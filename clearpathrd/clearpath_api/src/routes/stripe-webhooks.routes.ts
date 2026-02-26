/**
 * Stripe Webhooks Routes
 *
 * Handles incoming Stripe webhook events.
 * No authentication required - verified by Stripe signature.
 */

import { FastifyPluginAsync } from 'fastify';
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  verifyWebhookSignature,
  handleStripeWebhook,
} from '../services/stripe-webhook.service.js';
import { BadRequestError } from '../lib/errors/http-errors.js';

const stripeWebhooksRoutes: FastifyPluginAsync = async (server) => {
  /**
   * POST /stripe/webhook
   * Stripe webhook handler
   *
   * No authentication required - security via signature verification
   */
  server.post(
    '/webhook',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Get Stripe signature from headers
      const signature = request.headers['stripe-signature'];

      if (!signature || typeof signature !== 'string') {
        throw new BadRequestError('Missing Stripe signature header');
      }

      // Get raw body for signature verification
      const payload = request.rawBody;

      if (!payload) {
        throw new BadRequestError('Missing request body');
      }

      // Verify webhook signature and construct event
      let event;
      try {
        event = verifyWebhookSignature(payload, signature);
      } catch (err) {
        const error = err as Error;
        server.log.error(
          { err: error },
          'Webhook signature verification failed'
        );
        throw new BadRequestError(
          `Webhook signature verification failed: ${error.message}`
        );
      }

      // Log webhook event
      server.log.info(
        `Received webhook event: ${event.type} (${event.id})`
      );

      // Handle webhook event (async, but don't wait)
      // We respond with 200 immediately to acknowledge receipt
      handleStripeWebhook(event, server.prisma).catch((error) => {
        server.log.error('Error handling webhook event:', error);
      });

      // Acknowledge receipt immediately
      return reply.send({ received: true });
    }
  );

  /**
   * GET /stripe/config
   * Get Stripe publishable key for frontend
   * No authentication required - publishable key is safe to expose
   */
  server.get('/config', async (_request: FastifyRequest, reply: FastifyReply) => {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';

    if (!publishableKey) {
      throw new BadRequestError('Stripe not configured');
    }

    return reply.send({
      publishableKey,
    });
  });
};

export default stripeWebhooksRoutes;
