import jwt from 'jsonwebtoken';
import { supabaseConfig } from '../../config/supabase.config.js';
import { SupabaseJwtPayload } from '../../types/auth.types.js';
import { AuthenticationError } from '../errors/app-errors.js';

/**
 * Verify Supabase JWT token
 */
export function verifySupabaseJwt(token: string): SupabaseJwtPayload {
  try {
    const decoded = jwt.verify(token, supabaseConfig.jwtSecret, {
      algorithms: [...supabaseConfig.algorithms],
      audience: supabaseConfig.audience,
      issuer: supabaseConfig.issuer,
    });

    return decoded as unknown as SupabaseJwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    }
    throw new AuthenticationError('Token verification failed');
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string {
  if (!authHeader) {
    throw new AuthenticationError('Authorization header missing');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new AuthenticationError('Invalid authorization header format');
  }

  return parts[1];
}
