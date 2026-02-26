/**
 * Kit Orders Validation Schemas
 *
 * Zod schemas for KitOrder CRUD operations.
 * Phase 6 will add Stripe integration.
 */

import { z } from 'zod';
import {
  uuidSchema,
  paginationQuerySchema,
  postalCodeSchema,
  provinceSchema,
} from '../lib/validation/common.schemas.js';

// Product SKU enum matching ProductSku from schema.prisma
export const productSkuSchema = z.enum([
  'standard_long',
  'real_estate_short',
  'twin_pack',
]);

// Payment status enum matching PaymentStatus from schema.prisma
export const paymentStatusSchema = z.enum([
  'pending',
  'paid',
  'failed',
  'refunded',
]);

// Create kit order schema
export const createKitOrderSchema = z.object({
  homeId: uuidSchema,
  productSku: productSkuSchema,
  quantity: z.number().int().min(1).max(10),

  // Shipping address (4 fields)
  shippingAddressLine1: z.string().min(1).max(200),
  shippingCity: z.string().min(1).max(100),
  shippingProvince: provinceSchema,
  shippingPostalCode: postalCodeSchema,

  // Pricing (3 fields)
  subtotalCad: z.number().min(0),
  taxCad: z.number().min(0),
  totalCad: z.number().min(0),

  // Optional referral code
  referralCodeId: uuidSchema.optional(),
});

// Update kit order schema (admin-only updates)
export const updateKitOrderSchema = z.object({
  // Shipping fields
  shippingAddressLine1: z.string().min(1).max(200).optional(),
  shippingCity: z.string().min(1).max(100).optional(),
  shippingProvince: provinceSchema.optional(),
  shippingPostalCode: postalCodeSchema.optional(),

  // Status and references
  paymentStatus: paymentStatusSchema.optional(),
  labOrderReference: z.string().max(100).optional().nullable(),

  // Timestamps (admin-only)
  fulfilledAt: z.coerce.date().optional().nullable(),
});

// List kit orders query schema
export const listKitOrdersQuerySchema = paginationQuerySchema.extend({
  homeId: uuidSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
});

// Params schemas
export const getKitOrderParamsSchema = z.object({
  id: uuidSchema,
});

export const deleteKitOrderParamsSchema = z.object({
  id: uuidSchema,
});

// Type exports
export type CreateKitOrderInput = z.infer<typeof createKitOrderSchema>;
export type UpdateKitOrderInput = z.infer<typeof updateKitOrderSchema>;
export type ListKitOrdersQuery = z.infer<typeof listKitOrdersQuerySchema>;
export type GetKitOrderParams = z.infer<typeof getKitOrderParamsSchema>;
export type DeleteKitOrderParams = z.infer<typeof deleteKitOrderParamsSchema>;
