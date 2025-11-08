# New Zealand IRD-Compliant Payroll Export Specification

**Version:** 1.0  
**Date:** 2024-11-08  
**Status:** Design Phase - Awaiting Implementation  
**Compliance:** NZ Employment Relations Act 2000, Holidays Act 2003, Tax Administration Act 1994

---

## Executive Summary

This specification defines the payroll export format for New Zealand Inland Revenue Department (IRD) compliance. Current exports drop overtime hours and omit critical tax information, creating direct risk of underpayment and IR submission failures.

**Critical Gaps Identified:**
- ❌ Overtime hours not exported
- ❌ IRD numbers may be missing
- ❌ Tax codes not validated
- ❌ PAYE calculations missing
- ❌ KiwiSaver deductions not calculated
- ❌ Student loan deductions not tracked
- ❌ Leave accruals not included
- ❌ Public holiday premiums not separately identified

---

## Part 1: NZ IRD Payroll Requirements

### 1.1 Employer Filing Requirements (Payday Filing)

Under NZ tax law, employers must file employment information **within 2 working days** of each payday. This includes:

#### Employee Identification (IR330 Essentials)
- **IRD Number:** 8-9 digit unique tax identifier (required by Tax Administration Act 1994 s24)
- **Tax Code:** Valid NZ tax code (M, ME, SB, S, SH, ST, SA, SL, etc.)
- **Employee Name:** Full legal name matching IRD records
- **Employee Date of Birth:** For PAYE verification

#### Earnings Information
- **Gross Earnings:** Total pay before deductions
  - Regular pay (standard hours)
  - Overtime pay (separately itemized)
  - Public holiday premiums (Holidays Act 2003 compliance)
  - Allowances (travel, uniform, etc.)
  - Bonuses and commissions
  
#### Tax Deductions (PAYE)
- **PAYE Tax:** Calculated using IRD tax tables or AIM method
- **Student Loan Deductions:** 12% of earnings above threshold ($24,128 for 2024/25)
- **KiwiSaver Employee Contribution:** 3%, 4%, 6%, 8%, or 10%
- **KiwiSaver Employer Contribution:** Minimum 3% (compulsory employer contribution)
- **ESCT (Employer Superannuation Contribution Tax):** Tax on employer KiwiSaver contributions

#### Leave Accruals
- **Annual Leave:** 4 weeks per year (8% of gross earnings method)
- **Sick Leave:** 10 days per year after 6 months
- **Public Holiday Entitlement:** 12 public holidays + 1 regional
- **Alternative Days:** Owed for working public holidays

#### Pay Period Information
- **Pay Period Start Date:** ISO 8601 format
- **Pay Period End Date:** ISO 8601 format
- **Payment Date:** Actual date wages paid
- **Pay Frequency:** Weekly, Fortnightly, Monthly

### 1.2 IRD Validation Rules

#### IRD Number Validation Algorithm
```
1. Must be 8-9 digits (9 digits with leading zeros)
2. Checksum validation using IRD algorithm:
   - Multiply each digit by weighting (3,2,7,6,5,4,3,2)
   - Sum results
   - Divide by 11
   - Remainder must be 0
3. Cannot start with 0
```

#### Valid Tax Codes (2024/25 Tax Year)
| Code | Description | Usage |
|------|-------------|-------|
| M | Primary employment, no student loan | Most common |
| ME | Primary employment, no student loan, low earner | <$24k annual |
| M SL | Primary employment with student loan | |
| ME SL | Primary employment, low earner, student loan | |
| SB | Secondary employment | Part-time/casual |
| SB SL | Secondary employment with student loan | |
| S | Secondary employment, higher rate | |
| S SL | Secondary employment, SL deduction | |
| SH | Higher secondary rate | |
| ST | Special tax rate | |
| SA | Special exempt rate | |
| SL | Student loan only | No PAYE |
| CAE | Casual agricultural employee | |
| EDW | Election day worker | |
| ND | Non-declaration rate (45%) | Missing tax code |
| NS | Non-resident seasonal worker | |

#### PAYE Calculation Requirements
- Must use current IRD tax tables
- Apply ACC earner levy (currently 1.46% of gross earnings, capped at $142,283)
- Student loan threshold: $24,128 (2024/25)
- KiwiSaver calculations on gross earnings before PAYE

### 1.3 Record Retention Requirements

**Section 130, Employment Relations Act 2000:**
- Wage and time records: **6 years**
- Holiday and leave records: **6 years**
- Employment agreements: **6 years after employment ends**
- PAYE records: **7 years** (Tax Administration Act 1994)

### 1.4 Holidays Act 2003 Compliance

**Public Holiday Premium Recording:**
- Must separately track public holiday hours
- Minimum rate: 1.5x (time and a half)
- Common rate: 2.0x (double time)
- Must record which public holiday (Christmas, Waitangi Day, etc.)
- Alternative day entitlement if employee works the holiday

**Leave Balance Tracking:**
- Annual leave: Accrues continuously (8% method or weeks method)
- Sick leave: 10 days per year after 6 months service
- Alternative days: Granted when working public holidays
- Bereavement leave: 3 days per occasion

---

## Part 2: Export Schema Design

See separate file: `NZ_PAYROLL_EXPORT_SCHEMA.ts`

Key fields included:
- **Employee Identification:** IRD number, tax code, name, email
- **Regular Earnings:** Hours, rate, pay
- **Overtime Earnings:** Hours, rate, multiplier, pay, reason
- **Public Holiday Premium:** Hours, rate, multiplier, pay, holiday name
- **Tax Deductions:** PAYE, ACC levy, student loan, KiwiSaver, ESCT
- **Leave Balances:** Annual leave, sick leave, alternative days
- **Pay Totals:** Gross, deductions, net, employer cost
- **Metadata:** Pay period dates, payment date, company info, audit trail

---

## Part 3: File Format Specifications

### 3.1 CSV Format

**Filename:** `payroll_export_YYYYMMDD_HHMMSS.csv`

**Encoding:** UTF-8 with BOM (for Excel compatibility)

**Example:**
```csv
Employee ID,IRD Number,Employee Name,Tax Code,Regular Hours,Regular Pay,Overtime Hours,Overtime Pay,Overtime Multiplier,Public Holiday Hours,Public Holiday Pay,PAYE Tax,ACC Levy,Student Loan,KiwiSaver Employee,KiwiSaver Employer,Gross Pay,Net Pay,Pay Period Start,Pay Period End,Payment Date
"EMP001","123456789","John Smith","M",80.00,2400.00,10.00,450.00,1.50,8.00,480.00,596.35,43.71,0.00,99.90,99.90,3380.00,2529.55,"2024-02-05","2024-02-11","2024-02-15"
```

### 3.2 Excel Format (XLSX)

**Filename:** `payroll_export_YYYYMMDD_HHMMSS.xlsx`

**Workbook Structure:**
- **Sheet 1:** Payroll Data (all employee records)
- **Sheet 2:** Summary (totals by department, location)
- **Sheet 3:** Validation Errors (missing data, warnings)
- **Sheet 4:** Leave Balances (detailed leave report)

**Formatting:**
- Currency: NZD `$#,##0.00`
- Hours: `0.00`
- Percentages: `0.00%`
- Dates: `DD/MM/YYYY`

### 3.3 JSON Format

**Filename:** `payroll_export_YYYYMMDD_HHMMSS.json`

**Structure:**
```json
{
  "metadata": {
    "exportVersion": "1.0",
    "exportedAt": "2024-02-15T14:30:00Z",
    "companyId": "COMP001",
    "payPeriodStart": "2024-02-05",
    "payPeriodEnd": "2024-02-11",
    "totalRecords": 1
  },
  "payrollRecords": [
    {
      "employeeId": "EMP001",
      "irdNumber": "123456789",
      "taxCode": "M",
      "earnings": {
        "regular": { "hours": 80.00, "pay": 2400.00 },
        "overtime": { "hours": 10.00, "pay": 450.00, "multiplier": 1.50 },
        "publicHoliday": { "hours": 8.00, "pay": 480.00 }
      },
      "deductions": {
        "paye": 596.35,
        "acc": 43.71,
        "kiwiSaverEmployee": 99.90,
        "kiwiSaverEmployer": 99.90
      },
      "totals": {
        "grossPay": 3380.00,
        "netPay": 2529.55
      }
    }
  ]
}
```

---

## Part 4: Validation Rules

### 4.1 Pre-Export Validation Checklist

**Critical Validations (Must Pass):**
- ✅ All employees have IRD numbers
- ✅ All IRD numbers pass checksum validation
- ✅ All tax codes are valid NZ codes
- ✅ No negative pay amounts
- ✅ Net pay = Gross pay - Total deductions (within 1 cent)
- ✅ Pay period dates do not overlap with previous exports
- ✅ Payment date >= Pay period end date
- ✅ Regular hours + overtime hours = total hours

**Warning Validations (Can Proceed with Warnings):**
- ⚠️ Overtime hours > 20 in a week (excessive overtime)
- ⚠️ PAYE tax < 10% of gross for M tax code (under-withheld)
- ⚠️ KiwiSaver employee = 0 but not opted out
- ⚠️ Student loan code (SL suffix) but no deduction
- ⚠️ Public holiday worked but no alternative day granted
- ⚠️ Regular hours > 60 per week (health & safety concern)
- ⚠️ Bank account missing (cannot process direct deposit)

### 4.2 Tax Calculation Validations

**PAYE Validation:**
- For M tax code, annual gross > $14,000: PAYE ≥ 10.5%
- For M tax code, annual gross > $48,000: PAYE ≥ 17.5%
- For ND tax code: PAYE = 45%

**ACC Levy Validation:**
- ACC = 1.46% of gross (2024 rate)
- Maximum ACC on $142,283 annual = $2,077.33

**Student Loan Validation:**
- If tax code contains "SL": Deduction = 12% of (gross - $464/week threshold)
- If no "SL" in tax code: Deduction must be $0

**KiwiSaver Validation:**
- Employee rate must be 3%, 4%, 6%, 8%, or 10%
- Employer rate must be ≥ 3%
- If opted out: Both employee and employer = $0

### 4.3 Data Integrity Checks

**Hours Validation:**
```typescript
regularHours + overtimeHours + publicHolidayHours === totalHours
```

**Pay Calculation Validation:**
```typescript
regularPay === regularHours × regularRate
overtimePay === overtimeHours × overtimeRate × overtimeMultiplier
publicHolidayPay === publicHolidayHours × publicHolidayRate × publicHolidayMultiplier
grossPay === regularPay + overtimePay + publicHolidayPay + allowances + bonuses
```

**Deduction Validation:**
```typescript
totalDeductions === payeTax + accLevy + studentLoan + kiwiSaverEmployee + other
netPay === grossPay - totalDeductions
```

---

## Part 5: Gap Analysis

### 5.1 Current vs Required Fields

| Field | Current | Required | Gap | Priority |
|-------|---------|----------|-----|----------|
| **IRD Number** | ✅ In Employee model | ✅ Required | May be null | 🔴 Critical |
| **Tax Code** | ✅ In Employee model | ✅ Required | May be null | 🔴 Critical |
| **Overtime Hours** | ✅ In TimesheetEntry | ✅ Required | ✅ Available | ✅ Complete |
| **Overtime Multiplier** | ✅ In TimesheetEntry | ✅ Required | ✅ Available | ✅ Complete |
| **Public Holiday Hours** | ❌ Not tracked | ✅ Required | Missing field | 🔴 Critical |
| **Public Holiday Name** | ❌ Not tracked | ⚠️ Recommended | Missing field | 🟡 Medium |
| **PAYE Tax** | ❌ Not calculated | ✅ Required | Need calculator | 🔴 Critical |
| **ACC Levy** | ❌ Not calculated | ✅ Required | Need calculator | 🔴 Critical |
| **Student Loan** | ❌ Not tracked | ✅ Required | Missing field | 🔴 Critical |
| **KiwiSaver Employee** | ❌ Not calculated | ✅ Required | Need calculator | 🔴 Critical |
| **KiwiSaver Employer** | ❌ Not calculated | ✅ Required | Need calculator | 🔴 Critical |
| **ESCT** | ❌ Not calculated | ✅ Required | Need calculator | 🔴 Critical |
| **Annual Leave Balance** | ❌ Not in Employee | ⚠️ Recommended | Missing field | 🟡 Medium |
| **Sick Leave Balance** | ❌ Not in Employee | ⚠️ Recommended | Missing field | 🟡 Medium |
| **Alternative Days** | ❌ Not tracked | ⚠️ Recommended | Missing field | 🟡 Medium |
| **Date of Birth** | ❌ Not in Employee | ⚠️ Recommended | Missing field | 🟢 Low |
| **Bank Account** | ✅ In Employee model | ⚠️ Recommended | ✅ Available | ✅ Complete |

### 5.2 Missing Database Fields

**Employee Model Extensions Needed:**
```prisma
model Employee {
  // Existing fields...
  irdNumber String?       // ✅ Already exists
  taxCode TaxCode?        // ✅ Already exists
  
  // NEW FIELDS REQUIRED:
  dateOfBirth DateTime?
  studentLoanBalance Decimal? @db.Decimal(10, 2)
  kiwiSaverEmployeeRate Decimal? @db.Decimal(4, 2) // 0.03, 0.04, 0.06, 0.08, 0.10
  kiwiSaverEmployerRate Decimal? @db.Decimal(4, 2) // Minimum 0.03
  esctRate Decimal? @db.Decimal(4, 2) // 0.105, 0.175, 0.28, 0.33
  
  // Leave balances
  annualLeaveBalance Decimal? @db.Decimal(8, 2) // Hours
  sickLeaveBalance Decimal? @db.Decimal(8, 2) // Hours
  alternativeDaysBalance Int? @default(0) // Days
}
```

**TimesheetEntry Model Extensions:**
```prisma
model TimesheetEntry {
  // Existing overtime fields... ✅ Already complete
  
  // NEW FIELDS REQUIRED:
  isPublicHoliday Boolean @default(false)
  publicHolidayName String? // "Waitangi Day", "Christmas", etc.
  publicHolidayMultiplier Decimal? @db.Decimal(3, 2)
  alternativeDayGranted Boolean @default(false)
}
```

**New PayrollCalculation Model:**
```prisma
model PayrollCalculation {
  id String @id @default(cuid())
  timesheetId String
  employeeId String
  companyId String
  
  // Earnings
  regularPay Decimal @db.Decimal(10, 2)
  overtimePay Decimal @db.Decimal(10, 2)
  publicHolidayPay Decimal @db.Decimal(10, 2)
  allowances Decimal @db.Decimal(10, 2)
  bonuses Decimal @db.Decimal(10, 2)
  grossPay Decimal @db.Decimal(10, 2)
  
  // Deductions
  payeTax Decimal @db.Decimal(10, 2)
  accLevy Decimal @db.Decimal(10, 2)
  studentLoanDeduction Decimal @db.Decimal(10, 2)
  kiwiSaverEmployee Decimal @db.Decimal(10, 2)
  kiwiSaverEmployer Decimal @db.Decimal(10, 2)
  esctDeduction Decimal @db.Decimal(10, 2)
  totalDeductions Decimal @db.Decimal(10, 2)
  
  // Totals
  netPay Decimal @db.Decimal(10, 2)
  employerCost Decimal @db.Decimal(10, 2)
  
  // Pay period
  payPeriodStart DateTime
  payPeriodEnd DateTime
  paymentDate DateTime
  
  // Audit
  calculatedAt DateTime @default(now())
  calculatedBy String
  calculationVersion String
  
  Timesheet Timesheet @relation(fields: [timesheetId], references: [id])
  Employee Employee @relation(fields: [employeeId], references: [id])
  
  @@index([timesheetId])
  @@index([employeeId, payPeriodStart])
}
```

### 5.3 Missing Business Logic

**Tax Calculators Required:**
1. **PAYE Calculator** (lib/payroll/paye-calculator.ts)
   - Implement IRD tax tables for 2024/25
   - Support all tax codes (M, ME, SB, S, etc.)
   - Handle special rates (ND, EDW, CAE)
   
2. **ACC Levy Calculator** (lib/payroll/acc-calculator.ts)
   - 1.46% of gross earnings (2024 rate)
   - Cap at $142,283 annual earnings
   
3. **Student Loan Calculator** (lib/payroll/student-loan-calculator.ts)
   - 12% of earnings above $464/week threshold ($24,128 annual)
   - Only for tax codes with "SL" suffix
   
4. **KiwiSaver Calculator** (lib/payroll/kiwisaver-calculator.ts)
   - Employee: 3%, 4%, 6%, 8%, or 10% of gross
   - Employer: Minimum 3% of gross (may be higher)
   - ESCT: Tax on employer contribution (10.5%, 17.5%, 28%, 33%)
   
5. **Leave Accrual Calculator** (lib/payroll/leave-calculator.ts)
   - Annual leave: 8% of gross earnings or 4 weeks/year
   - Sick leave: 10 days/year after 6 months
   - Alternative days: 1 per public holiday worked

### 5.4 Data Collection Requirements

**Onboarding Process Updates:**
1. **Mandatory IRD Number Collection**
   - Validate with checksum algorithm
   - Cannot proceed without valid IRD number
   
2. **Tax Code Declaration (IR330 Form)**
   - Employee must declare tax code
   - Default to "M" if primary employment
   - Warn if using "ND" (non-declaration 45% rate)
   
3. **KiwiSaver Election**
   - Default opt-in (3% employee, 3% employer)
   - Allow opt-out with declaration
   - Record employee and employer rates
   
4. **Student Loan Declaration**
   - Ask if employee has student loan
   - If yes, tax code must include "SL"
   - Optional: Record balance for tracking
   
5. **Bank Account for Direct Deposit**
   - Format: XX-XXXX-XXXXXXX-XXX (15-16 digits)
   - Validate bank number against NZ bank list
   
6. **Date of Birth**
   - Required for PAYE verification
   - Used to calculate age-based entitlements

---

## Part 6: Risk Assessment

### 6.1 Compliance Risks

| Risk | Impact | Likelihood | Severity | Mitigation |
|------|--------|------------|----------|------------|
| **Missing IRD numbers** | Cannot file payday return | High | 🔴 Critical | Mandatory field in onboarding |
| **Invalid tax codes** | Incorrect PAYE withheld | Medium | 🔴 Critical | Validation against enum |
| **Overtime not exported** | Underpayment of staff | High | 🔴 Critical | Include overtime in schema |
| **No PAYE calculation** | IR penalties | High | 🔴 Critical | Implement PAYE calculator |
| **Missing KiwiSaver** | Employer non-compliance | High | 🔴 Critical | Implement KiwiSaver calc |
| **No student loan tracking** | Employee debt not paid | Medium | 🟡 Medium | Add student loan field |
| **Public holiday tracking** | Holidays Act breach | Medium | 🟡 Medium | Track PH separately |
| **No leave balances** | Cannot provide to employee | Low | 🟢 Low | Add leave balance fields |

### 6.2 Financial Risks

**Underpayment Risk:**
- If overtime not exported: ~$450/week per affected employee
- Public holiday premium shortfall: ~$240/holiday per employee
- Estimated impact: **$23,400/year per 10 employees**

**IRD Penalty Risk:**
- Late payday filing: $250 per occurrence
- Incorrect PAYE: 20% of shortfall + interest (8.27% p.a.)
- Missing KiwiSaver: $1,000 per affected employee
- Estimated exposure: **$50,000/year**

**Reputation Risk:**
- Employee complaints to Employment Relations Authority
- IRD audit triggering full company review
- Loss of trust from employees

---

## Part 7: Implementation Roadmap

### Phase 1: Critical Fields (Week 1-2)
- ✅ Overtime hours already tracked
- ⬜ Add public holiday tracking to TimesheetEntry
- ⬜ Make IRD number mandatory in onboarding
- ⬜ Add tax code validation
- ⬜ Implement basic CSV export with all earnings

### Phase 2: Tax Calculations (Week 3-4)
- ⬜ Implement PAYE calculator
- ⬜ Implement ACC levy calculator
- ⬜ Implement student loan calculator
- ⬜ Implement KiwiSaver calculator
- ⬜ Create PayrollCalculation model

### Phase 3: Leave Management (Week 5-6)
- ⬜ Add leave balance fields to Employee
- ⬜ Implement leave accrual calculator
- ⬜ Track alternative days for public holidays
- ⬜ Include leave balances in export

### Phase 4: Enhanced Exports (Week 7-8)
- ⬜ Implement Excel export with multiple sheets
- ⬜ Implement JSON export with nested structure
- ⬜ Add validation error reporting
- ⬜ Create export audit log

### Phase 5: IRD Integration (Week 9-10)
- ⬜ Implement IRD payday file format
- ⬜ Add IR filing API integration
- ⬜ Automated payday filing (within 2 days)
- ⬜ IRD submission confirmation tracking

---

## Part 8: Testing Requirements

### 8.1 Unit Tests
- ✅ IRD number checksum validation
- ✅ Tax code enum validation
- ✅ PAYE calculation for all tax codes
- ✅ ACC levy calculation with cap
- ✅ Student loan deduction logic
- ✅ KiwiSaver calculation (all rates)
- ✅ Leave accrual calculations
- ✅ Export data transformation

### 8.2 Integration Tests
- ✅ End-to-end payroll export flow
- ✅ Multi-employee export (100+ employees)
- ✅ Export validation warnings
- ✅ File format generation (CSV, Excel, JSON)
- ✅ Database transaction handling

### 8.3 Compliance Tests
- ✅ IRD payday file format validation
- ✅ 6-year data retention
- ✅ Holidays Act compliance (public holidays, leave)
- ✅ Employment Relations Act compliance (wage records)
- ✅ Audit trail completeness

---

## References

### Legislation
- [Tax Administration Act 1994](https://www.legislation.govt.nz/act/public/1994/0166/latest/DLM348342.html)
- [Employment Relations Act 2000](https://www.legislation.govt.nz/act/public/2000/0024/latest/DLM58317.html)
- [Holidays Act 2003](https://www.legislation.govt.nz/act/public/2003/0129/latest/DLM236787.html)
- [KiwiSaver Act 2006](https://www.legislation.govt.nz/act/public/2006/0040/latest/DLM378372.html)

### IRD Resources
- [Payday Filing](https://www.ird.govt.nz/employing-staff/payday-filing)
- [Tax Codes](https://www.ird.govt.nz/employing-staff/payday-filing/tax-codes)
- [PAYE Tables](https://www.ird.govt.nz/employing-staff/payday-filing/paye-tax-rates-and-thresholds)
- [KiwiSaver for Employers](https://www.ird.govt.nz/kiwisaver/kiwisaver-employers)

### Employment NZ
- [Wage and Time Records](https://www.employment.govt.nz/starting-employment/employment-agreements/keeping-employee-records/)
- [Overtime Pay](https://www.employment.govt.nz/hours-and-wages/pay/types-of-pay/overtime-pay/)
- [Public Holidays](https://www.employment.govt.nz/leave-and-holidays/public-holidays/)

---

## Appendix A: Example Calculations

### Example 1: Standard Week with Overtime
**Employee:** John Smith  
**Tax Code:** M  
**KiwiSaver:** 3% employee, 3% employer  
**Week:** 5-11 February 2024  

**Hours:**
- Regular: 80 hours @ $30/hr = $2,400
- Overtime: 10 hours @ $30/hr × 1.5 = $450
- **Gross Pay:** $2,850

**Deductions:**
- PAYE (17.5%): $498.75
- ACC (1.46%): $41.61
- KiwiSaver Employee (3%): $85.50
- **Total Deductions:** $625.86

**Net Pay:** $2,224.14

**Employer Costs:**
- KiwiSaver Employer (3%): $85.50
- ESCT (17.5% of $85.50): $14.96
- **Total Employer Cost:** $2,950.46

### Example 2: Waitangi Day (Public Holiday)
**Employee:** Jane Doe  
**Tax Code:** M SL  
**Student Loan:** Active  
**Date:** 6 February 2024 (Waitangi Day)

**Hours:**
- Public Holiday: 8 hours @ $35/hr × 2.0 = $560
- Alternative Day Granted: Yes

**Deductions:**
- PAYE (17.5%): $98.00
- ACC (1.46%): $8.18
- Student Loan (12% above threshold): $11.52
- KiwiSaver Employee (3%): $16.80
- **Total Deductions:** $134.50

**Net Pay:** $425.50

---

**END OF SPECIFICATION**
