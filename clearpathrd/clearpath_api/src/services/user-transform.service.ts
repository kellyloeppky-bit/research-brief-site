import { User } from '@prisma/client';

/**
 * User Data Transfer Object - excludes sensitive fields
 */
export interface UserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  marketingConsent: boolean;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transform User model to safe DTO (excludes passwordHash)
 * @param user - User entity from database
 * @returns UserDTO without sensitive fields
 */
export function toUserDTO(user: User): UserDTO {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

/**
 * Public user profile - minimal fields for public display
 */
export interface PublicUserDTO {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Transform User to public profile
 * @param user - User entity from database
 * @returns Minimal public user data
 */
export function toPublicUserDTO(user: User): PublicUserDTO {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}
