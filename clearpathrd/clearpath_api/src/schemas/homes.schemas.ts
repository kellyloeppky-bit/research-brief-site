import { z } from 'zod';
import {
  uuidSchema,
  paginationQuerySchema,
  postalCodeSchema,
  provinceSchema,
} from '../lib/validation/common.schemas.js';

/**
 * Home age range enum schema
 */
export const homeAgeRangeSchema = z.enum([
  'pre_1980',
  'age_1980_2000',
  'age_2000_2010',
  'post_2010',
  'unknown',
]);

export type HomeAgeRange = z.infer<typeof homeAgeRangeSchema>;

/**
 * Foundation type enum schema
 */
export const foundationTypeSchema = z.enum([
  'full_basement',
  'partial_basement',
  'crawl_space',
  'slab',
  'unknown',
]);

export type FoundationType = z.infer<typeof foundationTypeSchema>;

/**
 * Basement occupancy enum schema
 */
export const basementOccupancySchema = z.enum([
  'primary_living',
  'occasional',
  'storage',
  'no_basement',
]);

export type BasementOccupancy = z.infer<typeof basementOccupancySchema>;

/**
 * Create home schema
 * Note: radonZone and regionalPrevalencePct are auto-populated from FSA lookup
 */
export const createHomeSchema = z.object({
  nickname: z.string().max(100).optional().nullable(),
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100),
  province: provinceSchema,
  postalCode: postalCodeSchema,
  ageRange: homeAgeRangeSchema,
  foundationType: foundationTypeSchema,
  basementOccupancy: basementOccupancySchema,
  roughinPresent: z.boolean().default(false),
});

export type CreateHomeInput = z.infer<typeof createHomeSchema>;

/**
 * Update home schema (all fields optional)
 */
export const updateHomeSchema = z.object({
  nickname: z.string().max(100).optional().nullable(),
  addressLine1: z.string().min(1).max(200).optional(),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100).optional(),
  province: provinceSchema.optional(),
  postalCode: postalCodeSchema.optional(),
  ageRange: homeAgeRangeSchema.optional(),
  foundationType: foundationTypeSchema.optional(),
  basementOccupancy: basementOccupancySchema.optional(),
  roughinPresent: z.boolean().optional(),
});

export type UpdateHomeInput = z.infer<typeof updateHomeSchema>;

/**
 * Get home by ID params
 */
export const getHomeParamsSchema = z.object({
  id: uuidSchema,
});

export type GetHomeParams = z.infer<typeof getHomeParamsSchema>;

/**
 * List homes query parameters
 */
export const listHomesQuerySchema = paginationQuerySchema;

export type ListHomesQuery = z.infer<typeof listHomesQuerySchema>;

/**
 * Delete home params
 */
export const deleteHomeParamsSchema = z.object({
  id: uuidSchema,
});

export type DeleteHomeParams = z.infer<typeof deleteHomeParamsSchema>;
