import { describe, it, expect } from 'vitest';
import { sanitizeString } from '../utils/excelParser';

describe('Excel Parser Utilities', () => {
  describe('sanitizeString', () => {
    it('should remove prototype pollution patterns', () => {
      expect(sanitizeString('__proto__')).not.toBe('__proto__');
      expect(sanitizeString('constructor')).not.toBe('constructor');
      expect(sanitizeString('prototype')).not.toBe('prototype');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should convert to string', () => {
      expect(typeof sanitizeString(123)).toBe('string');
      expect(sanitizeString(123)).toBe('123');
    });

    it('should preserve legitimate values', () => {
      expect(sanitizeString('John Doe')).toBe('John Doe');
      expect(sanitizeString('john@example.com')).toBe('john@example.com');
    });

    it('should handle special characters safely', () => {
      const result = sanitizeString('Name<script>alert("xss")</script>');
      expect(typeof result).toBe('string');
    });
  });
});
