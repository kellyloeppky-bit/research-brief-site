import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { Prisma } from '@prisma/client';
import {
  createUserSchema,
  updateUserSchema,
  getUserParamsSchema,
  listUsersQuerySchema,
  deleteUserParamsSchema,
} from '../schemas/users.schemas.js';
import { toUserDTO } from '../services/user-transform.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAuth } from '../middleware/authorize.js';
import { requireSelfOrAdmin } from '../middleware/require-ownership.js';
import {
  ConflictError,
  NotFoundError,
} from '../lib/errors/http-errors.js';
import { UserContext } from '../types/auth.types.js';

const usersRoutes: FastifyPluginAsync = async (server) => {
  const serverWithTypes = server.withTypeProvider<ZodTypeProvider>();

  /**
   * POST /users
   * User registration (public endpoint)
   */
  serverWithTypes.post(
    '/',
    {
      schema: {
        body: createUserSchema,
        description: 'Register a new user',
        tags: ['users'],
      },
    },
    async (request, reply) => {
      const userData = request.body;

      // Check if email already exists
      const existingUser = await server.prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      // Create user (passwordHash managed by Supabase Auth)
      const newUser = await server.prisma.user.create({
        data: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          marketingConsent: userData.marketingConsent,
          role: 'user', // Default role
        },
      });

      return reply.status(201).send({
        success: true,
        data: toUserDTO(newUser),
        meta: { timestamp: new Date().toISOString() },
      });
    }
  );

  /**
   * GET /users/me
   * Get current authenticated user
   */
  serverWithTypes.get(
    '/me',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get current user profile',
        tags: ['users'],
      },
    },
    async (request, reply) => {
      const user = request.user as UserContext;

      const dbUser = await server.prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!dbUser) {
        throw new NotFoundError('User not found');
      }

      return reply.success(toUserDTO(dbUser));
    }
  );

  /**
   * GET /users/:id
   * Get specific user (self or admin)
   */
  serverWithTypes.get(
    '/:id',
    {
      preHandler: [authenticate, requireSelfOrAdmin()],
      schema: {
        params: getUserParamsSchema,
        description: 'Get user by ID (self or admin only)',
        tags: ['users'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const user = await server.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return reply.success(toUserDTO(user));
    }
  );

  /**
   * PUT /users/:id
   * Update user (self or admin)
   */
  serverWithTypes.put(
    '/:id',
    {
      preHandler: [authenticate, requireSelfOrAdmin()],
      schema: {
        params: getUserParamsSchema,
        body: updateUserSchema,
        description: 'Update user profile (self or admin only)',
        tags: ['users'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updateData = request.body;

      // Check if user exists
      const existingUser = await server.prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // If updating email, check for conflicts
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailConflict = await server.prisma.user.findUnique({
          where: { email: updateData.email },
        });

        if (emailConflict) {
          throw new ConflictError('Email already in use');
        }
      }

      // Update user
      const updatedUser = await server.prisma.user.update({
        where: { id },
        data: updateData,
      });

      return reply.success(toUserDTO(updatedUser));
    }
  );

  /**
   * DELETE /users/:id
   * Delete user (admin only)
   */
  serverWithTypes.delete(
    '/:id',
    {
      preHandler: [authenticate, requireAuth('admin')],
      schema: {
        params: deleteUserParamsSchema,
        description: 'Delete user (admin only)',
        tags: ['users'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Check if user exists
      const user = await server.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Delete user
      await server.prisma.user.delete({
        where: { id },
      });

      return reply.status(204).send();
    }
  );

  /**
   * GET /users
   * List all users (admin only, paginated)
   */
  serverWithTypes.get(
    '/',
    {
      preHandler: [authenticate, requireAuth('admin')],
      schema: {
        querystring: listUsersQuerySchema,
        description: 'List all users with pagination (admin only)',
        tags: ['users'],
      },
    },
    async (request, reply) => {
      const { page, limit, role, search } = request.query;

      // Build filter conditions
      const where: Prisma.UserWhereInput = {};

      if (role) {
        where.role = role;
      }

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get total count for pagination
      const total = await server.prisma.user.count({ where });

      // Get paginated users
      const users = await server.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        success: true,
        data: users.map(toUserDTO),
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
};

export default usersRoutes;
