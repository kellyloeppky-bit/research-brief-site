import { PrismaClient } from '@prisma/client';
import { SupabaseJwtPayload, UserContext } from '../../types/auth.types.js';
import { AuthenticationError } from '../errors/app-errors.js';

/**
 * Extract user context from JWT payload and database
 */
export async function extractUserContext(
  jwtPayload: SupabaseJwtPayload,
  prisma: PrismaClient
): Promise<UserContext> {
  // Fetch user from database to get current role
  const user = await prisma.user.findUnique({
    where: { id: jwtPayload.sub },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}
