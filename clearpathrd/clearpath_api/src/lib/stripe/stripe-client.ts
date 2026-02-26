/**
 * Stripe Client Singleton
 *
 * Initializes and exports a configured Stripe client instance.
 */

import Stripe from 'stripe';
import { stripeConfig } from '../../config/stripe.config.js';

/**
 * Stripe client instance
 * Configured with secret key and API version
 * Only initialized if secret key is configured
 */
export const stripe = stripeConfig.secretKey
  ? new Stripe(stripeConfig.secretKey, {
      apiVersion: stripeConfig.apiVersion,
      typescript: true,
      appInfo: {
        name: 'ClearPath RD API',
        version: '1.0.0',
      },
    })
  : (null as unknown as Stripe); // Placeholder when not configured

/**
 * Check if Stripe is properly configured
 *
 * @returns True if both secret key and webhook secret are set
 */
export function isStripeConfigured(): boolean {
  return !!stripeConfig.secretKey && !!stripeConfig.webhookSecret;
}

/**
 * Get Stripe publishable key (safe to expose to client)
 *
 * @returns Stripe publishable key
 */
export function getPublishableKey(): string {
  return stripeConfig.publishableKey;
}
