import { PrismaClient } from '@prisma/client';
import { appConfig } from '../../config/app.config.js';

/**
 * Global singleton instance for Prisma
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create Prisma client with logging configuration
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: appConfig.isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  });

/**
 * In development, preserve instance across hot reloads
 */
if (appConfig.isDevelopment) {
  globalForPrisma.prisma = prisma;
}

/**
 * Graceful shutdown
 */
export async function disconnectPrisma() {
  await prisma.$disconnect();
}
