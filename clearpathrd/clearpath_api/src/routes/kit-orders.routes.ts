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
        response: {
          201: z.object({
            success: z.boolean(),
            data: z.any(),
          }),
        },
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

      // Create kit order with default paymentStatus: 'paid' for testing
      const kitOrder = await server.prisma.kitOrder.create({
        data: {
          ...body,
          userId: user.id,
          paymentStatus: 'paid', // Default for testing
        },
      });

      return reply.status(201).success(kitOrder);
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
        response: {
          200: z.object({
            success: z.boolean(),
            data: z.array(z.any()),
            pagination: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
              totalPages: z.number(),
            }),
          }),
        },
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
        response: {
          200: z.object({
            success: z.boolean(),
            data: z.any(),
          }),
        },
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
        response: {
          200: z.object({
            success: z.boolean(),
            data: z.any(),
          }),
        },
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
        response: {
          200: z.object({
            success: z.boolean(),
            data: z.object({
              message: z.string(),
            }),
          }),
        },
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
};

export default kitOrdersRoutes;
