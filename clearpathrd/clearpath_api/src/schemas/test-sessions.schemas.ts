/**
 * Test Sessions Validation Schemas
 *
 * Zod schemas for TestSession CRUD and state machine operations.
 */

import { z } from 'zod';
import {
  uuidSchema,
  paginationQuerySchema,
} from '../lib/validation/common.schemas.js';

// Kit type enum matching KitType from schema.prisma
export const kitTypeSchema = z.enum(['long_term', 'real_estate_short']);

// Session status enum matching SessionStatus from schema.prisma
export const sessionStatusSchema = z.enum([
  'ordered',
  'active',
  'retrieval_due',
  'mailed',
  'results_pending',
  'complete',
  'expired',
  'cancelled',
]);

// Create test session schema (activation)
export const createTestSessionSchema = z.object({
  homeId: uuidSchema,
  kitOrderId: uuidSchema,
  kitSerialNumber: z.string().min(1).max(100),
  kitType: kitTypeSchema,
  placementRoom: z.string().min(1).max(100),
  placementDescription: z.string().max(500).optional().nullable(),
});

// Update test session schema (status updates)
export const updateTestSessionSchema = z.object({
  status: sessionStatusSchema,
  retrievedAt: z.coerce.date().optional().nullable(),
  mailedAt: z.coerce.date().optional().nullable(),
});

// Action schemas
export const retrieveTestSessionSchema = z.object({
  retrievedAt: z.coerce.date().optional(),
});

export const mailTestSessionSchema = z.object({
  mailedAt: z.coerce.date().optional(),
});

// List test sessions query schema
export const listTestSessionsQuerySchema = paginationQuerySchema.extend({
  homeId: uuidSchema.optional(),
  kitOrderId: uuidSchema.optional(),
  status: sessionStatusSchema.optional(),
});

// Params schemas
export const getTestSessionParamsSchema = z.object({
  id: uuidSchema,
});

export const updateTestSessionParamsSchema = z.object({
  id: uuidSchema,
});

export const actionTestSessionParamsSchema = z.object({
  id: uuidSchema,
});

// Type exports
export type CreateTestSessionInput = z.infer<typeof createTestSessionSchema>;
export type UpdateTestSessionInput = z.infer<typeof updateTestSessionSchema>;
export type RetrieveTestSessionInput = z.infer<typeof retrieveTestSessionSchema>;
export type MailTestSessionInput = z.infer<typeof mailTestSessionSchema>;
export type ListTestSessionsQuery = z.infer<typeof listTestSessionsQuerySchema>;
export type GetTestSessionParams = z.infer<typeof getTestSessionParamsSchema>;
export type UpdateTestSessionParams = z.infer<typeof updateTestSessionParamsSchema>;
export type ActionTestSessionParams = z.infer<typeof actionTestSessionParamsSchema>;
