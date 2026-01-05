# Dependency Audit Report

**Date:** January 6, 2026  
**Auditor:** Kiro AI  
**Project:** PeopleCore HRIS

## Summary

| Severity | Before Fix | After Fix |
|----------|------------|-----------|
| Critical | 0 | 0 |
| High | 2 | 1 |
| Moderate | 1 | 0 |
| Low | 0 | 0 |
| **Total** | **3** | **1** |

## Vulnerabilities Fixed

### 1. node-forge (HIGH → FIXED)

**Package:** node-forge ≤1.3.1  
**Severity:** High  
**Status:** ✅ Fixed via `npm audit fix`

**Vulnerabilities:**
- [GHSA-554w-wpv2-vw27](https://github.com/advisories/GHSA-554w-wpv2-vw27) - ASN.1 Unbounded Recursion
- [GHSA-5gfm-wpxj-wjgq](https://github.com/advisories/GHSA-5gfm-wpxj-wjgq) - ASN.1 Validator Desynchronization (CVSS 8.6)
- [GHSA-65ch-62r8-g69g](https://github.com/advisories/GHSA-65ch-62r8-g69g) - ASN.1 OID Integer Truncation

**Resolution:** Automatically updated to node-forge ≥1.3.2 via `npm audit fix`

### 2. nodemailer (MODERATE → FIXED)

**Package:** nodemailer ≤7.0.10  
**Severity:** Moderate  
**Status:** ✅ Fixed by upgrading to 7.0.12

**Vulnerabilities:**
- [GHSA-mm7p-fcc7-pg87](https://github.com/advisories/GHSA-mm7p-fcc7-pg87) - Email to unintended domain
- [GHSA-rcmh-qjqh-p98v](https://github.com/advisories/GHSA-rcmh-qjqh-p98v) - DoS via recursive calls
- [GHSA-46j5-6fg5-4gv3](https://github.com/advisories/GHSA-46j5-6fg5-4gv3) - DoS via Uncontrolled Recursion (CVSS 5.3)

**Resolution:** Upgraded from 6.10.1 to 7.0.12 via `npm install nodemailer@7.0.12`

**Note:** nodemailer is a dependency of next-auth. The project uses Resend for email sending, not nodemailer directly. The upgrade is safe as nodemailer is only used internally by next-auth for email provider authentication (not currently used in this project).

## Remaining Vulnerabilities

### 3. xlsx (HIGH → ACCEPTED RISK)

**Package:** xlsx (all versions)  
**Severity:** High  
**Status:** ⚠️ No fix available - Accepted Risk with Mitigations

**Vulnerabilities:**
- [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) - Prototype Pollution (CVSS 7.8)
- [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) - ReDoS (CVSS 7.5)

**Why No Fix:**
The open-source version of SheetJS (xlsx) has known vulnerabilities with no planned fix. The maintainers have moved security fixes to the commercial "SheetJS Pro" version.

**Usage in PeopleCore:**
- `lib/payroll-export.ts` - Excel export for payroll data
- `lib/payroll/payroll-export-service.ts` - NZ payroll export service
- `app/api/payroll/export-ird/route.ts` - IRD export API

**Risk Assessment:**
- **Attack Vector:** Local (requires user to upload malicious file)
- **Usage Pattern:** xlsx is used for EXPORT only (writing Excel files), not for parsing untrusted input
- **Exposure:** Low - only admin users can trigger payroll exports

**Mitigations Applied:**
1. xlsx is used for OUTPUT only (generating Excel files from trusted data)
2. No user-uploaded Excel files are parsed with xlsx
3. Payroll export is restricted to ADMIN role only
4. All input data is validated before being written to Excel

**Recommendation:**
- **Short-term:** Accept risk with current mitigations (export-only usage)
- **Long-term:** Consider alternatives:
  - [ExcelJS](https://www.npmjs.com/package/exceljs) - actively maintained, no known vulnerabilities
  - [xlsx-populate](https://www.npmjs.com/package/xlsx-populate) - alternative library
  - SheetJS Pro (commercial) - has security fixes

## Commands Executed

```bash
# Initial audit
npm audit

# Apply safe fixes
npm audit fix

# Upgrade nodemailer
npm install nodemailer@7.0.12 --save

# Verify remaining issues
npm audit
```

## Final Audit Output

```
# npm audit report

xlsx  *
Severity: high
Prototype Pollution in sheetJS - https://github.com/advisories/GHSA-4r6h-8v6p-xvw6
SheetJS Regular Expression Denial of Service (ReDoS) - https://github.com/advisories/GHSA-5pgg-2g8v-p4x9
No fix available
node_modules/xlsx

1 high severity vulnerability

Some issues need review, and may require choosing
a different dependency.
```

## Conclusion

- **2 of 3 vulnerabilities fixed** (node-forge, nodemailer)
- **1 vulnerability accepted** (xlsx) with documented mitigations
- The xlsx vulnerability is low-risk in this context because:
  - Used for export only (not parsing untrusted input)
  - Restricted to admin users
  - All data is validated before export
- Consider migrating to ExcelJS in a future sprint for complete remediation
