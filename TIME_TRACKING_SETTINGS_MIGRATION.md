# Time Tracking Settings Migration Guide

## Overview

This document describes the migration from legacy time tracking settings field names to canonical, type-safe field names across the database, API, and UI layers.

## Migration Date

**January 8, 2025** - Schema version `20250108000001_unify_time_tracking_settings`

## Changes Summary

### Database Schema Changes (Prisma)

#### Renamed Fields

| Old Field Name | New Field Name | Type Change | Notes |
|---------------|----------------|-------------|-------|
| `requireGPS` | `requireGpsLocation` | `Boolean` → `Boolean` | No type change, name standardization |
| `requirePhoto` | `photoRequirement` | `String` → `PhotoRequirement` enum | Converted to proper enum |
| `allowMobileClock` | `allowManualTimeEntry` | `Boolean` → `Boolean` | Clarified field purpose |
| `requireShiftConfirm` | `requireShiftConfirmation` | `Boolean` → `Boolean` | Name completion |
| `overtimeCalculationMode` | `overtimeCalculationMode` | `String` → `OvertimeCalculationMode` enum | Converted to proper enum |
| `exportFormat` | `payrollExportFormat` | `String` → `PayrollExportFormat` enum | Clarified purpose + enum |

#### New Fields Added

| Field Name | Type | Default | Description |
|-----------|------|---------|-------------|
| `enableGeofencing` | `Boolean` | `false` | Enable location-based restrictions |
| `geofenceRadius` | `Int` | `100` | Default geofence radius in meters |
| `requireBreaks` | `Boolean` | `true` | Require break periods |
| `minBreakDuration` | `Int` | `30` | Minimum break duration in minutes |
| `includeBreaks` | `Boolean` | `true` | Include breaks in exports |
| `includeNotes` | `Boolean` | `true` | Include notes in exports |

#### New Enums

```prisma
enum PhotoRequirement {
  NONE              // No photo required
  CLOCK_IN          // Photo required on clock in only
  CLOCK_IN_OUT      // Photo required on both clock in and out
}

enum OvertimeCalculationMode {
  DAILY             // Overtime when any day exceeds threshold
  WEEKLY            // Week total exceeds threshold
  MONTHLY           // Month total exceeds threshold
  PATTERN_BASED     // Compare actual vs contracted hours from working patterns
}

enum PayrollExportFormat {
  CSV
  EXCEL
  JSON
}
```

### API Changes

#### `/api/settings/time-tracking` (GET/PUT)

**Canonical Field Names (Preferred)**:
- `requireGpsLocation` (boolean)
- `photoRequirement` ('NONE' | 'CLOCK_IN' | 'CLOCK_IN_OUT')
- `allowManualTimeEntry` (boolean)
- `payrollExportFormat` ('CSV' | 'EXCEL' | 'JSON')

**Deprecated Field Names (Backward Compatible)**:
- `enableGPSTracking` (boolean) - maps to `requireGpsLocation`
- `requirePhotos` (boolean) - maps to `photoRequirement !== 'NONE'`
- `allowManualEntry` (boolean) - maps to `allowManualTimeEntry`

**Backward Compatibility**:
- API accepts both old and new field names in PUT requests
- API returns both old and new field names in GET responses (temporary)
- Console warnings logged when deprecated fields are used
- Deprecated fields will be removed in a future version

### UI Changes

#### Admin Settings Page (`app/(withSidebar)/admin/settings/time-tracking/page.tsx`)

**Updated Components**:
- Photo requirement changed from boolean switch to radio group with 3 options
- GPS tracking renamed to "Require GPS Location"
- Manual entry renamed to "Allow Manual Time Entry"
- All overtime calculation modes use proper enum values

#### ClockWidget Component (`components/time-tracking/ClockWidget.tsx`)

**Props Updated**:
```typescript
interface ClockWidgetProps {
  requireGpsLocation?: boolean;  // was: requireGPS
  photoRequirement?: 'NONE' | 'CLOCK_IN' | 'CLOCK_IN_OUT';  // was: requirePhoto
  onClockIn?: (data: ClockData) => Promise<void>;
  onClockOut?: (data: ClockData) => Promise<void>;
}
```

#### Legacy Rota UI (`app/(withSidebar)/rota/settings/TimeTrackingSettings.tsx`)

**Status**: No changes required
- Continues to use deprecated field names
- Works via API backward compatibility layer
- Should be migrated in future sprint

### API Consumers Updated

All endpoints updated to use canonical field names:
- `/api/time-tracking/clock-in` - Uses `requireGpsLocation`, `photoRequirement`
- `/api/time-tracking/clock-out` - Uses `requireGpsLocation`, `photoRequirement`
- `/api/time-tracking/sync` - Uses `requireGpsLocation`

## Migration Steps

### 1. Run Database Migration

```bash
npx prisma migrate deploy
```

This will:
- Create new enum types
- Add new columns with canonical names
- Backfill data from old columns
- Drop old columns

### 2. Regenerate Prisma Client

```bash
npx prisma generate
```

### 3. Verify TypeScript Compilation

```bash
npm run build
```

All TypeScript errors should be resolved after Prisma client regeneration.

### 4. Test Key Workflows

- [ ] Admin can update time tracking settings via UI
- [ ] Settings persist correctly to database
- [ ] Clock in/out respects GPS and photo requirements
- [ ] Overtime calculation uses correct mode
- [ ] Payroll export uses correct format

## Data Migration Details

### Photo Requirement Mapping

Old `requirePhoto` string values mapped to new enum:
- `"NO"` → `NONE`
- `"CLOCK_IN"` → `CLOCK_IN`
- `"BOTH"` or `"CLOCK_IN_OUT"` → `CLOCK_IN_OUT`

### Overtime Calculation Mode Mapping

Old string values mapped to new enum:
- `"DAILY"` → `DAILY`
- `"WEEKLY"` → `WEEKLY`
- `"MONTHLY"` → `MONTHLY`
- `"PATTERN_BASED"` → `PATTERN_BASED`

### Export Format Mapping

Old `exportFormat` string values mapped to new enum:
- `"CSV"` → `CSV`
- `"EXCEL"` → `EXCEL`
- `"JSON"` → `JSON`

## Rollback Plan

If issues arise, rollback steps:

1. Revert Prisma schema changes
2. Create rollback migration to restore old columns
3. Revert API layer changes
4. Revert UI changes
5. Regenerate Prisma client

**Rollback Migration** (if needed):
```sql
-- Restore old columns from new columns
ALTER TABLE "TimeTrackingSettings" 
  ADD COLUMN "requireGPS" BOOLEAN,
  ADD COLUMN "requirePhoto" TEXT,
  ADD COLUMN "allowMobileClock" BOOLEAN,
  ADD COLUMN "exportFormat" TEXT;

-- Copy data back
UPDATE "TimeTrackingSettings" 
  SET "requireGPS" = "requireGpsLocation",
      "requirePhoto" = CASE 
        WHEN "photoRequirement" = 'CLOCK_IN_OUT' THEN 'BOTH'
        WHEN "photoRequirement" = 'CLOCK_IN' THEN 'CLOCK_IN'
        ELSE 'NO'
      END,
      "allowMobileClock" = "allowManualTimeEntry",
      "exportFormat" = "payrollExportFormat"::TEXT;
```

## Future Deprecation Timeline

- **Phase 1 (Current)**: Dual support - both old and new field names work
- **Phase 2 (Q2 2025)**: Deprecation warnings in API responses
- **Phase 3 (Q3 2025)**: Remove backward compatibility layer
- **Phase 4 (Q4 2025)**: Remove deprecated field support entirely

## Testing Checklist

### Unit Tests
- [ ] Prisma schema validation
- [ ] API endpoint request/response validation
- [ ] Enum value mapping

### Integration Tests
- [ ] Settings CRUD operations
- [ ] Clock in/out with various photo requirements
- [ ] Overtime calculation with different modes
- [ ] Payroll export in different formats

### E2E Tests
- [ ] Admin settings page workflow
- [ ] Employee clock widget workflow
- [ ] Legacy rota settings (backward compatibility)

## Support

For questions or issues related to this migration:
- Check TypeScript compilation errors first
- Verify Prisma client was regenerated
- Review API console logs for deprecation warnings
- Contact: Development Team

## References

- Prisma Schema: `prisma/schema.prisma`
- Migration File: `prisma/migrations/20250108000001_unify_time_tracking_settings/migration.sql`
- API Route: `app/api/settings/time-tracking/route.ts`
- Admin UI: `app/(withSidebar)/admin/settings/time-tracking/page.tsx`
