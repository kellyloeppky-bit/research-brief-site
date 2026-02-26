/**
 * Test Session State Machine Service
 *
 * Core business logic for test session status transitions.
 *
 * State Transition Map:
 * - ordered → active, cancelled
 * - active → retrieval_due, cancelled
 * - retrieval_due → mailed, expired, cancelled
 * - mailed → results_pending, cancelled
 * - results_pending → complete, cancelled
 * - complete → (terminal)
 * - expired → (terminal)
 * - cancelled → (terminal)
 */

import type { PrismaClient } from '@prisma/client';
import { ConflictError } from '../lib/errors/http-errors.js';
import {
  calculateExpectedCompletionDate,
  calculateRetrievalDueAt,
  type KitType,
} from './test-session-timeline.service.js';

export type SessionStatus =
  | 'ordered'
  | 'active'
  | 'retrieval_due'
  | 'mailed'
  | 'results_pending'
  | 'complete'
  | 'expired'
  | 'cancelled';

// State transition configuration
const STATE_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  ordered: ['active', 'cancelled'],
  active: ['retrieval_due', 'cancelled'],
  retrieval_due: ['mailed', 'expired', 'cancelled'],
  mailed: ['results_pending', 'cancelled'],
  results_pending: ['complete', 'cancelled'],
  complete: [], // Terminal state
  expired: [], // Terminal state
  cancelled: [], // Terminal state
};

/**
 * Validate if a status transition is allowed
 * @throws ConflictError if transition is invalid
 */
export function validateStatusTransition(
  currentStatus: SessionStatus,
  newStatus: SessionStatus
): void {
  // No-op if same status
  if (currentStatus === newStatus) {
    return;
  }

  const allowedTransitions = STATE_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(newStatus)) {
    throw new ConflictError(
      `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: [${allowedTransitions.join(', ')}]`
    );
  }
}

/**
 * Get array of allowed next statuses from current status
 */
export function getNextAllowedStatuses(
  currentStatus: SessionStatus
): SessionStatus[] {
  return STATE_TRANSITIONS[currentStatus] || [];
}

/**
 * Execute a status transition with automatic field updates
 *
 * Side Effects:
 * - ordered → active: Sets activatedAt, expectedCompletionDate, retrievalDueAt
 * - All transitions: Updates status field
 */
export async function executeTransition(
  testSessionId: string,
  newStatus: SessionStatus,
  prisma: PrismaClient
): Promise<void> {
  // Get current session
  const session = await prisma.testSession.findUnique({
    where: { id: testSessionId },
  });

  if (!session) {
    throw new ConflictError('Test session not found');
  }

  // Validate transition
  validateStatusTransition(session.status as SessionStatus, newStatus);

  // Prepare update data
  const updateData: Record<string, unknown> = {
    status: newStatus,
  };

  // Handle special transitions with side effects
  if (session.status === 'ordered' && newStatus === 'active') {
    const activatedAt = new Date();
    const kitType = session.kitType as KitType;

    updateData.activatedAt = activatedAt;
    updateData.expectedCompletionDate = calculateExpectedCompletionDate(
      kitType,
      activatedAt
    );
    updateData.retrievalDueAt = calculateRetrievalDueAt(kitType, activatedAt);
  }

  // Execute update
  await prisma.testSession.update({
    where: { id: testSessionId },
    data: updateData,
  });
}
