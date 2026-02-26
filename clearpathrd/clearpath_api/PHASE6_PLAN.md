# Phase 6: Payment Processing - Implementation Plan

## Overview

Implement Stripe payment integration for KitOrder purchases. Replace the test-mode "paid" status with real payment processing.

**Estimated Time:** 3 hours

---

## Prerequisites

### Stripe Account Setup
1. Stripe account (test mode for development)
2. API keys: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
3. Webhook endpoint configured in Stripe Dashboard
4. Product catalog configured in Stripe (or create dynamically)

### Environment Variables
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_URL=https://clearpathrd.com (for success/cancel URLs)
```

---

## Payment Flow

### Customer Journey
```
1. User creates KitOrder
   ↓
2. Server creates Stripe PaymentIntent
   ↓
3. Frontend receives client_secret
   ↓
4. User completes payment (Stripe Checkout/Elements)
   ↓
5. Stripe sends webhook event
   ↓
6. Server updates KitOrder status
   ↓
7. User receives confirmation
```

### KitOrder Status Lifecycle
```
pending → paid → fulfilled
   ↓         ↓
 failed   refunded
   ↓
cancelled
```

---

## Implementation Sequence

### Part A: Stripe Configuration & Service (1h 15min)

#### 1. Install Stripe SDK - 5 min
```bash
npm install stripe
npm install --save-dev @types/stripe
```

#### 2. Create Stripe Configuration (`src/config/stripe.config.ts`) - 10 min

```typescript
/**
 * Stripe configuration with validation
 */
export const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  apiVersion: '2023-10-16' as const,
} as const;

// Validation on module load
if (!stripeConfig.secretKey) {
  console.warn('⚠️  STRIPE_SECRET_KEY not set - payment processing disabled');
}

if (!stripeConfig.webhookSecret) {
  console.warn('⚠️  STRIPE_WEBHOOK_SECRET not set - webhooks disabled');
}
```

#### 3. Create Stripe Client (`src/lib/stripe/stripe-client.ts`) - 10 min

```typescript
import Stripe from 'stripe';
import { stripeConfig } from '../../config/stripe.config.js';

/**
 * Stripe client singleton
 */
export const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: stripeConfig.apiVersion,
  typescript: true,
});

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!stripeConfig.secretKey && !!stripeConfig.webhookSecret;
}
```

#### 4. Create Payment Service (`src/services/payment.service.ts`) - 30 min

Core payment logic:

```typescript
import { stripe } from '../lib/stripe/stripe-client.js';
import type { PrismaClient } from '@prisma/client';

/**
 * Product SKU to Stripe price mapping
 */
const PRODUCT_PRICES: Record<string, { amount: number; currency: string }> = {
  standard_long: { amount: 10169, currency: 'cad' }, // $101.69 CAD
  real_estate_short: { amount: 5649, currency: 'cad' }, // $56.49 CAD
  twin_pack: { amount: 16949, currency: 'cad' }, // $169.49 CAD
};

/**
 * Create Stripe PaymentIntent for kit order
 */
export async function createPaymentIntent(
  kitOrderId: string,
  productSku: string,
  quantity: number,
  metadata: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  const priceInfo = PRODUCT_PRICES[productSku];
  if (!priceInfo) {
    throw new Error(`Invalid product SKU: ${productSku}`);
  }

  const amount = priceInfo.amount * quantity;

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: priceInfo.currency,
    metadata: {
      kitOrderId,
      productSku,
      quantity: quantity.toString(),
      ...metadata,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return paymentIntent;
}

/**
 * Retrieve PaymentIntent by ID
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Cancel PaymentIntent
 */
export async function cancelPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.cancel(paymentIntentId);
}

/**
 * Create Stripe Refund
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
): Promise<Stripe.Refund> {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount, // Optional: partial refund
    reason,
  });

  return refund;
}

/**
 * Update kit order status based on payment status
 */
export async function updateKitOrderFromPayment(
  paymentIntentId: string,
  status: 'paid' | 'failed' | 'refunded',
  prisma: PrismaClient
): Promise<void> {
  const kitOrder = await prisma.kitOrder.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });

  if (!kitOrder) {
    throw new Error(`Kit order not found for payment: ${paymentIntentId}`);
  }

  const updateData: Record<string, unknown> = {
    paymentStatus: status,
  };

  if (status === 'paid') {
    updateData.paidAt = new Date();
  }

  await prisma.kitOrder.update({
    where: { id: kitOrder.id },
    data: updateData,
  });
}
```

#### 5. Create Webhook Handler Service (`src/services/stripe-webhook.service.ts`) - 20 min

Handle Stripe webhook events:

```typescript
import type { Stripe } from 'stripe';
import type { PrismaClient } from '@prisma/client';
import { stripe } from '../lib/stripe/stripe-client.js';
import { stripeConfig } from '../../config/stripe.config.js';
import { updateKitOrderFromPayment } from './payment.service.js';

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    stripeConfig.webhookSecret
  );
}

/**
 * Handle payment_intent.succeeded event
 */
async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  prisma: PrismaClient
): Promise<void> {
  await updateKitOrderFromPayment(paymentIntent.id, 'paid', prisma);
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  prisma: PrismaClient
): Promise<void> {
  await updateKitOrderFromPayment(paymentIntent.id, 'failed', prisma);
}

/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(
  charge: Stripe.Charge,
  prisma: PrismaClient
): Promise<void> {
  if (charge.payment_intent) {
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent.id;

    await updateKitOrderFromPayment(paymentIntentId, 'refunded', prisma);
  }
}

/**
 * Main webhook event handler
 */
export async function handleStripeWebhook(
  event: Stripe.Event,
  prisma: PrismaClient
): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(
        event.data.object as Stripe.PaymentIntent,
        prisma
      );
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailed(
        event.data.object as Stripe.PaymentIntent,
        prisma
      );
      break;

    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge, prisma);
      break;

    // Add more event types as needed
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
```

---

### Part B: Update KitOrder Routes (1h)

#### 6. Update KitOrder Creation (`src/routes/kit-orders.routes.ts`) - 30 min

Modify POST /kit-orders to create PaymentIntent:

```typescript
/**
 * POST /kit-orders
 * Create a new kit order with Stripe payment
 */
serverWithTypes.post(
  '/',
  {
    preHandler: [authenticate],
    schema: {
      body: createKitOrderSchema,
    },
  },
  async (request, reply) => {
    const user = request.user as UserContext;
    const body = request.body as CreateKitOrderInput;

    // ... existing validations ...

    // Create kit order with 'pending' status
    const kitOrder = await server.prisma.kitOrder.create({
      data: {
        ...body,
        userId: user.id,
        paymentStatus: 'pending', // Changed from 'paid'
      },
    });

    // Create Stripe PaymentIntent
    const paymentIntent = await createPaymentIntent(
      kitOrder.id,
      body.productSku,
      body.quantity,
      {
        userId: user.id,
        homeId: body.homeId,
      }
    );

    // Update kit order with Stripe payment intent ID
    const updatedKitOrder = await server.prisma.kitOrder.update({
      where: { id: kitOrder.id },
      data: {
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    // Return kit order with client secret for frontend
    return reply.status(201).success({
      kitOrder: updatedKitOrder,
      clientSecret: paymentIntent.client_secret,
    });
  }
);
```

#### 7. Add Payment Status Endpoint - 15 min

New endpoint to check payment status:

```typescript
/**
 * GET /kit-orders/:id/payment-status
 * Get payment status for kit order
 */
serverWithTypes.get(
  '/:id/payment-status',
  {
    preHandler: [
      authenticate,
      requireOwnership('kit order', async (req) => {
        const { id } = req.params as GetKitOrderParams;
        return server.prisma.kitOrder.findUnique({ where: { id } });
      }),
    ],
    schema: {
      params: getKitOrderParamsSchema,
    },
  },
  async (request, reply) => {
    const { id } = request.params as GetKitOrderParams;

    const kitOrder = await server.prisma.kitOrder.findUnique({
      where: { id },
    });

    if (!kitOrder) {
      throw new NotFoundError('Kit order not found');
    }

    // Get latest payment intent status from Stripe
    let paymentStatus = kitOrder.paymentStatus;
    let paymentDetails = null;

    if (kitOrder.stripePaymentIntentId) {
      const paymentIntent = await getPaymentIntent(
        kitOrder.stripePaymentIntentId
      );

      paymentDetails = {
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        created: paymentIntent.created,
      };
    }

    return reply.success({
      kitOrderId: kitOrder.id,
      paymentStatus,
      paidAt: kitOrder.paidAt,
      paymentDetails,
    });
  }
);
```

#### 8. Add Refund Endpoint - 15 min

Admin-only refund endpoint:

```typescript
/**
 * POST /kit-orders/:id/refund
 * Refund a kit order (admin only)
 */
serverWithTypes.post(
  '/:id/refund',
  {
    preHandler: [authenticate, requireAuth('admin')],
    schema: {
      params: getKitOrderParamsSchema,
      body: z.object({
        amount: z.number().positive().optional(),
        reason: z
          .enum(['duplicate', 'fraudulent', 'requested_by_customer'])
          .optional(),
      }),
    },
  },
  async (request, reply) => {
    const { id } = request.params as GetKitOrderParams;
    const body = request.body as { amount?: number; reason?: string };

    const kitOrder = await server.prisma.kitOrder.findUnique({
      where: { id },
    });

    if (!kitOrder) {
      throw new NotFoundError('Kit order not found');
    }

    if (!kitOrder.stripePaymentIntentId) {
      throw new BadRequestError('No payment intent found for this order');
    }

    if (kitOrder.paymentStatus !== 'paid') {
      throw new BadRequestError('Can only refund paid orders');
    }

    // Create refund in Stripe
    const refund = await createRefund(
      kitOrder.stripePaymentIntentId,
      body.amount,
      body.reason as any
    );

    // Update kit order status
    await server.prisma.kitOrder.update({
      where: { id },
      data: {
        paymentStatus: 'refunded',
      },
    });

    return reply.success({
      refund: {
        id: refund.id,
        amount: refund.amount,
        status: refund.status,
        reason: refund.reason,
      },
    });
  }
);
```

---

### Part C: Stripe Webhook Endpoint (45min)

#### 9. Create Webhook Route (`src/routes/stripe-webhooks.routes.ts`) - 30 min

```typescript
import { FastifyPluginAsync } from 'fastify';
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  verifyWebhookSignature,
  handleStripeWebhook,
} from '../services/stripe-webhook.service.js';
import { BadRequestError } from '../lib/errors/http-errors.js';

const stripeWebhooksRoutes: FastifyPluginAsync = async (server) => {
  /**
   * POST /stripe/webhook
   * Stripe webhook handler (no authentication, verified by signature)
   */
  server.post(
    '/webhook',
    {
      config: {
        // Disable body parsing to get raw body for signature verification
        rawBody: true,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers['stripe-signature'];

      if (!signature || typeof signature !== 'string') {
        throw new BadRequestError('Missing Stripe signature');
      }

      // Get raw body
      const payload = request.rawBody;
      if (!payload) {
        throw new BadRequestError('Missing request body');
      }

      // Verify webhook signature
      let event;
      try {
        event = verifyWebhookSignature(payload, signature);
      } catch (err) {
        const error = err as Error;
        throw new BadRequestError(`Webhook signature verification failed: ${error.message}`);
      }

      // Handle webhook event
      await handleStripeWebhook(event, server.prisma);

      // Return 200 to acknowledge receipt
      return reply.send({ received: true });
    }
  );
};

export default stripeWebhooksRoutes;
```

#### 10. Configure Raw Body Plugin (`src/plugins/raw-body.plugin.ts`) - 15 min

Fastify plugin to preserve raw body for webhook signature verification:

```typescript
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import type { FastifyRequest } from 'fastify';

/**
 * Raw body plugin for Stripe webhook signature verification
 */
const rawBodyPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    async (req: FastifyRequest, body: Buffer) => {
      // Save raw body for routes that need it
      (req as any).rawBody = body;

      // Parse JSON for normal use
      try {
        return JSON.parse(body.toString('utf-8'));
      } catch (err) {
        throw new Error('Invalid JSON');
      }
    }
  );

  fastify.log.info('✓ Raw body plugin registered');
};

export default fp(rawBodyPlugin, {
  name: 'raw-body',
});
```

#### 11. Register Routes & Plugin - 10 min

Update `src/server.ts`:
```typescript
import rawBodyPlugin from './plugins/raw-body.plugin.js';
import stripeWebhooksRoutes from './routes/stripe-webhooks.routes.js';

// Register raw body plugin before routes
await server.register(rawBodyPlugin);

// Register webhook route
await server.register(stripeWebhooksRoutes, { prefix: '/api/v1/stripe' });
```

---

## Critical Files (in dependency order)

1. **Install Stripe SDK** - `npm install stripe`
2. **`src/config/stripe.config.ts`** - Stripe configuration
3. **`src/lib/stripe/stripe-client.ts`** - Stripe client singleton
4. **`src/services/payment.service.ts`** - Payment logic
5. **`src/services/stripe-webhook.service.ts`** - Webhook handler
6. **`src/plugins/raw-body.plugin.ts`** - Raw body preservation
7. **`src/routes/stripe-webhooks.routes.ts`** - Webhook endpoint
8. **`src/routes/kit-orders.routes.ts`** - Update with payment creation
9. **`src/server.ts`** - Register plugin and routes

---

## Testing Plan

### Local Testing with Stripe CLI

1. **Install Stripe CLI:**
```bash
# Windows
scoop install stripe

# Mac
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

2. **Login to Stripe:**
```bash
stripe login
```

3. **Forward webhooks to local server:**
```bash
stripe listen --forward-to localhost:3001/api/v1/stripe/webhook
```

4. **Trigger test webhook:**
```bash
stripe trigger payment_intent.succeeded
```

### Test Flow

1. **Create Kit Order**
   - POST /kit-orders
   - Verify returns clientSecret
   - Verify paymentStatus: 'pending'
   - Verify stripePaymentIntentId saved

2. **Check Payment Status**
   - GET /kit-orders/:id/payment-status
   - Verify returns Stripe payment details

3. **Simulate Payment Success** (using Stripe CLI)
   ```bash
   stripe trigger payment_intent.succeeded
   ```
   - Verify webhook received
   - Verify paymentStatus updated to 'paid'
   - Verify paidAt timestamp set

4. **Simulate Payment Failure**
   ```bash
   stripe trigger payment_intent.payment_failed
   ```
   - Verify paymentStatus updated to 'failed'

5. **Test Refund** (admin)
   - POST /kit-orders/:id/refund
   - Verify refund created in Stripe
   - Verify paymentStatus updated to 'refunded'

6. **Frontend Integration Test**
   - Use Stripe test card: 4242 4242 4242 4242
   - Complete payment flow
   - Verify webhook triggers
   - Verify order status updates

---

## Stripe Test Cards

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
3D Secure: 4000 0025 0000 3155
```

---

## Environment Variables

Add to `.env`:
```env
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_URL=http://localhost:3000
```

---

## Key Design Decisions

1. **PaymentIntent over Checkout Session**
   - More flexible for custom UI
   - Better for single-page apps
   - Easier to handle payment status

2. **Webhook-Driven Status Updates**
   - Reliable payment confirmation
   - Handles async payment methods
   - Prevents race conditions

3. **Metadata Storage**
   - Store kitOrderId in Stripe metadata
   - Easy to reconcile payments with orders
   - Useful for Stripe Dashboard

4. **Idempotency**
   - Webhook handler is idempotent
   - Safe to replay events
   - Prevents duplicate processing

5. **Admin Refunds**
   - Full and partial refunds supported
   - Tracked in Stripe and database
   - Audit trail maintained

---

## Security Considerations

1. **Webhook Signature Verification**
   - Always verify Stripe signature
   - Prevents replay attacks
   - Ensures authenticity

2. **Client Secret Protection**
   - Never log client secrets
   - Only return to authenticated users
   - Short-lived (expires after 24h)

3. **Amount Validation**
   - Server calculates amounts
   - Never trust client-side amounts
   - Validate against product catalog

4. **Refund Authorization**
   - Admin-only endpoint
   - Audit logging recommended
   - Reason tracking

---

## Success Criteria

- ✅ Stripe SDK installed and configured
- ✅ Payment service with PaymentIntent creation
- ✅ Webhook handler for payment events
- ✅ KitOrder creation with payment
- ✅ Payment status endpoint
- ✅ Admin refund endpoint
- ✅ Webhook endpoint with signature verification
- ✅ Raw body plugin for webhooks
- ✅ Type-safe implementation
- ✅ Local testing with Stripe CLI

---

**Ready to implement Phase 6?**
