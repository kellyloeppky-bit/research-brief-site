import { HttpError } from './http-errors.js';

/**
 * Validation error (400)
 */
export class ValidationError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(400, message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends HttpError {
  constructor(message = 'Authentication failed', details?: unknown) {
    super(401, message, 'AUTHENTICATION_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends HttpError {
  constructor(message = 'Insufficient permissions', details?: unknown) {
    super(403, message, 'AUTHORIZATION_ERROR', details);
    this.name = 'AuthorizationError';
  }
}
