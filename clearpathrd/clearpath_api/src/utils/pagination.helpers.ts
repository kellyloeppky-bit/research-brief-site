/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Pagination metadata for database queries
 */
export interface PaginationMeta {
  skip: number;
  take: number;
}

/**
 * Calculate skip and take for database queries
 */
export function calculatePagination(params: PaginationParams): PaginationMeta {
  const { page, limit } = params;

  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

/**
 * Build paginated query with skip/take
 */
export function buildPaginatedQuery<T extends Record<string, unknown>>(
  params: PaginationParams,
  baseQuery?: T
): T & PaginationMeta {
  const pagination = calculatePagination(params);

  return {
    ...baseQuery,
    ...pagination,
  } as T & PaginationMeta;
}
