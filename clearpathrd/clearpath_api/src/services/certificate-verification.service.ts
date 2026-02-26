/**
 * Certificate Verification Service
 *
 * Handles certificate verification URLs and validity period calculations.
 */

export type CertType = 'residential' | 'real_estate';

// Validity periods
const RESIDENTIAL_VALIDITY_YEARS = 2;
const REAL_ESTATE_VALIDITY_DAYS = 90;

/**
 * Generate public verification URL for certificate
 *
 * @param certificateId - Certificate UUID
 * @returns Public verification URL
 */
export function generateVerificationUrl(certificateId: string): string {
  const baseUrl = process.env.PUBLIC_URL || 'https://clearpathrd.com';
  return `${baseUrl}/verify/${certificateId}`;
}

/**
 * Calculate certificate expiry date based on type and start date
 *
 * @param certType - Certificate type (residential or real_estate)
 * @param validFrom - Certificate start date
 * @returns Expiry date
 */
export function calculateValidUntil(
  certType: CertType,
  validFrom: Date
): Date {
  const validUntil = new Date(validFrom);

  if (certType === 'residential') {
    // Residential certificates valid for 2 years
    validUntil.setFullYear(validUntil.getFullYear() + RESIDENTIAL_VALIDITY_YEARS);
  } else {
    // Real estate certificates valid for 90 days
    validUntil.setDate(validUntil.getDate() + REAL_ESTATE_VALIDITY_DAYS);
  }

  return validUntil;
}

/**
 * Check if certificate is currently valid
 *
 * @param status - Certificate status
 * @param validUntil - Certificate expiry date
 * @returns True if certificate is valid
 */
export function isCertificateValid(
  status: 'valid' | 'expired' | 'superseded',
  validUntil: Date
): boolean {
  if (status !== 'valid') {
    return false;
  }

  const now = new Date();
  return now <= validUntil;
}

/**
 * Get days remaining until certificate expires
 *
 * @param validUntil - Certificate expiry date
 * @returns Days remaining (negative if expired)
 */
export function getDaysUntilExpiry(validUntil: Date): number {
  const now = new Date();
  const diffMs = validUntil.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get certificate validity period description
 *
 * @param certType - Certificate type
 * @returns Human-readable validity period
 */
export function getValidityPeriodDescription(certType: CertType): string {
  if (certType === 'residential') {
    return `${RESIDENTIAL_VALIDITY_YEARS} years`;
  }
  return `${REAL_ESTATE_VALIDITY_DAYS} days`;
}

/**
 * Check if certificate is expiring soon (within 30 days)
 *
 * @param validUntil - Certificate expiry date
 * @returns True if expiring within 30 days
 */
export function isExpiringSoon(validUntil: Date): boolean {
  const daysRemaining = getDaysUntilExpiry(validUntil);
  return daysRemaining > 0 && daysRemaining <= 30;
}
