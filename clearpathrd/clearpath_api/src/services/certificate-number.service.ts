/**
 * Certificate Number Generation Service
 *
 * Generates unique, sequential certificate numbers.
 * Format: CP-YYYYMMDD-XXXX
 * Example: CP-20260226-0001
 *
 * - CP: ClearPath RD prefix
 * - YYYYMMDD: Date of generation
 * - XXXX: Sequential number for that day (padded to 4 digits)
 */

import type { PrismaClient } from '@prisma/client';

/**
 * Generate a unique certificate number
 *
 * @param prisma - Prisma client instance
 * @returns Certificate number in format CP-YYYYMMDD-XXXX
 */
export async function generateCertificateNumber(
  prisma: PrismaClient
): Promise<string> {
  const today = new Date();
  const dateString = formatDateForCertificate(today);
  const prefix = `CP-${dateString}-`;

  // Find the highest certificate number for today
  const lastCertificate = await prisma.certificate.findFirst({
    where: {
      certificateNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      certificateNumber: 'desc',
    },
    select: {
      certificateNumber: true,
    },
  });

  // Calculate next sequence number
  let sequence = 1;
  if (lastCertificate) {
    const lastSequence = extractSequenceNumber(lastCertificate.certificateNumber);
    sequence = lastSequence + 1;
  }

  // Format: CP-YYYYMMDD-XXXX
  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

/**
 * Format date as YYYYMMDD for certificate number
 *
 * @param date - Date to format
 * @returns Date string in YYYYMMDD format
 */
function formatDateForCertificate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

/**
 * Extract sequence number from certificate number
 *
 * @param certificateNumber - Full certificate number (e.g., CP-20260226-0001)
 * @returns Sequence number (e.g., 1)
 */
function extractSequenceNumber(certificateNumber: string): number {
  const parts = certificateNumber.split('-');
  if (parts.length !== 3) {
    return 0;
  }

  const sequence = parseInt(parts[2], 10);
  return isNaN(sequence) ? 0 : sequence;
}

/**
 * Validate certificate number format
 *
 * @param certificateNumber - Certificate number to validate
 * @returns True if format is valid
 */
export function isValidCertificateNumber(certificateNumber: string): boolean {
  // Format: CP-YYYYMMDD-XXXX
  const pattern = /^CP-\d{8}-\d{4}$/;
  return pattern.test(certificateNumber);
}

/**
 * Parse certificate number into components
 *
 * @param certificateNumber - Certificate number to parse
 * @returns Components or null if invalid
 */
export function parseCertificateNumber(certificateNumber: string): {
  prefix: string;
  date: string;
  sequence: number;
} | null {
  if (!isValidCertificateNumber(certificateNumber)) {
    return null;
  }

  const parts = certificateNumber.split('-');

  return {
    prefix: parts[0],
    date: parts[1],
    sequence: parseInt(parts[2], 10),
  };
}
