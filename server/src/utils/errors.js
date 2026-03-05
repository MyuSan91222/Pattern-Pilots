// Centralized error codes and messages for consistent error handling

export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
};

export const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ERROR_CODES.UNAUTHORIZED]: 'Unauthorized. Please login again.',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Token expired. Please login again.',
  [ERROR_CODES.TOKEN_INVALID]: 'Invalid token format',
  [ERROR_CODES.EMAIL_NOT_VERIFIED]: 'Please verify your email first',
  
  [ERROR_CODES.INVALID_INPUT]: 'Invalid input provided',
  [ERROR_CODES.MISSING_FIELD]: 'Required field missing',
  [ERROR_CODES.DUPLICATE_EMAIL]: 'Email already registered',
  
  [ERROR_CODES.NOT_FOUND]: 'Resource not found',
  [ERROR_CODES.ACCESS_DENIED]: 'Access denied',
  
  [ERROR_CODES.INTERNAL_ERROR]: 'Internal server error',
  [ERROR_CODES.DATABASE_ERROR]: 'Database error occurred',
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  constructor(code, statusCode = HTTP_STATUS.INTERNAL_ERROR, details = null) {
    super(ERROR_MESSAGES[code] || code);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function createErrorResponse(error) {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      ...(error.details && { details: error.details }),
    };
  }
  return {
    error: 'Internal server error',
    code: ERROR_CODES.INTERNAL_ERROR,
  };
}
