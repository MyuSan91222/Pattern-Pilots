import * as XLSX from '@e965/xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import type { ParsedFile, RawRecord } from '../types';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const NAME_COLS = ['full name', 'name', 'participant', 'student name', 'attendee'];
const ID_COLS = ['user principal name', 'id', 'student id', 'email', 'upn'];
const JOIN_COLS = ['join time', 'timestamp', 'time', 'joined', 'join'];
const ROLE_COLS = ['meeting role', 'role', 'participant role', 'user role'];

// Sanitize strings to prevent prototype pollution attacks
export function sanitizeString(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  // Prevent prototype pollution by filtering dangerous property names
  if (['__proto__', 'constructor', 'prototype'].includes(str.toLowerCase())) {
    return '';
  }
  return str;
}

function findCol(headers: string[], candidates: string[]): string | undefined {
  const lower = headers.map(h => h.toLowerCase());
  for (const c of candidates) {
    const idx = lower.findIndex(h => h.includes(c));
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

function parseDateTime(val: any): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Excel serial date - validate the number
    if (!isFinite(val) || val < 0 || val > 60000) return undefined;
    return new Date((val - 25569) * 86400 * 1000);
  }
  const str = sanitizeString(val);
  const d = new Date(str);
  return isNaN(d.getTime()) ? undefined : d;
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function extractIdFromEmail(email: string): string | undefined {
  if (!email) return undefined;
  // Extract all consecutive digits from email (e.g., "u6712047@au.edu" → "6712047")
  const match = sanitizeString(email).match(/(\d+)/);
  return match ? match[1] : undefined;
}

function buildRecords(rows: any[][], filename: string): ParsedFile {
  try {
    if (rows.length < 2) {
      throw new Error('File does not contain enough data. Expected at least a header row and one data row.');
    }

    // Find the header row: the first row (within first 25) that matches candidates
    // from at least 2 distinct column groups. This prevents metadata rows like
    // "Meeting title" (which accidentally contains "time") from being treated as
    // the header — a real header like "Name  First Join  Email  Role" hits 3-4 groups.
    let headerIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 25); i++) {
      try {
        const rowLower = rows[i].map((c: any) => {
          const str = String(c || '').toLowerCase().trim();
          return str;
        });
        let groupMatches = 0;
        if (NAME_COLS.some(c => rowLower.some(h => h.includes(c)))) groupMatches++;
        if (ID_COLS.some(c => rowLower.some(h => h.includes(c))))   groupMatches++;
        if (JOIN_COLS.some(c => rowLower.some(h => h.includes(c)))) groupMatches++;
        if (ROLE_COLS.some(c => rowLower.some(h => h.includes(c)))) groupMatches++;
        if (groupMatches >= 2) {
          headerIdx = i;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    const headers = rows[headerIdx].map((h: any) => String(h || '').trim());
    const nameCol = findCol(headers, NAME_COLS);
    const idCol   = findCol(headers, ID_COLS);
    const joinCol = findCol(headers, JOIN_COLS);
    const roleCol = findCol(headers, ROLE_COLS);

    // Validate that we found at least critical columns
    if (!nameCol) {
      throw new Error('Could not find a name column. Expected columns like: Full Name, Name, Participant, Student Name, or Attendee');
    }

    const nameIdx = nameCol ? headers.indexOf(nameCol) : 0;
    const idIdx   = idCol   ? headers.indexOf(idCol)   : -1;
    const joinIdx = joinCol ? headers.indexOf(joinCol) : 1;
    const roleIdx = roleCol ? headers.indexOf(roleCol) : -1;

    // Find where this data section ends (next numbered section header, e.g. "3. In-Meeting Activities")
    let endIdx = rows.length;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const firstCell = String(rows[i][0] || '').trim();
      if (/^\d+\.\s/.test(firstCell)) {
        endIdx = i;
        break;
      }
    }

    // Teams metadata keywords to filter out
    const metadataKeywords = [
      'meeting title', 'meeting duration', 'start time', 'end time',
      'attended participants', 'average attendance', 'in-meeting activities',
      'participants', 'join time', 'leave time', 'duration', 'participant id',
      'in-meeting duration', 'first join', 'last leave'
    ];

    const records: RawRecord[] = [];
    for (let i = headerIdx + 1; i < endIdx; i++) {
      try {
        const row = rows[i];
        let name = String(row[nameIdx] || '').trim();
        if (!name) continue;

        // Skip metadata rows (keywords that indicate summary info, not actual participants)
        const nameLower = name.toLowerCase();
        if (metadataKeywords.some(kw => nameLower.includes(kw))) {
          continue;
        }

        // Skip rows that are column headers (contain multiple space-separated words that look like column names)
        if (nameLower.includes('email') && nameLower.includes('role')) {
          continue;
        }

        // Remove date suffix from name (e.g., "JA HTU SAN - 12/11/25" → "JA HTU SAN")
        // Handles various date formats and separators (dash, tab, multiple spaces, etc.)
        // Match: optional whitespace, separator (dash/endash/emdash), optional whitespace, date pattern
        name = name.replace(/\s*[-–—]\s*\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\s*$/i, '').trim();
        // Handle dates separated by tabs or multiple spaces without dash (e.g., "NAME 12/04/25\t")
        name = name.replace(/\s+\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\s*$/i, '').trim();
        // Handle dates with quotes around them
        name = name.replace(/\s*[-–—]\s*[""''„‟]?\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}[""''„‟]?\s*$/i, '').trim();
        // Handle any remaining quotes or special chars at end
        name = name.replace(/[""''„‟]\s*$/, '').trim();

        // Sanitize name to prevent prototype pollution
        if (['__proto__', 'constructor', 'prototype'].includes(name.toLowerCase())) {
          continue;
        }

        let id = idIdx >= 0 ? String(row[idIdx] || '').trim() : undefined;
        // Filter out dashes and other non-meaningful characters
        if (id && /^[-–—_]+$/.test(id)) {
          id = undefined;
        }
        // If ID looks like an email, extract just the numeric part
        if (id && id.includes('@')) {
          id = extractIdFromEmail(id) || id;
        }
        const role = roleIdx >= 0 ? String(row[roleIdx] || '').trim() : undefined;
        const joinTime = parseDateTime(row[joinIdx]);
        records.push({ name, id: id || undefined, role: role || undefined, joinTime });
      } catch (e) {
        // Skip rows that cause parsing errors
        continue;
      }
    }

    const firstJoin = records.find(r => r.joinTime)?.joinTime;
    const detectedDate = firstJoin ? toISODate(firstJoin) : undefined;
    return { filename, records, detectedDate };
  } catch (e) {
    console.error('Error in buildRecords:', e);
    return { filename, records: [], detectedDate: undefined };
  }
}

// ── Native CSV parser ──────────────────────────────────────────────────────────

function parseCsvText(text: string, filename: string): ParsedFile {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // Auto-detect separator: Teams attendance CSVs are tab-separated.
  // Count tabs vs commas in a sample of non-empty lines.
  const sampleLines = lines.filter(l => l.trim()).slice(0, 15);
  const tabCount   = sampleLines.reduce((n, l) => n + (l.split('\t').length - 1), 0);
  const commaCount = sampleLines.reduce((n, l) => n + (l.split(',').length - 1), 0);
  const isTabSeparated = tabCount > commaCount;

  const rows: string[][] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    if (isTabSeparated) {
      rows.push(line.split('\t').map(f => f.trim()));
    } else {
      // RFC-4180 parsing — handles quoted fields that contain commas
      const row: string[] = [];
      let field = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          row.push(field.trim());
          field = '';
        } else {
          field += ch;
        }
      }
      row.push(field.trim());
      rows.push(row);
    }
  }

  return buildRecords(rows, filename);
}

// ── Excel parser (XLSX for .xlsx / .xls) ─────────────────────────────────────

function parseExcelBuffer(data: Uint8Array, filename: string): ParsedFile {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
  return buildRecords(rows, filename);
}

// ── PDF parser ─────────────────────────────────────────────────────────────────

async function parsePdfBuffer(data: Uint8Array, filename: string): Promise<ParsedFile> {
  try {
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    // Try to parse as table-like structure
    const rows: string[][] = [];
    const lines = fullText.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        // Split by multiple spaces or tabs
        const cells = line.split(/\s{2,}|\t+/).map(cell => cell.trim()).filter(cell => cell);
        if (cells.length > 0) {
          rows.push(cells);
        }
      }
    }

    if (rows.length < 2) {
      throw new Error('PDF does not contain readable attendance data. Please ensure the PDF contains a table with attendance records.');
    }
    return buildRecords(rows, filename);
  } catch (err) {
    throw new Error(`Failed to parse PDF: ${err}`);
  }
}

// ── DOCX parser ────────────────────────────────────────────────────────────────

async function parseDocxBuffer(data: ArrayBuffer, filename: string): Promise<ParsedFile> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: data });
    const fullText = result.value;

    // Parse text as table-like structure
    const rows: string[][] = [];
    const lines = fullText.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        // Split by multiple spaces or tabs
        const cells = line.split(/\s{2,}|\t+/).map(cell => cell.trim()).filter(cell => cell);
        if (cells.length > 0) {
          rows.push(cells);
        }
      }
    }

    if (rows.length < 2) {
      throw new Error('DOCX does not contain readable attendance data. Please ensure the document contains a table with attendance records.');
    }
    return buildRecords(rows, filename);
  } catch (err) {
    throw new Error(`Failed to parse DOCX: ${err}`);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function parseExcelFile(file: File): Promise<ParsedFile> {
  const ext = file.name.toLowerCase().split('.').pop() || '';
  const isCSV = ext === 'csv';
  const isPDF = ext === 'pdf';
  const isDocx = ext === 'docx';
  const isExcel = ['xlsx', 'xls', 'xlsm'].includes(ext);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (isCSV) {
      reader.onload = (e) => {
        try {
          resolve(parseCsvText(e.target!.result as string, file.name));
        } catch (err) {
          reject(new Error(`Failed to parse ${file.name}: ${err}`));
        }
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsText(file, 'utf-8');
    } else if (isPDF) {
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const result = await parsePdfBuffer(data, file.name);
          resolve(result);
        } catch (err) {
          reject(new Error(`Failed to parse ${file.name}: ${err}`));
        }
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsArrayBuffer(file);
    } else if (isDocx) {
      reader.onload = async (e) => {
        try {
          const result = await parseDocxBuffer(e.target!.result as ArrayBuffer, file.name);
          resolve(result);
        } catch (err) {
          reject(new Error(`Failed to parse ${file.name}: ${err}`));
        }
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsArrayBuffer(file);
    } else if (isExcel) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          resolve(parseExcelBuffer(data, file.name));
        } catch (err) {
          reject(new Error(`Failed to parse ${file.name}: ${err}`));
        }
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error(`Unsupported file format: ${ext}. Supported formats: CSV, XLSX, XLS, XLSM, PDF, DOCX`));
    }
  });
}

export function extractEarliestJoins(file: ParsedFile): Map<string, { joinTime?: Date; id?: string }> {
  const map = new Map<string, { joinTime?: Date; id?: string }>();
  for (const record of file.records) {
    const key = record.name.toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { joinTime: record.joinTime, id: record.id });
    } else if (record.joinTime && (!existing.joinTime || record.joinTime < existing.joinTime)) {
      map.set(key, { joinTime: record.joinTime, id: existing.id || record.id });
    }
  }
  return map;
}
