# Server-Only Module Mock Fix

**Issue:** Tests failing with "This module cannot be imported from a Client Component module" error.

## Root Cause
The `server-only` npm package explicitly throws when imported in non-server contexts (like tests). The error occurred when tests imported modules that depended on `app/lib/env.server.ts`, which uses `server-only`.

**Stack trace:**
```
Object.<anonymous> (/node_modules/server-only/index.js:1:7)
<anonymous> (/app/lib/env.server.ts:10:8)
```

## Additional Issue: Missing Prisma Enums
Test `tests/automation/queue.test.ts` was also failing with:
```
Cannot read properties of undefined (reading 'PENDING')
```

Because it imports `AutomationJobStatus` from `@prisma/client`, but our mock wasn't exporting enums.

## Solution Applied

### Updated `tests/setupEnv.ts`

Added two critical mocks:

#### 1. Mock `server-only` Package
```typescript
if (request === "server-only") {
  return {}; // Empty module - does nothing, prevents error
}
```

#### 2. Mock Prisma Enums
```typescript
if (request === "@prisma/client") {
  const AutomationJobStatus = { 
    PENDING: 'PENDING', 
    RUNNING: 'RUNNING', 
    COMPLETED: 'COMPLETED', 
    FAILED: 'FAILED' 
  };
  const ApprovalStatus = { 
    PENDING: 'PENDING', 
    APPROVED: 'APPROVED', 
    REJECTED: 'REJECTED' 
  };
  
  return {
    PrismaClient: class MockPrismaClient { /* ... */ },
    // Export enums that tests import
    AutomationJobStatus,
    ApprovalStatus,
    Prisma: {
      AutomationJobStatus,
      ApprovalStatus,
    },
  };
}
```

## How It Works

1. **`Module._load` intercepts ALL module imports** before they execute
2. **`server-only` returns empty object** - no error thrown
3. **`@prisma/client` returns enums** - tests can reference `AutomationJobStatus.PENDING`
4. **Real modules load normally** in production

## Benefits

✅ **No "server-only" errors** in tests  
✅ **Tests can use Prisma enums** like `AutomationJobStatus.PENDING`  
✅ **Production code unaffected** - mocks only active in test environment  
✅ **No database required** for any tests  

## Files Modified

- `tests/setupEnv.ts` - Added `server-only` mock and Prisma enum exports

---

**Status:** ✅ Complete - All server-only and enum issues resolved  
**Date:** November 11, 2025
