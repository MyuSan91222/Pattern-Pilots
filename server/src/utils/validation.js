import { z } from 'zod';

// Shared schemas
export const emailSchema = z.string().email('Invalid email format').toLowerCase();
export const passwordSchema = z.string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password too long');

// Auth schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password required'),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Name required').max(100, 'Name too long'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token required'),
  newPassword: passwordSchema,
});

// Group Chat schemas
export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name required').max(100),
  description: z.string().max(500).optional(),
  is_public: z.number().int().min(0).max(1).default(1),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  is_public: z.number().int().min(0).max(1).optional(),
});

export const sendMessageSchema = z.object({
  text: z.string().max(4000, 'Message too long').optional(),
  file_path: z.string().optional(),
});

// Lost & Found schemas
export const createPostingSchema = z.object({
  category: z.enum(['lost', 'found']),
  title: z.string().min(3, 'Title too short').max(200),
  description: z.string().min(10, 'Description too short').max(2000),
  location: z.string().max(200).optional(),
  image_path: z.string().optional(),
});

export const updatePostingSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(2000).optional(),
  location: z.string().max(200).optional(),
});

export function validateInput(schema, data) {
  try {
    return { valid: true, data: schema.parse(data) };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        valid: false,
        errors: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      };
    }
    return { valid: false, error: 'Validation failed' };
  }
}
