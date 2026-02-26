/**
 * Results Validation Schemas
 *
 * Zod schemas for Result CRUD operations and radon test results.
 */

import { z } from 'zod';
import {
  uuidSchema,
  paginationQuerySchema,
} from '../lib/validation/common.schemas.js';

// Result zone enum matching ResultZone from schema.prisma
export const resultZoneSchema = z.enum([
  'below_guideline',
  'caution',
  'action_required',
  'urgent_action',
]);

// Radon measurement validation
const MIN_RADON_VALUE = 0;
const MAX_RADON_VALUE = 10000; // 10,000 Bq/m³

export const radonValueSchema = z
  .number()
  .min(MIN_RADON_VALUE, 'Radon value must be non-negative')
  .max(MAX_RADON_VALUE, 'Radon value exceeds maximum (10,000 Bq/m³)');

// Create result schema
export const createResultSchema = z.object({
  testSessionId: uuidSchema,
  valueBqm3: radonValueSchema,
  labReference: z.string().max(100).optional().nullable(),
  recordedAt: z.coerce.date(),
});

// Update result schema (only if not immutable)
export const updateResultSchema = z.object({
  valueBqm3: radonValueSchema.optional(),
  labReference: z.string().max(100).optional().nullable(),
  recordedAt: z.coerce.date().optional(),
});

// List results query schema
export const listResultsQuerySchema = paginationQuerySchema.extend({
  homeId: uuidSchema.optional(),
  zone: resultZoneSchema.optional(),
  minValue: z.coerce.number().min(0).optional(),
  maxValue: z.coerce.number().max(10000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// Params schemas
export const getResultParamsSchema = z.object({
  id: uuidSchema,
});

export const deleteResultParamsSchema = z.object({
  id: uuidSchema,
});

export const getResultBySessionParamsSchema = z.object({
  testSessionId: uuidSchema,
});

// Type exports
export type CreateResultInput = z.infer<typeof createResultSchema>;
export type UpdateResultInput = z.infer<typeof updateResultSchema>;
export type ListResultsQuery = z.infer<typeof listResultsQuerySchema>;
export type GetResultParams = z.infer<typeof getResultParamsSchema>;
export type DeleteResultParams = z.infer<typeof deleteResultParamsSchema>;
export type GetResultBySessionParams = z.infer<
  typeof getResultBySessionParamsSchema
>;
