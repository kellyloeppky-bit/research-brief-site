import {
  SuccessResponse,
  ErrorResponse,
  PaginatedResponse,
} from '../types/request.types.js';

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  meta?: Record<string, unknown>
): SuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Create paginated response
 */
export function paginatedResponse<T>(
  data: T,
  pagination: {
    page: number;
    limit: number;
    total: number;
  }
): PaginatedResponse<T> {
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return {
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create error response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: unknown
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}
