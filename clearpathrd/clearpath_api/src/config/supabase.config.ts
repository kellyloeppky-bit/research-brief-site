/**
 * Supabase configuration with validation
 */
export const supabaseConfig = {
  jwtSecret: process.env.SUPABASE_JWT_SECRET || '',
  projectUrl: process.env.SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  // JWT verification options
  algorithms: ['HS256'] as const,
  issuer: process.env.SUPABASE_URL || '',
  audience: 'authenticated',
} as const;

// Validation on module load
if (!supabaseConfig.jwtSecret) {
  console.warn('⚠️  SUPABASE_JWT_SECRET not set - authentication will not work');
}

if (!supabaseConfig.projectUrl) {
  console.warn('⚠️  SUPABASE_URL not set - authentication will not work');
}
