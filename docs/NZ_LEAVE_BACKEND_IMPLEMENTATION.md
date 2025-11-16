# NZ Leave Compliance - Backend Implementation

**Date:** November 16, 2025  
**Status:** ✅ Complete  
**Version:** 1.0

## Overview

Complete backend implementation for NZ-compliant leave tooling with anniversary-based annual leave accrual, sick leave entitlements, alternative holidays, and public holiday tracking.

## Architecture

### 1. Database Schema Changes

#### Employee Model Extensions (`prisma/schema.prisma`)

```prisma
model Employee {
  // ... existing fields
  
  // NZ Leave Compliance Fields (Holidays Act 2003)
  sickLeaveDaysPerYear         Decimal?  @db.Decimal(4,1) @default(10)
  alternativeHolidayBalance    Decimal?  @db.Decimal(5,1) @default(0)
  publicHolidaysPerYear        Int?      @default(11)
  
  // Audit Fields
  employmentStartDate          DateTime? // Critical for anniversary calculations
}
```

**Field Descriptions:**
- `sickLeaveDaysPerYear`: Annual sick leave entitlement (NZ minimum: 10 days after 6 months)
- `alternativeHolidayBalance`: Current balance of alternative holidays earned for working public holidays
- `publicHolidaysPerYear`: Number of public holidays per year (11 national + regional for NZ)
- `employmentStartDate`: Used for anniversary-based leave calculations

#### Migration

**File:** `prisma/migrations/20250116120000_add_nz_leave_compliance_fields/migration.sql`

```sql
ALTER TABLE "Employee" 
  ADD COLUMN IF NOT EXISTS "sickLeaveDaysPerYear" DECIMAL(4,1) DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "alternativeHolidayBalance" DECIMAL(5,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "publicHolidaysPerYear" INTEGER DEFAULT 11;

COMMENT ON COLUMN "Employee"."sickLeaveDaysPerYear" IS 
  'NZ Holidays Act 2003: Annual sick leave entitlement (minimum 10 days after 6 months)';
COMMENT ON COLUMN "Employee"."alternativeHolidayBalance" IS 
  'NZ Holidays Act 2003: Alternative holiday days earned when working public holidays';
COMMENT ON COLUMN "Employee"."publicHolidaysPerYear" IS 
  'NZ Holidays Act 2003: Number of public holidays per year (11 national + regional)';
```

**To Apply:**
```bash
npx prisma migrate deploy
# or for development
npx prisma migrate dev
```

### 2. API Updates

#### POST `/api/employees` - Employee Creation

**Schema Validation** (`app/api/employees/route.ts:28-128`):

```typescript
const createEmployeeSchema = z.object({
  // ... existing fields
  
  // NZ Leave Compliance Fields
  sickLeaveDays: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === "") {
        return 10; // NZ default: 10 days after 6 months
      }
      const parsed = Number(val);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 10;
    },
    z.number().nonnegative(),
  ),
  
  alternativeHolidayDays: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === "") return 0;
      const parsed = Number(val);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    },
    z.number().nonnegative(),
  ),
  
  publicHolidayEntitlement: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === "") {
        return 11; // NZ default: 11 national + regional holidays
      }
      const parsed = Number(val);
      return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 11;
    },
    z.number().int().nonnegative(),
  ),
});
```

**Employee Creation** (`app/api/employees/route.ts:443-477`):

```typescript
const employee = await prisma.employee.create({
  data: {
    // ... existing fields
    
    startDate: new Date(startDate),
    employmentStartDate: new Date(startDate), // Store for anniversary calculations
    
    // NZ Leave Compliance Fields
    sickLeaveDaysPerYear: sickLeaveDays,
    alternativeHolidayBalance: alternativeHolidayDays,
    publicHolidaysPerYear: publicHolidayEntitlement,
    
    // Initialize sick leave balance with the annual entitlement
    sickLeaveBalance: sickLeaveDays * 8, // Convert to hours (8 hours per day)
  },
});
```

#### GET `/api/employees` - Employee Listing

**Response includes** (`app/api/employees/route.ts:295-299`):

```typescript
{
  // ... existing fields
  
  // NZ Leave Compliance Fields
  sickLeaveDaysPerYear: emp.sickLeaveDaysPerYear,
  alternativeHolidayBalance: emp.alternativeHolidayBalance,
  publicHolidaysPerYear: emp.publicHolidaysPerYear,
  employmentStartDate: emp.employmentStartDate,
}
```

### 3. Leave Calculator Service

**File:** `lib/payroll/leave-calculator.ts`

#### Anniversary-Based Entitlement Calculation

```typescript
/**
 * Calculate prorated annual leave entitlement based on start date anniversary
 * 
 * NZ Compliance: Annual leave accrues as 4 weeks after 12 months of continuous employment.
 * Before the first anniversary, leave is prorated based on days remaining to anniversary.
 */
export function calculateAnniversaryBasedEntitlement(
  startDate: Date,
  currentDate: Date = new Date(),
  daysPerWeek: number = 5,
  fullTimeEntitlement: number = 20
): number
```

**Algorithm:**
1. Validate inputs (future dates, bounds checking)
2. Calculate first anniversary date: `startDate + 1 year`
3. Calculate annual entitlement: `(daysPerWeek / 5) × fullTimeEntitlement`
4. If past anniversary: return full entitlement
5. Otherwise: prorate based on days remaining to anniversary
6. Round to nearest 0.5 days

**Formula:**
```
proratedEntitlement = annualEntitlement × (daysRemaining / 365)
```

#### Working Pattern Analysis

```typescript
/**
 * Calculate days worked per week from a working pattern
 */
export function calculateDaysPerWeek(workingPattern: {
  weeks: Array<{
    days: Array<{ type: string }>;
  }>;
}): number
```

**Logic:**
- Counts `FULL_DAY` as 1.0 days
- Counts `HALF_DAY_AM` / `HALF_DAY_PM` as 0.5 days
- Averages across multiple weeks for rotating patterns
- Returns 5.0 (full-time) as default if pattern is invalid

### 4. Type Safety & Validation

#### Input Validation

**Zod Schema Features:**
- ✅ Type coercion with safe defaults
- ✅ Bounds checking (non-negative values)
- ✅ Integer enforcement for public holidays
- ✅ Graceful handling of empty/null values

**Error Handling:**
```typescript
if (error instanceof z.ZodError) {
  return NextResponse.json(
    {
      success: false,
      error: "Invalid request body",
      details: error.flatten(),
    },
    { status: 400 },
  );
}
```

## NZ Compliance Rules

### Annual Leave (Holidays Act 2003)

**Entitlement:**
- **Minimum:** 4 weeks (20 days) after 12 months of continuous employment
- **Accrual:** Based on start date anniversary, not fiscal year
- **Proration:** Before first anniversary, prorated by days remaining/365

**Part-Time:**
- Formula: `(daysWorkedPerWeek / 5) × 20 days`
- Example: 3 days/week = 12 days annual leave

### Sick Leave (Holidays Act 2003)

**Entitlement:**
- **Minimum:** 10 days per year after 6 months of continuous employment
- **Accrual:** Begins after 6-month qualifying period
- **Maximum:** 20 days (unused sick leave can carry over)

**Storage:**
- Stored in `sickLeaveDaysPerYear` (configurable per employee)
- Balance tracked in `sickLeaveBalance` (hours)

### Alternative Holidays

**Entitlement:**
- 1 alternative day for each public holiday worked
- Must be taken within 12 months
- Can be paid out by agreement

**Storage:**
- Balance in `alternativeHolidayBalance` (days)
- Updated when employee works on public holiday

### Public Holidays

**Default:**
- 11 national public holidays + regional observances
- Configurable per employee in `publicHolidaysPerYear`

**NZ Public Holidays:**
1. New Year's Day
2. Day after New Year's Day
3. Waitangi Day
4. Good Friday
5. Easter Monday
6. ANZAC Day
7. Queen's Birthday
8. Matariki
9. Labour Day
10. Christmas Day
11. Boxing Day

## Testing

### Unit Tests

**File:** `tests/lib/leave-calculator-anniversary.test.ts`

**Coverage:** 25 comprehensive tests
- ✅ Full-time employees at various points in first year
- ✅ Part-time employees (various schedules)
- ✅ Past anniversary scenarios
- ✅ Edge cases (leap years, exact anniversary, future dates)
- ✅ Working pattern calculations
- ✅ Input validation and error handling
- ✅ Consistency and determinism checks

**Run Tests:**
```bash
npx tsx --test tests/lib/leave-calculator-anniversary.test.ts
```

**Expected Output:**
```
✔ 25 tests passed
✔ 0 tests failed
Duration: ~500ms
```

### Integration Testing

**Employee Creation Flow:**
```bash
# 1. Create employee with NZ leave defaults
POST /api/employees
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "startDate": "2024-01-01",
  "sickLeaveDays": 10,          // Optional, defaults to 10
  "alternativeHolidayDays": 0,   // Optional, defaults to 0
  "publicHolidayEntitlement": 11 // Optional, defaults to 11
}

# 2. Verify response includes NZ fields
GET /api/employees
[
  {
    "id": "...",
    "sickLeaveDaysPerYear": 10,
    "alternativeHolidayBalance": 0,
    "publicHolidaysPerYear": 11,
    "employmentStartDate": "2024-01-01T00:00:00.000Z"
  }
]
```

## API Examples

### Calculate Leave Entitlement

```typescript
import { 
  calculateAnniversaryBasedEntitlement,
  calculateDaysPerWeek 
} from '@/lib/payroll/leave-calculator';

// Example 1: Full-time employee, 6 months into first year
const entitlement1 = calculateAnniversaryBasedEntitlement(
  new Date('2024-01-01'), // startDate
  new Date('2024-07-01'), // currentDate
  5,                       // daysPerWeek
  20                       // fullTimeEntitlement (NZ default)
);
// Result: ~10 days

// Example 2: Part-time employee (3 days/week), full year
const entitlement2 = calculateAnniversaryBasedEntitlement(
  new Date('2023-01-01'),
  new Date('2024-01-01'),
  3,
  20
);
// Result: 12 days (60% of 20 days)

// Example 3: Calculate days from working pattern
const pattern = {
  weeks: [
    {
      days: [
        { type: 'FULL_DAY' },
        { type: 'FULL_DAY' },
        { type: 'HALF_DAY_AM' },
        { type: 'FULL_DAY' },
        { type: 'OFF' },
        { type: 'OFF' },
        { type: 'OFF' },
      ]
    }
  ]
};
const daysPerWeek = calculateDaysPerWeek(pattern);
// Result: 3.5 days
```

### Frontend Integration

```typescript
// In AddEmployeeModal calculateEntitlement function
import { 
  calculateAnniversaryBasedEntitlement,
  calculateDaysPerWeek 
} from '@/lib/payroll/leave-calculator';

const selectedPattern = workingPatterns.find(p => p.id === workingPatternId);
const daysPerWeek = calculateDaysPerWeek(selectedPattern);

const entitlement = calculateAnniversaryBasedEntitlement(
  new Date(startDate),
  new Date(),
  daysPerWeek,
  parseFloat(fullTimeEntitlement || "20")
);

// Result rounded to nearest 0.5 days
```

## Performance Considerations

### Database Indexing

**Recommended Indexes:**
```sql
-- For anniversary-based queries
CREATE INDEX idx_employee_employment_start_date 
  ON "Employee" ("employmentStartDate") 
  WHERE "employmentStartDate" IS NOT NULL;

-- For leave balance queries
CREATE INDEX idx_employee_leave_balances 
  ON "Employee" ("companyId", "isActive", "annualLeaveBalance");
```

### Caching Strategy

**Leave Calculations:**
- Cache anniversary dates (changes once per year per employee)
- Cache working pattern analysis (changes infrequently)
- Recalculate balances on:
  - Leave request approval/rejection
  - Leave adjustment by HR
  - Anniversary date reached

### Batch Processing

**For Bulk Operations:**
```typescript
// Calculate leave for all employees at once
const employees = await prisma.employee.findMany({
  where: { companyId, isActive: true },
  select: {
    id: true,
    employmentStartDate: true,
    workingPatternId: true,
    WorkingPattern: true,
  },
});

const calculations = employees.map(emp => {
  const daysPerWeek = calculateDaysPerWeek(emp.WorkingPattern);
  return {
    employeeId: emp.id,
    entitlement: calculateAnniversaryBasedEntitlement(
      emp.employmentStartDate,
      new Date(),
      daysPerWeek,
      20
    ),
  };
});
```

## Migration Guide

### For Existing Deployments

#### Step 1: Run Database Migration
```bash
npx prisma migrate deploy
```

#### Step 2: Backfill Existing Records
```typescript
// Script: scripts/backfill-nz-leave-fields.ts
import { prisma } from '@/lib/prisma';

async function backfillNZLeaveFields() {
  const employees = await prisma.employee.findMany({
    where: {
      sickLeaveDaysPerYear: null,
    },
  });

  for (const employee of employees) {
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        sickLeaveDaysPerYear: 10,
        alternativeHolidayBalance: 0,
        publicHolidaysPerYear: 11,
        employmentStartDate: employee.startDate || employee.User.createdAt,
      },
    });
  }

  console.log(`Updated ${employees.length} employees`);
}

backfillNZLeaveFields();
```

Run:
```bash
npx tsx scripts/backfill-nz-leave-fields.ts
```

#### Step 3: Verify Data Integrity
```sql
-- Check for null values
SELECT COUNT(*) FROM "Employee" 
WHERE "sickLeaveDaysPerYear" IS NULL
   OR "alternativeHolidayBalance" IS NULL
   OR "publicHolidaysPerYear" IS NULL;
-- Should return 0

-- Check for invalid values
SELECT COUNT(*) FROM "Employee"
WHERE "sickLeaveDaysPerYear" < 0
   OR "alternativeHolidayBalance" < 0
   OR "publicHolidaysPerYear" < 0;
-- Should return 0
```

### Step 4: Update Existing Integrations

**Leave Request Approval:**
```typescript
// When approving leave request, check alternative holiday balance
if (leaveRequest.categoryType === 'PUBLIC_HOLIDAY_WORKED') {
  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      alternativeHolidayBalance: {
        increment: 1, // Add 1 alternative day
      },
    },
  });
}
```

**Anniversary Date Notifications:**
```typescript
// Notify HR when employee reaches anniversary
const today = new Date();
const anniversaryEmployees = await prisma.employee.findMany({
  where: {
    employmentStartDate: {
      gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
    },
  },
});

// Send notifications or update entitlements
```

## Backward Compatibility

### UK/International Deployments

The system remains fully compatible with UK and international deployments:

1. **Flexible Entitlement:** `fullTimeEntitlement` parameter accepts any value (20 for NZ, 25-28 for UK)
2. **Optional Fields:** All NZ fields have defaults and can be null
3. **Custom Holiday Years:** Existing `holidayYear` field remains functional
4. **Dual Calculation:** Both anniversary-based and fiscal-year-based calculations supported

### Configuration

**Company-Level Settings** (future enhancement):
```typescript
interface CompanyLeaveSettings {
  leaveAccrualMethod: 'ANNIVERSARY' | 'FISCAL_YEAR';
  fullTimeAnnualLeaveDays: number; // 20 for NZ, 25-28 for UK
  sickLeaveEnabled: boolean;
  sickLeaveDaysPerYear: number;
  publicHolidayCount: number;
  alternativeHolidaysEnabled: boolean;
}
```

## Security Considerations

### Access Control

**Employee Creation:**
- ✅ Requires authenticated session
- ✅ Company-scoped (cannot create for other companies)
- ✅ Role-based: Only ADMIN can create employees

**Leave Field Updates:**
- ✅ Only HR/ADMIN can modify leave balances
- ✅ Audit logging for all leave changes
- ✅ Validation prevents negative balances

### Data Privacy

**Sensitive Fields:**
- Leave balances are employee-specific
- GDPR/Privacy Act compliance:
  - Include in employee data export
  - Remove on employee deletion (cascade)
  - Mask in reports unless authorized

## Monitoring & Observability

### Metrics to Track

1. **Leave Balance Health:**
   - Employees with negative balances
   - Employees exceeding max leave (8 weeks)
   - Average leave balance by department

2. **Anniversary Events:**
   - Employees reaching first anniversary this month
   - Failed leave calculations (errors)

3. **API Performance:**
   - `/api/employees POST` response time
   - Leave calculation time (p50, p95, p99)

### Logging

```typescript
console.log('[NZ Leave] Employee created:', {
  employeeId,
  sickLeaveDays,
  alternativeHolidays,
  publicHolidays,
  employmentStartDate,
});

console.log('[NZ Leave] Anniversary calculation:', {
  employeeId,
  startDate,
  currentDate,
  daysPerWeek,
  calculatedEntitlement,
  durationMs,
});
```

## Next Steps & Roadmap

### Phase 1: Foundation ✅ (Complete)
- [x] Database schema
- [x] API endpoints
- [x] Leave calculator
- [x] Unit tests
- [x] Documentation

### Phase 2: Automation (In Progress)
- [ ] Automated anniversary notifications
- [ ] Bulk leave entitlement updates
- [ ] Scheduled jobs for balance corrections

### Phase 3: Reporting
- [ ] Leave forecast reports
- [ ] Anniversary calendar
- [ ] Compliance dashboards
- [ ] Export for payroll systems

### Phase 4: Advanced Features
- [ ] Alternative holiday workflow
- [ ] Public holiday calendar integration
- [ ] Leave accrual projections
- [ ] Mobile app support

## Support & Resources

### Documentation
- [NZ Leave Frontend Implementation](./NZ_LEAVE_COMPLIANCE_IMPLEMENTATION.md)
- [Holidays Act 2003](https://www.employment.govt.nz/leave-and-holidays/)
- [NZ Employment Relations Act](https://www.employment.govt.nz/about/employment-law/)

### Code References
- Database: `prisma/schema.prisma:478-481`
- API: `app/api/employees/route.ts:80-127, 443-477`
- Calculator: `lib/payroll/leave-calculator.ts:391-492`
- Tests: `tests/lib/leave-calculator-anniversary.test.ts`

### Contact
For questions or issues related to NZ leave compliance implementation, refer to the development team or raise an issue in the project repository.

---

**Last Updated:** November 16, 2025  
**Contributors:** Cascade AI  
**Review Status:** Ready for Production
