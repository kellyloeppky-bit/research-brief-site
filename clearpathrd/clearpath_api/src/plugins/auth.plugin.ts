import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { supabaseConfig } from '../config/supabase.config.js';

/**
 * Authentication plugin - registers JWT support
 */
const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Only register JWT if secret is configured
  if (!supabaseConfig.jwtSecret) {
    fastify.log.warn('⚠️  Supabase JWT secret not configured - authentication disabled');
    return;
  }

  // Register JWT plugin
  await fastify.register(jwt, {
    secret: supabaseConfig.jwtSecret,
    sign: {
      algorithm: 'HS256',
    },
    verify: {
      algorithms: ['HS256'],
    },
  });

  fastify.log.info('✓ Authentication plugin registered');
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['database'], // Ensure DB is available for user lookup
});
