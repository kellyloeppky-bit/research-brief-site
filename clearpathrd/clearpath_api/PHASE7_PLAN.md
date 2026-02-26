# Phase 7: Email Notifications - Implementation Plan

## Overview

Implement comprehensive email notification system using Resend API for all user-facing communications. Includes transactional emails for orders, payments, test sessions, and results.

**Estimated Time:** 4 hours

---

## Email Service Selection: Resend

**Why Resend?**
- Modern, developer-friendly API
- Excellent TypeScript support
- React email templates (type-safe)
- Generous free tier (3,000 emails/month)
- Built-in email testing
- Great deliverability
- Simple integration

**Alternatives Considered:**
- SendGrid (more complex, older API)
- AWS SES (requires AWS setup)
- Postmark (similar quality, higher cost)

---

## Implementation Sequence

### Part A: Email Infrastructure (1h 15min)

#### 1. Install Dependencies - 5 min
```bash
npm install resend
npm install react-email @react-email/components
npm install --save-dev @react-email/render
```

#### 2. Email Configuration (`src/config/email.config.ts`) - 10 min

```typescript
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
  console.warn('⚠️  EMAIL_FROM should use clearpathrd.com domain in production.');
}
```

#### 3. Resend Client (`src/lib/email/resend-client.ts`) - 10 min

```typescript
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
```

#### 4. Base Email Templates (`src/emails/`) - 30 min

Create React email templates for consistent branding:

**`src/emails/components/EmailLayout.tsx`** - Base layout
```tsx
import {
  Html, Head, Body, Container, Section, Text, Hr, Link
} from '@react-email/components';

export interface EmailLayoutProps {
  children: React.ReactNode;
  previewText: string;
}

export function EmailLayout({ children, previewText }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Logo/Header */}
          <Section style={styles.header}>
            <Text style={styles.logo}>ClearPath RD</Text>
            <Text style={styles.tagline}>Professional Radon Testing</Text>
          </Section>

          {/* Main Content */}
          <Section style={styles.content}>
            {children}
          </Section>

          {/* Footer */}
          <Hr style={styles.hr} />
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Questions? Reply to this email or contact us at{' '}
              <Link href="mailto:support@clearpathrd.com">support@clearpathrd.com</Link>
            </Text>
            <Text style={styles.footerText}>
              © 2026 ClearPath RD. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' },
  container: { margin: '0 auto', padding: '20px 0', maxWidth: '600px' },
  header: { textAlign: 'center' as const, padding: '20px 0' },
  logo: { fontSize: '32px', fontWeight: 'bold', color: '#1a73e8', margin: '0' },
  tagline: { fontSize: '14px', color: '#666', margin: '5px 0 0 0' },
  content: { backgroundColor: '#ffffff', padding: '40px', borderRadius: '8px' },
  hr: { borderColor: '#e6e6e6', margin: '20px 0' },
  footer: { textAlign: 'center' as const, padding: '20px 0' },
  footerText: { fontSize: '12px', color: '#999', margin: '5px 0' },
};
```

**`src/emails/components/Button.tsx`** - CTA button
```tsx
import { Button as EmailButton } from '@react-email/components';

export interface ButtonProps {
  href: string;
  children: React.ReactNode;
}

export function Button({ href, children }: ButtonProps) {
  return (
    <EmailButton
      href={href}
      style={{
        backgroundColor: '#1a73e8',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '6px',
        textDecoration: 'none',
        display: 'inline-block',
        fontWeight: '600',
      }}
    >
      {children}
    </EmailButton>
  );
}
```

#### 5. Email Service (`src/services/email.service.ts`) - 20 min

Core email sending logic with error handling:

```typescript
/**
 * Email Service
 *
 * Handles email sending via Resend API with error handling and logging.
 */

import { resend, isEmailConfigured, getSenderEmail } from '../lib/email/resend-client.js';
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

    console.log(`✓ Email sent to ${options.to}: ${options.subject} (ID: ${result.data?.id})`);
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
export async function trySendEmail(options: SendEmailOptions): Promise<boolean> {
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
```

---

### Part B: Transactional Email Templates (1h 30min)

#### 6. Kit Order Email Templates - 25 min

**`src/emails/KitOrderConfirmation.tsx`**
```tsx
import { Text, Section, Hr } from '@react-email/components';
import { EmailLayout } from './components/EmailLayout.js';
import { Button } from './components/Button.js';

export interface KitOrderConfirmationProps {
  orderId: string;
  productName: string;
  quantity: number;
  totalCad: number;
  shippingAddress: string;
  trackOrderUrl: string;
}

export default function KitOrderConfirmation(props: KitOrderConfirmationProps) {
  return (
    <EmailLayout previewText="Your radon test kit order has been confirmed">
      <Text style={styles.heading}>Order Confirmed! 🎉</Text>
      <Text style={styles.text}>
        Thank you for ordering your radon test kit from ClearPath RD. Your order has been received
        and will be processed shortly.
      </Text>

      <Hr />

      <Section>
        <Text style={styles.label}>Order Number</Text>
        <Text style={styles.value}>{props.orderId}</Text>

        <Text style={styles.label}>Product</Text>
        <Text style={styles.value}>{props.productName} × {props.quantity}</Text>

        <Text style={styles.label}>Total</Text>
        <Text style={styles.value}>${props.totalCad.toFixed(2)} CAD</Text>

        <Text style={styles.label}>Shipping Address</Text>
        <Text style={styles.value}>{props.shippingAddress}</Text>
      </Section>

      <Hr />

      <Section style={{ textAlign: 'center', margin: '30px 0' }}>
        <Button href={props.trackOrderUrl}>Track Your Order</Button>
      </Section>

      <Text style={styles.text}>
        You'll receive another email when your kit ships. In the meantime, you can track your
        order status anytime using the button above.
      </Text>
    </EmailLayout>
  );
}

const styles = {
  heading: { fontSize: '24px', fontWeight: 'bold', margin: '0 0 20px 0' },
  text: { fontSize: '16px', lineHeight: '24px', color: '#333', margin: '15px 0' },
  label: { fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase' as const, margin: '15px 0 5px 0' },
  value: { fontSize: '16px', color: '#333', margin: '0 0 10px 0' },
};
```

**`src/emails/PaymentReceipt.tsx`** - Similar structure
**`src/emails/PaymentFailed.tsx`** - Payment failure notification
**`src/emails/RefundProcessed.tsx`** - Refund confirmation

#### 7. Test Session Email Templates - 25 min

**`src/emails/TestActivated.tsx`**
```tsx
export interface TestActivatedProps {
  homeAddress: string;
  kitSerialNumber: string;
  kitType: 'long_term' | 'real_estate_short';
  activatedAt: Date;
  expectedCompletionDate: Date;
  retrievalDueAt: Date;
  dashboardUrl: string;
}

export default function TestActivated(props: TestActivatedProps) {
  const durationDays = props.kitType === 'long_term' ? 91 : 4;
  const testTypeName = props.kitType === 'long_term'
    ? 'Long-Term (91 days)'
    : 'Real Estate Short-Term (4 days)';

  return (
    <EmailLayout previewText="Your radon test has been activated">
      <Text style={styles.heading}>Your Radon Test is Active ✅</Text>
      <Text style={styles.text}>
        You've successfully activated your radon test kit. Your {durationDays}-day testing period
        has begun.
      </Text>

      <Section>
        <Text style={styles.label}>Test Type</Text>
        <Text style={styles.value}>{testTypeName}</Text>

        <Text style={styles.label}>Kit Serial Number</Text>
        <Text style={styles.value}>{props.kitSerialNumber}</Text>

        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>{props.homeAddress}</Text>

        <Text style={styles.label}>Started</Text>
        <Text style={styles.value}>{props.activatedAt.toLocaleDateString()}</Text>

        <Text style={styles.label}>Retrieve Kit By</Text>
        <Text style={styles.value}>{props.retrievalDueAt.toLocaleDateString()}</Text>

        <Text style={styles.label}>Expected Completion</Text>
        <Text style={styles.value}>{props.expectedCompletionDate.toLocaleDateString()}</Text>
      </Section>

      <Section style={{ backgroundColor: '#f0f7ff', padding: '20px', borderRadius: '6px', margin: '20px 0' }}>
        <Text style={{ fontSize: '14px', color: '#1a73e8', fontWeight: '600', margin: '0 0 10px 0' }}>
          ⏰ Important Reminder
        </Text>
        <Text style={{ fontSize: '14px', color: '#333', margin: '0' }}>
          Do not move or disturb the test kit during the testing period. We'll send you reminders
          as your retrieval date approaches.
        </Text>
      </Section>

      <Section style={{ textAlign: 'center', margin: '30px 0' }}>
        <Button href={props.dashboardUrl}>View Test Dashboard</Button>
      </Section>
    </EmailLayout>
  );
}
```

**`src/emails/TestReminder.tsx`** - Day 30 and Day 80 reminders
**`src/emails/RetrievalDue.tsx`** - Reminder to retrieve kit
**`src/emails/TestExpired.tsx`** - Test expired notification

#### 8. Results & Certificate Email Templates - 25 min

**`src/emails/ResultsAvailable.tsx`**
```tsx
export interface ResultsAvailableProps {
  homeAddress: string;
  valueBqm3: number;
  riskZone: 'below_guideline' | 'caution' | 'action_required' | 'urgent_action';
  viewResultsUrl: string;
}

export default function ResultsAvailable(props: ResultsAvailableProps) {
  const riskInfo = getRiskInfo(props.riskZone);

  return (
    <EmailLayout previewText="Your radon test results are ready">
      <Text style={styles.heading}>Your Radon Test Results Are Ready 📊</Text>
      <Text style={styles.text}>
        Your radon test has been analyzed by our certified laboratory. Your results are now
        available to view.
      </Text>

      <Section style={{ textAlign: 'center', backgroundColor: riskInfo.bgColor, padding: '30px', borderRadius: '8px', margin: '20px 0' }}>
        <Text style={{ fontSize: '14px', color: '#666', margin: '0 0 10px 0' }}>
          Radon Level
        </Text>
        <Text style={{ fontSize: '48px', fontWeight: 'bold', color: riskInfo.color, margin: '0' }}>
          {props.valueBqm3}
        </Text>
        <Text style={{ fontSize: '14px', color: '#666', margin: '5px 0 15px 0' }}>
          Bq/m³
        </Text>
        <Text style={{ fontSize: '18px', fontWeight: '600', color: riskInfo.color, margin: '0' }}>
          {riskInfo.label}
        </Text>
      </Section>

      <Section style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '6px', margin: '20px 0' }}>
        <Text style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 10px 0' }}>
          What does this mean?
        </Text>
        <Text style={{ fontSize: '14px', color: '#333', margin: '0', lineHeight: '20px' }}>
          {riskInfo.message}
        </Text>
      </Section>

      <Section style={{ textAlign: 'center', margin: '30px 0' }}>
        <Button href={props.viewResultsUrl}>View Full Results</Button>
      </Section>
    </EmailLayout>
  );
}

function getRiskInfo(zone: string) {
  switch (zone) {
    case 'below_guideline':
      return {
        label: 'Below Guideline',
        color: '#10b981',
        bgColor: '#f0fdf4',
        message: 'Great news! Your radon level is below Health Canada\'s guideline of 200 Bq/m³. No action needed at this time.',
      };
    case 'caution':
      return {
        label: 'Caution Zone',
        color: '#f59e0b',
        bgColor: '#fffbeb',
        message: 'Your radon level is above the guideline. Consider mitigation within 2 years. We can connect you with certified contractors.',
      };
    case 'action_required':
      return {
        label: 'Action Required',
        color: '#ef4444',
        bgColor: '#fef2f2',
        message: 'Your radon level requires mitigation within 1 year. We strongly recommend contacting a certified contractor soon.',
      };
    case 'urgent_action':
      return {
        label: 'Urgent Action Required',
        color: '#dc2626',
        bgColor: '#fef2f2',
        message: 'Your radon level is very high and requires immediate mitigation. Please contact a certified contractor as soon as possible.',
      };
    default:
      return {
        label: 'Unknown',
        color: '#666',
        bgColor: '#f9f9f9',
        message: 'Please review your results in the dashboard.',
      };
  }
}
```

**`src/emails/CertificateReady.tsx`** - Certificate available notification

#### 9. Email Template Renderer (`src/lib/email/render.ts`) - 15 min

```typescript
/**
 * Email Template Renderer
 *
 * Renders React email templates to HTML strings.
 */

import { render } from '@react-email/render';

/**
 * Render email template to HTML
 *
 * @param template React email component
 * @param props Props for the template
 * @returns HTML string
 */
export async function renderEmailTemplate<T>(
  template: (props: T) => JSX.Element,
  props: T
): Promise<string> {
  return render(template(props));
}
```

---

### Part C: Email Notification Integration (1h 15min)

#### 10. Email Notification Service (`src/services/email-notification.service.ts`) - 30 min

High-level functions for sending notifications:

```typescript
/**
 * Email Notification Service
 *
 * High-level functions for sending transactional emails triggered by business events.
 */

import type { PrismaClient, KitOrder, TestSession, Result, Certificate } from '@prisma/client';
import { sendEmail, trySendEmail, getBaseUrl } from './email.service.js';
import { renderEmailTemplate } from '../lib/email/render.js';
import KitOrderConfirmation from '../emails/KitOrderConfirmation.js';
import PaymentReceipt from '../emails/PaymentReceipt.js';
import TestActivated from '../emails/TestActivated.js';
import ResultsAvailable from '../emails/ResultsAvailable.js';
// ... other imports

/**
 * Send kit order confirmation email
 */
export async function sendKitOrderConfirmationEmail(
  kitOrder: KitOrder & { user: { email: string } },
  prisma: PrismaClient
): Promise<boolean> {
  const html = await renderEmailTemplate(KitOrderConfirmation, {
    orderId: kitOrder.id,
    productName: getProductName(kitOrder.productSku),
    quantity: kitOrder.quantity,
    totalCad: kitOrder.totalCad,
    shippingAddress: formatShippingAddress(kitOrder),
    trackOrderUrl: `${getBaseUrl()}/orders/${kitOrder.id}`,
  });

  return trySendEmail({
    to: kitOrder.user.email,
    subject: `Order Confirmed - ${kitOrder.id}`,
    html,
  });
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceiptEmail(
  kitOrder: KitOrder & { user: { email: string } }
): Promise<boolean> {
  const html = await renderEmailTemplate(PaymentReceipt, {
    orderId: kitOrder.id,
    productName: getProductName(kitOrder.productSku),
    amountPaid: kitOrder.totalCad,
    paidAt: kitOrder.paidAt!,
    receiptUrl: `${getBaseUrl()}/orders/${kitOrder.id}/receipt`,
  });

  return trySendEmail({
    to: kitOrder.user.email,
    subject: `Payment Receipt - ${kitOrder.id}`,
    html,
  });
}

/**
 * Send test activation confirmation email
 */
export async function sendTestActivatedEmail(
  testSession: TestSession & { home: { userId: string; addressLine1: string; city: string; province: string } },
  userEmail: string
): Promise<boolean> {
  const html = await renderEmailTemplate(TestActivated, {
    homeAddress: formatHomeAddress(testSession.home),
    kitSerialNumber: testSession.kitSerialNumber,
    kitType: testSession.kitType,
    activatedAt: testSession.activatedAt!,
    expectedCompletionDate: testSession.expectedCompletionDate!,
    retrievalDueAt: testSession.retrievalDueAt!,
    dashboardUrl: `${getBaseUrl()}/tests/${testSession.id}`,
  });

  return trySendEmail({
    to: userEmail,
    subject: `Radon Test Activated - Kit ${testSession.kitSerialNumber}`,
    html,
  });
}

/**
 * Send results available email
 */
export async function sendResultsAvailableEmail(
  result: Result & { testSession: { home: { userId: string; addressLine1: string; city: string; province: string } } },
  userEmail: string
): Promise<boolean> {
  const html = await renderEmailTemplate(ResultsAvailable, {
    homeAddress: formatHomeAddress(result.testSession.home),
    valueBqm3: result.valueBqm3,
    riskZone: result.riskZone,
    viewResultsUrl: `${getBaseUrl()}/results/${result.id}`,
  });

  return trySendEmail({
    to: userEmail,
    subject: `Your Radon Test Results Are Ready`,
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

function formatHomeAddress(home: { addressLine1: string; city: string; province: string }): string {
  return `${home.addressLine1}, ${home.city}, ${home.province}`;
}
```

#### 11. Integrate Email Triggers into Existing Routes - 45 min

Update existing route handlers to trigger emails:

**`src/routes/kit-orders.routes.ts`** - Add email after order creation:
```typescript
// After creating kit order
const kitOrderWithUser = await server.prisma.kitOrder.findUnique({
  where: { id: kitOrder.id },
  include: { user: true },
});

// Send confirmation email (non-blocking)
sendKitOrderConfirmationEmail(kitOrderWithUser!, server.prisma).catch((err) =>
  server.log.error('Failed to send order confirmation email:', err)
);
```

**`src/services/stripe-webhook.service.ts`** - Add email after payment success:
```typescript
// In handlePaymentSucceeded, after updating order status
const kitOrderWithUser = await prisma.kitOrder.findUnique({
  where: { stripePaymentIntentId: paymentIntent.id },
  include: { user: true },
});

if (kitOrderWithUser) {
  sendPaymentReceiptEmail(kitOrderWithUser).catch((err) =>
    console.error('Failed to send payment receipt email:', err)
  );
}
```

**`src/routes/test-sessions.routes.ts`** - Add email after activation:
```typescript
// After creating test session
const user = await server.prisma.user.findUnique({
  where: { id: testSessionWithHome.home.userId },
});

if (user) {
  sendTestActivatedEmail(testSessionWithHome, user.email).catch((err) =>
    server.log.error('Failed to send activation email:', err)
  );
}
```

**`src/routes/results.routes.ts`** - Add email after result creation:
```typescript
// After creating result
const user = await server.prisma.user.findUnique({
  where: { id: resultWithRelations.testSession.home.userId },
});

if (user) {
  sendResultsAvailableEmail(resultWithRelations, user.email).catch((err) =>
    server.log.error('Failed to send results email:', err)
  );
}
```

---

## Critical Files (in dependency order)

1. **`src/config/email.config.ts`** - Email configuration
2. **`src/lib/email/resend-client.ts`** - Resend client singleton
3. **`src/services/email.service.ts`** - Core email sending
4. **`src/lib/email/render.ts`** - Template renderer
5. **`src/emails/components/EmailLayout.tsx`** - Base layout
6. **`src/emails/components/Button.tsx`** - Button component
7. **`src/emails/KitOrderConfirmation.tsx`** - Order email template
8. **`src/emails/PaymentReceipt.tsx`** - Payment email template
9. **`src/emails/PaymentFailed.tsx`** - Failed payment template
10. **`src/emails/RefundProcessed.tsx`** - Refund template
11. **`src/emails/TestActivated.tsx`** - Activation template
12. **`src/emails/TestReminder.tsx`** - Reminder template
13. **`src/emails/RetrievalDue.tsx`** - Retrieval reminder template
14. **`src/emails/ResultsAvailable.tsx`** - Results template
15. **`src/emails/CertificateReady.tsx`** - Certificate template
16. **`src/services/email-notification.service.ts`** - High-level notification functions
17. Update existing route files to trigger emails

---

## Environment Variables

Add to `.env`:
```env
# Email Configuration (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@clearpathrd.com
EMAIL_FROM_NAME=ClearPath RD
EMAIL_REPLY_TO=support@clearpathrd.com
PUBLIC_URL=http://localhost:3000
```

---

## Email Templates Summary

| Template | Trigger Event | Recipient | Key Content |
|----------|--------------|-----------|-------------|
| KitOrderConfirmation | Kit order created | Customer | Order details, tracking link |
| PaymentReceipt | Payment succeeded | Customer | Payment amount, receipt link |
| PaymentFailed | Payment failed | Customer | Failure reason, retry link |
| RefundProcessed | Refund issued | Customer | Refund amount, timeline |
| TestActivated | Test session activated | Customer | Kit info, timeline, next steps |
| TestReminder | Day 30 / Day 80 | Customer | Progress update, days remaining |
| RetrievalDue | Retrieval date reached | Customer | Reminder to retrieve kit |
| TestExpired | Test not retrieved | Customer | Test expired, order new kit |
| ResultsAvailable | Results created | Customer | Radon level, risk zone, next steps |
| CertificateReady | Certificate generated | Customer | Certificate link, validity |

---

## Verification / Testing

### Test Email Sending

1. **Configure Resend API Key**
   - Sign up at https://resend.com
   - Create API key
   - Add to `.env` as `RESEND_API_KEY`
   - Verify domain (or use test mode)

2. **Test Order Confirmation**
   - POST /kit-orders (create order)
   - Check email inbox for confirmation
   - Verify links work
   - Verify branding/styling

3. **Test Payment Receipt**
   - Trigger payment_intent.succeeded webhook
   - Check for receipt email
   - Verify payment amount correct

4. **Test Activation Email**
   - POST /test-sessions (activate kit)
   - Check for activation email
   - Verify timeline dates correct

5. **Test Results Email**
   - POST /results (create result)
   - Check for results email
   - Verify risk zone colors/messaging

### Email Deliverability Checklist

- ✅ SPF record configured for domain
- ✅ DKIM signature enabled in Resend
- ✅ From address uses verified domain
- ✅ Reply-to address monitored
- ✅ Unsubscribe link (not required for transactional)
- ✅ Plain text fallback (Resend auto-generates)

### Error Scenarios

| Scenario | Behavior | User Impact |
|----------|----------|-------------|
| Resend not configured | Warning logged, email skipped | None (order still created) |
| Invalid recipient email | Error logged, non-blocking | None (order still created) |
| API rate limit exceeded | Error thrown, logged | None (graceful degradation) |
| Template rendering error | Error thrown, logged | None (graceful degradation) |

---

## Architecture Consistency

Following established patterns:
- ✅ Configuration in `src/config/`
- ✅ Client singleton in `src/lib/`
- ✅ Service layer for business logic
- ✅ Graceful degradation (warnings not errors)
- ✅ Non-blocking email sends (fire-and-forget)
- ✅ Comprehensive error logging
- ✅ TypeScript strict mode

---

## Success Criteria

- ✅ Resend SDK installed and configured
- ✅ Email templates using React Email
- ✅ Template renderer service
- ✅ Email sending service with error handling
- ✅ Notification service for high-level functions
- ✅ Integration with existing routes (kit orders, payments, tests, results)
- ✅ Graceful degradation without config
- ✅ Type-safe templates and props
- ✅ Consistent branding across all emails
- ✅ All emails tested and verified

---

## Key Design Decisions

1. **Resend over SendGrid/SES**
   - Modern API, excellent DX
   - React email templates (type-safe)
   - Simple pricing, generous free tier

2. **React Email Templates**
   - Component-based, reusable
   - Type-safe props
   - Preview in browser during development
   - Easy to maintain and update

3. **Non-Blocking Email Sends**
   - Use `trySendEmail()` for fire-and-forget
   - Don't fail API requests if email fails
   - Log errors for debugging

4. **Graceful Degradation**
   - System works without email configured
   - Warnings logged, not errors
   - Development-friendly

5. **Template-First Approach**
   - All content in React templates
   - No inline HTML strings
   - Easy to preview and test

---

## Future Enhancements (Out of Scope)

- Email preferences/unsubscribe (not required for transactional)
- Email analytics (open rates, click rates)
- Scheduled reminder emails (requires background jobs)
- Email queuing (Redis/BullMQ)
- A/B testing email templates
- Multi-language support
- SMS notifications
- Push notifications

---

## Notes

- **Transactional emails only** - No marketing emails in this phase
- **No authentication required** for email preferences (all transactional)
- **Background jobs** for scheduled reminders are out of scope (would need cron jobs)
- **Email logging** to database could be added in future (EmailLog model)
- **Test mode** - Resend allows testing without verified domain

---

**Implementation Status:** 📋 **READY TO IMPLEMENT**

All requirements defined, architecture planned, ready to code!
