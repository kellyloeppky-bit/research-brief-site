import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { Prisma } from '@prisma/client';
import {
  createHomeSchema,
  updateHomeSchema,
  getHomeParamsSchema,
  listHomesQuerySchema,
  deleteHomeParamsSchema,
} from '../schemas/homes.schemas.js';
import {
  extractFSA,
  resolveRadonZoneFromPostalCode,
} from '../services/radon-zone.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireOwnership } from '../middleware/require-ownership.js';
import { NotFoundError } from '../lib/errors/http-errors.js';
import { UserContext } from '../types/auth.types.js';
import { isAdmin } from '../lib/auth/rbac.js';

const homesRoutes: FastifyPluginAsync = async (server) => {
  const serverWithTypes = server.withTypeProvider<ZodTypeProvider>();

  /**
   * POST /homes
   * Create new home with automatic radon zone lookup
   */
  serverWithTypes.post(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        body: createHomeSchema,
        description: 'Create a new home with automatic radon zone lookup',
        tags: ['homes'],
      },
    },
    async (request, reply) => {
      const user = request.user as UserContext;
      const homeData = request.body;

      // Resolve radon zone from postal code
      const { radonZone, regionalPrevalencePct } =
        await resolveRadonZoneFromPostalCode(homeData.postalCode, server.prisma);

      // Extract FSA from postal code
      const fsa = extractFSA(homeData.postalCode);

      // Create home
      const newHome = await server.prisma.home.create({
        data: {
          userId: user.id,
          nickname: homeData.nickname,
          addressLine1: homeData.addressLine1,
          addressLine2: homeData.addressLine2,
          city: homeData.city,
          province: homeData.province,
          postalCode: homeData.postalCode,
          fsa,
          ageRange: homeData.ageRange,
          foundationType: homeData.foundationType,
          basementOccupancy: homeData.basementOccupancy,
          roughinPresent: homeData.roughinPresent,
          radonZone,
          regionalPrevalencePct,
        },
      });

      return reply.status(201).send({
        success: true,
        data: newHome,
        meta: { timestamp: new Date().toISOString() },
      });
    }
  );

  /**
   * GET /homes
   * List homes (user sees own homes, admin sees all)
   */
  serverWithTypes.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        querystring: listHomesQuerySchema,
        description: 'List homes (paginated)',
        tags: ['homes'],
      },
    },
    async (request, reply) => {
      const user = request.user as UserContext;
      const { page, limit } = request.query;

      // Build filter - admin sees all, users see only their own
      const where: Prisma.HomeWhereInput = isAdmin(user)
        ? {}
        : { userId: user.id };

      // Get total count
      const total = await server.prisma.home.count({ where });

      // Get paginated homes
      const homes = await server.prisma.home.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        success: true,
        data: homes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
        meta: { timestamp: new Date().toISOString() },
      });
    }
  );

  /**
   * GET /homes/:id
   * Get specific home (owner or admin)
   */
  serverWithTypes.get(
    '/:id',
    {
      preHandler: [
        authenticate,
        requireOwnership('home', async (req) => {
          const { id } = req.params as { id: string };
          return server.prisma.home.findUnique({ where: { id } });
        }),
      ],
      schema: {
        params: getHomeParamsSchema,
        description: 'Get home by ID (owner or admin)',
        tags: ['homes'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const home = await server.prisma.home.findUnique({
        where: { id },
      });

      if (!home) {
        throw new NotFoundError('Home not found');
      }

      return reply.success(home);
    }
  );

  /**
   * PUT /homes/:id
   * Update home (owner or admin)
   * Re-resolves radon zone if postal code changes
   */
  serverWithTypes.put(
    '/:id',
    {
      preHandler: [
        authenticate,
        requireOwnership('home', async (req) => {
          const { id } = req.params as { id: string };
          return server.prisma.home.findUnique({ where: { id } });
        }),
      ],
      schema: {
        params: getHomeParamsSchema,
        body: updateHomeSchema,
        description: 'Update home (owner or admin)',
        tags: ['homes'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updateData = request.body;

      // Check if home exists
      const existingHome = await server.prisma.home.findUnique({
        where: { id },
      });

      if (!existingHome) {
        throw new NotFoundError('Home not found');
      }

      // If postal code changed, re-resolve radon zone
      let radonData = {};
      if (updateData.postalCode && updateData.postalCode !== existingHome.postalCode) {
        const { radonZone, regionalPrevalencePct } =
          await resolveRadonZoneFromPostalCode(updateData.postalCode, server.prisma);
        const fsa = extractFSA(updateData.postalCode);

        radonData = {
          fsa,
          radonZone,
          regionalPrevalencePct,
        };
      }

      // Update home
      const updatedHome = await server.prisma.home.update({
        where: { id },
        data: {
          ...updateData,
          ...radonData,
        },
      });

      return reply.success(updatedHome);
    }
  );

  /**
   * DELETE /homes/:id
   * Delete home (owner or admin)
   */
  serverWithTypes.delete(
    '/:id',
    {
      preHandler: [
        authenticate,
        requireOwnership('home', async (req) => {
          const { id } = req.params as { id: string };
          return server.prisma.home.findUnique({ where: { id } });
        }),
      ],
      schema: {
        params: deleteHomeParamsSchema,
        description: 'Delete home (owner or admin)',
        tags: ['homes'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Check if home exists
      const home = await server.prisma.home.findUnique({
        where: { id },
      });

      if (!home) {
        throw new NotFoundError('Home not found');
      }

      // Delete home
      await server.prisma.home.delete({
        where: { id },
      });

      return reply.status(204).send();
    }
  );
};

export default homesRoutes;
