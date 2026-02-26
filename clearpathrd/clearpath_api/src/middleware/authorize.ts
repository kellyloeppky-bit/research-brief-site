import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '../lib/auth/rbac.js';
import { UserContext } from '../types/auth.types.js';
import {
  AuthenticationError,
  AuthorizationError,
} from '../lib/errors/app-errors.js';

/**
 * Authorization middleware factory - checks user role
 */
export function requireAuth(roles?: UserRole | UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = request.user as UserContext | undefined;

    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    if (roles) {
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      if (!allowedRoles.includes(user.role)) {
        throw new AuthorizationError(
          `Required role: ${allowedRoles.join(' or ')}`
        );
      }
    }
  };
}
