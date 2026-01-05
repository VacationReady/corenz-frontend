# Error Handling Audit Report

## Overview

This document summarizes the findings from auditing error handling patterns across the PeopleCore HRIS API routes, focusing on:
1. Stack trace exposure in error responses
2. Generic error messages for 500 errors
3. Cross-tenant access returning 404 (not 403)

## Audit Date
January 6, 2026

---

## 1. Stack Trace Exposure Analysis

### Critical Issues Found

The following files expose stack traces in production error responses:

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `app/api/debug/timesheet-setup/route.ts` | 178 | Returns `error.stack` in response body | HIGH |
| `app/api/automation-rules/[id]/execute/route.ts` | 84 | Returns `error.stack` as `details` field | HIGH |

### Files Logging Stack Traces (Server-Side Only - OK)

These files log stack traces server-side but don't expose them in responses:

| File | Pattern | Status |
|------|---------|--------|
| `app/api/offboarding/[employeeId]/route.ts` | `console.error("Error stack:", errorStack)` | ✅ OK |
| `app/api/offboarding/[employeeId]/exit-interview/route.ts` | `console.error("Error stack:", errorStack)` | ✅ OK |
| `app/api/job-roles/route.ts` | `console.error` with stack | ✅ OK |
| `app/api/employees/route.ts` | `console.error` with stack | ✅ OK |
| `app/api/departments/route.ts` | `console.error` with stack | ✅ OK |
| `app/api/forms/by-slug/[slug]/route.ts` | `console.error` with stack | ✅ OK |

---

## 2. Error Message Exposure Analysis

### Pattern Analysis

The codebase has two patterns for 500 error responses:

#### Pattern A: Generic Messages (GOOD)
```typescript
return NextResponse.json(
  { success: false, error: "Internal server error." },
  { status: 500 }
);
```

Files using this pattern:
- `app/api/employees/[id]/route.ts` ✅
- `app/api/employees/route.ts` (partial) ✅

#### Pattern B: Exposing error.message (NEEDS REVIEW)
```typescript
return NextResponse.json(
  { error: error.message || "Failed to..." },
  { status: 500 }
);
```

Files exposing `error.message` in 500 responses:
- `app/api/working-patterns/[id]/route.ts`
- `app/api/working-patterns/route.ts`
- `app/api/training-records/create/route.ts`
- `app/api/training-records/[id]/route.ts`
- `app/api/time-tracking/upload-photo/route.ts`
- `app/api/storage/sign/route.ts`
- `app/api/seed-user/route.ts`
- `app/api/run-carryover/route.ts`
- `app/api/reports/[id]/send-history/route.ts`
- `app/api/reports/send/route.ts`
- `app/api/payroll/export-ird/route.ts`
- `app/api/payroll/export/route.ts`
- `app/api/payroll/calculate/route.ts`
- `app/api/performance/review-cycles/[id]/launch/route.ts`
- `app/api/leave-request/[id]/route.ts`
- `app/api/leave-request/route.ts`
- `app/api/health/db/route.ts`
- `app/api/event-subcategories/route.ts`
- `app/api/event-subcategories/[id]/route.ts`
- `app/api/event-categories/route.ts`
- `app/api/event-categories/[id]/route.ts`
- `app/api/event-categories/archived/route.ts`
- `app/api/documents/upload-employee/route.ts`

### Risk Assessment

Exposing `error.message` can leak:
- Database schema information (Prisma errors)
- Internal service names
- File paths
- Configuration details

**Recommendation**: Replace all `error.message` exposures with generic messages for 500 errors.

---

## 3. Cross-Tenant Access Response Analysis

### Correct Pattern (404 for Cross-Tenant)

The following files correctly return 404 for cross-tenant access attempts:

| File | Pattern | Status |
|------|---------|--------|
| `app/api/timesheets/[id]/route.ts` | Uses `TenantValidationError` → 404 | ✅ |
| `app/api/timesheets/[id]/submit/route.ts` | Uses `TenantValidationError` → 404 | ✅ |
| `app/api/timesheets/[id]/approve/route.ts` | Uses `TenantValidationError` → 404 | ✅ |
| `app/api/timesheets/[id]/reject/route.ts` | Uses `TenantValidationError` → 404 | ✅ |
| `app/api/timesheets/[id]/audit/route.ts` | Uses `TenantValidationError` → 404 | ✅ |
| `app/api/timesheets/[id]/approval-details/route.ts` | Uses `TenantValidationError` → 404 | ✅ |
| `app/api/employees/[id]/route.ts` | Query includes `companyId` → 404 | ✅ |
| `app/api/transactional-change-requests/route.ts` | Checks `companyId` → 404 | ✅ |
| `app/api/training-records/[id]/route.ts` | Returns 404 for not found | ✅ |
| `app/api/users/[id]/profile-image/route.ts` | Checks `companyId` → 404 | ✅ |

### Pattern Used

```typescript
// Good pattern - tenant-scoped query returns 404
const resource = await prisma.resource.findUnique({
  where: {
    id,
    companyId: session.user.companyId, // Tenant isolation
  },
});

if (!resource) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
```

### Files Needing Review

Some files return 403 for authorization failures after finding the resource:

| File | Pattern | Recommendation |
|------|---------|----------------|
| `app/api/offboarding/[employeeId]/route.ts` | Returns 403 after finding resource | Consider if this leaks existence |
| `app/api/employees/[id]/route.ts` | Returns 403 for `canAccessEmployee` failure | Acceptable - resource already tenant-scoped |

---

## 4. Global Error Handler

The application uses Sentry for error tracking with a proper global error handler:

```typescript
// app/global-error.tsx
export default function GlobalError({ error }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  
  return <NextError statusCode={0} />; // Generic error page
}
```

**Status**: ✅ Properly configured - no stack traces exposed to users

---

## 5. Summary of Findings

### Critical Issues (Must Fix)

1. **Stack trace in response** - `app/api/debug/timesheet-setup/route.ts`
2. **Stack trace in response** - `app/api/automation-rules/[id]/execute/route.ts`

### Medium Issues (Should Fix)

1. **Error message exposure** - 20+ files expose `error.message` in 500 responses

### Compliant Areas

1. **Cross-tenant access** - Correctly returns 404 (not 403) in most cases
2. **Global error handler** - Properly configured with Sentry
3. **Server-side logging** - Stack traces logged server-side only (good practice)

---

## 6. Recommendations

### Immediate Actions

1. Remove stack trace from `app/api/debug/timesheet-setup/route.ts` response
2. Remove stack trace from `app/api/automation-rules/[id]/execute/route.ts` response

### Short-term Actions

1. Create a standardized error response helper function
2. Replace all `error.message` exposures with generic messages
3. Ensure all 500 errors return: `{ error: "Internal server error" }`

### Proposed Helper Function

```typescript
// lib/api-error.ts
export function handleApiError(error: unknown, context: string) {
  console.error(`[${context}] Error:`, error);
  
  // Log stack trace server-side only
  if (error instanceof Error) {
    console.error(`[${context}] Stack:`, error.stack);
  }
  
  // Return generic message to client
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
```

---

## 7. Verification Checklist

- [x] Identified files exposing stack traces in responses
- [x] Identified files exposing error.message in 500 responses
- [x] Verified cross-tenant access returns 404
- [x] Verified global error handler configuration
- [x] Documented recommendations

---

## 8. Fixes Applied

### Critical Fixes (Stack Trace Removal)

1. **app/api/debug/timesheet-setup/route.ts**
   - Removed `error.stack` from response body
   - Now logs stack trace server-side only
   - Returns generic "Internal server error" message

2. **app/api/automation-rules/[id]/execute/route.ts**
   - Removed `error.stack` from `details` field
   - Now logs stack trace server-side only
   - Returns generic "Failed to execute workflow" message

### Cross-Tenant Access Fixes (403 → 404)

3. **app/api/training-records/list/route.ts**
   - Changed from `findUnique` + companyId check to `findFirst` with companyId filter
   - Now returns 404 for cross-tenant access (prevents ID enumeration)

4. **app/api/training-records/create/route.ts**
   - Changed from `findUnique` + companyId check to `findFirst` with companyId filter
   - Now returns 404 for cross-tenant access (prevents ID enumeration)

5. **app/api/timesheets/entries/[id]/route.ts**
   - Changed from `findUnique` + companyId check to `findFirst` with companyId filter
   - Now returns 404 for cross-tenant access (prevents ID enumeration)
   - Fixed both PATCH and DELETE handlers

6. **app/api/timesheets/entries/[id]/audit/route.ts**
   - Changed from `findUnique` + companyId check to `findFirst` with companyId filter
   - Now returns 404 for cross-tenant access (prevents ID enumeration)
