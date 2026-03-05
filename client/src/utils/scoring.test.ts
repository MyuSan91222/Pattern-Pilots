import { describe, it, expect } from 'vitest';
import {
  analyzeAttendance,
  autoDetectClassTimes,
} from '../utils/scoring';
import type { AttendanceConfig, ParsedFile } from '../types';

describe('Scoring Engine', () => {
  const mockConfig: AttendanceConfig = {
    classStart: '09:00',
    classEnd: '10:00',
    lateThreshold: 15,
    absentThreshold: 60,
    maxScore: 100,
    latePenalty: 10,
    absentPenalty: 30,
    timesLocked: false,
  };

  const mockFiles: ParsedFile[] = [
    {
      filename: 'test.xlsx',
      records: [
        {
          name: 'John Doe',
          id: 'john@example.com',
          joinTime: new Date('2024-03-04T09:05:00'),
        },
        {
          name: 'Jane Smith',
          id: 'jane@example.com',
          joinTime: new Date('2024-03-04T09:20:00'), // Late
        },
        {
          name: 'Bob Wilson',
          id: 'bob@example.com',
          joinTime: undefined, // Absent
        },
      ],
    },
  ];

  describe('analyzeAttendance', () => {
    it('should analyze attendance correctly', () => {
      const results = analyzeAttendance(mockFiles, mockConfig);
      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('John Doe');
      expect(results[0].normal).toBe(1); // John is on time
      expect(results[1].late).toBe(1); // Jane is late
      expect(results[2].absent).toBe(1); // Bob is absent
    });

    it('should calculate scores correctly', () => {
      const results = analyzeAttendance(mockFiles, mockConfig);
      expect(results[0].score).toBe(100); // On time
      expect(results[1].score).toBe(90); // Late penalty
      expect(results[2].score).toBe(70); // Absent penalty
    });

    it('should handle empty files', () => {
      const results = analyzeAttendance([], mockConfig);
      expect(results).toEqual([]);
    });
  });

  describe('autoDetectClassTimes', () => {
    it('should detect class times from join times', () => {
      const times = autoDetectClassTimes(mockFiles);
      expect(times).not.toBeNull();
      expect(times?.start).toMatch(/\d{2}:\d{2}/);
      expect(times?.end).toMatch(/\d{2}:\d{2}/);
    });

    it('should return null for empty files', () => {
      const times = autoDetectClassTimes([]);
      expect(times).toBeNull();
    });

    it('should return null for files with no join times', () => {
      const files: ParsedFile[] = [
        {
          filename: 'test.xlsx',
          records: [{ name: 'John', id: 'john' }],
        },
      ];
      const times = autoDetectClassTimes(files);
      expect(times).toBeNull();
    });
  });
});
