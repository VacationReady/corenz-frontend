# Timezone Fix: Leave Booking Date Mismatch

## Problem
When booking sick leave for "today" (Dec 23), the system showed a conflict with sickness on "yesterday" (Dec 22) in the calendar, even though the calendar showed Dec 23 as blank. The error message said Dec 23 was taken, but the calendar showed the sickness on Dec 22 and 24.

## Root Cause
The issue had two parts:

### Part 1: Mixed Date Storage Formats
The database contained leave records in two different formats:
- **Old records**: Stored as UTC midnight (e.g., `2025-12-23T00:00:00.000Z`)
- **New records**: Would be stored as local midnight (e.g., `2025-12-22T11:00:00.000Z` for NZ UTC+13)

### Part 2: Timestamp-Based Comparison
The validation logic was comparing dates using timestamps with timezone-aware methods (`dayjs().startOf("day")`), which caused:
- Different timestamps for the same calendar date
- False positive overlaps when comparing old vs new format dates

### Example of the Bug
In New Zealand (UTC+13):
- Existing sickness: `2025-12-23T00:00:00.000Z` (UTC midnight Dec 23)
  - Displays as: Dec 23 (correct)
- New leave request: User selects "2025-12-23"
  - Old code would create: `2025-12-23T00:00:00.000Z` (UTC midnight)
  - New code creates: `2025-12-22T11:00:00.000Z` (local midnight, which is Dec 22 11:00 UTC)
- Validation: Sees these as different timestamps and flags overlap incorrectly

## Solution
Changed the system to compare dates **by calendar day** rather than by timestamp:

### 1. Leave Request API (`app/api/employees/[id]/leave-requests/route.ts`)
```typescript
// Parse dates as local midnight (consistent with user's calendar view)
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const startDateObj = parseLocalDate(startDate);
const endDateObj = parseLocalDate(endDate);
```

### 2. Validation Logic (`app/lib/validateLeaveRequest.ts`)
```typescript
// Helper to normalize any date to calendar date string (YYYY-MM-DD)
const toCalendarDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Compare by calendar date, not timestamp
const requestStartCal = toCalendarDate(startDate);
const requestEndCal = toCalendarDate(endDate);

// Fetch all potential overlaps and filter by calendar date
const potentialOverlaps = await prisma.leaveRequest.findMany({...});
const overlapping = potentialOverlaps.find((existing) => {
  const existingStartCal = toCalendarDate(new Date(existing.startDate));
  const existingEndCal = toCalendarDate(new Date(existing.endDate));
  return requestStartCal <= existingEndCal && requestEndCal >= existingStartCal;
});
```

### 3. Removed dayjs Dependency
Replaced all `dayjs()` calls with native Date methods to avoid timezone-aware calculations:
```typescript
// OLD: dayjs(startDate).startOf("day")
// NEW: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
```

### 4. Bulk Actions (`app/api/bulk-actions/leave/route.ts`)
Applied the same `parseLocalDate` function for consistency.

## How It Works Now
1. User selects "2025-12-23" in the UI
2. Date is parsed as local midnight: `new Date(2025, 11, 23, 0, 0, 0, 0)`
3. Database stores this timestamp (which may be different in UTC)
4. **Validation compares by calendar date**: Extracts "2025-12-23" from both old and new records
5. Calendar displays using local methods: Shows Dec 23 correctly
6. Overlap detection works correctly regardless of how dates were originally stored

## Key Insight
The fix treats dates as **calendar dates** (Dec 23 is Dec 23 everywhere) rather than **instants in time** (which vary by timezone). This is the correct approach for all-day events like leave requests.

## Backward Compatibility
The solution handles both old (UTC midnight) and new (local midnight) date formats:
- Old records: `2025-12-23T00:00:00.000Z` → extracts "2025-12-23"
- New records: `2025-12-22T11:00:00.000Z` → extracts "2025-12-23" (using local methods)
- Both compare as the same calendar date

## Testing
To verify the fix:
1. Book sick leave for "today" (Dec 23)
2. Try to book holiday for the same date
3. Should see conflict error with correct date (Dec 23)
4. Calendar should display events on the correct dates
5. Works with both old and new date formats in the database

## Files Changed
- `app/api/employees/[id]/leave-requests/route.ts` - Added `parseLocalDate` function
- `app/lib/validateLeaveRequest.ts` - Changed overlap check to compare by calendar date, removed dayjs
- `app/api/bulk-actions/leave/route.ts` - Added `parseLocalDate` function

## Optional: Database Migration
If you want to normalize all existing dates to the new format, run:
```bash
npx tsx scripts/fix-leave-dates-timezone.ts
```

This will convert all UTC midnight dates to local midnight dates. However, this is **optional** because the validation now handles both formats correctly.
