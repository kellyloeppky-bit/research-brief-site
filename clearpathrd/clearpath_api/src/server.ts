import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';

// Phase 2 plugins
import errorHandlerPlugin from './plugins/error-handler.plugin.js';
import databasePlugin from './plugins/database.plugin.js';
import authPlugin from './plugins/auth.plugin.js';
import responseFormatterPlugin from './plugins/response-formatter.plugin.js';

// Phase 2 middleware
import { authenticate } from './middleware/authenticate.js';
import { requireAuth } from './middleware/authorize.js';

// Phase 2 validation
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';

// Phase 3 routes
import usersRoutes from './routes/users.routes.js';
import homesRoutes from './routes/homes.routes.js';
import radonZonesRoutes from './routes/radon-zones.routes.js';

// Phase 4 routes
import kitOrdersRoutes from './routes/kit-orders.routes.js';
import testSessionsRoutes from './routes/test-sessions.routes.js';

dotenv.config();

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
    },
  },
}).withTypeProvider<ZodTypeProvider>();

// Set Zod validators
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

// Register plugins in correct order
await server.register(cors);
await server.register(errorHandlerPlugin);
await server.register(databasePlugin);
await server.register(authPlugin);
await server.register(responseFormatterPlugin);

// Phase 3: Register API routes
await server.register(usersRoutes, { prefix: '/api/v1/users' });
await server.register(homesRoutes, { prefix: '/api/v1/homes' });
await server.register(radonZonesRoutes, { prefix: '/api/v1/radon-zones' });

// Phase 4: Register API routes
await server.register(kitOrdersRoutes, { prefix: '/api/v1/kit-orders' });
await server.register(testSessionsRoutes, { prefix: '/api/v1/test-sessions' });

// Health check route
server.get('/health', async (_request, reply) => {
  return reply.success({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Example: Protected route - get current user
server.get(
  '/me',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    return reply.success(request.user);
  }
);

// Example: Admin-only route
server.get(
  '/admin/stats',
  {
    preHandler: [authenticate, requireAuth('admin')],
  },
  async (request, reply) => {
    const userCount = await request.server.prisma.user.count();
    return reply.success({ userCount });
  }
);

// Graceful shutdown handlers
const gracefulShutdown = async (signal: string) => {
  server.log.info(`Received ${signal}, closing server gracefully...`);
  await server.close();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start server
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '0.0.0.0';

try {
  await server.listen({ port: PORT, host: HOST });
  server.log.info(`Server listening on http://localhost:${PORT}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
