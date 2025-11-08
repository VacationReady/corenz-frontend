# NZ Payroll Data - Quick Reference Guide

## 🎯 Overview

This guide provides quick access to NZ payroll data requirements, valid values, and common scenarios.

---

## 📋 Required Fields for Payroll Export

### Minimum Required
1. **IRD Number** - 8 or 9 digits with valid checksum
2. **Tax Code** - Valid NZ tax code from IRD list

### Required if Applicable
3. **KiwiSaver Employee Rate** - If enrolled (3%, 4%, 6%, 8%, or 10%)
4. **Student Loan Rate** - If has student loan (typically 12%)

---

## 🔢 Valid Values

### IRD Numbers
- **Format:** 8-9 digits
- **Examples:** 
  - `123456789` ✅
  - `49091850` ✅
  - `123-456-789` ✅ (formatted)
  - `1234567` ❌ (too short)
  - `123456788` ❌ (invalid checksum)

### Tax Codes

**Most Common:**
- `M` - Primary income, no student loan
- `M_SL` - Primary income with student loan
- `ME` - Primary with earners' levy
- `SB` - Secondary income up to $14k
- `S` - Secondary $14k-$48k
- `SH` - Secondary $48k-$70k
- `ST` - Secondary over $70k

**Special:**
- `STC` - Special tax code
- `ND` - No declaration
- `CAE` - Casual agricultural
- `EDW` - Election day workers

### KiwiSaver Employee Rates
- `0%` - Not enrolled
- `3%` - Minimum
- `4%`
- `6%`
- `8%`
- `10%` - Maximum

### KiwiSaver Employer Rates
- **Minimum:** 3% (legal requirement)
- **Typical:** 3%
- **Enhanced:** 4-6% (voluntary benefit)

### Student Loan Rates
- **Standard:** 12%
- **Range:** 0-20%
- **Threshold:** No deduction below $24,128 annual income (2024/2025)

---

## 💻 API Examples

### Update Complete Payroll Data

```bash
curl -X PATCH https://your-domain.com/api/employees/emp-123/bank-payroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "irdNumber": "123-456-789",
    "taxCode": "M",
    "bankAccountNumber": "12-3456-7890123-00",
    "kiwiSaverEnrolled": true,
    "kiwiSaverEmployeeRate": 0.03,
    "kiwiSaverEmployerRate": 0.03,
    "hasStudentLoan": false
  }'
```

### Employee with Student Loan

```bash
curl -X PATCH https://your-domain.com/api/employees/emp-456/bank-payroll \
  -H "Content-Type: application/json" \
  -d '{
    "irdNumber": "987654321",
    "taxCode": "M_SL",
    "hasStudentLoan": true,
    "studentLoanRate": 0.12,
    "kiwiSaverEnrolled": false
  }'
```

### Employee Not in KiwiSaver

```bash
curl -X PATCH https://your-domain.com/api/employees/emp-789/bank-payroll \
  -H "Content-Type: application/json" \
  -d '{
    "irdNumber": "555666777",
    "taxCode": "M",
    "kiwiSaverEnrolled": false,
    "hasStudentLoan": false
  }'
```

### Special Tax Rate (Non-Standard)

```bash
curl -X PATCH https://your-domain.com/api/employees/emp-999/bank-payroll \
  -H "Content-Type: application/json" \
  -d '{
    "irdNumber": "444555666",
    "taxCode": "STC",
    "specialTaxRate": 0.175,
    "taxExemptionReason": "Non-resident contractor per IRD approval #12345"
  }'
```

---

## 🎓 Common Scenarios

### Scenario 1: Standard Full-Time Employee
```json
{
  "irdNumber": "123456789",
  "taxCode": "M",
  "kiwiSaverEnrolled": true,
  "kiwiSaverEmployeeRate": 0.03,
  "kiwiSaverEmployerRate": 0.03,
  "hasStudentLoan": false
}
```

### Scenario 2: Part-Time Student with Loan
```json
{
  "irdNumber": "987654321",
  "taxCode": "M_SL",
  "kiwiSaverEnrolled": true,
  "kiwiSaverEmployeeRate": 0.03,
  "kiwiSaverEmployerRate": 0.03,
  "hasStudentLoan": true,
  "studentLoanRate": 0.12
}
```

### Scenario 3: Secondary Job (Part-Time)
```json
{
  "irdNumber": "555666777",
  "taxCode": "SB",
  "kiwiSaverEnrolled": false,
  "hasStudentLoan": false
}
```

### Scenario 4: Contractor with Special Rate
```json
{
  "irdNumber": "444555666",
  "taxCode": "STC",
  "specialTaxRate": 0.175,
  "taxExemptionReason": "Non-resident contractor",
  "kiwiSaverEnrolled": false,
  "hasStudentLoan": false
}
```

### Scenario 5: Enhanced KiwiSaver Benefit
```json
{
  "irdNumber": "333222111",
  "taxCode": "M",
  "kiwiSaverEnrolled": true,
  "kiwiSaverEmployeeRate": 0.08,
  "kiwiSaverEmployerRate": 0.06,
  "hasStudentLoan": false
}
```

---

## ❌ Common Validation Errors

### Invalid IRD Number
```json
{
  "error": "Invalid IRD number (checksum failed)"
}
```
**Fix:** Verify digits with IRD records or use IRD lookup tool

### Invalid Tax Code
```json
{
  "error": "Invalid tax code. Must be one of: M, ME, M_SL, ..."
}
```
**Fix:** Use valid code from approved list (see above)

### KiwiSaver Rate Without Enrollment
```json
{
  "error": "KiwiSaver rate must be 0 or null when not enrolled"
}
```
**Fix:** Set `kiwiSaverEnrolled: true` or remove rate

### Invalid KiwiSaver Employee Rate
```json
{
  "error": "KiwiSaver employee rate must be one of: 0%, 3%, 4%, 6%, 8%, 10%"
}
```
**Fix:** Use valid rate (e.g., `0.03` not `0.035`)

### Employer Rate Below Minimum
```json
{
  "error": "KiwiSaver employer rate must be at least 3% (minimum required by law)"
}
```
**Fix:** Set to at least `0.03`

### Special Rate Without Reason
```json
{
  "error": "Tax exemption reason is required when using special tax rate"
}
```
**Fix:** Provide explanation in `taxExemptionReason` field

---

## 🛠️ Validation in Code

### TypeScript Validation Example

```typescript
import { validateNzPayrollData } from "@/lib/payroll/nz-payroll-validation";

const employeeData = {
  irdNumber: "123-456-789",
  taxCode: "M",
  kiwiSaverEnrolled: true,
  kiwiSaverEmployeeRate: 0.03,
  kiwiSaverEmployerRate: 0.03,
  hasStudentLoan: false,
};

const result = validateNzPayrollData(employeeData);

if (result.valid) {
  // Data is valid, proceed with save
  console.log("✅ Valid payroll data");
  console.log("Normalized:", result.normalizedData);
} else {
  // Show errors to user
  console.error("❌ Validation errors:");
  Object.entries(result.errors).forEach(([field, error]) => {
    console.error(`  ${field}: ${error}`);
  });
}
```

### Check Data Completeness

```typescript
import { isPayrollDataComplete } from "@/lib/payroll/nz-payroll-validation";

const { complete, missing } = isPayrollDataComplete(employeeData);

if (!complete) {
  console.warn(`Missing required fields: ${missing.join(", ")}`);
  // Block payroll export or show warning to admin
}
```

---

## 📊 Database Queries

### Find Employees with Incomplete Data

```sql
SELECT 
  e.id,
  u."firstName",
  u."lastName",
  u.email,
  CASE 
    WHEN e."irdNumber" IS NULL THEN 'IRD Number, '
    ELSE ''
  END ||
  CASE 
    WHEN e."taxCode" IS NULL THEN 'Tax Code, '
    ELSE ''
  END ||
  CASE 
    WHEN e."kiwiSaverEnrolled" = true AND e."kiwiSaverEmployeeRate" IS NULL THEN 'KiwiSaver Rate, '
    ELSE ''
  END ||
  CASE 
    WHEN e."hasStudentLoan" = true AND e."studentLoanRate" IS NULL THEN 'Student Loan Rate, '
    ELSE ''
  END as missing_fields
FROM "Employee" e
JOIN "User" u ON e."userId" = u.id
WHERE e."isActive" = true
  AND e."companyId" = 'your-company-id'
  AND (
    e."irdNumber" IS NULL 
    OR e."taxCode" IS NULL
    OR (e."kiwiSaverEnrolled" = true AND e."kiwiSaverEmployeeRate" IS NULL)
    OR (e."hasStudentLoan" = true AND e."studentLoanRate" IS NULL)
  );
```

### Count Completion Rate

```sql
SELECT 
  COUNT(*) as total_employees,
  COUNT(CASE WHEN e."irdNumber" IS NOT NULL AND e."taxCode" IS NOT NULL THEN 1 END) as complete_employees,
  ROUND(
    COUNT(CASE WHEN e."irdNumber" IS NOT NULL AND e."taxCode" IS NOT NULL THEN 1 END) * 100.0 / COUNT(*),
    2
  ) as completion_percentage
FROM "Employee" e
WHERE e."isActive" = true
  AND e."companyId" = 'your-company-id';
```

---

## 📞 Support Resources

### Government Resources
- **IRD Employer Portal:** https://www.ird.govt.nz/employing-staff
- **Tax Code Tool:** https://www.ird.govt.nz/employing-staff/paye-tax/tax-codes
- **KiwiSaver Guide:** https://www.kiwisaver.govt.nz/employers/
- **Student Loans:** https://www.ird.govt.nz/student-loans

### Internal Resources
- **Validation Library:** `lib/payroll/nz-payroll-validation.ts`
- **Test Suite:** `tests/payroll/nz-payroll-validation.test.ts`
- **Full Documentation:** `NZ_PAYROLL_DATA_MODEL_IMPLEMENTATION.md`
- **API Endpoint:** `/api/employees/[id]/bank-payroll`

---

## 🚀 Quick Start for Admins

1. **Access Employee Record**
   - Navigate to: Employees → [Select Employee] → Bank & Payroll

2. **Enter Required Information**
   - IRD Number (required)
   - Tax Code (required)
   - KiwiSaver details (if enrolled)
   - Student Loan (if applicable)

3. **Save Changes**
   - System validates in real-time
   - Errors shown with guidance
   - Green checkmark when complete

4. **Verify Completeness**
   - Run: `npm run check-payroll-data`
   - Review report for missing data
   - Export CSV template if needed

---

## ✅ Checklist: Before Running Payroll

- [ ] All active employees have IRD numbers
- [ ] All active employees have tax codes
- [ ] KiwiSaver rates set for enrolled employees
- [ ] Student loan rates set for employees with loans
- [ ] Bank account numbers validated
- [ ] Special tax situations documented
- [ ] Run completeness check script
- [ ] Review any validation warnings
- [ ] Export payroll data successfully

---

**Last Updated:** 2025-01-15  
**Version:** 1.0  
**Compliance:** Tax Administration Act 1994, KiwiSaver Act 2006
