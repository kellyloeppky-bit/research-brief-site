/**
 * Email Notification Service
 *
 * High-level functions for sending transactional emails triggered by business events.
 */

import type {
  KitOrder,
  TestSession,
  Result,
  Certificate,
} from '@prisma/client';
import { trySendEmail, getBaseUrl } from './email.service.js';
import { renderEmailTemplate } from '../lib/email/render.js';
import KitOrderConfirmation from '../emails/KitOrderConfirmation.js';
import PaymentReceipt from '../emails/PaymentReceipt.js';
import PaymentFailed from '../emails/PaymentFailed.js';
import RefundProcessed from '../emails/RefundProcessed.js';
import TestActivated from '../emails/TestActivated.js';
import RetrievalDue from '../emails/RetrievalDue.js';
import ResultsAvailable from '../emails/ResultsAvailable.js';
import CertificateReady from '../emails/CertificateReady.js';

/**
 * Send kit order confirmation email
 */
export async function sendKitOrderConfirmationEmail(
  kitOrder: KitOrder & { user: { email: string } }
): Promise<boolean> {
  const html = await renderEmailTemplate(
    KitOrderConfirmation({
      orderId: kitOrder.id,
      productName: getProductName(kitOrder.productSku),
      quantity: kitOrder.quantity,
      totalCad: Number(kitOrder.totalCad),
      shippingAddress: formatShippingAddress(kitOrder),
      trackOrderUrl: `${getBaseUrl()}/orders/${kitOrder.id}`,
    })
  );

  return trySendEmail({
    to: kitOrder.user.email,
    subject: `Order Confirmed - ${kitOrder.id.slice(0, 8)}`,
    html,
  });
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceiptEmail(
  kitOrder: KitOrder & { user: { email: string } }
): Promise<boolean> {
  if (!kitOrder.paidAt) {
    console.warn('Cannot send payment receipt - order not paid');
    return false;
  }

  const html = await renderEmailTemplate(
    PaymentReceipt({
      orderId: kitOrder.id,
      productName: getProductName(kitOrder.productSku),
      amountPaid: Number(kitOrder.totalCad),
      paidAt: kitOrder.paidAt,
      receiptUrl: `${getBaseUrl()}/orders/${kitOrder.id}/receipt`,
    })
  );

  return trySendEmail({
    to: kitOrder.user.email,
    subject: `Payment Receipt - ${kitOrder.id.slice(0, 8)}`,
    html,
  });
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail(
  kitOrder: KitOrder & { user: { email: string } },
  failureReason?: string
): Promise<boolean> {
  const html = await renderEmailTemplate(
    PaymentFailed({
      orderId: kitOrder.id,
      productName: getProductName(kitOrder.productSku),
      amountDue: Number(kitOrder.totalCad),
      failureReason,
      retryUrl: `${getBaseUrl()}/orders/${kitOrder.id}/payment`,
    })
  );

  return trySendEmail({
    to: kitOrder.user.email,
    subject: `Payment Failed - ${kitOrder.id.slice(0, 8)}`,
    html,
  });
}

/**
 * Send refund processed email
 */
export async function sendRefundProcessedEmail(
  kitOrder: KitOrder & { user: { email: string } },
  refundAmount: number,
  refundReason: string
): Promise<boolean> {
  const html = await renderEmailTemplate(
    RefundProcessed({
      orderId: kitOrder.id,
      refundAmount,
      refundReason: formatRefundReason(refundReason),
      refundDate: new Date(),
      estimatedArrival: '5-10 business days',
    })
  );

  return trySendEmail({
    to: kitOrder.user.email,
    subject: `Refund Processed - ${kitOrder.id.slice(0, 8)}`,
    html,
  });
}

/**
 * Send test activation confirmation email
 */
export async function sendTestActivatedEmail(
  testSession: TestSession & {
    home: {
      userId: string;
      addressLine1: string;
      city: string;
      province: string;
    };
  },
  userEmail: string
): Promise<boolean> {
  if (!testSession.activatedAt || !testSession.expectedCompletionDate || !testSession.retrievalDueAt) {
    console.warn('Cannot send activation email - missing timeline data');
    return false;
  }

  const html = await renderEmailTemplate(
    TestActivated({
      homeAddress: formatHomeAddress(testSession.home),
      kitSerialNumber: testSession.kitSerialNumber,
      kitType: testSession.kitType,
      activatedAt: testSession.activatedAt,
      expectedCompletionDate: testSession.expectedCompletionDate,
      retrievalDueAt: testSession.retrievalDueAt,
      dashboardUrl: `${getBaseUrl()}/tests/${testSession.id}`,
    })
  );

  return trySendEmail({
    to: userEmail,
    subject: `Radon Test Activated - Kit ${testSession.kitSerialNumber}`,
    html,
  });
}

/**
 * Send retrieval due reminder email
 */
export async function sendRetrievalDueEmail(
  testSession: TestSession & {
    home: {
      userId: string;
      addressLine1: string;
      city: string;
      province: string;
    };
  },
  userEmail: string,
  daysActive: number
): Promise<boolean> {
  if (!testSession.retrievalDueAt) {
    console.warn('Cannot send retrieval email - missing retrieval date');
    return false;
  }

  const html = await renderEmailTemplate(
    RetrievalDue({
      homeAddress: formatHomeAddress(testSession.home),
      kitSerialNumber: testSession.kitSerialNumber,
      retrievalDueAt: testSession.retrievalDueAt,
      daysActive,
      dashboardUrl: `${getBaseUrl()}/tests/${testSession.id}`,
    })
  );

  return trySendEmail({
    to: userEmail,
    subject: `Time to Retrieve Your Test Kit - ${testSession.kitSerialNumber}`,
    html,
  });
}

/**
 * Send results available email
 */
export async function sendResultsAvailableEmail(
  result: Result & {
    testSession: {
      home: {
        userId: string;
        addressLine1: string;
        city: string;
        province: string;
      };
    };
  },
  userEmail: string
): Promise<boolean> {
  const html = await renderEmailTemplate(
    ResultsAvailable({
      homeAddress: formatHomeAddress(result.testSession.home),
      valueBqm3: Number(result.valueBqm3),
      riskZone: result.zone,
      viewResultsUrl: `${getBaseUrl()}/results/${result.id}`,
    })
  );

  return trySendEmail({
    to: userEmail,
    subject: 'Your Radon Test Results Are Ready',
    html,
  });
}

/**
 * Send certificate ready email
 */
export async function sendCertificateReadyEmail(
  certificate: Certificate & {
    home: {
      userId: string;
      addressLine1: string;
      city: string;
      province: string;
    };
    result: {
      valueBqm3: number;
    };
  },
  userEmail: string
): Promise<boolean> {
  if (!certificate.validUntil) {
    console.warn('Cannot send certificate email - missing validity date');
    return false;
  }

  const html = await renderEmailTemplate(
    CertificateReady({
      certificateNumber: certificate.certificateNumber,
      homeAddress: formatHomeAddress(certificate.home),
      valueBqm3: Number(certificate.result.valueBqm3),
      issuedDate: certificate.generatedAt,
      validUntil: certificate.validUntil,
      certificateUrl: `${getBaseUrl()}/certificates/${certificate.id}`,
    })
  );

  return trySendEmail({
    to: userEmail,
    subject: `Your Radon Certificate is Ready - ${certificate.certificateNumber}`,
    html,
  });
}

// Helper functions

function getProductName(sku: string): string {
  const names: Record<string, string> = {
    standard_long: 'Standard Long-Term Radon Test Kit',
    real_estate_short: 'Real Estate Short-Term Radon Test Kit',
    twin_pack: 'Twin Pack Radon Test Kits',
  };
  return names[sku] || sku;
}

function formatShippingAddress(kitOrder: KitOrder): string {
  return `${kitOrder.shippingAddressLine1}, ${kitOrder.shippingCity}, ${kitOrder.shippingProvince} ${kitOrder.shippingPostalCode}`;
}

function formatHomeAddress(home: {
  addressLine1: string;
  city: string;
  province: string;
}): string {
  return `${home.addressLine1}, ${home.city}, ${home.province}`;
}

function formatRefundReason(reason: string): string {
  const reasons: Record<string, string> = {
    duplicate: 'Duplicate Payment',
    fraudulent: 'Fraudulent Transaction',
    requested_by_customer: 'Customer Request',
  };
  return reasons[reason] || reason;
}
