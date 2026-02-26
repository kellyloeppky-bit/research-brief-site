import { FastifyRequest, FastifyReply } from 'fastify';
import { UserContext } from '../types/auth.types.js';
import { isAdmin } from '../lib/auth/rbac.js';
import { NotFoundError } from '../lib/errors/http-errors.js';
import { AuthorizationError } from '../lib/errors/app-errors.js';

/**
 * Middleware factory to require resource ownership
 * Admin users can bypass ownership checks
 *
 * @param resourceType - Human-readable resource name for error messages
 * @param getResource - Async function to fetch the resource and return userId
 * @returns Fastify middleware function
 */
export function requireOwnership<T extends { userId: string }>(
  resourceType: string,
  getResource: (request: FastifyRequest) => Promise<T | null>
) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = request.user as UserContext;

    // Admin bypass - admins can access any resource
    if (isAdmin(user)) {
      return;
    }

    // Fetch the resource
    const resource = await getResource(request);
    if (!resource) {
      throw new NotFoundError(`${resourceType} not found`);
    }

    // Check ownership
    if (resource.userId !== user.id) {
      throw new AuthorizationError(
        `You do not have permission to access this ${resourceType}`
      );
    }
  };
}

/**
 * Middleware to require user to be accessing their own record or be an admin
 */
export function requireSelfOrAdmin() {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = request.user as UserContext;
    const targetUserId = (request.params as { id: string }).id;

    // Admin bypass or self-access
    if (isAdmin(user) || user.id === targetUserId) {
      return;
    }

    throw new AuthorizationError('You can only access your own user record');
  };
}
