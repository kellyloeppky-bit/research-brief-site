/**
 * Stripe Webhook Handler Service
 *
 * Processes Stripe webhook events and updates order status accordingly.
 */

import type Stripe from 'stripe';
import type { PrismaClient } from '@prisma/client';
import { stripe, isStripeConfigured } from '../lib/stripe/stripe-client.js';
import { stripeConfig } from '../config/stripe.config.js';
import { updateKitOrderFromPayment } from './payment.service.js';
import {
  sendPaymentReceiptEmail,
  sendPaymentFailedEmail,
  sendRefundProcessedEmail,
} from './email-notification.service.js';

/**
 * Verify Stripe webhook signature
 *
 * @param payload - Raw request body
 * @param signature - Stripe-Signature header
 * @returns Verified Stripe Event
 * @throws Error if signature verification fails
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      stripeConfig.webhookSecret
    );
    return event;
  } catch (err) {
    const error = err as Error;
    console.error('Webhook signature verification failed:', error.message);
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
}

/**
 * Handle payment_intent.succeeded event
 * Triggered when a payment is successfully completed
 *
 * @param paymentIntent - Stripe PaymentIntent object
 * @param prisma - Prisma client
 */
async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  prisma: PrismaClient
): Promise<void> {
  console.log(`Payment succeeded: ${paymentIntent.id}`);

  try {
    await updateKitOrderFromPayment(paymentIntent.id, 'paid', prisma);
    console.log(`✓ Kit order marked as paid for payment: ${paymentIntent.id}`);

    // Send payment receipt email (non-blocking)
    const kitOrderWithUser = await prisma.kitOrder.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: { user: true },
    });

    if (kitOrderWithUser) {
      sendPaymentReceiptEmail(kitOrderWithUser).catch((err) => {
        console.error('Failed to send payment receipt email:', err);
      });
    }
  } catch (error) {
    console.error(`Failed to update kit order:`, error);
    // Don't throw - webhook should still return 200 to prevent retries
  }
}

/**
 * Handle payment_intent.payment_failed event
 * Triggered when a payment attempt fails
 *
 * @param paymentIntent - Stripe PaymentIntent object
 * @param prisma - Prisma client
 */
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  prisma: PrismaClient
): Promise<void> {
  console.log(`Payment failed: ${paymentIntent.id}`);

  try {
    await updateKitOrderFromPayment(paymentIntent.id, 'failed', prisma);
    console.log(`✓ Kit order marked as failed for payment: ${paymentIntent.id}`);

    // Send payment failed email (non-blocking)
    const kitOrderWithUser = await prisma.kitOrder.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: { user: true },
    });

    if (kitOrderWithUser) {
      const failureMessage = paymentIntent.last_payment_error?.message;
      sendPaymentFailedEmail(kitOrderWithUser, failureMessage).catch((err) => {
        console.error('Failed to send payment failed email:', err);
      });
    }
  } catch (error) {
    console.error(`Failed to update kit order:`, error);
  }
}

/**
 * Handle charge.refunded event
 * Triggered when a charge is refunded (full or partial)
 *
 * @param charge - Stripe Charge object
 * @param prisma - Prisma client
 */
async function handleChargeRefunded(
  charge: Stripe.Charge,
  prisma: PrismaClient
): Promise<void> {
  console.log(`Charge refunded: ${charge.id}`);

  if (!charge.payment_intent) {
    console.warn('Charge has no payment_intent, skipping order update');
    return;
  }

  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent.id;

  try {
    await updateKitOrderFromPayment(paymentIntentId, 'refunded', prisma);
    console.log(
      `✓ Kit order marked as refunded for payment: ${paymentIntentId}`
    );

    // Send refund email (non-blocking)
    const kitOrderWithUser = await prisma.kitOrder.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      include: { user: true },
    });

    if (kitOrderWithUser && charge.amount_refunded) {
      const refundAmountCad = charge.amount_refunded / 100; // Convert cents to CAD
      const refundReason =
        charge.refunds?.data[0]?.reason || 'requested_by_customer';
      sendRefundProcessedEmail(
        kitOrderWithUser,
        refundAmountCad,
        refundReason
      ).catch((err) => {
        console.error('Failed to send refund email:', err);
      });
    }
  } catch (error) {
    console.error(`Failed to update kit order:`, error);
  }
}

/**
 * Handle payment_intent.canceled event
 * Triggered when a payment intent is canceled
 *
 * @param paymentIntent - Stripe PaymentIntent object
 * @param prisma - Prisma client
 */
async function handlePaymentCanceled(
  paymentIntent: Stripe.PaymentIntent,
  _prisma: PrismaClient
): Promise<void> {
  console.log(`Payment canceled: ${paymentIntent.id}`);

  // Optionally update kit order to 'cancelled' status
  // For now, we'll just log it
  console.log(`Payment intent ${paymentIntent.id} was canceled`);
}

/**
 * Main webhook event handler
 * Routes events to appropriate handler functions
 *
 * @param event - Verified Stripe Event
 * @param prisma - Prisma client
 */
export async function handleStripeWebhook(
  event: Stripe.Event,
  prisma: PrismaClient
): Promise<void> {
  console.log(`Processing webhook event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(
          event.data.object as Stripe.PaymentIntent,
          prisma
        );
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(
          event.data.object as Stripe.PaymentIntent,
          prisma
        );
        break;

      case 'payment_intent.canceled':
        await handlePaymentCanceled(
          event.data.object as Stripe.PaymentIntent,
          prisma
        );
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge, prisma);
        break;

      // Add more event types as needed
      case 'payment_intent.created':
      case 'payment_intent.processing':
        // Log but don't process (informational events)
        console.log(`Informational event: ${event.type}`);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    console.log(`✓ Webhook event processed: ${event.type}`);
  } catch (error) {
    console.error(`Error processing webhook event ${event.type}:`, error);
    // Don't throw - return 200 to prevent Stripe from retrying
  }
}
