/**
 * Radon Risk Assessment Service
 *
 * Implements Health Canada radon guidelines for risk zone classification.
 *
 * Guidelines:
 * - Health Canada guideline: 200 Bq/m³
 * - Below 200: No action required
 * - 200-599: Consider remediation
 * - 600-799: Remediation recommended within 2 years
 * - 800+: Urgent remediation within 1 year
 *
 * Reference: https://www.canada.ca/en/health-canada/services/radon.html
 */

export type RiskZone =
  | 'below_guideline'
  | 'caution'
  | 'action_required'
  | 'urgent_action';

// Risk thresholds in Bq/m³
const THRESHOLD_GUIDELINE = 200;
const THRESHOLD_CAUTION = 600;
const THRESHOLD_ACTION = 800;

// Valid measurement range
const MIN_RADON_VALUE = 0;
const MAX_RADON_VALUE = 10000; // 10,000 Bq/m³ is extremely high

/**
 * Calculate risk zone based on radon measurement
 *
 * @param valueBqm3 - Radon concentration in Bq/m³
 * @returns Risk zone classification
 */
export function calculateRiskZone(valueBqm3: number): RiskZone {
  if (valueBqm3 < THRESHOLD_GUIDELINE) {
    return 'below_guideline';
  }
  if (valueBqm3 < THRESHOLD_CAUTION) {
    return 'caution';
  }
  if (valueBqm3 < THRESHOLD_ACTION) {
    return 'action_required';
  }
  return 'urgent_action';
}

/**
 * Risk level details for UI display
 */
export interface RiskLevelDetails {
  zone: RiskZone;
  title: string;
  description: string;
  color: string; // Hex color for UI
  actionRequired: string;
  timeframe: string | null;
  guidelineReference: string;
}

/**
 * Get detailed information about a risk zone
 *
 * @param zone - Risk zone classification
 * @returns Detailed risk level information
 */
export function getRiskLevelDetails(zone: RiskZone): RiskLevelDetails {
  const details: Record<RiskZone, RiskLevelDetails> = {
    below_guideline: {
      zone: 'below_guideline',
      title: 'Below Guideline',
      description:
        'Your radon level is below the Health Canada guideline of 200 Bq/m³. No immediate action is required.',
      color: '#10B981', // Green
      actionRequired: 'No action required at this time',
      timeframe: null,
      guidelineReference: 'Health Canada guideline: 200 Bq/m³',
    },
    caution: {
      zone: 'caution',
      title: 'Caution Zone',
      description:
        'Your radon level is above the Health Canada guideline. Remediation should be considered to reduce exposure.',
      color: '#F59E0B', // Amber
      actionRequired: 'Consider remediation to reduce radon levels',
      timeframe: 'Recommended within 2 years',
      guidelineReference: 'Health Canada guideline: 200 Bq/m³',
    },
    action_required: {
      zone: 'action_required',
      title: 'Action Required',
      description:
        'Your radon level is significantly elevated. Remediation is strongly recommended to protect your health.',
      color: '#F97316', // Orange
      actionRequired: 'Remediation strongly recommended',
      timeframe: 'Within 2 years',
      guidelineReference: 'Health Canada guideline: 200 Bq/m³',
    },
    urgent_action: {
      zone: 'urgent_action',
      title: 'Urgent Action Required',
      description:
        'Your radon level is very high. Immediate remediation is necessary to reduce health risks.',
      color: '#EF4444', // Red
      actionRequired: 'Immediate remediation required',
      timeframe: 'Within 1 year',
      guidelineReference: 'Health Canada guideline: 200 Bq/m³',
    },
  };

  return details[zone];
}

/**
 * Validate radon measurement is within acceptable range
 *
 * @param valueBqm3 - Radon concentration in Bq/m³
 * @returns True if value is valid
 */
export function isValidRadonMeasurement(valueBqm3: number): boolean {
  return valueBqm3 >= MIN_RADON_VALUE && valueBqm3 <= MAX_RADON_VALUE;
}

/**
 * Get user-friendly message for radon value
 *
 * @param valueBqm3 - Radon concentration in Bq/m³
 * @returns Human-readable interpretation
 */
export function getRadonValueMessage(valueBqm3: number): string {
  const zone = calculateRiskZone(valueBqm3);
  const details = getRiskLevelDetails(zone);

  return `${details.title}: ${valueBqm3} Bq/m³ - ${details.actionRequired}`;
}

/**
 * Calculate reduction percentage needed to reach guideline
 *
 * @param valueBqm3 - Current radon concentration
 * @returns Percentage reduction needed, or 0 if already below guideline
 */
export function calculateReductionNeeded(valueBqm3: number): number {
  if (valueBqm3 <= THRESHOLD_GUIDELINE) {
    return 0;
  }

  const reductionNeeded =
    ((valueBqm3 - THRESHOLD_GUIDELINE) / valueBqm3) * 100;
  return Math.round(reductionNeeded);
}
