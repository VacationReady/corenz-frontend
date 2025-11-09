# NZ Payroll Export - User Guide for Finance Teams

## Overview

The NZ IRD-Compliant Payroll Export system generates comprehensive payroll files that can be submitted to Inland Revenue and imported into accounting systems. All exports are fully compliant with:

- **Tax Administration Act 1994** (Payday Filing)
- **Employment Relations Act 2000** (Record Keeping)
- **Holidays Act 2003** (Leave Entitlements)
- **KiwiSaver Act 2006** (Retirement Contributions)

## Quick Start

### Generating a Payroll Export

1. Navigate to **Payroll → Export** in the application
2. Select the pay period (start and end dates)
3. Choose export format (CSV, Excel, or JSON)
4. Optional: Filter by department or specific employees
5. Click **Generate Export**
6. Download the generated file

### API Usage (For Integrations)

```typescript
POST /api/payroll/export

Body:
{
  "payPeriodStart": "2024-11-01",
  "payPeriodEnd": "2024-11-07",
  "paymentDate": "2024-11-08",  // Optional
  "format": "csv",  // or "json", "excel"
  "departmentIds": ["dept-123"],  // Optional
  "employeeIds": ["emp-456"]  // Optional
}
```

## Export Formats

### CSV Format
**Best for:** Importing into accounting software (Xero, MYOB, QuickBooks)

**File structure:**
- One row per employee
- All fields flattened (no nested objects)
- Includes calculated totals

**Use cases:**
- Weekly payroll processing
- Importing into payroll systems
- Quick reviews in Excel

### JSON Format
**Best for:** API integrations, data warehousing

**File structure:**
- Structured nested objects
- Complete metadata
- Machine-readable

**Use cases:**
- Feeding BI tools
- Custom reporting systems
- Archive/backup

### Excel Format
**Best for:** Executive reporting, detailed analysis

**File structure:**
- Multiple sheets (Summary + Detail)
- Formatted for readability
- Includes totals and summaries

**Use cases:**
- Board reporting
- Payroll audits
- Finance team reviews

## What's Included in Exports

### Employee Information
- Employee ID, IRD Number, Name, Email
- Tax Code, Date of Birth
- Department, Location, Job Role
- Bank Account (for payments)

### Earnings Breakdown
**Regular Hours:**
- Hours worked
- Hourly rate
- Total regular pay

**Overtime (1.5x multiplier):**
- Overtime hours
- Overtime rate
- Overtime multiplier (1.5x)
- Total overtime pay
- Reason for overtime

**Public Holiday Premium (2x multiplier):**
- Public holiday hours
- Holiday rate
- Holiday multiplier (2.0x)
- Holiday name (e.g., "Christmas Day")
- Alternative day granted (yes/no)

**Other Earnings:**
- Allowances
- Bonuses
- Commission
- Reimbursements

### Tax Deductions (PAYE)
- PAYE tax (based on IRD tax tables 2024/25)
- ACC earner levy (1.46% of gross, capped)
- Effective tax rate applied

### Student Loan Deductions
- Deduction amount (12% above threshold)
- Weekly threshold ($464 for 2024/25)
- Remaining loan balance

### KiwiSaver Contributions
- Employee contribution (3%, 4%, 6%, 8%, 10%)
- Employee contribution rate
- Employer contribution (minimum 3%)
- Employer contribution rate
- ESCT (tax on employer contribution)
- Opted out status

### Leave Balances
- Annual leave balance (hours)
- Sick leave balance (hours)
- Alternative days balance

### Pay Totals
- Total hours worked
- Gross pay (before deductions)
- Total deductions
- **Net pay** (amount to pay employee)
- **Employer cost** (total cost including employer KiwiSaver + ESCT)

### Pay Period Information
- Pay period start date
- Pay period end date
- Payment date
- Pay frequency (WEEKLY, FORTNIGHTLY, MONTHLY)

### Audit Information
- Export timestamp
- Exported by (user name)
- Timesheet IDs included

## Pre-Export Validation

The system performs comprehensive validation **before** generating the export. If validation fails, the export will be blocked and you'll receive error messages.

### Errors (Block Export)

These issues **must** be fixed before exporting:

1. **Missing IRD Number**
   - *Error:* "Employee [Name] missing IRD number"
   - *Fix:* Add IRD number to employee record

2. **Missing Tax Code**
   - *Error:* "Employee [Name] missing tax code"
   - *Fix:* Add valid NZ tax code to employee record

3. **Negative Net Pay**
   - *Error:* "Employee [Name] has negative net pay"
   - *Fix:* Review deductions - total exceeds gross pay

4. **Net Pay Calculation Mismatch**
   - *Error:* "Net pay mismatch: expected $X, got $Y"
   - *Fix:* Contact system administrator - calculation error

### Warnings (Review But Allow)

These issues are flagged but won't block export:

1. **High Regular Hours**
   - *Warning:* "Employee has 65 regular hours"
   - *Action:* Verify hours are correct (possible data entry error)

2. **High Overtime Hours**
   - *Warning:* "Employee has 25 overtime hours"
   - *Action:* Verify overtime is authorized

3. **Zero Gross Pay**
   - *Warning:* "Employee has zero gross pay"
   - *Action:* Normal for employees on leave, otherwise investigate

4. **Below Minimum Wage**
   - *Warning:* "Hourly rate $20 below minimum wage ($23.15)"
   - *Action:* Verify rate is correct and compliant

## Sample Export (CSV)

```csv
Employee ID,IRD Number,Employee Name,Email,Tax Code,Regular Hours,Regular Rate,Regular Pay,Overtime Hours,Overtime Multiplier,Overtime Pay,Gross Pay,PAYE Tax,ACC Levy,Student Loan Deduction,KiwiSaver Employee,KiwiSaver Employer,ESCT,Net Pay,Employer Cost,Pay Period Start,Pay Period End,Payment Date
emp-001,123456789,John Smith,john@example.com,M,40.00,25.00,1000.00,0.00,1.50,0.00,1000.00,119.50,14.60,0.00,30.00,30.00,5.25,835.90,1035.25,2024-11-01,2024-11-07,2024-11-08
emp-002,234567890,Jane Doe,jane@example.com,M SL,40.00,30.00,1200.00,5.00,1.50,225.00,1425.00,187.83,20.81,85.92,72.00,36.00,6.30,1058.44,1467.30,2024-11-01,2024-11-07,2024-11-08
```

## IRD Payday Filing

Exports include all information required for IRD Payday Filing:

✅ Employee IRD numbers (validated)
✅ Tax codes (2024/25 tax year)
✅ PAYE tax calculated using IRD tax tables
✅ ACC earner levy (1.46%)
✅ Student loan deductions (12% above threshold)
✅ KiwiSaver contributions
✅ ESCT on employer contributions

### IRD Submission Workflow

1. **Generate Export** → Download CSV or JSON
2. **Review Warnings** → Fix any flagged issues
3. **Submit to IRD** → Use IRD's myIR gateway
4. **Pay Employees** → Use net pay amounts
5. **Pay IRD** → Sum of PAYE + ACC + Student Loan
6. **Pay KiwiSaver** → Send to KiwiSaver providers

## Accounting System Integration

### Xero
1. Export as CSV
2. In Xero: Payroll → Pay Run → Import
3. Map columns to Xero fields
4. Review and approve

### MYOB
1. Export as CSV
2. In MYOB: Payroll → Import Pay Run
3. Map columns to MYOB fields
4. Process payroll

### QuickBooks
1. Export as Excel
2. In QuickBooks: Employees → Payroll → Import
3. Map columns to QuickBooks fields
4. Finalize payroll

## Troubleshooting

### Export Fails with "No approved timesheets found"

**Cause:** No timesheets have been approved for the selected period

**Fix:**
1. Go to Timesheets → Approvals
2. Review and approve pending timesheets
3. Try export again

### Export Fails with "Validation failed"

**Cause:** One or more employees have missing required data

**Fix:**
1. Review error messages in the validation report
2. Fix flagged employee records (IRD number, tax code, etc.)
3. Try export again

### Wrong Amount in Export

**Cause:** Timesheet not approved, or incorrect hours

**Fix:**
1. Verify timesheet is approved
2. Check timesheet hours are correct
3. Recalculate payroll if needed
4. Try export again

### Employee Not Included in Export

**Cause:** Timesheet not approved, or wrong pay period

**Fix:**
1. Check timesheet approval status
2. Verify pay period dates
3. Check department filter (if applied)

## Audit Trail

Every export is logged for compliance:

- Export timestamp
- User who generated export
- Pay period covered
- Number of employees included
- Export format used
- File name generated

Access audit logs: **Settings → Audit Logs → Filter by "PAYROLL_EXPORT"**

## Compliance Checklist

Before submitting to IRD:

- [ ] All timesheets approved for period
- [ ] Export validation passed (no errors)
- [ ] Warnings reviewed and verified
- [ ] Net pay totals verified
- [ ] IRD numbers validated
- [ ] Tax codes current (2024/25 tax year)
- [ ] KiwiSaver rates correct
- [ ] Student loan codes accurate

## Support

For questions or issues:

1. Check this user guide
2. Review validation warnings/errors
3. Contact payroll administrator
4. Email: support@yourcompany.com

## Appendix: Tax Rates 2024/25

### PAYE Tax Brackets
- $0 - $14,000: 10.5%
- $14,001 - $48,000: 17.5%
- $48,001 - $70,000: 30%
- $70,001 - $180,000: 33%
- $180,001+: 39%

### Student Loan
- Threshold: $24,128 annual ($464 weekly)
- Deduction Rate: 12% above threshold

### KiwiSaver
- Employee: 3%, 4%, 6%, 8%, or 10%
- Employer: Minimum 3%
- ESCT Rates: 10.5%, 17.5%, 28%, or 33%

### ACC Earner Levy
- Rate: 1.46%
- Cap: $142,283 annual

### Minimum Wage
- Adult: $23.15/hour (2024)
- Starting-out: $18.52/hour
- Training: $18.52/hour
