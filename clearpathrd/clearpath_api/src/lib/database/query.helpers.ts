/**
 * Common query helper utilities
 * Add reusable query patterns here as needed
 */

/**
 * Build where clause for case-insensitive search
 */
export function caseInsensitiveSearch(field: string, value: string) {
  return {
    [field]: {
      contains: value,
      mode: 'insensitive' as const,
    },
  };
}

/**
 * Build pagination parameters
 */
export function buildPaginationParams(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}
