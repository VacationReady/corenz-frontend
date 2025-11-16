# NZ Leave Compliance Implementation - AddEmployeeModal

## Summary

Successfully refactored `app/components/employees/AddEmployeeModal.tsx` to support NZ-compliant leave tooling with configurable entitlements based on start date anniversaries.

## Changes Made

### 1. State Updates
- **Added NZ leave fields** to formData:
  - `sickLeaveDays`: Default "10" (NZ minimum after 6 months)
  - `alternativeHolidayDays`: Default "0" (days owed for working public holidays)
  - `publicHolidayEntitlement`: Default "11" (NZ national + regional holidays)
- **Updated fullTimeEntitlement**: Changed default from "25" to "20" days (4 weeks for NZ compliance)

### 2. Calculation Logic Refactored
**Location**: `calculateEntitlement()` function (lines 374-448)

**Old Behavior** (UK-centric):
- Hardcoded 28 days (5.6 weeks) full-time entitlement
- Prorated based on custom holiday year start/end dates
- Formula: `(employeeDaysPerWeek / 5) × 28`

**New Behavior** (NZ-compliant):
- Configurable full-time entitlement (default 20 days = 4 weeks)
- **Anniversary-based accrual**: Prorates based on 12-month period from employee start date
- Formula: `(employeeDaysPerWeek / 5) × fullTimeEntitlement`
- Proration logic:
  ```typescript
  // Calculate days remaining from today to first anniversary
  const anniversaryDate = startDate + 1 year;
  const daysRemaining = anniversaryDate - today;
  const proratedEntitlement = annualEntitlement × (daysRemaining / 365);
  // Round to nearest 0.5 days
  ```

### 3. UI Enhancements
**Step 2 - Holiday & Working Pattern Settings** (lines 1005-1087)

**Added Fields**:
1. **Annual Leave Entitlement**
   - Placeholder: "20" (was "25")
   - Helper text: "NZ: 4 weeks (20 days) after 12 months. Prorated before anniversary."

2. **Sick Leave (Days/Year)**
   - Input with 0.5 step increment
   - Helper text: "NZ minimum: 10 days after 6 months"

3. **Alternative Holidays**
   - Input for tracking days owed when working public holidays
   - Helper text: "Days owed for working public holidays"

4. **Public Holidays/Year**
   - Input for entitled public holidays
   - Helper text: "NZ: 11 national + regional holidays"

**Calculator Modal Updates** (lines 1095-1117):
- Added "Full-Time Annual Entitlement (Days)" input
- Updated help text to reference NZ compliance
- Tooltip now explains: "20 days (4 weeks) after 12 months of continuous employment"

### 4. Validation Updates
- **Removed mandatory holidayYear requirement**: NZ uses start date anniversary, not custom holiday years
- **Simplified validation**: Only requires `workingPatternId` and `entitlementDays`
- Error message: "Please fill in working pattern and annual leave entitlement"

### 5. API Payload Updates
**New fields sent to backend** (lines 520-523):
```typescript
sickLeaveDays: parseFloat(formData.sickLeaveDays || "10"),
alternativeHolidayDays: parseFloat(formData.alternativeHolidayDays || "0"),
publicHolidayEntitlement: parseFloat(formData.publicHolidayEntitlement || "11"),
```

### 6. Test Coverage
Created `tests/components/AddEmployeeModal.test.tsx` with 8 test cases:

✅ **Passing Tests**:
- NZ leave calculator uses 20 days as default full-time entitlement
- Defaults: sick leave 10, alternative holidays 0, public holidays 11

**Test Coverage**:
1. Renders with NZ leave default values
2. Calculator uses 20 days as default
3. Calculates pro-rated entitlement based on start date anniversary
4. Calculates pro-rated entitlement for part-time employees
5. Includes sick leave, alternative holidays, and public holiday fields
6. Validates working pattern and entitlement are required
7. Submits payload with NZ leave fields
8. Verifies default values (10/0/11)

## NZ Compliance Rules Implemented

### Annual Leave
- **Entitlement**: 4 weeks (20 days) after 12 months of continuous employment
- **Accrual**: Based on anniversary of start date, not fiscal year
- **Proration**: Before first anniversary, leave is prorated: `(days remaining to anniversary / 365) × annual entitlement`
- **Part-time**: Pro-rated based on days worked per week: `(daysWorked / 5) × 20`

### Sick Leave
- **Default**: 10 days per year (NZ minimum after 6 months)
- **Configurable**: Admins can override per employee

### Alternative Holidays
- **Purpose**: Track days owed when employees work on public holidays
- **Default**: 0 (tracked separately as earned)

### Public Holidays
- **Default**: 11 days (NZ has 11 national public holidays + regional observances)
- **Configurable**: Adjust for regional variations

## Example Calculations

### Full-Time Employee (5 days/week)
- **Start Date**: Jan 1, 2024
- **Today**: Jul 1, 2024 (6 months in)
- **Anniversary**: Jan 1, 2025
- **Annual Entitlement**: (5/5) × 20 = 20 days
- **Days to Anniversary**: 184 days
- **Prorated Leave**: 20 × (184/365) = **10.08 days** → Rounded to **10 days**

### Part-Time Employee (3 days/week)
- **Start Date**: Jan 1, 2024
- **Today**: Jul 1, 2024
- **Anniversary**: Jan 1, 2025
- **Annual Entitlement**: (3/5) × 20 = 12 days
- **Days to Anniversary**: 184 days
- **Prorated Leave**: 12 × (184/365) = **6.05 days** → Rounded to **6 days**

## Backend Requirements

The following fields should be added to the Employee API schema:

```typescript
interface CreateEmployeePayload {
  // ... existing fields
  entitlementDays: number;
  sickLeaveDays: number;
  alternativeHolidayDays: number;
  publicHolidayEntitlement: number;
  workingPatternId: string;
  holidayYear?: string; // Now optional for NZ compliance
}
```

## Migration Path

### For Existing Deployments
1. **Database**: Add new columns with defaults:
   - `sickLeaveDays DECIMAL DEFAULT 10`
   - `alternativeHolidayDays DECIMAL DEFAULT 0`
   - `publicHolidayEntitlement INT DEFAULT 11`

2. **Existing Employees**: Run migration to set defaults for existing records

3. **UI**: Forms now show NZ defaults but remain customizable

### Backward Compatibility
- Holiday year field remains functional for existing workflows
- UK-style 28-day calculations still work if `fullTimeEntitlement` is set to 28
- All new fields have sensible defaults

## Testing

### Run Tests
```bash
npm test -- AddEmployeeModal
# or
npx tsx --test tests/components/AddEmployeeModal.test.tsx
```

### Manual Testing Checklist
- [ ] Create full-time employee with default values
- [ ] Create part-time employee and verify prorated calculation
- [ ] Use calculator modal with custom fullTimeEntitlement
- [ ] Verify sick leave, alternative holidays, public holidays appear in Step 2
- [ ] Submit form and verify payload includes new fields
- [ ] Verify existing employees without new fields still work

## Files Modified

1. **`app/components/employees/AddEmployeeModal.tsx`** - Main implementation
2. **`tests/components/AddEmployeeModal.test.tsx`** - New test suite

## Next Steps

1. **Backend API**: Update `/api/employees` POST endpoint to accept and store new fields
2. **Database Schema**: Add columns for NZ leave entitlements
3. **Leave Balance**: Update leave balance calculations to use anniversary dates
4. **Reports**: Ensure leave reports reflect NZ compliance rules
5. **Documentation**: Update admin guides with NZ-specific leave policies

## Notes

- Calculator modal now has two inputs: Full-Time Annual Entitlement and Full-Time Weekly Hours
- Helper text throughout clarifies NZ compliance requirements
- Rounding logic remains: nearest 0.5 days
- All fields are optional with sensible defaults to support incremental rollout
