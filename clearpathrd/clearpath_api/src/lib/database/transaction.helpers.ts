import { PrismaClient } from '@prisma/client';

/**
 * Transaction client type
 */
export type TransactionClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];

/**
 * Execute a callback within a transaction
 */
export async function withTransaction<T>(
  prisma: PrismaClient,
  callback: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback);
}

/**
 * Create a transactional service wrapper
 */
export function createTransactionalService(prisma: PrismaClient) {
  return {
    async execute<T>(
      callback: (tx: TransactionClient) => Promise<T>
    ): Promise<T> {
      return withTransaction(prisma, callback);
    },
  };
}
