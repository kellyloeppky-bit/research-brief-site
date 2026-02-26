import { z } from 'zod';

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid();

/**
 * Pagination query parameters schema
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Canadian postal code schema
 */
export const postalCodeSchema = z
  .string()
  .regex(
    /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/,
    'Invalid postal code format (e.g., A1A 1A1)'
  );

/**
 * Canadian province code schema
 */
export const provinceSchema = z.enum([
  'AB',
  'BC',
  'MB',
  'NB',
  'NL',
  'NS',
  'NT',
  'NU',
  'ON',
  'PE',
  'QC',
  'SK',
  'YT',
]);

/**
 * Email validation schema
 */
export const emailSchema = z.string().email().max(255);

/**
 * Phone validation schema (simplified)
 */
export const phoneSchema = z
  .string()
  .regex(/^\+?1?\d{10,14}$/, 'Invalid phone number');

/**
 * ISO datetime string schema
 */
export const dateStringSchema = z.string().datetime();

/**
 * Date-only string schema (YYYY-MM-DD)
 */
export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Canadian Forward Sortation Area (FSA) schema
 * Format: A1A (first 3 characters of postal code)
 */
export const fsaSchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]\d[A-Z]$/, 'Invalid FSA format (must be A1A format)')
  .transform((s) => s.toUpperCase());
