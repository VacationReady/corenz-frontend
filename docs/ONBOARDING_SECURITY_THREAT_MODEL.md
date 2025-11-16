# Onboarding System Security Threat Model

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Production-Ready  
**Compliance:** Multi-Tenant SaaS, NZ Privacy Act

---

## Executive Summary

This document outlines the security architecture, threat model, and access controls for the onboarding system. It is designed for security auditors, compliance officers, and NZ SME customers who require assurance that tenant data isolation is maintained throughout the employee onboarding lifecycle.

---

## Architecture Overview

### Components

1. **Template Builder API** (`/api/onboarding/templates/*`)
   - Create, update, delete, and publish onboarding templates
   - Tenant-scoped template storage
   
2. **Instance Management API** (`/api/onboarding/instances/*`)
   - Load active onboarding instances for employees
   - Step completion and response submission
   - Progress tracking

3. **Step Type Mapper** (`lib/onboarding/mapStepType.ts`)
   - Bidirectional mapping between database enums and UI keys
   - Ensures renderer compatibility

4. **Label Validation** (`lib/onboarding/label-validation.ts`)
   - Real-time duplicate detection
   - Suggestion generation
   - Localization support

5. **Audit Logger** (`lib/onboarding/audit-logger.ts`)
   - Tenant-scoped audit trail
   - Before/after value tracking

---

## Threat Model

### 1. Cross-Tenant Data Access

**Threat:** Unauthorized access to another tenant's onboarding templates or employee instances.

**Attack Vectors:**
- Direct API manipulation (changing IDs in requests)
- Session hijacking or token theft
- Privilege escalation from employee to admin in different tenant

**Mitigations:**
✅ **Authentication Layer**
- All endpoints require valid session via NextAuth
- Session includes `user.companyId` (tenant identifier)
- 401 returned for missing or invalid session

✅ **Authorization Layer**
- Employee verification: Employee's `companyId` must match session `companyId`
- Template scope: All template queries include `WHERE companyId = session.user.companyId`
- Instance scope: Instance queries join to templates with `companyId` filter

✅ **Database Query Enforcement**
```typescript
// Example from instances/[employeeId]/route.ts
const employee = await prisma.employee.findUnique({
  where: { id: employeeId },
  select: { companyId: true },
});

if (employee.companyId !== session.user.companyId) {
  return NextResponse.json(
    { error: "Forbidden: Cross-tenant access denied" },
    { status: 403 }
  );
}
```

**Test Coverage:**
- `tests/api/onboarding-instances-auth.test.ts` - Cross-tenant access returns 403
- `tests/e2e/onboarding-multi-tenant.cy.ts` - E2E validation of tenant isolation

---

### 2. Unauthorized Data Modification

**Threat:** Non-admin users modifying templates or instances belonging to others.

**Attack Vectors:**
- API endpoint abuse without permission checks
- CSRF attacks on mutation endpoints
- Bulk operation exploitation

**Mitigations:**
✅ **Permission-Based Access Control**
- Template mutations require `hasPermission(user, "onboarding", "edit")`
- Admin-only operations verified via `session.user.role === "ADMIN"`

✅ **CSRF Protection**
- NextAuth session cookies with SameSite=Lax
- Token validation on all POST/PUT/DELETE requests

✅ **Audit Trail**
- All template changes logged to `OnboardingAuditLog` table
- Includes `userId`, `companyId`, `before`, `after` values
- Immutable append-only log

**Test Coverage:**
- `tests/api/onboarding-templates-permissions.test.ts` (to be created)

---

### 3. Data Leakage via Step Metadata

**Threat:** Sensitive employee data exposed through onboarding responses.

**Attack Vectors:**
- Metadata stored in plaintext without encryption
- Responses visible to unauthorized users
- Export functionality without sanitization

**Mitigations:**
✅ **Metadata Normalization**
- `normalizeStepMetadata()` function sanitizes and validates all metadata
- Type-specific schemas prevent arbitrary data injection

✅ **Response Scoping**
- Step responses only accessible to:
  - The employee who submitted them
  - HR admins in the same company
  - Managers with explicit permission

✅ **Signed URL Generation**
- Document URLs use Supabase signed URLs (5-minute expiry)
- No direct file paths exposed to client

**Compliance Notes:**
- Compliant with NZ Privacy Act 2020 Principle 5 (storage and security)
- PII (bank accounts, IRD numbers) stored encrypted at rest via Supabase

---

### 4. Label Injection and Duplication Attacks

**Threat:** Malicious users inject harmful labels or create duplicate steps to confuse workflows.

**Attack Vectors:**
- XSS via step labels rendered without sanitization
- SQL injection through label fields
- Denial of service via extremely long labels

**Mitigations:**
✅ **Input Validation**
- Min length: 3 characters
- Max length: 80 characters
- No HTML or script tags allowed (sanitized in React)
- Uniqueness enforced per template

✅ **Real-Time Validation**
- `StepLabelValidator` component validates before publish
- Backend validation on template save
- Duplicate detection is case-insensitive

✅ **Parameterized Queries**
- All Prisma queries use parameterized inputs (no string concatenation)

**Test Coverage:**
- `tests/unit/label-validation.test.ts` - Comprehensive validation tests

---

### 5. Instance Tampering

**Threat:** Users modify onboarding instances to skip required steps or falsify completion.

**Attack Vectors:**
- Direct API calls to mark steps complete without submission
- Replay attacks reusing old step responses
- Status manipulation (pending → completed)

**Mitigations:**
✅ **Step Completion Validation**
- `POST /api/onboarding/step/[stepId]/complete` validates:
  - Step belongs to active instance for user's employee record
  - Required fields are present in submission
  - Status transitions are valid (pending → in_progress → completed)

✅ **Immutable History**
- `OnboardingStepResponse` table is append-only
- Latest response ordered by `createdAt DESC`
- Cannot delete historical responses

✅ **Manager/HR Approval Gates**
- Certain steps (e.g., equipment checklist) require manager sign-off
- Approval recorded in `OnboardingStepInstance.approvedBy`

**Test Coverage:**
- `tests/integration/onboarding-step-completion.test.ts` (to be created)

---

## API Endpoints - Security Matrix

| Endpoint | Auth Required | Tenant Scope | Permission | Rate Limit | Audit Log |
|----------|--------------|--------------|------------|------------|-----------|
| `GET /api/onboarding/templates` | ✅ Yes | ✅ Yes | read | 100/min | ❌ No |
| `POST /api/onboarding/templates` | ✅ Yes | ✅ Yes | edit | 10/min | ✅ Yes |
| `PUT /api/onboarding/templates` | ✅ Yes | ✅ Yes | edit | 10/min | ✅ Yes |
| `DELETE /api/onboarding/templates` | ✅ Yes | ✅ Yes | admin | 5/min | ✅ Yes |
| `GET /api/onboarding/instances/[employeeId]` | ✅ Yes | ✅ Yes | read | 100/min | ❌ No |
| `POST /api/onboarding/step/[stepId]/complete` | ✅ Yes | ✅ Yes | self | 20/min | ✅ Yes |

---

## Step Type Security Considerations

### High-Risk Step Types
- **PAYROLL_SETUP**: Contains bank account, tax numbers
- **UPLOAD_DOCUMENT**: May include passports, right-to-work docs
- **BENEFITS_ENROLLMENT**: Contains dependent information

### Security Controls
1. **Encryption at Rest**: All PII encrypted via Supabase storage
2. **Access Logging**: Document access logged to audit trail
3. **Retention Policy**: Documents deleted after 7 years per NZ legal requirements

---

## Tenant Isolation Verification

### Database Level
```sql
-- All onboarding queries must include companyId filter
SELECT * FROM "OnboardingTemplate" 
WHERE "companyId" = $1;

-- Foreign key constraints enforce referential integrity
ALTER TABLE "OnboardingStep" 
ADD CONSTRAINT fk_template_company 
FOREIGN KEY (templateId) 
REFERENCES "OnboardingTemplate"(id);
```

### Application Level
```typescript
// Tenant scope enforced in Prisma queries
const templates = await prisma.onboardingTemplate.findMany({
  where: { companyId: session.user.companyId }, // ← Required
});
```

### Test Validation
```typescript
// Test ensures query includes tenant scope
test("tenant scope prevents cross-tenant access", async () => {
  let queryWasScoped = false;
  
  prisma.onboardingInstance.findFirst = async ({ where }: any) => {
    if (where.OnboardingTemplate?.companyId === "company1") {
      queryWasScoped = true;
    }
    return null;
  };
  
  await GET(req, { params: { employeeId: "emp1" } });
  assert.ok(queryWasScoped);
});
```

---

## Compliance & Auditing

### NZ Privacy Act 2020 Compliance

| Principle | Implementation |
|-----------|----------------|
| **Principle 5** (Security safeguards) | Encrypted storage, signed URLs, tenant isolation |
| **Principle 6** (Access to personal info) | Employees can view their own onboarding data |
| **Principle 11** (Disclosure) | Audit logs track who accessed what data |
| **Principle 12** (Unique identifiers) | IRD numbers stored encrypted, accessed via secure endpoint |

### Audit Trail Schema
```typescript
interface OnboardingAuditLog {
  id: string;
  companyId: string;       // Tenant scope
  userId: string;          // Actor
  action: string;          // "template_create", "label_update", etc.
  resourceType: string;    // "template", "instance", "step"
  resourceId: string;      // ID of affected resource
  before: JSON;            // Previous state
  after: JSON;             // New state
  ipAddress: string;       // Source IP
  userAgent: string;       // Client info
  createdAt: DateTime;     // Timestamp
}
```

### Export & Reporting
- Audit logs exportable via `/api/audit-logs?type=onboarding`
- Filtered by `companyId` automatically
- CSV/JSON formats supported
- Retention: 7 years per legal requirements

---

## Incident Response

### Suspected Cross-Tenant Access

1. **Immediate Actions**
   - Review audit logs: `SELECT * FROM "OnboardingAuditLog" WHERE companyId != expectedCompanyId`
   - Identify affected resources
   - Freeze accounts involved

2. **Investigation**
   - Check application logs for 403 responses
   - Review database query logs for missing `companyId` filters
   - Verify session token validity

3. **Remediation**
   - Revoke compromised sessions
   - Notify affected customers within 72 hours (GDPR/NZ Privacy Act)
   - Apply patches to vulnerable endpoints

### Data Breach Protocol
- Follow NZ Privacy Commissioner breach notification requirements
- Document timeline and affected records
- Provide credit monitoring if financial data exposed

---

## Security Testing Requirements

### Pre-Deployment Checklist
- [ ] All tests in `tests/api/onboarding-instances-auth.test.ts` pass
- [ ] E2E multi-tenant tests pass
- [ ] Label validation prevents XSS and SQL injection
- [ ] Audit logs capture all mutations
- [ ] Rate limiting configured on production

### Penetration Testing
- Annual third-party penetration test
- Focus areas: Cross-tenant access, privilege escalation, data exfiltration
- Report to be shared with enterprise customers upon request

---

## Future Enhancements

### Planned Security Improvements
1. **Field-Level Encryption**: Encrypt `OnboardingStepResponse.response` JSON at application level
2. **Anomaly Detection**: Alert on unusual access patterns (e.g., HR accessing 100+ instances in 1 minute)
3. **Zero-Knowledge Architecture**: Allow employees to encrypt sensitive fields with their own key
4. **Blockchain Audit Trail**: Immutable proof of template versions and completions

---

## Contact & Escalation

**Security Team**: security@corenz.com  
**Data Protection Officer**: dpo@corenz.com  
**Incident Hotline**: +64 (0)9 XXX XXXX  

For auditors: Request access to test environment via `audits@corenz.com`

---

## Appendix: Test Coverage Report

Run full security test suite:
```bash
# Unit tests
npm run test:unit -- tests/unit/label-validation.test.ts

# API integration tests
npm run test:api -- tests/api/onboarding-instances-auth.test.ts

# E2E tests
npm run test:e2e -- tests/e2e/onboarding-multi-tenant.cy.ts

# Coverage report
npm run test:coverage
```

Expected coverage for security-critical paths: **>95%**

---

**Document Control**
- **Author**: Development Team
- **Reviewers**: Security Team, Legal, Compliance
- **Approval**: CTO, CISO
- **Next Review**: Q2 2025
