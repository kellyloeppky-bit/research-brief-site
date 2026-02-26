/**
 * Certificates Validation Schemas
 *
 * Zod schemas for Certificate CRUD operations and verification.
 */

import { z } from 'zod';
import {
  uuidSchema,
  paginationQuerySchema,
} from '../lib/validation/common.schemas.js';

// Certificate type enum matching CertType from schema.prisma
export const certTypeSchema = z.enum(['residential', 'real_estate']);

// Certificate status enum matching CertStatus from schema.prisma
export const certStatusSchema = z.enum(['valid', 'expired', 'superseded']);

// Create certificate schema
export const createCertificateSchema = z.object({
  resultId: uuidSchema,
  certType: certTypeSchema,
  validFrom: z.coerce.date().optional(), // Defaults to today
});

// List certificates query schema
export const listCertificatesQuerySchema = paginationQuerySchema.extend({
  homeId: uuidSchema.optional(),
  status: certStatusSchema.optional(),
  certType: certTypeSchema.optional(),
});

// Params schemas
export const getCertificateParamsSchema = z.object({
  id: uuidSchema,
});

export const verifyCertificateParamsSchema = z.object({
  id: uuidSchema,
});

export const supersedeCertificateParamsSchema = z.object({
  id: uuidSchema,
});

// Supersede certificate body schema
export const supersedeCertificateSchema = z.object({
  reason: z.string().max(500).optional(),
});

// Type exports
export type CreateCertificateInput = z.infer<typeof createCertificateSchema>;
export type ListCertificatesQuery = z.infer<typeof listCertificatesQuerySchema>;
export type GetCertificateParams = z.infer<typeof getCertificateParamsSchema>;
export type VerifyCertificateParams = z.infer<typeof verifyCertificateParamsSchema>;
export type SupersedeCertificateParams = z.infer<typeof supersedeCertificateParamsSchema>;
export type SupersedeCertificateInput = z.infer<typeof supersedeCertificateSchema>;
