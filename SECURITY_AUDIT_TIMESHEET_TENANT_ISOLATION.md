# Security Audit Report: Timesheet Tenant Isolation

**Date:** 2024-11-08  
**Severity:** 🔴 **CRITICAL**  
**Status:** ⚠️ **VULNERABLE - REQUIRES IMMEDIATE ATTENTION**

---

## Executive Summary

**CRITICAL tenant isolation vulnerabilities** identified in timesheet endpoints. Several GET/PUT/PATCH/DELETE handlers fetch records by ID only, without validating that the requesting user's company matches the resource's company. This allows any authenticated admin/manager who learns another tenant's timesheet ID to read, modify, or delete their records.

**Risk:** Data breach, unauthorized access, data manipulation, payroll fraud  
**Attack Complexity:** LOW - Only requires knowledge of a CUID  
**Detection:** HIGH - No audit trail of cross-tenant access attempts

---

## Part 1: Endpoint Vulnerability Matrix

| Endpoint | Method | companyId Filter | Status | Severity |
|----------|--------|------------------|--------|----------|
| `/api/timesheets` | GET | ✅ YES | ✅ SECURE | - |
| `/api/timesheets/[id]` | GET | ❌ NO | 🔴 VULNERABLE | CRITICAL |
| `/api/timesheets/[id]` | PUT | ❌ NO | 🔴 VULNERABLE | CRITICAL |
| `/api/timesheets/[id]` | DELETE | ❌ NO | 🔴 VULNERABLE | CRITICAL |
| `/api/timesheets/[id]/approve` | POST | ❌ NO | 🔴 VULNERABLE | CRITICAL |
| `/api/timesheets/[id]/reject` | POST | ❌ NO | 🔴 VULNERABLE | CRITICAL |
| `/api/timesheets/[id]/submit` | POST | ❌ NO | 🔴 VULNERABLE | CRITICAL |
| `/api/timesheets/[id]/audit` | GET | ❌ NO | 🔴 VULNERABLE | HIGH |
| `/api/timesheets/pending` | GET | ✅ YES | ✅ SECURE | - |
| `/api/timesheets/approved` | GET | ✅ YES | ✅ SECURE | - |
| `/api/timesheets/bulk-approve` | POST | ✅ YES | ✅ SECURE | - |
| `/api/timesheets/bulk-reject` | POST | ✅ YES | ✅ SECURE | - |
| `/api/timesheets/entries/[id]` | GET | ✅ YES | ✅ SECURE | - |
| `/api/timesheets/entries/[id]` | PATCH | ✅ YES | ✅ SECURE | - |
| `/api/timesheets/entries/[id]/overtime` | GET | ❌ NO | 🔴 VULNERABLE | HIGH |
| `/api/timesheets/entries/[id]/overtime` | PATCH | ❌ NO | 🔴 VULNERABLE | CRITICAL |
| `/api/timesheets/entries/[id]/audit` | GET | ✅ YES | ✅ SECURE | - |

**Summary:** 9 vulnerable endpoints, 8 secure endpoints

---

## Part 2: Vulnerable Code Examples

### 🔴 VULNERABILITY #1: `/api/timesheets/[id]` GET

**File:** `app/api/timesheets/[id]/route.ts:54-85`

```typescript
// ❌ VULNERABLE: No companyId filter
const timesheet = await prisma.timesheet.findUnique({
  where: { id: id },  // Only filters by ID
  include: { ClockEntries: {...}, TimesheetEntries: {...} },
});

// Permission check happens AFTER fetch, doesn't validate company
const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(requestingEmployee.User.role);
if (!isOwnTimesheet && !isAdminOrManager) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

**Attack:** Admin from Company A can read Company B's timesheet if they know the ID.

---

### 🔴 VULNERABILITY #2: `/api/timesheets/[id]/approve` POST

**File:** `app/api/timesheets/[id]/approve/route.ts:54-78`

```typescript
// ❌ VULNERABLE: No company validation
const timesheet = await prisma.timesheet.findUnique({
  where: { id: id },
  include: { ApprovalStages: {...}, Employee: {...} },
});

// Proceeds to approval logic without verifying tenant
const activeStage = timesheet.ApprovalStages.find((s) => s.isActive);
```

**Attack:** Cross-tenant approval leading to payroll fraud.

---

### 🔴 VULNERABILITY #3: `/api/timesheets/entries/[id]/overtime` PATCH

**File:** `app/api/timesheets/entries/[id]/overtime/route.ts:41-80`

```typescript
// ❌ VULNERABLE: Missing companyId in query
const entry = await prisma.timesheetEntry.findUnique({
  where: { id: entryId },
  include: {
    Timesheet: {
      include: {
        Employee: {
          select: { id: true }  // ❌ companyId not selected
        }
      }
    }
  }
});

// canAmendOvertime() checks role but not company
const canAmend = await canAmendOvertime(session.user.id, entry.Timesheet.employeeId);
```

**Attack:** Admin from Company A can manipulate Company B's overtime rates.

---

### ✅ SECURE PATTERN: `/api/timesheets/entries/[id]` PATCH

**File:** `app/api/timesheets/entries/[id]/route.ts:94-97`

```typescript
// ✅ CORRECT: Validates company scoping
if (entry.Timesheet.Employee.companyId !== requestingEmployee.companyId) {
  return NextResponse.json({ error: 'Entry belongs to different company' }, { status: 403 });
}
```

**This pattern should be applied to ALL vulnerable endpoints.**

---

## Part 3: Proof-of-Concept Test

Create: `tests/security/timesheet-tenant-isolation.test.ts`

```typescript
describe('Timesheet Tenant Isolation', () => {
  it('FAILS: Admin A can read Timesheet B (CURRENT)', async () => {
    // Setup: Company A admin, Company B timesheet
    const response = await GET('/api/timesheets/timesheet-b', {
      session: { userId: 'admin-a', companyId: 'company-a' }
    });
    
    // ❌ CURRENT: Returns 200 (vulnerable)
    expect(response.status).toBe(200);
    
    // ✅ EXPECTED: Should return 403 or 404
    // expect(response.status).toBe(403);
  });

  it('FAILS: Admin A can update Timesheet B (CURRENT)', async () => {
    const response = await PUT('/api/timesheets/timesheet-b', {
      session: { userId: 'admin-a', companyId: 'company-a' },
      body: { entries: [...] }
    });
    
    // ❌ CURRENT: Returns 200 (vulnerable)
    expect(response.status).toBe(200);
  });
});
```

---

## Part 4: Recommended Fix Strategy

### 🎯 Option 1: Database-Level Filtering (RECOMMENDED)

**Create validation helper:**

```typescript
// lib/tenant-validation.ts
export async function validateTimesheetTenant(
  timesheetId: string,
  requestingCompanyId: string
) {
  const timesheet = await prisma.timesheet.findFirst({
    where: {
      id: timesheetId,
      companyId: requestingCompanyId,  // ✅ Tenant filter
    },
  });
  
  if (!timesheet) {
    throw new Error('Timesheet not found or access denied');
  }
  
  return timesheet;
}
```

**Apply to endpoints:**

```typescript
// app/api/timesheets/[id]/route.ts - GET
export async function GET(req, { params }) {
  const { id } = await params;
  const requestingEmployee = await getRequestingEmployee(session);
  
  // ✅ FIX: Validate tenant first
  const timesheet = await validateTimesheetTenant(id, requestingEmployee.companyId);
  
  // Continue with existing permission checks...
}
```

---

### 🎯 Option 2: Prisma Extension (ADVANCED)

```typescript
// lib/prisma-tenant.ts
export const prismaWithTenant = (companyId: string) => {
  return prisma.$extends({
    query: {
      timesheet: {
        async findUnique({ args, query }) {
          args.where = { ...args.where, companyId };
          return query(args);
        },
      },
    },
  });
};
```

---

### 🎯 Option 3: Middleware Pattern

```typescript
// lib/middleware/tenant-check.ts
export async function withTenantCheck(
  handler: (req, params) => Promise<Response>,
  resourceType: 'timesheet' | 'entry'
) {
  return async (req, params) => {
    const session = await getServerSession(authOptions);
    const employee = await getRequestingEmployee(session);
    
    const resourceId = (await params).id;
    const isValid = await validateResourceTenant(resourceType, resourceId, employee.companyId);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return handler(req, params);
  };
}

// Usage:
export const GET = withTenantCheck(getTimesheetHandler, 'timesheet');
```

---

## Implementation Checklist

### Phase 1: Critical Fixes (DO IMMEDIATELY)
- [ ] Fix `/api/timesheets/[id]` GET/PUT/DELETE
- [ ] Fix `/api/timesheets/[id]/approve` POST
- [ ] Fix `/api/timesheets/[id]/reject` POST
- [ ] Fix `/api/timesheets/entries/[id]/overtime` PATCH/GET

### Phase 2: Validation
- [ ] Add `validateTimesheetTenant()` helper
- [ ] Add `validateTimesheetEntryTenant()` helper
- [ ] Update `canAmendOvertime()` to check company

### Phase 3: Testing
- [ ] Create security test suite
- [ ] Test cross-tenant access attempts
- [ ] Verify audit logs capture attempts

### Phase 4: Monitoring
- [ ] Add logging for tenant validation failures
- [ ] Create alerts for suspicious access patterns
- [ ] Review audit logs for past breaches

---

## Risk Assessment if Not Fixed

| Risk | Likelihood | Impact | Overall |
|------|------------|--------|---------|
| Data breach | HIGH | CRITICAL | 🔴 CRITICAL |
| Unauthorized data modification | HIGH | CRITICAL | 🔴 CRITICAL |
| Payroll fraud | MEDIUM | HIGH | 🟠 HIGH |
| Compliance violation | HIGH | HIGH | 🟠 HIGH |
| Reputational damage | MEDIUM | CRITICAL | 🟠 HIGH |

**Estimated time to exploit:** < 1 hour  
**Estimated time to fix:** 4-8 hours  
**Recommended action:** Deploy fix within 24 hours

---

## Migration Considerations

**Q: Are there existing cross-tenant references in the database?**  
A: Run this query to check:

```sql
SELECT t.id, t.companyId, e.companyId as employeeCompanyId
FROM Timesheet t
JOIN Employee e ON t.employeeId = e.id
WHERE t.companyId != e.companyId;
```

**Q: Will this break existing functionality?**  
A: No, if implemented correctly. The fix only prevents unauthorized cross-tenant access.

**Q: Do we need to notify customers?**  
A: Depends on whether breach occurred. Review audit logs first.

---

## Contact

For questions about this audit, contact the security team.

**Report generated:** 2024-11-08  
**Next review:** After fixes are deployed
