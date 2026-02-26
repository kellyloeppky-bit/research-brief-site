import { z } from 'zod';
import { fsaSchema } from '../lib/validation/common.schemas.js';

/**
 * FSA lookup query schema
 */
export const lookupRadonZoneQuerySchema = z.object({
  fsa: fsaSchema,
});

export type LookupRadonZoneQuery = z.infer<typeof lookupRadonZoneQuerySchema>;
