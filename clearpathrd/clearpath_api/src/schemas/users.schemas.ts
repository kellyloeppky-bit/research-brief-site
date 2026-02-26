import { z } from 'zod';
import {
  emailSchema,
  phoneSchema,
  uuidSchema,
  paginationQuerySchema,
} from '../lib/validation/common.schemas.js';

/**
 * User registration / creation schema
 */
export const createUserSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: phoneSchema.optional().nullable(),
  marketingConsent: z.boolean().default(false),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * User update schema (all fields optional)
 */
export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: phoneSchema.optional().nullable(),
  marketingConsent: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * Get user by ID params
 */
export const getUserParamsSchema = z.object({
  id: uuidSchema,
});

export type GetUserParams = z.infer<typeof getUserParamsSchema>;

/**
 * List users query parameters
 */
export const listUsersQuerySchema = paginationQuerySchema.extend({
  role: z.enum(['user', 'admin']).optional(),
  search: z.string().optional(), // Search by email, firstName, lastName
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

/**
 * Delete user params
 */
export const deleteUserParamsSchema = z.object({
  id: uuidSchema,
});

export type DeleteUserParams = z.infer<typeof deleteUserParamsSchema>;
