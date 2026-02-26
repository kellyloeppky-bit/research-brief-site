/**
 * Email Service
 *
 * Handles email sending via Resend API with error handling and logging.
 */

import {
  resend,
  isEmailConfigured,
  getSenderEmail,
} from '../lib/email/resend-client.js';
import { emailConfig } from '../config/email.config.js';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

/**
 * Send email via Resend
 *
 * @param options Email options
 * @returns Email ID if successful
 * @throws Error if Resend not configured or sending fails
 */
export async function sendEmail(options: SendEmailOptions): Promise<string> {
  if (!isEmailConfigured()) {
    throw new Error('Email service is not configured');
  }

  try {
    const result = await resend.emails.send({
      from: getSenderEmail(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo || emailConfig.replyTo,
      cc: options.cc,
      bcc: options.bcc,
    });

    if (result.error) {
      console.error('Email sending failed:', result.error);
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    console.log(
      `✓ Email sent to ${options.to}: ${options.subject} (ID: ${result.data?.id})`
    );
    return result.data?.id || 'unknown';
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}

/**
 * Send email with graceful degradation
 * Does not throw - logs error and returns false on failure
 *
 * @param options Email options
 * @returns True if sent successfully, false otherwise
 */
export async function trySendEmail(
  options: SendEmailOptions
): Promise<boolean> {
  try {
    await sendEmail(options);
    return true;
  } catch (error) {
    console.error('Failed to send email (non-blocking):', error);
    return false;
  }
}

/**
 * Get base URL for email links
 */
export function getBaseUrl(): string {
  return emailConfig.baseUrl;
}
