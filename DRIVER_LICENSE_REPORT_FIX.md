# Driver License Report Fix

## Problem
When trying to preview a driver license report, the system showed "No records" even though employees had driver license information in the database.

## Root Cause
The reporting system had a critical issue with how it handled reports that mixed multiple data models:

1. When creating any report, the system requires `User.firstName` and `User.lastName` as mandatory fields
2. When you selected driver license fields (`DriverLicence.type`, `DriverLicence.licenceNumber`, etc.), the query builder detected multiple models (User + DriverLicence)
3. The query builder would pick a "primary model" (usually User since those fields came first)
4. **It would then filter out ALL fields from other models**, effectively dropping the DriverLicence fields from the query
5. Result: A report with only User information and no driver license data

## Solution
Implemented field anchoring for driver license reports (similar to the existing leave request handling):

### Changes Made

#### 1. Query Route (`app/api/reports/query/route.ts`)
- Added `anchorFieldToDriverLicence()` function that rewrites User/Employee fields to be anchored under DriverLicence
  - Example: `User.firstName` → `DriverLicence.Employee.User.firstName`
- Updated `rewriteFieldsForLeaveContext()` to detect and handle DriverLicence fields
- Added support for Job Role and Working Pattern fields when querying through DriverLicence
- Added support for Employee start date fallback computation

#### 2. Computed Handlers (`app/lib/computedHandlers.ts`)
- Added computed field handlers for DriverLicence model:
  - `_computed.jobRoleName` - Resolves job role through Employee relation
  - `_computed.workingPatternName` - Resolves working pattern with assignment fallback
  - `_computed.effectiveStartDate` - Resolves employee start date with fallback

### Bonus Improvements
Applied the same fix to other employee-related models that had the same issue:
- **EmploymentCheck** - Now works correctly when mixed with User fields
- **TrainingRecord** - Now works correctly when mixed with User fields

## How It Works Now

### Before Fix
```
Selected Fields: User.firstName, User.lastName, DriverLicence.type, DriverLicence.licenceNumber
↓
Query Builder detects multiple models
↓
Picks "User" as primary model
↓
Filters out DriverLicence fields ❌
↓
Query only includes: User.firstName, User.lastName
↓
Result: No driver license data!
```

### After Fix
```
Selected Fields: User.firstName, User.lastName, DriverLicence.type, DriverLicence.licenceNumber
↓
Query Builder detects DriverLicence fields
↓
Anchors User fields to DriverLicence: DriverLicence.Employee.User.firstName, DriverLicence.Employee.User.lastName
↓
Primary model: DriverLicence ✅
↓
Query includes: DriverLicence.Employee.User.firstName, DriverLicence.Employee.User.lastName, DriverLicence.type, DriverLicence.licenceNumber
↓
Result: Proper driver license report with employee information!
```

## Testing the Fix

1. Go to **Reports** → **Create Report**
2. Expand "Documents & Compliance" category
3. Select driver license fields:
   - License Type
   - License Number
   - License Issue Date
   - License Expiry Date
4. Click "Next: Preview Report"
5. You should now see all employees with driver license information! 🎉

## Technical Notes

- The fix follows the same pattern as LeaveRequest field anchoring that was already in place
- Driver license reports now correctly query from the `DriverLicence` model and include related Employee and User data
- The tenant security filter (`DriverLicence.Employee.companyId`) now works correctly because the Employee relation is properly included
- Each driver license becomes a separate row in the report (since employees can have multiple licenses)

## Related Files Modified
1. `app/api/reports/query/route.ts` - Query rewriting and field anchoring
2. `app/lib/computedHandlers.ts` - Computed field resolution for related models

