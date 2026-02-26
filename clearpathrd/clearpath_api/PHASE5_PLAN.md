# Phase 5: Test Results & Certificates - Implementation Plan

## Overview

Implement Result and Certificate APIs with risk calculation and PDF generation. Completes the test session lifecycle.

**Estimated Time:** 4 hours

---

## Database Schema Review

### Result Model
- `id` - UUID primary key
- `testSessionId` - Unique foreign key to TestSession
- `valueBqm3` - Radon measurement in Bq/m³ (Decimal 8,2)
- `zone` - Risk zone enum (below_guideline, caution, action_required, urgent_action)
- `labReference` - Optional lab reference number
- `enteredByUserId` - User who entered the result (admin)
- `isImmutable` - Lock result after certificate generation
- `recordedAt` - Date result was recorded
- Relationships: TestSession (one-to-one), Certificate (one-to-one)

### Certificate Model
- `id` - UUID primary key
- `resultId` - Unique foreign key to Result
- `homeId` - Foreign key to Home
- `certificateNumber` - Unique certificate number (format: CP-YYYYMMDD-XXXX)
- `certType` - residential | real_estate
- `status` - valid | expired | superseded
- `verificationUrl` - Public URL for certificate verification
- `pdfStoragePath` - Optional path to PDF file
- `validFrom` - Certificate start date
- `validUntil` - Certificate expiry date
- `generatedAt` - Certificate generation timestamp
- `supersededAt` - Optional superseded timestamp
- Relationships: Result (one-to-one), Home (many-to-one)

### Risk Zones (Canadian Guidelines)
Based on Health Canada radon action guidelines:
- **below_guideline**: < 200 Bq/m³ (no action required)
- **caution**: 200-599 Bq/m³ (consider remediation)
- **action_required**: 600-799 Bq/m³ (remediation recommended within 2 years)
- **urgent_action**: ≥ 800 Bq/m³ (remediation within 1 year)

Reference: Health Canada guideline is 200 Bq/m³

---

## Implementation Sequence

### Part A: Result API with Risk Calculation (2h)

#### 1. Create Risk Calculation Service (`src/services/radon-risk.service.ts`) - 30 min

Business logic for determining risk zones:

```typescript
export type RiskZone = 'below_guideline' | 'caution' | 'action_required' | 'urgent_action';

/**
 * Calculate risk zone based on radon measurement
 * Based on Health Canada guidelines
 */
export function calculateRiskZone(valueBqm3: number): RiskZone {
  if (valueBqm3 < 200) return 'below_guideline';
  if (valueBqm3 < 600) return 'caution';
  if (valueBqm3 < 800) return 'action_required';
  return 'urgent_action';
}

/**
 * Get risk level details (description, color, recommendations)
 */
export interface RiskLevelDetails {
  zone: RiskZone;
  title: string;
  description: string;
  color: string; // hex color for UI
  actionRequired: string;
  timeframe: string | null;
}

export function getRiskLevelDetails(zone: RiskZone): RiskLevelDetails;

/**
 * Check if value is within valid range
 */
export function isValidRadonMeasurement(valueBqm3: number): boolean {
  return valueBqm3 >= 0 && valueBqm3 <= 10000; // Max 10,000 Bq/m³
}
```

#### 2. Create Schemas (`src/schemas/results.schemas.ts`) - 20 min

- ResultZone enum: `below_guideline | caution | action_required | urgent_action`
- createResultSchema: testSessionId, valueBqm3, labReference (optional), recordedAt
- updateResultSchema: valueBqm3, labReference, recordedAt (only if not immutable)
- listResultsQuerySchema: pagination + filter by homeId, zone, dateRange
- Params schemas: getResultParamsSchema, deleteResultParamsSchema

**Validation Rules:**
- valueBqm3: Must be >= 0 and <= 10,000
- testSessionId: Must exist and be in 'results_pending' or 'complete' status
- Only admin can create/update results
- Cannot update if isImmutable = true

#### 3. Create Routes (`src/routes/results.routes.ts`) - 50 min

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/results` | Admin only | Create result (auto-calculates zone, updates test session to 'complete') |
| GET | `/results` | User/Admin | List results (filter by user unless admin) |
| GET | `/results/:id` | Owner/Admin | Get specific result |
| PUT | `/results/:id` | Admin only | Update result (only if not immutable) |
| DELETE | `/results/:id` | Admin only | Delete result (only if no certificate exists) |
| GET | `/results/by-session/:testSessionId` | Owner/Admin | Get result by test session ID |

**Key Route Logic:**

**POST /results (Create):**
```typescript
// Validations
- Verify testSessionId exists
- Verify test session is in 'mailed' or 'results_pending' status
- Verify no result already exists for this session (one-to-one)
- Verify valueBqm3 is valid
- Check if certificate already exists (would make result immutable)

// Calculate zone
const zone = calculateRiskZone(body.valueBqm3);

// Create result
const result = await server.prisma.result.create({
  data: {
    ...body,
    zone,
    enteredByUserId: user.id,
    isImmutable: false,
  },
});

// Update test session status to 'complete'
await server.prisma.testSession.update({
  where: { id: body.testSessionId },
  data: { status: 'complete' },
});

return reply.status(201).success(result);
```

**GET /results/by-session/:testSessionId:**
```typescript
// Get result by test session ID
const result = await server.prisma.result.findUnique({
  where: { testSessionId },
  include: {
    testSession: {
      include: { home: true },
    },
    certificate: true,
  },
});

// Check ownership via home
if (!isAdmin(user) && result.testSession.home.userId !== user.id) {
  throw new ForbiddenError();
}

return reply.success(result);
```

#### 4. Update Test Session State Machine - 20 min

Update `src/services/test-session-state.service.ts`:
- Allow transition: `results_pending` → `complete`
- Side effect: When result is created, automatically transition session

---

### Part B: Certificate API with Generation (2h)

#### 5. Create Certificate Number Generator (`src/services/certificate-number.service.ts`) - 20 min

```typescript
/**
 * Generate unique certificate number
 * Format: CP-YYYYMMDD-XXXX
 * Example: CP-20260226-0001
 */
export async function generateCertificateNumber(
  prisma: PrismaClient
): Promise<string> {
  const today = format(new Date(), 'yyyyMMdd');
  const prefix = `CP-${today}-`;

  // Find the highest number for today
  const lastCert = await prisma.certificate.findFirst({
    where: {
      certificateNumber: {
        startsWith: prefix,
      },
    },
    orderBy: { certificateNumber: 'desc' },
  });

  let sequence = 1;
  if (lastCert) {
    const lastSequence = parseInt(lastCert.certificateNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}
```

#### 6. Create Verification URL Service (`src/services/certificate-verification.service.ts`) - 15 min

```typescript
/**
 * Generate public verification URL for certificate
 */
export function generateVerificationUrl(certificateId: string): string {
  const baseUrl = process.env.PUBLIC_URL || 'https://clearpathrd.com';
  return `${baseUrl}/verify/${certificateId}`;
}

/**
 * Calculate certificate validity period
 * Residential: 2 years from validFrom
 * Real Estate: 90 days from validFrom
 */
export function calculateValidityPeriod(
  certType: 'residential' | 'real_estate',
  validFrom: Date
): Date {
  const validUntil = new Date(validFrom);

  if (certType === 'residential') {
    validUntil.setFullYear(validUntil.getFullYear() + 2); // 2 years
  } else {
    validUntil.setDate(validUntil.getDate() + 90); // 90 days
  }

  return validUntil;
}
```

#### 7. Create Schemas (`src/schemas/certificates.schemas.ts`) - 20 min

- CertType enum: `residential | real_estate`
- CertStatus enum: `valid | expired | superseded`
- createCertificateSchema: resultId, certType, validFrom
- listCertificatesQuerySchema: pagination + filter by homeId, status
- Params schemas: getCertificateParamsSchema, verifyCertificateParamsSchema
- Action schemas: supersedeCertificateSchema

**Validation Rules:**
- resultId: Must exist and not already have a certificate
- certType: Must match test session kit type
- Only admin can create certificates
- validFrom: Defaults to today

#### 8. Create Routes (`src/routes/certificates.routes.ts`) - 45 min

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/certificates` | Admin only | Generate certificate (marks result as immutable) |
| GET | `/certificates` | User/Admin | List certificates (filter by user unless admin) |
| GET | `/certificates/:id` | Owner/Admin | Get specific certificate |
| GET | `/certificates/verify/:id` | Public | Verify certificate (public endpoint) |
| PATCH | `/certificates/:id/supersede` | Admin only | Mark certificate as superseded |

**Key Route Logic:**

**POST /certificates (Generate):**
```typescript
// Validations
- Verify resultId exists
- Verify no certificate already exists for this result
- Verify certType matches test session kit type
  - standard_long → residential
  - real_estate_short → real_estate

// Generate certificate
const certificateNumber = await generateCertificateNumber(server.prisma);
const verificationUrl = generateVerificationUrl(certificateId);
const validFrom = body.validFrom || new Date();
const validUntil = calculateValidityPeriod(body.certType, validFrom);

const certificate = await server.prisma.certificate.create({
  data: {
    resultId: body.resultId,
    homeId: result.testSession.homeId,
    certificateNumber,
    certType: body.certType,
    status: 'valid',
    verificationUrl,
    validFrom,
    validUntil,
  },
});

// Mark result as immutable
await server.prisma.result.update({
  where: { id: body.resultId },
  data: { isImmutable: true },
});

return reply.status(201).success(certificate);
```

**GET /certificates/verify/:id (Public):**
```typescript
// No authentication required - public verification
const certificate = await server.prisma.certificate.findUnique({
  where: { id },
  include: {
    result: true,
    home: {
      select: {
        addressLine1: true,
        city: true,
        province: true,
        postalCode: true,
      },
    },
  },
});

if (!certificate) {
  throw new NotFoundError('Certificate not found');
}

// Return public certificate data (limited info)
return reply.success({
  certificateNumber: certificate.certificateNumber,
  certType: certificate.certType,
  status: certificate.status,
  validFrom: certificate.validFrom,
  validUntil: certificate.validUntil,
  isValid: certificate.status === 'valid' && new Date() <= certificate.validUntil,
  address: certificate.home, // Limited address info
  zone: certificate.result.zone,
  valueBqm3: certificate.result.valueBqm3,
});
```

#### 9. Register Routes - 10 min

Update `src/server.ts`:
```typescript
import resultsRoutes from './routes/results.routes.js';
import certificatesRoutes from './routes/certificates.routes.js';

await server.register(resultsRoutes, { prefix: '/api/v1/results' });
await server.register(certificatesRoutes, { prefix: '/api/v1/certificates' });
```

---

## Critical Files (in dependency order)

1. **`src/services/radon-risk.service.ts`** - Risk zone calculation (no dependencies)
2. **`src/services/certificate-number.service.ts`** - Certificate number generation (no dependencies)
3. **`src/services/certificate-verification.service.ts`** - Verification URL generation (no dependencies)
4. **`src/schemas/results.schemas.ts`** - Result validation (no dependencies)
5. **`src/routes/results.routes.ts`** - Result API (depends on #1, #4)
6. **`src/schemas/certificates.schemas.ts`** - Certificate validation (no dependencies)
7. **`src/routes/certificates.routes.ts`** - Certificate API (depends on #2, #3, #6)
8. **`src/services/test-session-state.service.ts`** - Update for 'complete' transition (existing file)
9. **`src/server.ts`** - Route registration (depends on #5, #7)

---

## Testing Plan

### Test Flow

1. **Create Result** (POST /results)
   - Use existing test session in 'results_pending' status
   - Provide valueBqm3: 450 (should be 'caution' zone)
   - Verify zone auto-calculated
   - Verify test session status updated to 'complete'
   - Verify result.isImmutable = false

2. **Get Result by Session** (GET /results/by-session/:testSessionId)
   - Verify returns result with test session and home data
   - Verify ownership check works

3. **List Results** (GET /results)
   - Verify pagination
   - Verify user sees only their results
   - Admin sees all results

4. **Generate Certificate** (POST /certificates)
   - Use resultId from step 1
   - Verify certificateNumber format: CP-20260226-0001
   - Verify validUntil calculated correctly (2 years for residential)
   - Verify result.isImmutable = true after generation
   - Verify verificationUrl generated

5. **Verify Certificate** (GET /certificates/verify/:id)
   - No auth required
   - Verify returns public certificate data
   - Verify isValid = true if status='valid' and not expired

6. **Test Result Immutability** (PUT /results/:id)
   - Try to update result after certificate generated
   - Verify 409 Conflict error

7. **Test Risk Zones**
   - valueBqm3: 150 → below_guideline
   - valueBqm3: 300 → caution
   - valueBqm3: 650 → action_required
   - valueBqm3: 900 → urgent_action

8. **Test Certificate Validity**
   - Residential: validUntil = validFrom + 2 years
   - Real Estate: validUntil = validFrom + 90 days

---

## Key Design Decisions

1. **Risk Zone Auto-Calculation:** Zone calculated automatically based on valueBqm3, no manual override
2. **Result Immutability:** Results become immutable after certificate generation (data integrity)
3. **One-to-One Relationships:** TestSession ↔ Result ↔ Certificate (one session = one result = one certificate)
4. **Admin-Only Creation:** Only admins can create results and certificates (lab data entry)
5. **Public Verification:** Certificate verification endpoint is public (no auth required)
6. **Certificate Numbering:** Sequential per day (CP-YYYYMMDD-XXXX format)
7. **Automatic Session Completion:** Creating a result automatically completes the test session

---

## Out of Scope (Future Phases)

- PDF generation (Phase 8 - requires PDFKit or similar)
- Email notifications (Phase 7)
- Bulk result import (admin tool)
- Certificate revocation
- Result amendment workflow
- Contractor lead generation on action_required zones

---

## Architecture Consistency

Following Phase 3 & 4 patterns:
- ✅ Zod schemas in `src/schemas/`
- ✅ Routes as Fastify plugins with ZodTypeProvider
- ✅ Middleware chain: authenticate → ownership check
- ✅ Services for complex business logic only
- ✅ Error classes for consistent error handling
- ✅ reply.success() helper for responses
- ✅ Pagination for list endpoints
- ✅ Admin-only endpoints use requireAuth('admin')

---

## Success Criteria

- ✅ Result API with 6 endpoints
- ✅ Certificate API with 5 endpoints (including public verification)
- ✅ Risk zone auto-calculation (4 zones)
- ✅ Certificate number generation (sequential per day)
- ✅ Result immutability after certificate generation
- ✅ Public certificate verification endpoint
- ✅ Type-safe implementation (type-check passes)
- ✅ Test session completes on result creation
- ✅ Ownership checks enforce security

---

**Ready to implement?** This plan provides complete Phase 5 functionality without PDF generation (deferred to Phase 8).
