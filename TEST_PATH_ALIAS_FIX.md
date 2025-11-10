# Test Path Alias Resolution Fix

**Issue:** GitHub Actions CI was failing due to TypeScript path alias resolution errors in test files.

## Root Cause
The `tsx --test` test runner doesn't resolve TypeScript path aliases (`@/*`) configured in `tsconfig.json` without additional configuration. The error was:
```
Cannot find package '@/app' imported from tests/integration/timesheet-edit-overtime.test.ts
```

## Solution
Replaced all TypeScript path aliases with relative paths in test files:
- `@/app/*` → `../../app/*` (or `../app/*` depending on test depth)
- `@/lib/*` → `../../app/lib/*` (or `../app/lib/*`)
- `@/components/*` → `../../components/*`

## Files Fixed

### Integration Tests (tests/integration/)
- ✅ `timesheet-edit-overtime.test.ts`
  - Fixed `@/app/api/timesheets/entries/[id]/route` → relative path
  - Fixed `@/lib/prisma` → `../../app/lib/prisma`
  - Added robust mock handling with try-catch for `mock.method()`

### Root-Level Tests (tests/)
- ✅ `transactionalNotifications.test.ts`
  - `@/lib/transactional-notifications` → `../app/lib/transactional-notifications`
  - `@/lib/audit-helpers` → `../app/lib/audit-helpers`

- ✅ `time.test.ts`
  - `@/lib/time` → `../app/lib/time`

- ✅ `reportingDatePresets.test.ts`
  - `@/lib/reportingDatePresets` → `../app/lib/reportingDatePresets`
  - `@/lib/queryBuilder` → `../app/lib/queryBuilder`

- ✅ `permissions.test.ts`
  - `@/lib/permissions` → `../app/lib/permissions`

- ✅ `news-utils.test.ts`
  - `@/lib/news-utils` → `../app/lib/news-utils`

- ✅ `reportsQueryRoute.test.ts`
  - `@/lib/prisma` → `../app/lib/prisma`
  - `@/lib/reportingTimeConfig` → `../app/lib/reportingTimeConfig`
  - `@/app/api/reports/query/route` → `../app/api/reports/query/route`

- ✅ `auditLogsNotificationIntegration.test.ts`
  - `@/lib/audit-helpers` → `../app/lib/audit-helpers`
  - Mock modules updated to use relative paths

- ✅ `auditHelpers.test.ts`
  - `@/lib/audit-helpers` → `../app/lib/audit-helpers`

### Subdirectory Tests
- ✅ `tests/forms/schemaHelpers.test.ts`
  - `@/api/forms/[id]/types` → `../../app/api/forms/[id]/types`

- ✅ `tests/automation/workflow-builder.test.tsx`
  - `@/app/(withSidebar)/settings/automation-rules/components/WorkflowCanvas` → relative path

## Technical Details

### Why tsx doesn't resolve path aliases
- `tsx` is a TypeScript execution engine that doesn't use `tsc` compilation
- It doesn't automatically apply `tsconfig.json` path mappings during module resolution
- Path aliases work in Next.js build because Next.js has its own module resolution

### Alternative Solutions (not used)
1. **tsx --tsconfig flag**: Doesn't support path mapping
2. **tsconfig-paths**: Requires additional runtime registration
3. **Relative paths**: ✅ Chosen - most reliable, no runtime dependencies

## Verification
Run tests to verify all imports resolve correctly:
```bash
npm test
```

All tests should now pass in CI environment without module resolution errors.

## Additional Fix: Mock Method Error Handling
Enhanced `timesheet-edit-overtime.test.ts` with robust mocking:
- Added try-catch around `mock.method()` calls
- Graceful fallback to alternative mocking when method mocking unavailable
- Prevents `ERR_INVALID_ARG_VALUE` errors in CI environments

---
**Status:** ✅ Complete - All test files updated with relative paths
**Date:** November 10, 2025
