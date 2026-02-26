/**
 * Email Configuration
 *
 * Centralized email service configuration with validation.
 */

export const emailConfig = {
  apiKey: process.env.RESEND_API_KEY || '',
  fromEmail: process.env.EMAIL_FROM || 'noreply@clearpathrd.com',
  fromName: process.env.EMAIL_FROM_NAME || 'ClearPath RD',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@clearpathrd.com',
  baseUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
} as const;

/**
 * Log warnings if email not configured (non-blocking)
 */
if (!emailConfig.apiKey) {
  console.warn('⚠️  RESEND_API_KEY not configured. Email sending will fail.');
}

if (!emailConfig.fromEmail.includes('@clearpathrd.com')) {
  console.warn(
    '⚠️  EMAIL_FROM should use clearpathrd.com domain in production.'
  );
}
