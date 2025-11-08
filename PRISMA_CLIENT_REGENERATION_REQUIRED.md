# ⚠️ Prisma Client Regeneration Required

## Issue
The database migration has been applied, but Prisma Client is still using the old field names. TypeScript is showing errors because the generated Prisma types don't match the updated schema.

## Current State
- ✅ Database migration applied (`20251108035700_fix_time_tracking_settings_columns`)
- ✅ Prisma schema updated with correct field names
- ❌ Prisma Client NOT regenerated (still has old types)

## Field Name Mapping
| Old Name (Prisma Client) | New Name (Schema) |
|--------------------------|-------------------|
| `requireGPS` | `requireGpsLocation` |
| `requirePhoto` | `photoRequirement` |
| (field doesn't exist) | `allowManualTimeEntry` |

## Solution
Run the following command to regenerate Prisma Client:

```powershell
npx prisma generate
```

This will:
1. Read the updated `prisma/schema.prisma` file
2. Generate new TypeScript types matching the schema
3. Update `node_modules/@prisma/client` with correct types
4. Fix all TypeScript errors

## After Regeneration
Once Prisma Client is regenerated, the TypeScript errors will disappear because:
- `settings.requireGpsLocation` will be recognized
- `settings.photoRequirement` will be recognized  
- `settings.allowManualTimeEntry` will be recognized

## Deployment Note
**IMPORTANT**: On Vercel/deployment, Prisma Client is automatically regenerated during the build process, so this issue only affects local development. However, you should still run `npx prisma generate` locally to verify the types are correct before pushing.

## Verification
After running `npx prisma generate`, verify the types are correct:

```typescript
// This should now work without errors:
import { TimeTrackingSettings } from '@prisma/client';

const settings: TimeTrackingSettings = await prisma.timeTrackingSettings.findUnique({
  where: { companyId: 'test' }
});

// These fields should now exist:
console.log(settings.requireGpsLocation);  // ✅ boolean
console.log(settings.photoRequirement);     // ✅ 'NONE' | 'CLOCK_IN' | 'CLOCK_IN_OUT'
console.log(settings.allowManualTimeEntry); // ✅ boolean
```

## Why This Happened
1. Database migration was applied (schema changed in DB)
2. Prisma schema file was updated to match
3. But `npx prisma generate` wasn't run yet
4. So Prisma Client still has old types from before the migration

This is normal - Prisma Client generation is a separate step from migrations.
