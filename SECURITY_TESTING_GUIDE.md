# Security Testing Guide: Tenant Isolation Fixes

This guide provides step-by-step instructions for testing the tenant isolation security fixes.

---

## Quick Test Checklist

- [ ] Run automated security tests
- [ ] Test cross-tenant access (should fail)
- [ ] Test same-tenant access (should succeed)
- [ ] Test all timesheet workflows
- [ ] Verify no regressions in existing functionality
- [ ] Check audit logs are created correctly

---

## 1. Automated Testing

### Run Security Test Suite

```bash
# Run the security tests
npm test tests/security/timesheet-tenant-isolation.test.ts

# Run with verbose output
npm test -- --verbose tests/security/timesheet-tenant-isolation.test.ts

# Run with coverage
npm test -- --coverage tests/security/
```

### Expected Results

**Before Fix (Vulnerable):**
```
🔴 VULNERABILITY DEMONSTRATION: Cross-Tenant Access
  ✓ VULNERABLE: Admin A can query Timesheet B directly via Prisma
  ✓ VULNERABLE: No database-level protection exists
  ✓ VULNERABLE: Entry overtime endpoint has no company check
```

**After Fix (Secure):**
```
✅ EXPECTED BEHAVIOR: Proper Tenant Isolation
  ✓ SECURE: Query with companyId filter blocks cross-tenant access
  ✓ SECURE: Admin A can only access their own company data
  ✓ SECURE: Admin B can only access their own company data
```

### Run Full Test Suite

```bash
# Ensure no regressions
npm test

# All tests should pass
```

---

## 2. Manual Testing Setup

### Prerequisites

1. **Two Test Companies:**
   - Company A (ID: `test-company-a`)
   - Company B (ID: `test-company-b`)

2. **Test Users:**
   - Admin A (Company A)
   - Admin B (Company B)
   - Employee A (Company A)
   - Employee B (Company B)

3. **Test Data:**
   - Timesheet A (Company A, Employee A)
   - Timesheet B (Company B, Employee B)

### Setup Script

```typescript
// Run this in Prisma Studio or via script
// scripts/create-test-data.ts

import { prisma } from '@/app/lib/prisma';

async function createTestData() {
  // Create companies
  const companyA = await prisma.company.create({
    data: { id: 'test-company-a', name: 'Test Company A', subdomain: 'test-a' }
  });
  
  const companyB = await prisma.company.create({
    data: { id: 'test-company-b', name: 'Test Company B', subdomain: 'test-b' }
  });

  // Create users and employees...
  // (See full script in tests/security/setup-test-data.ts)
}
```

---

## 3. Cross-Tenant Access Tests (Should Fail)

### Test 1: GET Timesheet from Another Company

```bash
# Login as Admin A
# Get auth token for Company A admin

# Try to access Company B's timesheet
curl -X GET \
  http://localhost:3000/api/timesheets/test-timesheet-b \
  -H "Authorization: Bearer <company-a-admin-token>" \
  -H "Content-Type: application/json"

# ✅ EXPECTED: 404 Not Found
# ❌ BEFORE FIX: 200 OK with Company B's data
```

### Test 2: UPDATE Timesheet from Another Company

```bash
# As Admin A, try to update Company B's timesheet
curl -X PUT \
  http://localhost:3000/api/timesheets/test-timesheet-b \
  -H "Authorization: Bearer <company-a-admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "entries": [{
      "date": "2024-11-01T00:00:00Z",
      "startTime": "2024-11-01T09:00:00Z",
      "endTime": "2024-11-01T17:00:00Z",
      "breakMinutes": 30
    }]
  }'

# ✅ EXPECTED: 404 Not Found
# ❌ BEFORE FIX: 200 OK, data modified
```

### Test 3: APPROVE Timesheet from Another Company

```bash
# As Admin A, try to approve Company B's timesheet
curl -X POST \
  http://localhost:3000/api/timesheets/test-timesheet-b/approve \
  -H "Authorization: Bearer <company-a-admin-token>" \
  -H "Content-Type: application/json" \
  -d '{ "comments": "Approved" }'

# ✅ EXPECTED: 404 Not Found
# ❌ BEFORE FIX: 200 OK, timesheet approved
```

### Test 4: AMEND Overtime from Another Company

```bash
# As Admin A, try to amend Company B's overtime
curl -X PATCH \
  http://localhost:3000/api/timesheets/entries/test-entry-b/overtime \
  -H "Authorization: Bearer <company-a-admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "regularHours": 0,
    "overtimeHours": 8,
    "multiplier": 2.0,
    "reason": "Fraudulent overtime increase"
  }'

# ✅ EXPECTED: 404 Not Found
# ❌ BEFORE FIX: 200 OK, overtime modified
```

---

## 4. Same-Tenant Access Tests (Should Succeed)

### Test 1: Admin Accesses Own Company Timesheet

```bash
# As Admin A, access Company A's timesheet
curl -X GET \
  http://localhost:3000/api/timesheets/test-timesheet-a \
  -H "Authorization: Bearer <company-a-admin-token>"

# ✅ EXPECTED: 200 OK with timesheet data
```

### Test 2: Employee Accesses Own Timesheet

```bash
# As Employee A, access own timesheet
curl -X GET \
  http://localhost:3000/api/timesheets/test-timesheet-a \
  -H "Authorization: Bearer <employee-a-token>"

# ✅ EXPECTED: 200 OK with timesheet data
```

### Test 3: Manager Approves Department Timesheet

```bash
# As Manager A, approve department timesheet
curl -X POST \
  http://localhost:3000/api/timesheets/test-timesheet-a/approve \
  -H "Authorization: Bearer <manager-a-token>" \
  -d '{ "comments": "Approved" }'

# ✅ EXPECTED: 200 OK, timesheet approved
```

---

## 5. Workflow Testing

### Workflow 1: Employee Timesheet Submission

```bash
# 1. Employee creates timesheet
POST /api/timesheets/generate
# ✅ Should succeed

# 2. Employee views own timesheet
GET /api/timesheets/{id}
# ✅ Should succeed

# 3. Employee submits timesheet
POST /api/timesheets/{id}/submit
# ✅ Should succeed

# 4. Manager from DIFFERENT company tries to approve
POST /api/timesheets/{id}/approve
# ✅ Should fail with 404
```

### Workflow 2: Manager Overtime Amendment

```bash
# 1. Manager views department timesheet
GET /api/timesheets/{id}
# ✅ Should succeed for same company

# 2. Manager amends overtime
PATCH /api/timesheets/entries/{id}/overtime
# ✅ Should succeed for same company

# 3. Manager from DIFFERENT company tries to amend
PATCH /api/timesheets/entries/{id}/overtime
# ✅ Should fail with 404
```

### Workflow 3: Admin Audit Trail Access

```bash
# 1. Admin views audit trail for own company
GET /api/timesheets/{id}/audit
# ✅ Should succeed

# 2. Admin from DIFFERENT company tries to view audit
GET /api/timesheets/{id}/audit
# ✅ Should fail with 404
```

---

## 6. Edge Cases Testing

### Edge Case 1: ID Enumeration Attack

```bash
# Attacker tries sequential IDs
for id in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:3000/api/timesheets/timesheet-$id \
    -H "Authorization: Bearer <attacker-token>"
done

# ✅ EXPECTED: All return 404 for other companies
# ✅ EXPECTED: No information about which IDs exist
```

### Edge Case 2: Timing Attack

```bash
# Measure response time for existing vs non-existing IDs
time curl http://localhost:3000/api/timesheets/valid-other-company-id
time curl http://localhost:3000/api/timesheets/non-existent-id

# ✅ EXPECTED: Similar response times
# ✅ EXPECTED: Both return 404
```

### Edge Case 3: SUPER_ADMIN Cross-Tenant Access

```bash
# SUPER_ADMIN should be able to switch companies
# This is intentional for support purposes

# 1. SUPER_ADMIN switches to Company B
POST /api/auth/switch-company
{ "companyId": "test-company-b" }

# 2. Access Company B timesheet
GET /api/timesheets/test-timesheet-b
# ✅ EXPECTED: 200 OK (SUPER_ADMIN has this privilege)
```

---

## 7. Performance Testing

### Response Time Comparison

```bash
# Before fix (no validation)
time curl http://localhost:3000/api/timesheets/{id}

# After fix (with validation)
time curl http://localhost:3000/api/timesheets/{id}

# ✅ EXPECTED: < 50ms difference
# ✅ EXPECTED: No noticeable performance impact
```

### Load Testing

```bash
# Install k6 or use Apache Bench
npm install -g k6

# Run load test
k6 run tests/load/timesheet-endpoints.js

# ✅ EXPECTED: Similar throughput before/after
# ✅ EXPECTED: No increase in error rates
```

---

## 8. Database Query Analysis

### Check Query Performance

```sql
-- Enable query logging
SET log_statement = 'all';

-- Run test queries
SELECT * FROM "Timesheet" 
WHERE id = 'test-id' AND "companyId" = 'test-company-a';

-- Check execution plan
EXPLAIN ANALYZE 
SELECT * FROM "Timesheet" 
WHERE id = 'test-id' AND "companyId" = 'test-company-a';

-- ✅ EXPECTED: Index scan on (id, companyId)
-- ✅ EXPECTED: < 1ms execution time
```

### Verify Indexes

```sql
-- Check if indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'Timesheet';

-- ✅ EXPECTED: Index on id (primary key)
-- ✅ EXPECTED: Index on companyId
```

---

## 9. Audit Log Verification

### Check Audit Logs Created

```sql
-- Check for tenant validation attempts
SELECT * FROM "GlobalAuditLog"
WHERE action = 'UNAUTHORIZED_ACCESS_ATTEMPT'
  AND metadata->>'type' = 'TENANT_VIOLATION'
ORDER BY "createdAt" DESC
LIMIT 10;

-- ✅ EXPECTED: Logs created for failed attempts (when logging enabled)
```

### Verify Audit Log Content

```sql
-- Check audit log structure
SELECT 
  "actorId",
  "companyId",
  "action",
  "entityType",
  "entityId",
  metadata->>'resourceType' as resource_type,
  metadata->>'attemptedCompanyId' as attempted_company,
  "createdAt"
FROM "GlobalAuditLog"
WHERE metadata->>'type' = 'TENANT_VIOLATION';

-- ✅ EXPECTED: Complete information about violation attempts
```

---

## 10. Regression Testing

### Test Existing Functionality

```bash
# Run all existing tests
npm test

# ✅ EXPECTED: All tests pass
# ✅ EXPECTED: No new failures
```

### Test All Timesheet Features

- [ ] Create timesheet
- [ ] View timesheet
- [ ] Edit timesheet
- [ ] Submit timesheet
- [ ] Approve timesheet
- [ ] Reject timesheet
- [ ] Delete timesheet
- [ ] View audit trail
- [ ] Amend overtime
- [ ] Generate timesheet
- [ ] Bulk approve
- [ ] Bulk reject

---

## 11. Security Validation

### Penetration Testing Checklist

- [ ] ID enumeration blocked
- [ ] Timing attacks mitigated
- [ ] Information disclosure prevented
- [ ] Authorization bypass prevented
- [ ] SQL injection not possible (using Prisma)
- [ ] CSRF protection in place (Next.js default)
- [ ] Rate limiting considered (future work)

### OWASP Top 10 Compliance

- [x] A01:2021 – Broken Access Control ✅ FIXED
- [x] A02:2021 – Cryptographic Failures (N/A)
- [x] A03:2021 – Injection ✅ Using Prisma ORM
- [x] A04:2021 – Insecure Design ✅ Defense in depth
- [x] A05:2021 – Security Misconfiguration (Reviewed)
- [x] A06:2021 – Vulnerable Components (Dependencies updated)
- [x] A07:2021 – Authentication Failures ✅ Using NextAuth
- [x] A08:2021 – Software and Data Integrity (Reviewed)
- [x] A09:2021 – Security Logging ✅ Infrastructure ready
- [x] A10:2021 – Server-Side Request Forgery (N/A)

---

## 12. Monitoring Setup

### Enable Security Logging

```typescript
// In lib/tenant-validation.ts helpers
// Uncomment logging calls after validation failures

// Example:
if (!timesheet) {
  await logTenantViolationAttempt(
    userId,
    'timesheet',
    timesheetId,
    requestingCompanyId
  );
  throw new TenantValidationError('Timesheet not found');
}
```

### Set Up Alerts

```sql
-- Create monitoring view
CREATE VIEW security_violations AS
SELECT 
  DATE_TRUNC('hour', "createdAt") as hour,
  COUNT(*) as violation_count,
  COUNT(DISTINCT "actorId") as unique_actors,
  metadata->>'resourceType' as resource_type
FROM "GlobalAuditLog"
WHERE action = 'UNAUTHORIZED_ACCESS_ATTEMPT'
  AND metadata->>'type' = 'TENANT_VIOLATION'
GROUP BY DATE_TRUNC('hour', "createdAt"), metadata->>'resourceType';

-- Alert if > 10 violations per hour
SELECT * FROM security_violations 
WHERE violation_count > 10;
```

---

## Test Results Template

```markdown
## Test Execution Report

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** [Dev/Staging/Production]

### Automated Tests
- [ ] Security tests passed
- [ ] All existing tests passed
- [ ] No regressions found

### Manual Tests
- [ ] Cross-tenant access blocked
- [ ] Same-tenant access works
- [ ] All workflows functional

### Performance
- [ ] Response time acceptable
- [ ] No performance degradation
- [ ] Database queries optimized

### Issues Found
- None / [List issues]

### Recommendation
- [ ] Ready for production
- [ ] Needs additional testing
- [ ] Issues must be fixed first

**Sign-off:** _______________
```

---

## Support

For questions or issues during testing:
1. Review `SECURITY_FIXES_IMPLEMENTED.md`
2. Check `lib/tenant-validation.ts` documentation
3. Contact security team

**Testing Status:** Ready for execution  
**Estimated Time:** 2-4 hours for complete testing  
**Priority:** HIGH - Test before production deployment
