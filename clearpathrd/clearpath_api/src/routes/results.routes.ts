/**
 * Results Routes
 *
 * Result API for radon test results with risk calculation.
 * Admin-only creation, user can view their own results.
 */

import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { authenticate } from '../middleware/authenticate.js';
import { requireAuth } from '../middleware/authorize.js';
import { requireHomeOwnership } from '../middleware/require-home-ownership.js';
import {
  createResultSchema,
  updateResultSchema,
  listResultsQuerySchema,
  getResultParamsSchema,
  deleteResultParamsSchema,
  getResultBySessionParamsSchema,
  type CreateResultInput,
  type UpdateResultInput,
  type ListResultsQuery,
  type GetResultParams,
  type DeleteResultParams,
  type GetResultBySessionParams,
} from '../schemas/results.schemas.js';
import {
  calculateRiskZone,
  isValidRadonMeasurement,
} from '../services/radon-risk.service.js';
import { executeTransition } from '../services/test-session-state.service.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../lib/errors/http-errors.js';
import type { UserContext } from '../types/auth.types.js';
import { isAdmin } from '../lib/auth/rbac.js';

const resultsRoutes: FastifyPluginAsync = async (server) => {
  const serverWithTypes = server.withTypeProvider<ZodTypeProvider>();

  /**
   * POST /results
   * Create a new test result (admin only)
   * Auth: Required (admin)
   */
  serverWithTypes.post(
    '/',
    {
      preHandler: [authenticate, requireAuth('admin')],
      schema: {
        body: createResultSchema,
      },
    },
    async (request, reply) => {
      const user = request.user as UserContext;
      const body = request.body as CreateResultInput;

      // Validate radon measurement
      if (!isValidRadonMeasurement(body.valueBqm3)) {
        throw new BadRequestError(
          'Radon value must be between 0 and 10,000 Bq/m³'
        );
      }

      // Verify test session exists
      const testSession = await server.prisma.testSession.findUnique({
        where: { id: body.testSessionId },
      });

      if (!testSession) {
        throw new NotFoundError('Test session not found');
      }

      // Verify test session is in appropriate status
      const allowedStatuses = ['mailed', 'results_pending', 'complete'];
      if (!allowedStatuses.includes(testSession.status)) {
        throw new BadRequestError(
          `Test session must be in 'mailed', 'results_pending', or 'complete' status. Current status: ${testSession.status}`
        );
      }

      // Check if result already exists for this session (one-to-one)
      const existingResult = await server.prisma.result.findUnique({
        where: { testSessionId: body.testSessionId },
      });

      if (existingResult) {
        throw new ConflictError(
          'A result already exists for this test session'
        );
      }

      // Calculate risk zone automatically
      const zone = calculateRiskZone(body.valueBqm3);

      // Create result
      const result = await server.prisma.result.create({
        data: {
          testSessionId: body.testSessionId,
          valueBqm3: body.valueBqm3,
          zone,
          labReference: body.labReference,
          enteredByUserId: user.id,
          isImmutable: false,
          recordedAt: body.recordedAt,
        },
      });

      // Update test session status to 'complete' if not already
      if (testSession.status !== 'complete') {
        await executeTransition(
          body.testSessionId,
          'complete',
          server.prisma
        );
      }

      return reply.status(201).success(result);
    }
  );

  /**
   * GET /results
   * List results with pagination and filters
   * Auth: Required (self or admin)
   */
  serverWithTypes.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        querystring: listResultsQuerySchema,
      },
    },
    async (request, reply) => {
      const user = request.user as UserContext;
      const query = request.query as ListResultsQuery;

      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Record<string, unknown> = {};

      // Filter by user unless admin
      if (!isAdmin(user)) {
        where.testSession = {
          home: {
            userId: user.id,
          },
        };
      }

      // Apply filters
      if (query.homeId) {
        where.testSession = {
          ...(where.testSession as object),
          homeId: query.homeId,
        };
      }

      if (query.zone) {
        where.zone = query.zone;
      }

      if (query.minValue !== undefined || query.maxValue !== undefined) {
        where.valueBqm3 = {};
        if (query.minValue !== undefined) {
          (where.valueBqm3 as Record<string, unknown>).gte = query.minValue;
        }
        if (query.maxValue !== undefined) {
          (where.valueBqm3 as Record<string, unknown>).lte = query.maxValue;
        }
      }

      if (query.startDate || query.endDate) {
        where.recordedAt = {};
        if (query.startDate) {
          (where.recordedAt as Record<string, unknown>).gte = query.startDate;
        }
        if (query.endDate) {
          (where.recordedAt as Record<string, unknown>).lte = query.endDate;
        }
      }

      // Get total count and data
      const [total, results] = await Promise.all([
        server.prisma.result.count({ where }),
        server.prisma.result.findMany({
          where,
          skip,
          take: limit,
          orderBy: { recordedAt: 'desc' },
          include: {
            testSession: {
              select: {
                id: true,
                kitSerialNumber: true,
                homeId: true,
              },
            },
            certificate: {
              select: {
                id: true,
                certificateNumber: true,
                status: true,
              },
            },
          },
        }),
      ]);

      return reply.success(results, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    }
  );

  /**
   * GET /results/:id
   * Get a specific result
   * Auth: Required (home owner or admin)
   */
  serverWithTypes.get(
    '/:id',
    {
      preHandler: [
        authenticate,
        requireHomeOwnership('result', async (req) => {
          const { id } = req.params as GetResultParams;
          const result = await server.prisma.result.findUnique({
            where: { id },
            include: {
              testSession: {
                include: { home: true },
              },
            },
          });
          // Transform to match expected type (flatten home relationship)
          if (!result) return null;
          return {
            ...result,
            home: result.testSession.home,
          };
        }),
      ],
      schema: {
        params: getResultParamsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as GetResultParams;

      const result = await server.prisma.result.findUnique({
        where: { id },
        include: {
          testSession: {
            include: {
              home: true,
            },
          },
          certificate: true,
        },
      });

      if (!result) {
        throw new NotFoundError('Result not found');
      }

      return reply.success(result);
    }
  );

  /**
   * GET /results/by-session/:testSessionId
   * Get result by test session ID
   * Auth: Required (home owner or admin)
   */
  serverWithTypes.get(
    '/by-session/:testSessionId',
    {
      preHandler: [
        authenticate,
        requireHomeOwnership('result', async (req) => {
          const { testSessionId } = req.params as GetResultBySessionParams;
          const result = await server.prisma.result.findUnique({
            where: { testSessionId },
            include: {
              testSession: {
                include: { home: true },
              },
            },
          });
          // Transform to match expected type (flatten home relationship)
          if (!result) return null;
          return {
            ...result,
            home: result.testSession.home,
          };
        }),
      ],
      schema: {
        params: getResultBySessionParamsSchema,
      },
    },
    async (request, reply) => {
      const { testSessionId } = request.params as GetResultBySessionParams;

      const result = await server.prisma.result.findUnique({
        where: { testSessionId },
        include: {
          testSession: {
            include: {
              home: true,
            },
          },
          certificate: true,
        },
      });

      if (!result) {
        throw new NotFoundError('Result not found for this test session');
      }

      return reply.success(result);
    }
  );

  /**
   * PUT /results/:id
   * Update a result (admin only, only if not immutable)
   * Auth: Required (admin)
   */
  serverWithTypes.put(
    '/:id',
    {
      preHandler: [authenticate, requireAuth('admin')],
      schema: {
        params: getResultParamsSchema,
        body: updateResultSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as GetResultParams;
      const body = request.body as UpdateResultInput;

      // Verify result exists
      const existingResult = await server.prisma.result.findUnique({
        where: { id },
      });

      if (!existingResult) {
        throw new NotFoundError('Result not found');
      }

      // Check if result is immutable
      if (existingResult.isImmutable) {
        throw new ConflictError(
          'Cannot update result: A certificate has been generated for this result, making it immutable'
        );
      }

      // Validate new radon value if provided
      if (body.valueBqm3 !== undefined) {
        if (!isValidRadonMeasurement(body.valueBqm3)) {
          throw new BadRequestError(
            'Radon value must be between 0 and 10,000 Bq/m³'
          );
        }
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {};

      if (body.valueBqm3 !== undefined) {
        updateData.valueBqm3 = body.valueBqm3;
        // Recalculate zone if value changes
        updateData.zone = calculateRiskZone(body.valueBqm3);
      }

      if (body.labReference !== undefined) {
        updateData.labReference = body.labReference;
      }

      if (body.recordedAt !== undefined) {
        updateData.recordedAt = body.recordedAt;
      }

      // Update result
      const result = await server.prisma.result.update({
        where: { id },
        data: updateData,
      });

      return reply.success(result);
    }
  );

  /**
   * DELETE /results/:id
   * Delete a result (admin only, only if no certificate exists)
   * Auth: Required (admin)
   */
  serverWithTypes.delete(
    '/:id',
    {
      preHandler: [authenticate, requireAuth('admin')],
      schema: {
        params: deleteResultParamsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as DeleteResultParams;

      // Verify result exists
      const existingResult = await server.prisma.result.findUnique({
        where: { id },
        include: {
          certificate: true,
        },
      });

      if (!existingResult) {
        throw new NotFoundError('Result not found');
      }

      // Check if certificate exists
      if (existingResult.certificate) {
        throw new ConflictError(
          'Cannot delete result: A certificate exists for this result. Delete the certificate first.'
        );
      }

      // Delete result
      await server.prisma.result.delete({
        where: { id },
      });

      return reply.success({ message: 'Result deleted successfully' });
    }
  );
};

export default resultsRoutes;
