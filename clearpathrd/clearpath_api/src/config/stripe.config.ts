/**
 * Stripe Configuration
 *
 * Centralizes Stripe API configuration with validation.
 */

export const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  apiVersion: '2026-02-25.clover' as const, // Latest stable version
} as const;

// Validation on module load
if (!stripeConfig.secretKey) {
  console.warn('⚠️  STRIPE_SECRET_KEY not set - payment processing disabled');
}

if (!stripeConfig.publishableKey) {
  console.warn('⚠️  STRIPE_PUBLISHABLE_KEY not set - payment processing disabled');
}

if (!stripeConfig.webhookSecret) {
  console.warn('⚠️  STRIPE_WEBHOOK_SECRET not set - webhooks disabled');
}
