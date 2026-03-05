import { describe, it, expect } from 'vitest';
import { validateInput, loginSchema, signupSchema, createGroupSchema } from '../utils/validation.js';

describe('Input Validation', () => {
  describe('loginSchema', () => {
    it('should validate correct login credentials', () => {
      const result = validateInput(loginSchema, {
        email: 'user@example.com',
        password: 'password123',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = validateInput(loginSchema, {
        email: 'invalid-email',
        password: 'password123',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject missing password', () => {
      const result = validateInput(loginSchema, {
        email: 'user@example.com',
        password: '',
      });
      expect(result.valid).toBe(false);
    });

    it('should lowercase email', () => {
      const result = validateInput(loginSchema, {
        email: 'User@Example.COM',
        password: 'password123',
      });
      expect(result.valid).toBe(true);
      expect(result.data.email).toBe('user@example.com');
    });
  });

  describe('signupSchema', () => {
    it('should validate correct signup data', () => {
      const result = validateInput(signupSchema, {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'John Doe',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject short password', () => {
      const result = validateInput(signupSchema, {
        email: 'user@example.com',
        password: '123',
        name: 'John Doe',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject missing name', () => {
      const result = validateInput(signupSchema, {
        email: 'user@example.com',
        password: 'password123',
        name: '',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('createGroupSchema', () => {
    it('should validate group creation data', () => {
      const result = validateInput(createGroupSchema, {
        name: 'Test Group',
        description: 'A test group',
        is_public: 1,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject empty group name', () => {
      const result = validateInput(createGroupSchema, {
        name: '',
        is_public: 1,
      });
      expect(result.valid).toBe(false);
    });

    it('should set default is_public if not provided', () => {
      const result = validateInput(createGroupSchema, {
        name: 'Test Group',
      });
      expect(result.valid).toBe(true);
      expect(result.data.is_public).toBe(1);
    });
  });
});
