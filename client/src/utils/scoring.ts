import type { AttendanceConfig, Student, SessionRecord, AttendanceStatus } from '../types';
import type { ParsedFile } from '../types';
import { extractEarliestJoins } from './excelParser';

function parseTimeToDate(timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(0);
  d.setHours(h, m, 0, 0);
  return d;
}

function classifyJoinTime(joinTime: Date | undefined, config: AttendanceConfig): AttendanceStatus {
  if (!joinTime) return 'Absent';
  
  const classStart = parseTimeToDate(config.classStart);
  const refDate = new Date(joinTime.getTime());
  refDate.setFullYear(1970, 0, 1);
  classStart.setFullYear(1970, 0, 1);

  const diffMinutes = (refDate.getTime() - classStart.getTime()) / 60000;

  // Negative means before class start - still on time
  // 0 means exactly at class start - on time
  // Positive means after class start
  
  if (diffMinutes < config.lateThreshold) return 'Normal';
  if (diffMinutes < config.absentThreshold) return 'Late';
  return 'Absent';
}

// Helper function to create a normalized key for deduplication
function createStudentKey(name: string, id?: string): string {
  const idPart = id ? String(id).toLowerCase().trim() : '';
  if (idPart) return idPart; // Prefer ID if available
  
  // Normalize name: lowercase, trim, remove extra spaces, remove special characters
  const namePart = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/[^\w\s]/g, ''); // Remove special characters except spaces
  
  return namePart;
}

export function analyzeAttendance(files: ParsedFile[], config: AttendanceConfig): Student[] {
  // Validate config
  if (!config || config.maxScore < 1) {
    throw new Error('Invalid config: maxScore must be at least 1');
  }
  if (config.latePenalty < 0 || config.absentPenalty < 0) {
    throw new Error('Invalid config: penalties cannot be negative');
  }

  // Build a master map: studentKey -> per-session records
  // Use a Map to consolidate students across files, using ID or name as the key
  const studentMap = new Map<string, { 
    name: string; 
    id?: string; 
    role?: string; 
    sessions: SessionRecord[] 
  }>();

  for (const file of files) {
    const earliestJoins = extractEarliestJoins(file);

    for (const [nameKey, { joinTime, id }] of earliestJoins) {
      const originalRecord = file.records.find(r => r.name.toLowerCase() === nameKey);
      const role = originalRecord?.role;
      const displayName = originalRecord?.name || nameKey;

      // Create a unique key based on ID (if available) or name
      const studentKey = createStudentKey(displayName, id);

      const isoDate = joinTime
        ? joinTime.toISOString().split('T')[0]
        : undefined;
      const sessionRecord: SessionRecord = {
        filename: file.filename,
        date: file.detectedDate || isoDate,
        status: classifyJoinTime(joinTime, config),
        joinTime: joinTime?.toLocaleTimeString(),
      };

      const existing = studentMap.get(studentKey);
      if (existing) {
        // Student already exists, add this session
        existing.sessions.push(sessionRecord);
        if (!existing.role && role) existing.role = role;
        // Keep the more complete name
        if (displayName && displayName.length > existing.name.length) {
          existing.name = displayName;
        }
        // Keep the ID if we get one
        if (!existing.id && id) existing.id = id;
      } else {
        // New student
        studentMap.set(studentKey, {
          name: displayName,
          id: id || undefined,
          role: role || undefined,
          sessions: [sessionRecord],
        });
      }
    }
  }

  // Also account for students absent in some sessions (files they don't appear in)
  // Students who appear in fewer files than total get Absent for missing sessions
  for (const [, data] of studentMap) {
    const presentFiles = new Set(data.sessions.map(s => s.filename));
    for (const file of files) {
      if (!presentFiles.has(file.filename)) {
        data.sessions.push({
          filename: file.filename,
          date: file.detectedDate,
          status: 'Absent',
          joinTime: undefined,
        });
      }
    }
  }

  // Compute scores
  const students: Student[] = [];
  for (const [, data] of studentMap) {
    const normal = data.sessions.filter(s => s.status === 'Normal').length;
    const late   = data.sessions.filter(s => s.status === 'Late').length;
    const absent = data.sessions.filter(s => s.status === 'Absent').length;

    // Effective max scales with the number of sessions uploaded
    const totalMax = config.maxScore * files.length;
    // Calculate score with safety checks
    const deduction = late * config.latePenalty + absent * config.absentPenalty;
    const score = Math.max(0, Math.min(totalMax, totalMax - deduction));

    // Ensure score is a valid number
    if (!isFinite(score)) {
      throw new Error(`Invalid score calculation for student ${data.name}`);
    }

    // First/last date from sessions where they actually attended (not absent)
    const attendedDates = data.sessions
      .filter(s => s.status !== 'Absent' && s.date)
      .map(s => s.date!)
      .sort();
    const firstDate = attendedDates[0];
    const lastDate  = attendedDates[attendedDates.length - 1];

    students.push({
      name: data.name, 
      id: data.id, 
      role: data.role,
      normal, late, absent, score,
      sessions: data.sessions,
      firstDate, lastDate,
    });
  }

  return students.sort((a, b) => b.score - a.score);
}

export function autoDetectClassTimes(files: ParsedFile[]): { start: string; end: string } | null {
  if (files.length === 0) return null;

  // Single file: use 25th percentile of join times from that file
  if (files.length === 1) {
    const file = files[0];
    const joinTimes: Date[] = file.records
      .filter(r => r.joinTime)
      .map(r => r.joinTime!);

    if (joinTimes.length === 0) return null;

    // Sort by time of day
    const sorted = [...joinTimes].sort((a, b) => {
      const aMin = a.getHours() * 60 + a.getMinutes();
      const bMin = b.getHours() * 60 + b.getMinutes();
      return aMin - bMin;
    });

    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const startHour = p25.getHours();
    const startMin = p25.getMinutes();
    const start = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    const endHour = startHour + 1;
    const end = `${String(endHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;

    return { start, end };
  }

  // Multiple files: calculate average start and end time for each file, then average those
  const fileTimings: Array<{ start: number; end: number }> = [];

  for (const file of files) {
    const joinTimes: Date[] = file.records
      .filter(r => r.joinTime)
      .map(r => r.joinTime!);

    if (joinTimes.length === 0) continue;

    // Convert to minutes since midnight for easier calculation
    const minutesList = joinTimes.map(t => t.getHours() * 60 + t.getMinutes());

    // Sort and use 25th percentile as start time estimate for this file
    const sorted = [...minutesList].sort((a, b) => a - b);
    const p25Minutes = sorted[Math.floor(sorted.length * 0.25)];

    // Assume class duration is 1 hour
    const endMinutes = p25Minutes + 60;

    fileTimings.push({ start: p25Minutes, end: endMinutes });
  }

  if (fileTimings.length === 0) return null;

  // Calculate averages
  const avgStartMinutes = Math.round(
    fileTimings.reduce((sum, t) => sum + t.start, 0) / fileTimings.length
  );
  const avgEndMinutes = Math.round(
    fileTimings.reduce((sum, t) => sum + t.end, 0) / fileTimings.length
  );

  // Convert back to HH:MM format
  const startHour = Math.floor(avgStartMinutes / 60);
  const startMin = avgStartMinutes % 60;
  const start = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;

  const endHour = Math.floor(avgEndMinutes / 60);
  const endMin = avgEndMinutes % 60;
  const end = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

  return { start, end };
}
