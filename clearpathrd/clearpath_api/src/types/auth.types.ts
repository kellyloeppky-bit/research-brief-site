/**
 * Supabase JWT payload structure
 */
export interface SupabaseJwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
  aud: string;
  exp: number;
  iat: number;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  user_metadata?: Record<string, unknown>;
}

/**
 * Extracted user context attached to requests
 */
export interface UserContext {
  id: string;
  email: string;
  role: 'user' | 'admin';
}
