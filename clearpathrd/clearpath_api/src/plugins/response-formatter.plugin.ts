import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import {
  successResponse,
  paginatedResponse,
} from '../utils/response.helpers.js';

/**
 * Response formatter plugin - adds helper methods to reply
 */
const responseFormatterPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorate reply with success helper
  fastify.decorateReply(
    'success',
    function (data: unknown, meta?: Record<string, unknown>) {
      return this.send(successResponse(data, meta));
    }
  );

  // Decorate reply with paginated helper
  fastify.decorateReply(
    'paginated',
    function (
      data: unknown,
      pagination: { page: number; limit: number; total: number }
    ) {
      return this.send(paginatedResponse(data, pagination));
    }
  );

  fastify.log.info('✓ Response formatter plugin registered');
};

export default fp(responseFormatterPlugin, {
  name: 'response-formatter',
});
