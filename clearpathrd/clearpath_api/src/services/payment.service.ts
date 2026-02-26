/**
 * Payment Service
 *
 * Core payment processing logic using Stripe API.
 * Handles payment intents, refunds, and order status updates.
 */

import type Stripe from 'stripe';
import type { PrismaClient } from '@prisma/client';
import { stripe, isStripeConfigured } from '../lib/stripe/stripe-client.js';

/**
 * Product SKU to price mapping (in cents)
 * Prices include tax (13% HST for Ontario)
 */
const PRODUCT_PRICES: Record<
  string,
  { amount: number; currency: string; description: string }
> = {
  standard_long: {
    amount: 10169, // $101.69 CAD
    currency: 'cad',
    description: 'ClearPath RD Standard Long-Term Radon Test Kit',
  },
  real_estate_short: {
    amount: 5649, // $56.49 CAD
    currency: 'cad',
    description: 'ClearPath RD Real Estate Short-Term Radon Test Kit',
  },
  twin_pack: {
    amount: 16949, // $169.49 CAD
    currency: 'cad',
    description: 'ClearPath RD Twin Pack Radon Test Kits',
  },
};

/**
 * Create Stripe PaymentIntent for kit order
 *
 * @param kitOrderId - Kit order UUID
 * @param productSku - Product SKU
 * @param quantity - Order quantity
 * @param metadata - Additional metadata to attach
 * @returns Stripe PaymentIntent
 */
export async function createPaymentIntent(
  kitOrderId: string,
  productSku: string,
  quantity: number,
  metadata: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const priceInfo = PRODUCT_PRICES[productSku];

  if (!priceInfo) {
    throw new Error(`Invalid product SKU: ${productSku}`);
  }

  const amount = priceInfo.amount * quantity;

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: priceInfo.currency,
    description: `${priceInfo.description} (Qty: ${quantity})`,
    metadata: {
      kitOrderId,
      productSku,
      quantity: quantity.toString(),
      ...metadata,
    },
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never', // Disable redirect-based payment methods
    },
    statement_descriptor: 'CLEARPATH RD', // Appears on customer's statement
  });

  return paymentIntent;
}

/**
 * Retrieve PaymentIntent by ID
 *
 * @param paymentIntentId - Stripe PaymentIntent ID
 * @returns Stripe PaymentIntent
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Cancel PaymentIntent
 *
 * @param paymentIntentId - Stripe PaymentIntent ID
 * @returns Cancelled PaymentIntent
 */
export async function cancelPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.cancel(paymentIntentId);
}

/**
 * Create Stripe Refund
 *
 * @param paymentIntentId - Stripe PaymentIntent ID
 * @param amount - Optional amount in cents (for partial refund)
 * @param reason - Refund reason
 * @returns Stripe Refund
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
): Promise<Stripe.Refund> {
  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
    reason,
  };

  if (amount !== undefined) {
    refundParams.amount = amount;
  }

  const refund = await stripe.refunds.create(refundParams);
  return refund;
}

/**
 * Update kit order status based on payment status
 *
 * @param paymentIntentId - Stripe PaymentIntent ID
 * @param status - Payment status
 * @param prisma - Prisma client
 */
export async function updateKitOrderFromPayment(
  paymentIntentId: string,
  status: 'paid' | 'failed' | 'refunded',
  prisma: PrismaClient
): Promise<void> {
  const kitOrder = await prisma.kitOrder.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });

  if (!kitOrder) {
    console.error(`Kit order not found for payment: ${paymentIntentId}`);
    throw new Error(`Kit order not found for payment: ${paymentIntentId}`);
  }

  const updateData: Record<string, unknown> = {
    paymentStatus: status,
  };

  if (status === 'paid') {
    updateData.paidAt = new Date();
  }

  await prisma.kitOrder.update({
    where: { id: kitOrder.id },
    data: updateData,
  });

  console.log(
    `Updated kit order ${kitOrder.id} to status: ${status} (payment: ${paymentIntentId})`
  );
}

/**
 * Get product price information
 *
 * @param productSku - Product SKU
 * @returns Price information or null if not found
 */
export function getProductPrice(productSku: string): {
  amount: number;
  currency: string;
  description: string;
} | null {
  return PRODUCT_PRICES[productSku] || null;
}

/**
 * Calculate total amount for order
 *
 * @param productSku - Product SKU
 * @param quantity - Order quantity
 * @returns Total amount in cents
 */
export function calculateOrderTotal(
  productSku: string,
  quantity: number
): number {
  const priceInfo = PRODUCT_PRICES[productSku];

  if (!priceInfo) {
    throw new Error(`Invalid product SKU: ${productSku}`);
  }

  return priceInfo.amount * quantity;
}
