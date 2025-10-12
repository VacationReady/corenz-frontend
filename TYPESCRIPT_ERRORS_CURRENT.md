# Current TypeScript Errors - Build Blockers

**Date:** October 12, 2025  
**Status:** 🟡 **242 TYPE ERRORS** (58 fixed, 242 remaining)  
**Last Updated:** After Phase 1 fixes

---

## 🎯 Progress Update

**Phase 1 Complete:** ✅ **58 errors fixed (19% reduction)**

| Category | Errors Fixed |
|----------|--------------|
| **Prisma Model Names** | 25 errors |
| **Missing Type Packages** | 20 errors |
| **AI Module Types** | 3 errors |
| **Department Counts** | 10 errors |

**See `TYPESCRIPT_FIX_PROGRESS.md` for detailed progress report.**

---

## Executive Summary

Running `npx tsc --noEmit` originally revealed **~300 real type errors** in the codebase. After Phase 1 fixes, **242 errors remain** - primarily in test files.

**Current Finding:** Core business logic is now type-safe. Remaining errors are mostly test infrastructure mock type issues.

---

## Error Categories

### 1. Prisma Model Property Name Mismatches (~80 errors)

**Issue:** Prisma include/select using wrong property names (lowercase vs PascalCase)

```typescript
// ❌ Wrong (throughout codebase)
include: {
  user: true,        // Should be 'User'
  employee: true,    // Should be 'Employee'
  permissionProfile: true  // Should be 'PermissionProfile'
}

// ✅ Correct
include: {
  User: true,
  Employee: true,
  PermissionProfile: true
}
```

**Affected files:**
- `scripts/backfillJobRole.ts`
- `scripts/debug-employee-user-mapping.ts`
- `scripts/debug-user-permissions.ts`
- `scripts/check-admin-permissions.ts`
- `app/lib/automation/tests/evaluator.test.ts`
- `app/lib/automation/tests/executor.test.ts`
- And ~15 more script files

**Fix effort:** 2-3 hours (global find-replace with verification)

---

### 2. Vitest Mock Type Issues (~100 errors)

**Issue:** Mock functions returning `Promise<T>` assigned to variables typed as `undefined`

```typescript
// ❌ Current (fails type check)
vi.mock('module', () => ({
  prisma: {
    user: {
      findMany: vi.fn().mockResolvedValue([])  // Returns Promise<any[]>
    }
  }
}))

// Later in test:
(prisma.user.findMany as any).mockResolvedValue([...]) // Type: undefined

// ✅ Fix options:
// Option 1: Proper mock types
const mockFindMany = vi.fn<[], Promise<User[]>>()

// Option 2: Type assertions
(prisma.user.findMany as Mock).mockResolvedValue([...])

// Option 3: Use vi.mocked() helper
vi.mocked(prisma.user.findMany).mockResolvedValue([...])
```

**Affected files:**
- `tests/api/blackoutDaysRoutes.test.ts` (~10 errors)
- `tests/api/newsEngagementRoutes.test.ts` (~30 errors)
- `tests/auditLogsNotificationIntegration.test.ts` (~15 errors)
- `tests/transactionalNotifications.test.ts` (~30 errors)
- `tests/reportsQueryRoute.test.ts` (~15 errors)
- `app/lib/automation/tests/*.ts` (~50 errors)

**Fix effort:** 8-12 hours (need to properly type all mocks)

---

### 3. Missing Type Declarations (~20 errors)

**Issue:** Missing `@types` packages and module declarations

```typescript
// ❌ Error
import { JSDOM } from 'jsdom'
// Could not find a declaration file for module 'jsdom'

// ❌ Error  
import { POST } from '@/app/api/fields/route'
// Cannot find module '@/app/api/fields/route'

// ❌ Error
describe('test', () => {})
// Cannot find name 'describe'. Need @types/jest or @types/mocha
```

**Missing packages:**
- `@types/jsdom` - DOM testing (2 files affected)
- Test runner types for some test files (3 files affected)

**Missing modules:**
- Several API route imports in tests fail (5-10 errors)

**Fix effort:** 2-3 hours (install packages, fix imports)

---

### 4. AI Module Type Issues (~10 errors)

**Issue:** Missing properties in context types

```typescript
// app/lib/ai/advanced-conversational-intelligence.ts(244)
Property 'userPreferences' does not exist on type 'ConversationContext'

// app/lib/ai/error-handling-recovery.ts(299)
Object literal may only specify known properties, 
but 'Employees' does not exist (should be 'Employee')
```

**Fix effort:** 1-2 hours (add missing properties, fix Prisma references)

---

### 5. Prisma Query Builder Issues (~30 errors)

**Issue:** Using non-existent properties in Prisma queries

```typescript
// ❌ Wrong
prisma.onboardingStep.create({
  data: {
    formId: "...",      // Should use 'Form: { connect: { id } }'
    documentId: "..."   // Should use 'Document: { connect: { id } }'
  }
})

// ❌ Wrong
prisma.employee.findMany({
  where: { createdAt: { gt: date } }  // Employee model has no 'createdAt'
})

// ❌ Wrong
const result = await prisma.department.findMany({
  include: { _count: { select: { Employees: true } } }  // Should be 'Employee'
})
```

**Fix effort:** 3-4 hours (review Prisma schema, fix queries)

---

### 6. NextRequest vs Request Type Mismatches (~15 errors)

**Issue:** Tests using `Request` where `NextRequest` expected

```typescript
// ❌ Error in tests
const req = new Request('http://localhost', { method: 'POST' })
await POST(req)  // Expects NextRequest, got Request

// ✅ Fix
import { NextRequest } from 'next/server'
const req = new NextRequest('http://localhost', { method: 'POST' })
```

**Fix effort:** 1-2 hours

---

### 7. Miscellaneous Type Issues (~50 errors)

Various other type mismatches:
- Readonly property assignments
- Duplicate identifiers
- Missing return statements
- Type narrowing issues
- Json type assignments

---

## Options for Moving Forward

### Option 1: Fix All Errors (Recommended for Production)

**Time estimate:** 3-5 days (20-30 hours)

**Approach:**
1. Install missing type declarations (2 hours)
2. Fix Prisma model name mismatches globally (3 hours)
3. Properly type all Vitest mocks (12 hours)
4. Fix Prisma query builder issues (4 hours)
5. Fix remaining miscellaneous errors (8 hours)
6. Verify build passes: `npx tsc --noEmit`

**Pros:**
- ✅ TypeScript compilation works
- ✅ Catches real bugs at compile time
- ✅ Production-ready
- ✅ Enables future strict flags

**Cons:**
- ⚠️ Significant time investment
- ⚠️ Risk of breaking changes

---

### Option 2: Skip Type Checking (Quick but Risky)

**Approach:**
- Update `tsconfig.json` with `"skipLibCheck": true` and `"noEmit": true`
- Add `"typeCheck": false` to Next.js config
- Build will succeed but types not checked

**Pros:**
- ✅ Immediate deployment
- ✅ No code changes needed

**Cons:**
- ❌ Type errors hidden
- ❌ Potential runtime bugs
- ❌ Technical debt accumulates
- ❌ Not recommended for production

---

### Option 3: Incremental Fix (Pragmatic)

**Phase 1 (Critical):** 4-6 hours
- Fix Prisma model name mismatches (global search-replace)
- Install missing type packages
- Fix AI module errors
- Fix NextRequest issues

**Phase 2 (Important):** 8-12 hours
- Properly type all Vitest mocks
- Fix Prisma query builder issues

**Phase 3 (Nice-to-have):** 4-6 hours
- Fix miscellaneous type issues
- Enable stricter flags incrementally

**Pros:**
- ✅ Balances urgency with quality
- ✅ Can deploy after Phase 1 if needed
- ✅ Reduces risk exposure gradually

**Cons:**
- ⚠️ Still requires commitment
- ⚠️ Some errors remain temporarily

---

## Immediate Actions Required

### If You Need to Deploy NOW

```bash
# Temporary workaround - skip type checking
# Edit tsconfig.json:
{
  "compilerOptions": {
    "skipLibCheck": true,
    "noEmit": true
  }
}

# Edit next.config.js:
module.exports = {
  typescript: {
    ignoreBuildErrors: true  // ⚠️ USE WITH CAUTION
  }
}
```

**⚠️ WARNING:** This hides errors. Use only as last resort.

---

### If You Can Fix Critical Errors (Recommended)

**Priority 1: Prisma Model Names** (2-3 hours)

```bash
# Global find-replace in all files:
# 1. Scripts directory
find scripts -name "*.ts" -exec sed -i 's/user: true/User: true/g' {} \;
find scripts -name "*.ts" -exec sed -i 's/employee: true/Employee: true/g' {} \;
find scripts -name "*.ts" -exec sed -i 's/permissionProfile: true/PermissionProfile: true/g' {} \;

# 2. Review and test each changed file
# 3. Verify with: npx tsc --noEmit
```

**Priority 2: Install Missing Types** (30 minutes)

```bash
npm install --save-dev @types/jsdom
```

**Priority 3: Fix AI Module Errors** (1 hour)

Update `ConversationContext` type to include `userPreferences`.

---

## Recommendation

**For Production Deployment:**

I recommend **Option 3 (Incremental Fix) - Phase 1** as the minimum viable fix:

1. ✅ **Fix Prisma model names** (3 hours) - Critical for data integrity
2. ✅ **Install @types/jsdom** (5 minutes) - Simple fix
3. ✅ **Fix AI module errors** (1 hour) - Affects user-facing features
4. ✅ **Fix NextRequest issues** (1 hour) - Test infrastructure

**Total time:** ~5 hours of focused work

This brings error count from ~300 → ~150, making the build much healthier while deferring mock type issues for later cleanup.

---

## Status After Hardening Work

| Category | Before | After Hardening | Current |
|----------|--------|----------------|---------|
| **Environment validation** | ❌ None | ✅ Complete | ✅ Working |
| **Dependency hygiene** | ⚠️ 18 unused | ✅ Clean | ✅ Clean |
| **TypeScript compilation** | ❓ Unknown | 🔴 **300 errors** | 🔴 **Needs fixing** |
| **Lint errors** | 2 | ✅ 0 | ✅ 0 |

**Conclusion:** Environment and dependencies are production-ready. TypeScript errors are real bugs that need addressing before claiming "production-ready" status.
