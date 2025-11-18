# Test Failures Summary - Onboarding Templates

## Issues Identified

### 1. **Template Versioning Tests** (tests/api/template-versioning.test.ts)
All 9 tests failing with "Template not found" error

**Root Cause**: The `updateTemplate` function now uses `findFirst` with tenant scoping, but the test templates may not have all required fields.

**Status**: ✅ Fixed - Added `updatedById` field to template creation

### 2. **Designer Security Tests** (tests/api/designer-security.test.ts)  
3 tests failing:

- ❌ "should only return templates for the specified tenant" - Returns 0 templates (expected > 0)
- ❌ "should only return journeys for the specified tenant" - Returns 0 templates (expected > 0)
- ❌ "should enforce onboarding read permission" - Permission check returns wrong value
- ❌ "should create telemetry events for cross-tenant access attempts" - Telemetry event severity is undefined
- ❌ "Serialization Security" tests - Module import path errors (fixed)
- ❌ "Update and Delete Operations" tests - Module import path errors (fixed)

**Root Causes**:
1. Company model doesn't have `subdomain` field - Fixed
2. Templates need `updatedById` field - Fixed
3. Cleanup methods using `deleteMany` on models without that method - Fixed
4. Import paths using `@/app/api` instead of relative paths - Fixed

### 3. **Prisma Model Issues**
- ❌ Tests using `prisma.company.deleteMany()` - Company model uses `delete()` not `deleteMany()`
- ❌ Tests using `prisma.journeyTemplate.deleteMany()` - Same issue

**Status**: ✅ Fixed - Changed to individual `delete()` calls with error handling

## Files Modified

1. ✅ `tests/api/template-versioning.test.ts` - Added `updatedById` to template creation
2. ✅ `tests/api/designer-security.test.ts` - Fixed company creation, cleanup, imports, and added test users
3. ✅ `app/api/onboarding/templates/actions.ts` - Improved tenant checking logic

## Remaining Issues

The tests are still failing because:

1. **Template queries returning 0 results**: The templates are being created but queries aren't finding them
2. **Permission checks**: The `hasPermission` function may not be working correctly in test environment

## Recommended Next Steps

1. **Run database migration** to ensure schema is up-to-date:
   ```bash
   npx prisma migrate dev
   ```

2. **Generate Prisma client** to ensure types are current:
   ```bash
   npx prisma generate
   ```

3. **Check if test database is properly configured** in `tests/setupEnv.ts`

4. **Consider mocking Prisma** for unit tests instead of using real database

## Test Command

To run only these specific tests:
```bash
npx tsx --test tests/api/designer-security.test.ts tests/api/template-versioning.test.ts
```
