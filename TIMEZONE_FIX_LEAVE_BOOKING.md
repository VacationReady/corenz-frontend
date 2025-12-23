# Timezone Fix: Leave Booking Date Mismatch

## Problem
When booking sick leave for "today" (Dec 23), the system showed a conflict with sickness on "yesterday" (Dec 22) in the calendar. This was caused by timezone mismatches in date handling.

## Root Cause
The issue occurred because dates were being handled inconsistently across three parts of the system:

1. **Date Input**: User selects "2025-12-23" in the UI
2. **Date Parsing**: `new Date("2025-12-23")` creates a Date object at **UTC midnight** (00:00 UTC)
3. **Date Storage**: Database stores the UTC timestamp
4. **Date Display**: Calendar uses **local timezone methods** (`getDate()`, `getMonth()`, `getFullYear()`)
5. **Date Validation**: Uses `dayjs().startOf("day")` which also uses local timezone

### Example of the Bug
In New Zealand (UTC+13):
- User selects: "2025-12-23"
- `new Date("2025-12-23")` creates: 2025-12-23T00:00:00.000Z (UTC)
- In NZ local time, this is: 2025-12-23T13:00:00+13:00 (1pm on Dec 23)
- When calendar displays using `getDate()`: Shows as Dec 22 (because UTC midnight is still Dec 22 in some contexts)
- When validation compares dates: Compares UTC timestamps which can span different days

## Solution
Changed date parsing to use **local timezone** consistently throughout:

### 1. Leave Request API (`app/api/employees/[id]/leave-requests/route.ts`)
```typescript
// OLD: Parsed as UTC midnight
const startDateObj = new Date(startDate);
const endDateObj = new Date(endDate);

// NEW: Parse as local midnight
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const startDateObj = parseLocalDate(startDate);
const endDateObj = parseLocalDate(endDate);
```

### 2. Validation Logic (`app/lib/validateLeaveRequest.ts`)
```typescript
// OLD: Used dayjs which could cause timezone shifts
const rangeStart = dayjs(startDate).startOf("day").toDate();
const rangeEnd = dayjs(endDate).endOf("day").toDate();

// NEW: Use UTC with local date components to avoid shifts
const rangeStart = new Date(Date.UTC(
  startDate.getFullYear(), 
  startDate.getMonth(), 
  startDate.getDate(), 
  0, 0, 0, 0
));
const rangeEnd = new Date(Date.UTC(
  endDate.getFullYear(), 
  endDate.getMonth(), 
  endDate.getDate(), 
  23, 59, 59, 999
));
```

### 3. Bulk Actions (`app/api/bulk-actions/leave/route.ts`)
Applied the same `parseLocalDate` function for consistency.

## How It Works Now
1. User selects "2025-12-23" in the UI
2. Date is parsed as local midnight: `new Date(2025, 11, 23, 0, 0, 0, 0)`
3. Database stores this as the local midnight timestamp
4. Calendar displays using local methods: Shows Dec 23
5. Validation compares using UTC with local components: Correctly identifies overlaps

## Testing
To verify the fix:
1. Book sick leave for "today" (Dec 23)
2. Try to book holiday for the same date
3. Should see conflict error with correct date (Dec 23, not Dec 22)
4. Calendar should display the event on Dec 23

## Files Changed
- `app/api/employees/[id]/leave-requests/route.ts` - Added `parseLocalDate` function
- `app/lib/validateLeaveRequest.ts` - Changed overlap check to use UTC with local components
- `app/api/bulk-actions/leave/route.ts` - Added `parseLocalDate` function

## Notes
- The calendar API (`app/api/calendar-events/route.ts`) already uses local timezone methods for display, so no changes needed there
- This fix ensures dates are treated as "calendar dates" (Dec 23 is Dec 23 everywhere) rather than "instants in time" (which vary by timezone)
- All date comparisons now happen in a consistent timezone context
