/**
 * Home Ownership Middleware
 *
 * Custom middleware for checking ownership through Home relationship.
 * Used for resources that belong to a Home (TestSession → Home → User).
 *
 * Admins automatically bypass ownership checks.
 */

import type { FastifyRequest } from 'fastify';
import { NotFoundError, ForbiddenError } from '../lib/errors/http-errors.js';
import type { UserContext } from '../types/auth.types.js';
import { isAdmin } from '../lib/auth/rbac.js';

/**
 * Require home ownership middleware factory
 *
 * @param resourceType - Human-readable resource type for error messages
 * @param getResource - Async function to fetch resource with home relationship
 * @returns Fastify middleware function
 *
 * @example
 * ```typescript
 * preHandler: [
 *   authenticate,
 *   requireHomeOwnership('test session', async (req) => {
 *     const { id } = req.params as { id: string };
 *     return server.prisma.testSession.findUnique({
 *       where: { id },
 *       include: { home: true }, // CRITICAL: Must include home
 *     });
 *   }),
 * ]
 * ```
 */
export function requireHomeOwnership<T extends { home: { userId: string } }>(
  resourceType: string,
  getResource: (request: FastifyRequest) => Promise<T | null>
) {
  return async (request: FastifyRequest) => {
    const user = request.user as UserContext;

    // Admin bypass
    if (isAdmin(user)) {
      return;
    }

    // Fetch resource with home relationship
    const resource = await getResource(request);

    if (!resource) {
      throw new NotFoundError(`${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found`);
    }

    // Check ownership through home
    if (resource.home.userId !== user.id) {
      throw new ForbiddenError(
        `You do not have permission to access this ${resourceType}`
      );
    }
  };
}
