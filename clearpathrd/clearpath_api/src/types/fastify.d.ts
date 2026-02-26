import { PrismaClient } from '@prisma/client';
import { UserContext } from './auth.types.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }

  interface FastifyRequest {
    user?: UserContext;
  }

  interface FastifyReply {
    success<T>(data: T, meta?: Record<string, unknown>): FastifyReply;
    paginated<T>(
      data: T,
      pagination: { page: number; limit: number; total: number }
    ): FastifyReply;
  }
}
