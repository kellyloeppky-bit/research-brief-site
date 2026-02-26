/**
 * Test Session Timeline Service
 *
 * Encapsulates business rules for test session date calculations.
 *
 * Timeline Rules:
 * - Long-term (standard_long): 91 days total, retrieval due at 80 days
 * - Short-term (real_estate_short): 4 days (96 hours), retrieval due at 2 days
 */

export type KitType = 'long_term' | 'real_estate_short';

// Timeline constants
const LONG_TERM_DURATION_DAYS = 91;
const LONG_TERM_RETRIEVAL_DUE_DAYS = 80;
const SHORT_TERM_DURATION_DAYS = 4;
const SHORT_TERM_RETRIEVAL_DUE_DAYS = 2;

/**
 * Calculate the expected completion date based on kit type and activation date
 */
export function calculateExpectedCompletionDate(
  kitType: KitType,
  activatedAt: Date
): Date {
  const durationDays = kitType === 'long_term'
    ? LONG_TERM_DURATION_DAYS
    : SHORT_TERM_DURATION_DAYS;

  const completionDate = new Date(activatedAt);
  completionDate.setDate(completionDate.getDate() + durationDays);
  return completionDate;
}

/**
 * Calculate the retrieval due date based on kit type and activation date
 */
export function calculateRetrievalDueAt(
  kitType: KitType,
  activatedAt: Date
): Date {
  const retrievalDueDays = kitType === 'long_term'
    ? LONG_TERM_RETRIEVAL_DUE_DAYS
    : SHORT_TERM_RETRIEVAL_DUE_DAYS;

  const retrievalDueDate = new Date(activatedAt);
  retrievalDueDate.setDate(retrievalDueDate.getDate() + retrievalDueDays);
  return retrievalDueDate;
}

/**
 * Get the number of days since activation
 */
export function getDaysSinceActivation(activatedAt: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - activatedAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if retrieval is overdue
 * Returns true if retrievalDueAt has passed and kit hasn't been retrieved
 */
export function isRetrievalOverdue(
  retrievalDueAt: Date,
  retrievedAt: Date | null
): boolean {
  if (retrievedAt) {
    return false; // Already retrieved
  }

  const now = new Date();
  return now > retrievalDueAt;
}
