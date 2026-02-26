/**
 * Kit Orders Routes
 *
 * Minimal KitOrder API to satisfy foreign key dependencies for TestSessions.
 * Stripe integration deferred to Phase 6.
 */

import { z } from 'zod';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { authenticate } from '../middleware/authenticate.js';
import { requireAuth } from '../middleware/authorize.js';
import { requireOwnership } from '../middleware/require-ownership.js';
import {
  createPaymentIntent,
  getPaymentIntent,
  createRefund,
} from '../services/payment.service.js';
import { isStripeConfigured } from '../lib/stripe/stripe-client.js';
import { sendKitOrderConfirmationEmail } from '../services/email-notification.service.js';
import {
  createKitOrderSchema,
  updateKitOrderSchema,
  listKitOrdersQuerySchema,
  getKitOrderParamsSchema,
  deleteKitOrderParamsSchema,
  type CreateKitOrderInput,
  type UpdateKitOrderInput,
  type ListKitOrdersQuery,
  type GetKitOrderParams,
  type DeleteKitOrderParams,
} from '../schemas/kit-orders.schemas.js';
import { NotFoundError, BadRequestError } from '../lib/errors/http-errors.js';
import type { UserContext } from '../types/auth.types.js';
import { isAdmin } from '../lib/auth/rbac.js';

const kitOrdersRoutes: FastifyPluginAsync = async (server) => {
  const serverWithTypes = server.withTypeProvider<ZodTypeProvider>();
  /**
   * POST /kit-orders
   * Create a new kit order
   * Auth: Required (self)
   */
  serverWithTypes.post(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        body: createKitOrderSchema,
      },
    },
    async (request, reply) => {
      const user = request.user as UserContext;
      const body = request.body as CreateKitOrderInput;

      // Verify homeId exists and belongs to user
      const home = await server.prisma.home.findUnique({
        where: { id: body.homeId },
      });

      if (!home) {
        throw new NotFoundError('Home not found');
      }

      if (home.userId !== user.id && !isAdmin(user)) {
        throw new BadRequestError('Home does not belong to you');
      }

      // Verify quantity is valid
      if (body.quantity < 1 || body.quantity > 10) {
        throw new BadRequestError('Quantity must be between 1 and 10');
      }

      // Verify pricing calculation
      const calculatedTotal = body.subtotalCad + body.taxCad;
      if (Math.abs(calculatedTotal - body.totalCad) > 0.01) {
        throw new BadRequestError(
          'Total must equal subtotal + tax'
        );
      }

      // Verify referral code exists if provided
      if (body.referralCodeId) {
        const referralCode = await server.prisma.referralCode.findUnique({
          where: { id: body.referralCodeId },
        });

        if (!referralCode) {
          throw new NotFoundError('Referral code not found');
        }
      }

      // Create kit order with 'pending' status
      const kitOrder = await server.prisma.kitOrder.create({
        data: {
          ...body,
          userId: user.id,
          paymentStatus: 'pending',
        },
      });

      // Create Stripe PaymentIntent if Stripe is configured
      let clientSecret: string | null = null;

      if (isStripeConfigured()) {
        try {
          const paymentIntent = await createPaymentIntent(
            kitOrder.id,
            body.productSku,
            body.quantity,
            {
              userId: user.id,
              homeId: body.homeId,
              userEmail: user.email,
            }
          );

          // Update kit order with Stripe payment intent ID
          await server.prisma.kitOrder.update({
            where: { id: kitOrder.id },
            data: {
              stripePaymentIntentId: paymentIntent.id,
            },
          });

          clientSecret = paymentIntent.client_secret;

          server.log.info(
            `Created PaymentIntent ${paymentIntent.id} for kit order ${kitOrder.id}`
          );
        } catch (error) {
          server.log.error(
            { err: error },
            'Failed to create Stripe PaymentIntent'
          );
          // Continue without Stripe - order still created
        }
      } else {
        server.log.warn('Stripe not configured - order created without payment');
      }

      // Send order confirmation email (non-blocking)
      const kitOrderWithUser = await server.prisma.kitOrder.findUnique({
        where: { id: kitOrder.id },
        include: { user: true },
      });

      if (kitOrderWithUser) {
        sendKitOrderConfirmationEmail(kitOrderWithUser).catch((err) => {
          server.log.error({ err }, 'Failed to send order confirmation email');
        });
      }

      // Return kit order with client secret for frontend
      return reply.status(201).success({
        kitOrder,
        clientSecret,
      });
    }
  );

  /**
   * GET /kit-orders
   * List kit orders with pagination and filters
   * Auth: Required (self or admin)
   */
  serverWithTypes.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        querystring: listKitOrdersQuerySchema,
      },
    },
    async (request, reply) => {
      const user = request.user as UserContext;
      const query = request.query as ListKitOrdersQuery;

      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Record<string, unknown> = {};

      // Filter by user unless admin
      if (!isAdmin(user)) {
        where.userId = user.id;
      }

      // Apply filters
      if (query.homeId) {
        where.homeId = query.homeId;
      }

      if (query.paymentStatus) {
        where.paymentStatus = query.paymentStatus;
      }

      // Get total count and data
      const [total, kitOrders] = await Promise.all([
        server.prisma.kitOrder.count({ where }),
        server.prisma.kitOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return reply.success(kitOrders, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    }
  );

  /**
   * GET /kit-orders/:id
   * Get a specific kit order
   * Auth: Required (owner or admin)
   */
  serverWithTypes.get(
    '/:id',
    {
      preHandler: [
        authenticate,
        requireOwnership('kit order', async (req) => {
          const { id } = req.params as GetKitOrderParams;
          return server.prisma.kitOrder.findUnique({
            where: { id },
          });
        }),
      ],
      schema: {
        params: getKitOrderParamsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as GetKitOrderParams;

      const kitOrder = await server.prisma.kitOrder.findUnique({
        where: { id },
      });

      if (!kitOrder) {
        throw new NotFoundError('Kit order not found');
      }

      return reply.success(kitOrder);
    }
  );

  /**
   * PUT /kit-orders/:id
   * Update a kit order (admin only)
   * Auth: Required (admin)
   */
  serverWithTypes.put(
    '/:id',
    {
      preHandler: [authenticate, requireAuth('admin')],
      schema: {
        params: getKitOrderParamsSchema,
        body: updateKitOrderSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as GetKitOrderParams;
      const body = request.body as UpdateKitOrderInput;

      // Verify kit order exists
      const existingKitOrder = await server.prisma.kitOrder.findUnique({
        where: { id },
      });

      if (!existingKitOrder) {
        throw new NotFoundError('Kit order not found');
      }

      // Update kit order
      const kitOrder = await server.prisma.kitOrder.update({
        where: { id },
        data: body,
      });

      return reply.success(kitOrder);
    }
  );

  /**
   * DELETE /kit-orders/:id
   * Delete a kit order (admin only)
   * Auth: Required (admin)
   */
  serverWithTypes.delete(
    '/:id',
    {
      preHandler: [authenticate, requireAuth('admin')],
      schema: {
        params: deleteKitOrderParamsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as DeleteKitOrderParams;

      // Verify kit order exists
      const existingKitOrder = await server.prisma.kitOrder.findUnique({
        where: { id },
      });

      if (!existingKitOrder) {
        throw new NotFoundError('Kit order not found');
      }

      // Delete kit order
      await server.prisma.kitOrder.delete({
        where: { id },
      });

      return reply.success({ message: 'Kit order deleted successfully' });
    }
  );

  /**
   * GET /kit-orders/:id/payment-status
   * Get payment status for kit order
   * Auth: Required (owner or admin)
   */
  serverWithTypes.get(
    '/:id/payment-status',
    {
      preHandler: [
        authenticate,
        requireOwnership('kit order', async (req) => {
          const { id } = req.params as { id: string };
          return server.prisma.kitOrder.findUnique({ where: { id } });
        }),
      ],
      schema: {
        params: getKitOrderParamsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as GetKitOrderParams;

      const kitOrder = await server.prisma.kitOrder.findUnique({
        where: { id },
      });

      if (!kitOrder) {
        throw new NotFoundError('Kit order not found');
      }

      // Get latest payment intent status from Stripe
      let paymentDetails = null;

      if (kitOrder.stripePaymentIntentId && isStripeConfigured()) {
        try {
          const paymentIntent = await getPaymentIntent(
            kitOrder.stripePaymentIntentId
          );

          paymentDetails = {
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            created: paymentIntent.created,
          };
        } catch (error) {
          server.log.error(
            { err: error },
            'Failed to fetch payment intent from Stripe'
          );
        }
      }

      return reply.success({
        kitOrderId: kitOrder.id,
        paymentStatus: kitOrder.paymentStatus,
        paidAt: kitOrder.paidAt,
        paymentDetails,
      });
    }
  );

  /**
   * POST /kit-orders/:id/refund
   * Refund a kit order (admin only)
   * Auth: Required (admin)
   */
  serverWithTypes.post(
    '/:id/refund',
    {
      preHandler: [authenticate, requireAuth('admin')],
      schema: {
        params: getKitOrderParamsSchema,
        body: z.object({
          amount: z.number().positive().optional(),
          reason: z
            .enum(['duplicate', 'fraudulent', 'requested_by_customer'])
            .optional(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as GetKitOrderParams;
      const body = request.body as {
        amount?: number;
        reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
      };

      const kitOrder = await server.prisma.kitOrder.findUnique({
        where: { id },
      });

      if (!kitOrder) {
        throw new NotFoundError('Kit order not found');
      }

      if (!kitOrder.stripePaymentIntentId) {
        throw new BadRequestError('No payment intent found for this order');
      }

      if (kitOrder.paymentStatus !== 'paid') {
        throw new BadRequestError(
          'Can only refund paid orders. Current status: ' +
            kitOrder.paymentStatus
        );
      }

      if (!isStripeConfigured()) {
        throw new BadRequestError('Stripe not configured');
      }

      // Create refund in Stripe
      const refund = await createRefund(
        kitOrder.stripePaymentIntentId,
        body.amount,
        body.reason
      );

      // Update kit order status
      await server.prisma.kitOrder.update({
        where: { id },
        data: {
          paymentStatus: 'refunded',
        },
      });

      server.log.info(
        `Refund created: ${refund.id} for kit order ${kitOrder.id}`
      );

      return reply.success({
        refund: {
          id: refund.id,
          amount: refund.amount,
          status: refund.status,
          reason: refund.reason,
          created: refund.created,
        },
      });
    }
  );
};

export default kitOrdersRoutes;
