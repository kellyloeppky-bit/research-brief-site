import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { prisma, disconnectPrisma } from '../lib/database/client.js';

/**
 * Database plugin - registers Prisma client as Fastify decorator
 */
const databasePlugin: FastifyPluginAsync = async (fastify) => {
  // Decorate Fastify instance with Prisma client
  fastify.decorate('prisma', prisma);

  // Test connection on startup
  try {
    await prisma.$connect();
    fastify.log.info('✓ Database connection established');
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to connect to database');
    throw error;
  }

  // Cleanup on shutdown
  fastify.addHook('onClose', async (instance) => {
    instance.log.info('Disconnecting from database...');
    await disconnectPrisma();
  });
};

export default fp(databasePlugin, {
  name: 'database',
});
