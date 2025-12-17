# NZ Sick Leave - Implementation Guide

## Overview

This document describes the NZ Holidays Act 2003 compliant sick leave implementation using a ledger-based, anniversary-grant model.

## Legal Model (Holidays Act 2003)

### Entitlement Rules

| Rule | Value |
|------|-------|
| Eligibility | After **6 months** continuous employment |
| Initial Grant | **10 days** on eligibility date |
| Anniversary Grant | **10 days** every 12 months thereafter |
| Maximum Balance | **20 days** (cap enforced at grant time only) |
| Paid Status | At normal rate |
| Waiting Days | None |

### Key Differences from Legacy Model

| Aspect | Legacy (Accrual) | New (Anniversary-Grant) |
|--------|------------------|-------------------------|
| Accumulation | Per pay period | Annual grant on anniversary |
| Eligibility | Immediate | After 6 months |
| Cap Enforcement | Continuous | At grant time only |
| Balance Tracking | Direct field update | Ledger-based |
| Audit Trail | None | Full ledger history |

## Entitlement Timeline

```
Employment Start (Day 0)
    │
    │  ← No sick leave eligibility
    │
    ▼
Month 6 (Eligibility Date)
    │
    │  ← First grant: 10 days
    │
    ▼
Month 18 (First Anniversary)
    │
    │  ← Second grant: 10 days
    │  ← Cap check: if balance > 20 days, clamp to 20
    │
    ▼
Month 30 (Second Anniversary)
    │
    │  ← Third grant: 10 days
    │  ← Cap check
    │
    ...continues annually...
```

## Canonical Employment Date Rule

The system uses a canonical date rule to determine employment start:

```typescript
if (employee.employmentStartDate) {
  return employee.employmentStartDate;
} else {
  return employee.startDate;
}
```

**Always use `getCanonicalEmploymentDate()` from `lib/leave/nz-sick-leave-ledger.ts`** to ensure consistent date handling across the codebase.

## Units & Rounding

### Internal Unit: Hours

All internal calculations and storage use **hours** as the base unit.

```typescript
const HOURS_PER_DAY = 8;
const SICK_LEAVE_GRANT_DAYS = 10;
const SICK_LEAVE_GRANT_HOURS = 80;  // 10 days × 8 hours
const SICK_LEAVE_CAP_HOURS = 160;   // 20 days × 8 hours
```

### Display Unit: Days

UI displays balance in **days**, rounded to **0.5 day increments**.

```typescript
function hoursToDisplayDays(hours: number): number {
  const days = hours / HOURS_PER_DAY;
  return Math.round(days * 2) / 2;  // Round to nearest 0.5
}
```

### Display Rules

- ✅ Show: "5.5 days available"
- ✅ Show: "Eligible from 2024-07-01"
- ✅ Show: "Next 10 days added 2025-07-01"
- ❌ Never show: "80 hours per year"
- ❌ Never show: Accrual language

## Grant Timing Strategy

**Strategy: Lazy on-read** (chosen for this implementation)

Grants are applied lazily when sick leave balance is read or used. This approach:
- Avoids scheduled job complexity
- Ensures balance is always up-to-date when needed
- Handles missed grants automatically

### Required Call Sites

The `applySickLeaveGrants()` function **MUST** be called from:

1. **Sick leave balance API** - `app/api/leave-request/route.ts` (scope=balances)
2. **Leave booking validation** - `app/lib/validateLeaveRequest.ts`
3. **Manager approval endpoint** - `app/lib/advanceLeaveApproval.ts`
4. **Payroll calculation read path** - Before reading sick leave balance for payroll

Missing any of these call sites is a **defect**.

## Ledger Architecture

### LeaveBalanceLedger Table

The `LeaveBalanceLedger` table is the **single source of truth** for all sick leave balance changes.

```prisma
model LeaveBalanceLedger {
  id             String                @id
  employeeId     String
  companyId      String
  leaveType      LeaveBalanceLedgerType  // SICK_LEAVE
  eventType      LeaveBalanceLedgerEvent // OPENING_BALANCE, GRANT, USAGE, CAP_CLAMP, ADJUSTMENT
  deltaHours     Decimal               // Positive for grants, negative for usage
  balanceAfter   Decimal               // Running balance
  grantDate      DateTime?             // For GRANT events
  idempotencyKey String                @unique
  sourceRef      String?               // e.g., leaveRequestId
  description    String?
  createdBy      String?
  createdAt      DateTime
}
```

### Event Types

| Event Type | Description | deltaHours |
|------------|-------------|------------|
| `OPENING_BALANCE` | Migration only | Current balance |
| `GRANT` | Anniversary grant (10 days) | +80 hours |
| `USAGE` | Leave taken | Negative |
| `CAP_CLAMP` | Balance capped at 20 days | Negative |
| `ADJUSTMENT` | Manual HR adjustment | Any |

### Idempotency Keys

All ledger writes use idempotency keys to prevent duplicates:

```
SICK_GRANT:<employeeId>:<grantDate>
SICK_USAGE:<leaveRequestId>
SICK_CAP_CLAMP:<employeeId>:<date>
SICK_OPENING_BALANCE:<employeeId>
SICK_USAGE_REVERSAL:<leaveRequestId>
```

### Employee.sickLeaveBalance

The `Employee.sickLeaveBalance` field is a **cache** only. It is:

- Updated exclusively via the ledger helper functions
- Never written directly from other code
- Safe to read for display purposes

**DO NOT** write to `sickLeaveBalance` outside of `lib/leave/nz-sick-leave-ledger.ts`.

## Concurrency Safety

### Approach: Row-Level Locking

The implementation uses `SELECT ... FOR UPDATE` to prevent concurrent grant application:

```typescript
const employees = await tx.$queryRaw`
  SELECT ... FROM "Employee"
  WHERE id = ${employeeId}
  FOR UPDATE
`;
```

Combined with the unique constraint on `idempotencyKey`, this ensures:
- No duplicate grants
- Safe concurrent access
- Serializable transaction isolation

## Migration

### Running the Migration

```bash
# Preview changes (dry run)
npm run migrate:nz-sick-leave -- --dry-run

# Execute migration
npm run migrate:nz-sick-leave
```

### Migration Steps

1. **Schema migration**: Creates `LeaveBalanceLedger` table and new Employee fields
2. **Data backfill**: For each employee:
   - Creates `OPENING_BALANCE` ledger entry with current balance
   - Sets `sickLeaveEligibilityDate` (6 months from start)
   - Sets `sickLeaveLastGrantDate` based on tenure

### Migration Rules

- Balances are **NOT clamped** during migration
- Employees above 20-day cap are **reported** but not modified
- Cap will be enforced at the next grant time

### Verification Checklist

After migration, verify:

- [ ] `LeaveBalanceLedger` table exists
- [ ] All active employees have `OPENING_BALANCE` entries
- [ ] `sickLeaveEligibilityDate` is set for all employees
- [ ] `sickLeaveLastGrantDate` is set for eligible employees
- [ ] Above-cap report reviewed

## API Changes

### Booking Rejection (Pre-Eligibility)

When an employee attempts to book sick leave before eligibility:

```json
{
  "success": false,
  "error": "You are not yet eligible for sick leave. Eligibility begins on 2024-07-01 after 6 months of continuous employment.",
  "code": "SICK_LEAVE_NOT_ELIGIBLE",
  "eligibleFrom": "2024-07-01"
}
```

### Balance Response

The sick leave balance API now includes eligibility information:

```json
{
  "balanceDays": 10,
  "balanceHours": 80,
  "isEligible": true,
  "eligibilityDate": "2024-07-01",
  "nextGrantDate": "2025-07-01",
  "daysUntilNextGrant": 180
}
```

## UI Guidelines

### Employee Leave Request Dialog

Display:
- Sick leave available (days)
- "Eligible from <date>" (if not yet eligible)
- "Next 10 days added <date>" (if eligible)
- Disable submit button before eligibility

### Manager Approval View

Display:
- Employee's eligibility status
- Current balance
- Next grant date
- Block approval if pre-eligibility

### Balance Overview / Dashboard

- Show days only (0.5 increments)
- Never use accrual phrasing
- Show eligibility milestone for new starters

## Testing

Run the test suite:

```bash
npm test -- tests/nz-sick-leave-ledger.test.ts
```

### Test Coverage

- 6-month eligibility boundary
- First grant calculation
- Multiple missed grants
- Cap enforcement (20 days)
- Booking rejection pre-eligibility
- Ledger idempotency
- Unit conversions

## Payroll Integration

### Removed Behaviors

- ❌ Sick leave accrual per pay period
- ❌ Direct `sickLeaveBalance` mutation from payroll

### New Behaviors

- ✅ Payroll reads balance (cache is updated by ledger)
- ✅ Payroll may consume balance via `recordSickLeaveUsage()`
- ✅ `skipSickLeaveAccrual: true` flag in leave calculator

## Files Changed

### Core Implementation
- `prisma/schema.prisma` - LeaveBalanceLedger model, Employee fields
- `lib/leave/nz-sick-leave-ledger.ts` - Entitlement engine

### API Updates
- `app/api/employees/route.ts` - Employee creation (no seeding)
- `app/api/leave-request/route.ts` - Balance endpoint
- `app/lib/validateLeaveRequest.ts` - Eligibility guard
- `app/lib/advanceLeaveApproval.ts` - Ledger integration

### Payroll Updates
- `lib/payroll/leave-calculator.ts` - Skip sick leave accrual
- `lib/payroll/payroll-calculation-service.ts` - No direct balance update

### Migration & Tests
- `scripts/migrate-nz-sick-leave.ts` - Migration script
- `tests/nz-sick-leave-ledger.test.ts` - Test suite

## Known Risks / Follow-ups

1. **Existing employees with pre-seeded balances**: Migration handles via OPENING_BALANCE
2. **Employees above 20-day cap**: Reported but not clamped; enforced at next grant
3. **UI components**: May need updates to show eligibility status
4. **Mobile app**: May need updates to reflect new model
5. **Reports**: Leave reports may need updates for new fields

## References

- [NZ Holidays Act 2003](https://www.legislation.govt.nz/act/public/2003/0129/latest/DLM236387.html)
- [Employment NZ - Sick Leave](https://www.employment.govt.nz/leave-and-holidays/sick-leave/)
