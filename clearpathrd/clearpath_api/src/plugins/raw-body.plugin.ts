/**
 * Raw Body Plugin
 *
 * Preserves raw request body for Stripe webhook signature verification.
 * Stripe requires the raw body to verify the webhook signature.
 */

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import type { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer | string;
  }
}

/**
 * Raw body plugin
 * Captures raw body before JSON parsing for routes that need it
 */
const rawBodyPlugin: FastifyPluginAsync = async (fastify) => {
  // Add hook to capture raw body for all requests
  fastify.addHook('preParsing', async (request: FastifyRequest, payload: any) => {
    // Only capture for POST requests with JSON content type
    if (
      request.method === 'POST' &&
      request.headers['content-type']?.includes('application/json')
    ) {
      const chunks: Buffer[] = [];

      // Check if payload is iterable
      if (payload && typeof payload[Symbol.asyncIterator] === 'function') {
        // Collect chunks
        for await (const chunk of payload) {
          chunks.push(chunk as Buffer);
        }

        // Store raw body
        const rawBody = Buffer.concat(chunks);
        request.rawBody = rawBody;

        // Create a new readable stream from the buffer for parsing
        const { Readable } = await import('stream');
        const newPayload = new Readable();
        newPayload.push(rawBody);
        newPayload.push(null);

        return newPayload;
      }
    }

    return payload;
  });

  fastify.log.info('✓ Raw body plugin registered');
};

export default fp(rawBodyPlugin, {
  name: 'raw-body',
});
