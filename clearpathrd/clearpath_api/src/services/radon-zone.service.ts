import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../lib/errors/http-errors.js';

/**
 * Extract Forward Sortation Area (FSA) from a Canadian postal code
 * @param postalCode - Full postal code (e.g., "M5V 3A8")
 * @returns FSA (first 3 characters, uppercase)
 */
export function extractFSA(postalCode: string): string {
  return postalCode.substring(0, 3).toUpperCase().replace(/\s/g, '');
}

/**
 * Look up radon zone data by FSA
 * @param fsa - Forward Sortation Area (3 characters)
 * @param prisma - Prisma client instance
 * @returns Radon zone level and prevalence percentage
 * @throws NotFoundError if FSA not found in database
 */
export async function lookupRadonZone(fsa: string, prisma: PrismaClient) {
  const zoneData = await prisma.radonZoneMap.findUnique({
    where: { fsa: fsa.toUpperCase() },
  });

  if (!zoneData) {
    throw new NotFoundError(`Radon zone data not found for FSA: ${fsa}`);
  }

  return {
    radonZone: zoneData.zoneLevel,
    regionalPrevalencePct: zoneData.prevalencePct,
  };
}

/**
 * Resolve radon zone data from a full postal code
 * @param postalCode - Full postal code (e.g., "M5V 3A8")
 * @param prisma - Prisma client instance
 * @returns Radon zone level and prevalence percentage
 * @throws NotFoundError if FSA not found in database
 */
export async function resolveRadonZoneFromPostalCode(
  postalCode: string,
  prisma: PrismaClient
) {
  const fsa = extractFSA(postalCode);
  return lookupRadonZone(fsa, prisma);
}
