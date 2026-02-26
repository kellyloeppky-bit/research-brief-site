import { FastifyRequest, FastifyReply } from 'fastify';
import {
  extractTokenFromHeader,
  verifySupabaseJwt,
} from '../lib/auth/jwt.verifier.js';
import { extractUserContext } from '../lib/auth/user.extractor.js';

/**
 * Authentication middleware - verifies JWT and attaches user to request
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const token = extractTokenFromHeader(request.headers.authorization);
  const jwtPayload = verifySupabaseJwt(token);
  const userContext = await extractUserContext(jwtPayload, request.server.prisma);

  // Attach user to request
  request.user = userContext;
}
