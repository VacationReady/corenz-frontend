# NZ Payroll Export - Gap Analysis & Implementation Plan

**Version:** 1.0  
**Date:** 2024-11-08  
**Status:** Design Phase

---

## Executive Summary

Gap analysis between current system and NZ IRD compliance requirements.

**Key Findings:**
- 🟢 **Complete:** Overtime hours tracking
- 🔴 **Critical:** Tax calculations, public holiday tracking, leave balances
- 🟡 **Medium:** IRD validation, student loan tracking
- 🟢 **Low:** Enhanced reporting

---

## Part 1: Database Schema Gaps

### Employee Model - Required Fields

**Missing Fields:**
```prisma
model Employee {
  // NEW REQUIRED
  dateOfBirth DateTime?
  studentLoanBalance Decimal? @db.Decimal(10, 2)
  hasStudentLoan Boolean @default(false)
  kiwiSaverEmployeeRate Decimal? @db.Decimal(4, 2) // Change from Int
  kiwiSaverEmployerRate Decimal? @db.Decimal(4, 2) @default(0.03)
  esctRate Decimal? @db.Decimal(4, 2)
  annualLeaveBalance Decimal @default(0) @db.Decimal(8, 2)
  sickLeaveBalance Decimal @default(80) @db.Decimal(8, 2)
  alternativeDaysBalance Int @default(0)
}
```

**Priority:** 🔴 CRITICAL | **Time:** 2-3 hours

---

### TimesheetEntry Model - Public Holiday Fields

**Missing Fields:**
```prisma
model TimesheetEntry {
  // NEW REQUIRED
  isPublicHoliday Boolean @default(false)
  publicHolidayName String?
  publicHolidayHours Decimal @default(0) @db.Decimal(5, 2)
  publicHolidayMultiplier Decimal @default(2.0) @db.Decimal(3, 2)
  alternativeDayGranted Boolean @default(false)
}
```

**Priority:** 🔴 CRITICAL | **Time:** 1-2 hours

---

### New PayrollCalculation Model

**Status:** ❌ Missing

```prisma
model PayrollCalculation {
  id String @id
  timesheetId String
  employeeId String
  grossPay Decimal @db.Decimal(10, 2)
  payeTax Decimal @db.Decimal(10, 2)
  accLevy Decimal @db.Decimal(10, 2)
  studentLoanDeduction Decimal @db.Decimal(10, 2)
  kiwiSaverEmployee Decimal @db.Decimal(10, 2)
  kiwiSaverEmployer Decimal @db.Decimal(10, 2)
  netPay Decimal @db.Decimal(10, 2)
  calculatedAt DateTime @default(now())
  // ... more fields
}
```

**Priority:** 🔴 CRITICAL | **Time:** 3-4 hours

---

## Part 2: Business Logic Gaps

### Tax Calculators - Not Implemented

#### PAYE Calculator
**File:** `lib/payroll/paye-calculator.ts`
**Status:** ❌ Missing
**Priority:** 🔴 CRITICAL
**Time:** 8-12 hours

```typescript
export function calculatePAYE(params: {
  grossEarnings: number;
  taxCode: NZTaxCode;
  payFrequency: PayFrequency;
}): { paye: number; effectiveRate: number }
```

#### ACC Levy Calculator
**File:** `lib/payroll/acc-calculator.ts`
**Status:** ❌ Missing
**Priority:** 🔴 CRITICAL
**Time:** 2-3 hours

#### Student Loan Calculator
**File:** `lib/payroll/student-loan-calculator.ts`
**Status:** ❌ Missing
**Priority:** 🔴 CRITICAL
**Time:** 2-3 hours

#### KiwiSaver Calculator
**File:** `lib/payroll/kiwisaver-calculator.ts`
**Status:** ❌ Missing
**Priority:** 🔴 CRITICAL
**Time:** 3-4 hours

---

## Part 3: API Gaps

### Required Endpoints

**1. Enhanced Payroll Export**
- Endpoint: `POST /api/payroll/export`
- Status: ⚠️ Incomplete (drops overtime, no tax calculations)
- Priority: 🔴 CRITICAL
- Time: 8-12 hours

**2. Payroll Calculation**
- Endpoint: `POST /api/payroll/calculate`
- Status: ❌ Missing
- Priority: 🔴 CRITICAL
- Time: 6-8 hours

**3. IRD Filing** (Optional Phase 5)
- Endpoint: `POST /api/payroll/ird-filing`
- Status: ❌ Missing
- Priority: 🟢 LOW
- Time: 16-20 hours

---

## Part 4: Validation Gaps

### Required Validators

**File:** `lib/payroll/validators.ts`

**Functions Needed:**
- `validateIRDNumber(irdNumber: string): boolean`
- `validateTaxCode(taxCode: string): boolean`
- `validatePayrollExport(companyId, period): ValidationResult`
- `validateEmployeePayroll(employee): ValidationErrors`

**Validation Rules:**
- ✅ IRD numbers with checksum
- ✅ Tax codes against enum
- ✅ Net pay = Gross - Deductions
- ✅ No negative amounts
- ⚠️ Overtime > 20 hours/week
- ⚠️ PAYE seems low for tax code

**Priority:** 🔴 CRITICAL | **Time:** 4-6 hours

---

## Part 5: Onboarding Gaps

### Missing Employee Information Collection

**Current:** ⚠️ Incomplete

**Required Additions:**
1. ✅ IRD Number (exists, needs validation)
2. ✅ Tax Code (exists, needs validation)
3. ❌ Date of Birth
4. ❌ Student Loan Declaration
5. ❌ KiwiSaver Rate Selection (3%, 4%, 6%, 8%, 10%)
6. ❌ ESCT Rate
7. ✅ Bank Account (exists)

**Priority:** 🔴 CRITICAL | **Time:** 6-8 hours

---

## Part 6: Implementation Roadmap

### Phase 1: Database (Week 1) - 3-5 days
- [ ] Migrate Employee model (leave balances, KiwiSaver rates)
- [ ] Migrate TimesheetEntry (public holiday fields)
- [ ] Create PayrollCalculation model
- [ ] Data migration scripts

### Phase 2: Tax Calculators (Week 2) - 5-7 days
- [ ] PAYE calculator with all tax codes
- [ ] ACC levy calculator
- [ ] Student Loan calculator
- [ ] KiwiSaver calculator
- [ ] Unit tests (100+ cases)

### Phase 3: Payroll Service (Week 3) - 5-7 days
- [ ] PayrollCalculationService
- [ ] Integrate all calculators
- [ ] Validation service
- [ ] Calculation API endpoint

### Phase 4: Export Enhancement (Week 4) - 5-7 days
- [ ] Update export to use PayrollCalculation
- [ ] CSV/Excel/JSON exports with all fields
- [ ] Validation warnings
- [ ] Audit logging

### Phase 5: Onboarding (Week 5) - 3-5 days
- [ ] IRD validation in onboarding
- [ ] Tax code selection
- [ ] Student loan + KiwiSaver setup
- [ ] Make fields mandatory

### Phase 6: Leave Management (Week 6) - 5-7 days
- [ ] Leave accrual automation
- [ ] Alternative days tracking
- [ ] Leave balance UI
- [ ] Include in export

---

## Part 7: Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Tax calculation errors | 🔴 Critical | Medium | Extensive testing, IRD verification |
| Data migration issues | 🔴 Critical | Low | Backup, rollback plan, staging |
| Missing IRD numbers | 🔴 Critical | High | Mandatory in onboarding |
| Performance issues | 🟡 Medium | Low | Optimize queries, indexes |
| User adoption | 🟡 Medium | Medium | Training, documentation |

---

## Part 8: Testing Requirements

### Unit Tests: 120+ test cases
- PAYE calculation (20+ tests)
- ACC levy (5+ tests)
- Student loan (10+ tests)
- KiwiSaver (15+ tests)
- Validators (20+ tests)
- Export functions (15+ tests)

### Integration Tests: 15+ scenarios
- End-to-end export
- Multi-employee calculation
- Public holiday detection
- Leave accrual
- Validation handling

### Compliance Tests: 10+ scenarios
- IRD format validation
- 6-year retention
- Holidays Act compliance
- Audit trail completeness

---

## Part 9: Success Criteria

- ✅ All employees have valid IRD numbers
- ✅ Tax calculations match IRD requirements
- ✅ Overtime correctly exported
- ✅ Public holidays tracked
- ✅ Leave balances maintained
- ✅ 0 critical validation errors
- ✅ Export time < 30s (100 employees)
- ✅ 100% calculator test coverage

---

## Appendix: Current System Status

**What's Working:**
- ✅ Overtime hours tracking (already implemented)
- ✅ Overtime multipliers
- ✅ Regular hours tracking
- ✅ Employee IRD/tax code fields exist
- ✅ Bank account storage

**What's Missing:**
- ❌ Tax calculations (PAYE, ACC, Student Loan, KiwiSaver)
- ❌ Public holiday tracking
- ❌ Leave balance management
- ❌ Payroll validation
- ❌ Complete export format

**Total Estimated Implementation Time:** 6-8 weeks (30-40 days)

---

**END OF GAP ANALYSIS**
