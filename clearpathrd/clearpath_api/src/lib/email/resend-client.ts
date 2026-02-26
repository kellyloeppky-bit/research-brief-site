/**
 * Resend Email Client Singleton
 */

import { Resend } from 'resend';
import { emailConfig } from '../../config/email.config.js';

/**
 * Resend client instance (conditional initialization)
 */
export const resend = emailConfig.apiKey
  ? new Resend(emailConfig.apiKey)
  : (null as unknown as Resend);

/**
 * Check if email service is properly configured
 */
export function isEmailConfigured(): boolean {
  return !!emailConfig.apiKey;
}

/**
 * Get sender email address
 */
export function getSenderEmail(): string {
  return `${emailConfig.fromName} <${emailConfig.fromEmail}>`;
}
