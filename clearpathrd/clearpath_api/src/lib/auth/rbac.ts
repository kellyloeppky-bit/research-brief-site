import { UserContext } from '../../types/auth.types.js';
import { AuthorizationError } from '../errors/app-errors.js';

export type UserRole = 'user' | 'admin';

/**
 * Require specific role
 */
export function requireRole(user: UserContext, requiredRole: UserRole): void {
  if (user.role !== requiredRole) {
    throw new AuthorizationError(`This action requires ${requiredRole} role`);
  }
}

/**
 * Require one of multiple roles
 */
export function requireOneOfRoles(
  user: UserContext,
  requiredRoles: UserRole[]
): void {
  if (!requiredRoles.includes(user.role as UserRole)) {
    throw new AuthorizationError(
      `This action requires one of: ${requiredRoles.join(', ')}`
    );
  }
}

/**
 * Check if user is admin
 */
export function isAdmin(user: UserContext): boolean {
  return user.role === 'admin';
}

/**
 * Check if user has specific role
 */
export function hasRole(user: UserContext, role: UserRole): boolean {
  return user.role === role;
}
