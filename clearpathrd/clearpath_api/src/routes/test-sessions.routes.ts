/**
 * Test Sessions Routes
 *
 * TestSession API with state machine and timeline management.
 */

import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { authenticate } from '../middleware/authenticate.js';
import { requireHomeOwnership } from '../middleware/require-home-ownership.js';
import {
  createTestSessionSchema,
  updateTestSessionSchema,
  retrieveTestSessionSchema,
  mailTestSessionSchema,
  listTestSessionsQuerySchema,
  getTestSessionParamsSchema,
  updateTestSessionParamsSchema,
  actionTestSessionParamsSchema,
  type CreateTestSessionInput,
  type UpdateTestSessionInput,
  type RetrieveTestSessionInput,
  type MailTestSessionInput,
  type ListTestSessionsQuery,
  type GetTestSessionParams,
  type UpdateTestSessionParams,
  type ActionTestSessionParams,
} from '../schemas/test-sessions.schemas.js';
import {
  calculateExpectedCompletionDate,
  calculateRetrievalDueAt,
  type KitType,
} from '../services/test-session-timeline.service.js';
import {
  validateStatusTransition,
  executeTransition,
  type SessionStatus,
} from '../services/test-session-state.service.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../lib/errors/http-errors.js';
import { sendTestActivatedEmail } from '../services/email-notification.service.js';
import type { UserContext } from '../types/auth.types.js';
import { isAdmin } from '../lib/auth/rbac.js';

const testSessionsRoutes: FastifyPluginAsync = async (server) => {
  const serverWithTypes = server.withTypeProvider<ZodTypeProvider>();
  /**
   * POST /test-sessions
   * Activate a kit (create test session in 'active' state)
   * Auth: Required (home owner)
   */
  serverWithTypes.post(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        body: createTestSessionSchema,
      },
    },
    async (request, reply) => {
      const user = request.user as UserContext;
      const body = request.body as CreateTestSessionInput;

      // Verify homeId exists
      const home = await server.prisma.home.findUnique({
        where: { id: body.homeId },
      });

      if (!home) {
        throw new NotFoundError('Home not found');
      }

      // Verify home belongs to user (unless admin)
      if (home.userId !== user.id && !isAdmin(user)) {
        throw new BadRequestError('Home does not belong to you');
      }

      // Verify kitOrderId exists and belongs to same user
      const kitOrder = await server.prisma.kitOrder.findUnique({
        where: { id: body.kitOrderId },
      });

      if (!kitOrder) {
        throw new NotFoundError('Kit order not found');
      }

      if (kitOrder.userId !== user.id && !isAdmin(user)) {
        throw new BadRequestError('Kit order does not belong to you');
      }

      // Verify kitOrderId.homeId matches session.homeId (data integrity)
      if (kitOrder.homeId !== body.homeId) {
        throw new BadRequestError(
          'Kit order home does not match test session home'
        );
      }

      // Verify kitSerialNumber is unique
      const existingSession = await server.prisma.testSession.findUnique({
        where: { kitSerialNumber: body.kitSerialNumber },
      });

      if (existingSession) {
        throw new ConflictError('Kit serial number already in use');
      }

      // Verify kitType matches productSku
      const kitTypeMap: Record<string, KitType> = {
        standard_long: 'long_term',
        real_estate_short: 'real_estate_short',
        twin_pack: 'long_term', // Twin pack uses long_term timeline
      };

      const expectedKitType = kitTypeMap[kitOrder.productSku];
      if (body.kitType !== expectedKitType) {
        throw new BadRequestError(
          `Kit type '${body.kitType}' does not match product SKU '${kitOrder.productSku}'`
        );
      }

      // Create session in 'active' state with timeline calculations
      const activatedAt = new Date();
      const kitType = body.kitType as KitType;

      const testSession = await server.prisma.testSession.create({
        data: {
          ...body,
          status: 'active',
          activatedAt,
          expectedCompletionDate: calculateExpectedCompletionDate(
            kitType,
            activatedAt
          ),
          retrievalDueAt: calculateRetrievalDueAt(kitType, activatedAt),
        },
      });

      // Send activation email (non-blocking)
      const testSessionWithHome = await server.prisma.testSession.findUnique({
        where: { id: testSession.id },
        include: { home: true },
      });

      if (testSessionWithHome) {
        const user = await server.prisma.user.findUnique({
          where: { id: testSessionWithHome.home.userId },
        });

        if (user) {
          sendTestActivatedEmail(testSessionWithHome, user.email).catch(
            (err) => {
              server.log.error({ err }, 'Failed to send activation email');
            }
          );
        }
      }

      return reply.status(201).success(testSession);
    }
  );

  /**
   * GET /test-sessions
   * List test sessions with pagination and filters
   * Auth: Required (self or admin)
   */
  serverWithTypes.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        querystring: listTestSessionsQuerySchema,
      },
    },
    async (request, reply) => {
      const user = request.user as UserContext;
      const query = request.query as ListTestSessionsQuery;

      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Record<string, unknown> = {};

      // Filter by user unless admin
      if (!isAdmin(user)) {
        where.home = {
          userId: user.id,
        };
      }

      // Apply filters
      if (query.homeId) {
        where.homeId = query.homeId;
      }

      if (query.kitOrderId) {
        where.kitOrderId = query.kitOrderId;
      }

      if (query.status) {
        where.status = query.status;
      }

      // Get total count and data
      const [total, testSessions] = await Promise.all([
        server.prisma.testSession.count({ where }),
        server.prisma.testSession.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return reply.success(testSessions, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    }
  );

  /**
   * GET /test-sessions/:id
   * Get a specific test session
   * Auth: Required (home owner or admin)
   */
  serverWithTypes.get(
    '/:id',
    {
      preHandler: [
        authenticate,
        requireHomeOwnership('test session', async (req) => {
          const { id } = req.params as GetTestSessionParams;
          return server.prisma.testSession.findUnique({
            where: { id },
            include: { home: true }, // CRITICAL: Must include home
          });
        }),
      ],
      schema: {
        params: getTestSessionParamsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as GetTestSessionParams;

      const testSession = await server.prisma.testSession.findUnique({
        where: { id },
      });

      if (!testSession) {
        throw new NotFoundError('Test session not found');
      }

      return reply.success(testSession);
    }
  );

  /**
   * PUT /test-sessions/:id
   * Update test session status (validated via state machine)
   * Auth: Required (home owner or admin)
   */
  serverWithTypes.put(
    '/:id',
    {
      preHandler: [
        authenticate,
        requireHomeOwnership('test session', async (req) => {
          const { id } = req.params as UpdateTestSessionParams;
          return server.prisma.testSession.findUnique({
            where: { id },
            include: { home: true },
          });
        }),
      ],
      schema: {
        params: updateTestSessionParamsSchema,
        body: updateTestSessionSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as UpdateTestSessionParams;
      const body = request.body as UpdateTestSessionInput;

      // Get existing session
      const session = await server.prisma.testSession.findUnique({
        where: { id },
      });

      if (!session) {
        throw new NotFoundError('Test session not found');
      }

      // Validate status transition if status is being updated
      if (body.status) {
        validateStatusTransition(
          session.status as SessionStatus,
          body.status as SessionStatus
        );

        // Execute transition (handles side effects)
        await executeTransition(id, body.status as SessionStatus, server.prisma);
      }

      // Update other fields if provided
      const updateData: Record<string, unknown> = {};
      if (body.retrievedAt !== undefined) {
        updateData.retrievedAt = body.retrievedAt;
      }
      if (body.mailedAt !== undefined) {
        updateData.mailedAt = body.mailedAt;
      }

      // Apply additional updates if any
      if (Object.keys(updateData).length > 0) {
        await server.prisma.testSession.update({
          where: { id },
          data: updateData,
        });
      }

      // Return updated session
      const updated = await server.prisma.testSession.findUnique({
        where: { id },
      });

      return reply.success(updated);
    }
  );

  /**
   * PATCH /test-sessions/:id/retrieve
   * Mark kit as retrieved (sets retrievedAt)
   * Auth: Required (home owner or admin)
   */
  serverWithTypes.patch(
    '/:id/retrieve',
    {
      preHandler: [
        authenticate,
        requireHomeOwnership('test session', async (req) => {
          const { id } = req.params as ActionTestSessionParams;
          return server.prisma.testSession.findUnique({
            where: { id },
            include: { home: true },
          });
        }),
      ],
      schema: {
        params: actionTestSessionParamsSchema,
        body: retrieveTestSessionSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as ActionTestSessionParams;
      const body = request.body as RetrieveTestSessionInput;

      const session = await server.prisma.testSession.findUnique({
        where: { id },
      });

      if (!session) {
        throw new NotFoundError('Test session not found');
      }

      // Mark as retrieved
      const retrievedAt = body.retrievedAt || new Date();

      const updated = await server.prisma.testSession.update({
        where: { id },
        data: { retrievedAt },
      });

      return reply.success(updated);
    }
  );

  /**
   * PATCH /test-sessions/:id/mail
   * Mark kit as mailed (transitions to 'mailed' status)
   * Auth: Required (home owner or admin)
   */
  serverWithTypes.patch(
    '/:id/mail',
    {
      preHandler: [
        authenticate,
        requireHomeOwnership('test session', async (req) => {
          const { id } = req.params as ActionTestSessionParams;
          return server.prisma.testSession.findUnique({
            where: { id },
            include: { home: true },
          });
        }),
      ],
      schema: {
        params: actionTestSessionParamsSchema,
        body: mailTestSessionSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as ActionTestSessionParams;
      const body = request.body as MailTestSessionInput;

      const session = await server.prisma.testSession.findUnique({
        where: { id },
      });

      if (!session) {
        throw new NotFoundError('Test session not found');
      }

      // Validate current status allows mailing
      const allowedStatuses: SessionStatus[] = ['active', 'retrieval_due'];
      if (!allowedStatuses.includes(session.status as SessionStatus)) {
        throw new ConflictError(
          `Cannot mail kit in '${session.status}' status. Kit must be in 'active' or 'retrieval_due' status.`
        );
      }

      // Mark as mailed and transition to 'mailed' status
      const mailedAt = body.mailedAt || new Date();

      const updated = await server.prisma.testSession.update({
        where: { id },
        data: {
          status: 'mailed',
          mailedAt,
        },
      });

      return reply.success(updated);
    }
  );

  /**
   * PATCH /test-sessions/:id/cancel
   * Cancel test session
   * Auth: Required (home owner or admin)
   */
  serverWithTypes.patch(
    '/:id/cancel',
    {
      preHandler: [
        authenticate,
        requireHomeOwnership('test session', async (req) => {
          const { id } = req.params as ActionTestSessionParams;
          return server.prisma.testSession.findUnique({
            where: { id },
            include: { home: true },
          });
        }),
      ],
      schema: {
        params: actionTestSessionParamsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as ActionTestSessionParams;

      const session = await server.prisma.testSession.findUnique({
        where: { id },
      });

      if (!session) {
        throw new NotFoundError('Test session not found');
      }

      // Validate transition to cancelled
      validateStatusTransition(
        session.status as SessionStatus,
        'cancelled'
      );

      // Execute transition
      await executeTransition(id, 'cancelled', server.prisma);

      // Return updated session
      const updated = await server.prisma.testSession.findUnique({
        where: { id },
      });

      return reply.success(updated);
    }
  );
};

export default testSessionsRoutes;
