import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { HttpError } from '../lib/errors/http-errors.js';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Map Prisma error codes to HTTP status codes
 */
function mapPrismaErrorToStatus(code: string): number {
  const errorMap: Record<string, number> = {
    P2002: 409, // Unique constraint failed
    P2025: 404, // Record not found
    P2003: 400, // Foreign key constraint failed
    P2014: 400, // Invalid relation
    P2015: 404, // Related record not found
    P2021: 404, // Table does not exist
    P2022: 404, // Column does not exist
  };
  return errorMap[code] || 500;
}

/**
 * Map Prisma error codes to user-friendly messages
 */
function mapPrismaErrorMessage(code: string): string {
  const messageMap: Record<string, string> = {
    P2002: 'A record with this value already exists',
    P2025: 'Record not found',
    P2003: 'Invalid reference to related record',
    P2014: 'Invalid relationship',
    P2015: 'Related record not found',
  };
  return messageMap[code] || 'Database operation failed';
}

/**
 * Global error handler plugin
 */
const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    // Log error with context
    request.log.error(
      {
        err: error,
        req: {
          method: request.method,
          url: request.url,
          params: request.params,
          query: request.query,
        },
      },
      'Request error'
    );

    // Handle known HttpError types
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.issues,
        },
      });
    }

    // Handle Prisma known request errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const statusCode = mapPrismaErrorToStatus(error.code);
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: mapPrismaErrorMessage(error.code),
        },
      });
    }

    // Handle Prisma validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid data provided',
        },
      });
    }

    // Handle Fastify errors (includes validation)
    const errorObj = error as Record<string, unknown>;
    if ('statusCode' in errorObj && typeof errorObj.statusCode === 'number') {
      return reply.status(errorObj.statusCode).send({
        success: false,
        error: {
          code: ('code' in errorObj && typeof errorObj.code === 'string') ? errorObj.code : 'UNKNOWN_ERROR',
          message: 'message' in errorObj && typeof errorObj.message === 'string' ? errorObj.message : 'An error occurred',
        },
      });
    }

    // Fallback for unknown errors
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  fastify.log.info('Error handler plugin registered');
};

export default fp(errorHandlerPlugin, {
  name: 'error-handler',
});
