/**
 * NZ IRD-Compliant Payroll Export Service
 * 
 * Generates payroll exports in multiple formats (CSV, JSON, Excel)
 * with complete IRD compliance for NZ payroll submissions.
 * 
 * Compliance:
 * - Tax Administration Act 1994 (Payday Filing)
 * - Employment Relations Act 2000 (Record Keeping)
 * - Holidays Act 2003 (Leave Entitlements)
 * - KiwiSaver Act 2006 (Retirement Contributions)
 * 
 * @version 1.0
 * @date 2024-11-09
 */

import { format as formatDate } from 'date-fns';
import * as XLSX from 'xlsx';
import {
  NZPayrollExportRecord,
  FlatPayrollExportRecord,
  PayrollExportResult,
  flattenPayrollRecord,
  NZTaxCode,
} from '../../types/nz-payroll-export';
import type { PrismaClient } from '@prisma/client';

// Lazy-load Prisma to prevent test environment database connection errors
let prisma: PrismaClient | null = null;
function getPrisma(): PrismaClient | null {
  if (!prisma && process.env.NODE_ENV !== 'test') {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

// ============================================
// TYPES
// ============================================

export interface PayrollExportOptions {
  companyId: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  paymentDate?: Date;
  format: 'csv' | 'json' | 'excel';
  employeeIds?: string[];
  departmentIds?: string[];
  exportedBy: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface OvertimeBreakdown {
  standardOvertimeHours: number;     // 1.5x multiplier
  standardOvertimePay: number;
  publicHolidayHours: number;        // 2x+ multiplier
  publicHolidayPay: number;
  tier2OvertimeHours: number;        // 2.0x+ multiplier (other than public holidays)
  tier2OvertimePay: number;
}

// ============================================
// MAIN SERVICE CLASS
// ============================================

export class PayrollExportService {
  /**
   * Generate complete payroll export
   */
  async generateExport(options: PayrollExportOptions): Promise<PayrollExportResult> {
    const {
      companyId,
      payPeriodStart,
      payPeriodEnd,
      paymentDate,
      format,
      employeeIds,
      departmentIds,
      exportedBy,
    } = options;

    console.log(`[PayrollExport] Starting export for company ${companyId}, period ${formatDate(payPeriodStart, 'yyyy-MM-dd')} to ${formatDate(payPeriodEnd, 'yyyy-MM-dd')}`);

    // STEP 1: Fetch all approved timesheets for period (tenant-scoped!)
    const timesheets = await this.fetchApprovedTimesheets(
      companyId,
      payPeriodStart,
      payPeriodEnd,
      employeeIds,
      departmentIds
    );

    console.log(`[PayrollExport] Found ${timesheets.length} approved timesheets`);

    if (timesheets.length === 0) {
      throw new Error('No approved timesheets found for the specified period');
    }

    // STEP 2: Build export records for each employee
    const exportRecords: NZPayrollExportRecord[] = [];
    const warnings: string[] = [];

    for (const timesheet of timesheets) {
      try {
        const record = await this.buildExportRecord(
          timesheet,
          payPeriodStart,
          payPeriodEnd,
          paymentDate || payPeriodEnd,
          exportedBy
        );
        exportRecords.push(record);
      } catch (error) {
        const message = `Failed to build export record for employee ${timesheet.employeeId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[PayrollExport] ${message}`);
        warnings.push(message);
      }
    }

    console.log(`[PayrollExport] Built ${exportRecords.length} export records`);

    // STEP 3: Run pre-export validation
    const validation = await this.validateExport(exportRecords);
    
    if (!validation.isValid) {
      console.error(`[PayrollExport] Validation failed with ${validation.errors.length} errors`);
      throw new Error(`Export validation failed:\n${validation.errors.join('\n')}`);
    }

    warnings.push(...validation.warnings);

    // STEP 4: Generate file in requested format
    const exportResult = await this.generateFile(
      exportRecords,
      format,
      companyId,
      payPeriodStart,
      payPeriodEnd,
      exportedBy,
      warnings
    );

    // STEP 5: Log export event for audit
    await this.logExportEvent(
      companyId,
      exportedBy,
      payPeriodStart,
      payPeriodEnd,
      exportRecords.length,
      format,
      exportResult.filename
    );

    console.log(`[PayrollExport] Export completed successfully: ${exportResult.filename}`);

    return exportResult;
  }

  /**
   * Fetch approved timesheets for period
   */
  private async fetchApprovedTimesheets(
    companyId: string,
    payPeriodStart: Date,
    payPeriodEnd: Date,
    employeeIds?: string[],
    departmentIds?: string[]
  ) {
    const db = getPrisma();
    if (!db) return [];
    
    return db.timesheet.findMany({
      where: {
        companyId,
        approvalStatus: 'APPROVED',
        periodStart: { gte: payPeriodStart },
        periodEnd: { lte: payPeriodEnd },
        ...(employeeIds && { employeeId: { in: employeeIds } }),
        ...(departmentIds && {
          Employee: {
            departmentId: { in: departmentIds },
          },
        }),
      },
      include: {
        Employee: {
          include: {
            User: true,
            Department: true,
            Location: true,
            JobRole: true,
          },
        },
        TimesheetEntries: {
          orderBy: { date: 'asc' },
        },
        PayrollCalculations: {
          where: {
            status: { in: ['CALCULATED', 'APPROVED', 'EXPORTED'] },
          },
          orderBy: { calculatedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Build export record for a single employee
   */
  private async buildExportRecord(
    timesheet: any,
    payPeriodStart: Date,
    payPeriodEnd: Date,
    paymentDate: Date,
    exportedBy: string
  ): Promise<NZPayrollExportRecord> {
    const employee = timesheet.Employee;
    const user = employee.User;

    // Get employee IRD/tax data
    if (!employee.irdNumber) {
      throw new Error(`Employee ${user.name} (${employee.id}) missing IRD number`);
    }

    if (!employee.taxCode) {
      throw new Error(`Employee ${user.name} (${employee.id}) missing tax code`);
    }

    // Get or calculate payroll data
    let payrollCalc = timesheet.PayrollCalculations[0];
    
    if (!payrollCalc) {
      throw new Error(`No payroll calculation found for employee ${user.name} (${employee.id})`);
    }

    // Aggregate overtime from timesheet entries
    const overtimeBreakdown = this.aggregateOvertime(timesheet.TimesheetEntries, employee.hourlyRate);

    // Get company data
    const db = getPrisma();
    if (!db) throw new Error('Database unavailable');
    
    const company = await db.company.findUnique({
      where: { id: timesheet.companyId },
      select: {
        id: true,
        name: true,
        // IRD number would go here if we had it in schema
      },
    });

    // Build structured export record
    const exportRecord: NZPayrollExportRecord = {
      // Employee Identification
      employeeId: employee.id,
      irdNumber: employee.irdNumber,
      employeeName: user.name,
      employeeEmail: user.email,
      taxCode: employee.taxCode as NZTaxCode,
      dateOfBirth: employee.dateOfBirth ? formatDate(new Date(employee.dateOfBirth), 'yyyy-MM-dd') : undefined,

      // Earnings
      earnings: {
        regular: {
          hours: parseFloat(payrollCalc.regularPay.toString()) / parseFloat(employee.hourlyRate?.toString() || '25'),
          rate: parseFloat(employee.hourlyRate?.toString() || '25'),
          pay: parseFloat(payrollCalc.regularPay.toString()),
        },
        overtime: {
          hours: overtimeBreakdown.standardOvertimeHours + overtimeBreakdown.tier2OvertimeHours,
          rate: parseFloat(employee.hourlyRate?.toString() || '25'),
          multiplier: overtimeBreakdown.standardOvertimeHours > 0 ? 1.5 : 2.0,
          pay: parseFloat(payrollCalc.overtimePay.toString()),
          type: 'AUTO',
        },
        publicHoliday: {
          hours: overtimeBreakdown.publicHolidayHours,
          rate: parseFloat(employee.hourlyRate?.toString() || '25'),
          multiplier: 2.0,
          pay: parseFloat(payrollCalc.publicHolidayPay.toString()),
          alternativeDayGranted: timesheet.TimesheetEntries.some((e: any) => e.alternativeDayGranted),
        },
        other: {
          allowances: parseFloat(payrollCalc.allowances.toString()),
          bonuses: parseFloat(payrollCalc.bonuses.toString()),
          commission: parseFloat(payrollCalc.commission.toString()),
          reimbursements: parseFloat(payrollCalc.reimbursements.toString()),
        },
      },

      // Deductions
      deductions: {
        paye: {
          tax: parseFloat(payrollCalc.payeTax.toString()),
          accLevy: parseFloat(payrollCalc.accLevy.toString()),
        },
        studentLoan: {
          deduction: parseFloat(payrollCalc.studentLoanDeduction.toString()),
          balance: employee.studentLoanBalance ? parseFloat(employee.studentLoanBalance.toString()) : undefined,
        },
        kiwiSaver: {
          employee: parseFloat(payrollCalc.kiwiSaverEmployee.toString()),
          employeeRate: parseFloat(payrollCalc.kiwiSaverEmployeeRate.toString()),
          employer: parseFloat(payrollCalc.kiwiSaverEmployer.toString()),
          employerRate: parseFloat(payrollCalc.kiwiSaverEmployerRate.toString()),
          esct: parseFloat(payrollCalc.esctDeduction.toString()),
          optedOut: !employee.kiwiSaverEnrolled,
        },
        other: {
          unionFees: parseFloat(payrollCalc.unionFees.toString()),
          insurance: parseFloat(payrollCalc.insuranceDeductions.toString()),
          childcareLevy: parseFloat(payrollCalc.childcareLevy.toString()),
          other: parseFloat(payrollCalc.otherDeductions.toString()),
        },
      },

      // Leave Balances
      leaveBalances: {
        annualLeave: {
          accrued: 0, // This would need to be calculated from the period
          taken: 0,
          balance: parseFloat(employee.annualLeaveBalance?.toString() || '0'),
        },
        sickLeave: {
          accrued: 0,
          taken: 0,
          balance: parseFloat(employee.sickLeaveBalance?.toString() || '0'),
        },
        alternativeDays: {
          balance: employee.alternativeDaysBalance || 0,
        },
      },

      // Totals
      totals: {
        totalHours: parseFloat(timesheet.totalHours.toString()),
        grossPay: parseFloat(payrollCalc.grossPay.toString()),
        totalDeductions: parseFloat(payrollCalc.totalDeductions.toString()),
        netPay: parseFloat(payrollCalc.netPay.toString()),
        employerCost: parseFloat(payrollCalc.employerCost.toString()),
      },

      // Pay Period
      payPeriodStart: formatDate(payPeriodStart, 'yyyy-MM-dd'),
      payPeriodEnd: formatDate(payPeriodEnd, 'yyyy-MM-dd'),
      paymentDate: formatDate(paymentDate, 'yyyy-MM-dd'),
      payFrequency: payrollCalc.payFrequency as any,

      // Company
      companyId: timesheet.companyId,
      companyName: company?.name || 'Unknown',

      // Metadata
      metadata: {
        department: employee.Department?.name,
        location: employee.Location?.name,
        jobRole: employee.JobRole?.title,
        bankAccount: employee.bankAccountNumber,
        employmentType: employee.employmentType,
        contractType: employee.contractType,
        timesheetIds: [timesheet.id],
        exportedAt: new Date().toISOString(),
        exportedBy,
        exportVersion: '1.0',
      },
    };

    return exportRecord;
  }

  /**
   * Aggregate overtime hours from timesheet entries
   * 
   * Uses enriched metadata from overtime calculator:
   * - publicHolidayHours: Precise hours (supports partial-day holidays)
   * - overtimeHours: Regular overtime hours
   * - Prevents double-counting by separating holiday and overtime buckets
   */
  private aggregateOvertime(entries: any[], hourlyRate: any): OvertimeBreakdown {
    const breakdown: OvertimeBreakdown = {
      standardOvertimeHours: 0,
      standardOvertimePay: 0,
      publicHolidayHours: 0,
      publicHolidayPay: 0,
      tier2OvertimeHours: 0,
      tier2OvertimePay: 0,
    };

    const rate = parseFloat(hourlyRate?.toString() || '25');

    for (const entry of entries) {
      const overtimeHours = entry.overtimeHours ? parseFloat(entry.overtimeHours.toString()) : 0;
      const multiplier = entry.overtimeMultiplier ? parseFloat(entry.overtimeMultiplier.toString()) : 1.5;
      
      // Public holiday hours (separate category, uses precise publicHolidayHours)
      // This includes partial-day holidays and Mondayised holidays
      if (entry.isPublicHoliday && entry.publicHolidayHours) {
        const pubHolidayHours = parseFloat(entry.publicHolidayHours.toString());
        const pubMultiplier = parseFloat(entry.publicHolidayMultiplier?.toString() || '2.0');
        breakdown.publicHolidayHours += pubHolidayHours;
        breakdown.publicHolidayPay += pubHolidayHours * rate * pubMultiplier;
      }
      
      // Standard overtime (1.5x) - excludes public holiday hours
      if (overtimeHours > 0 && !entry.isPublicHoliday) {
        if (Math.abs(multiplier - 1.5) < 0.01) {
          breakdown.standardOvertimeHours += overtimeHours;
          breakdown.standardOvertimePay += overtimeHours * rate * multiplier;
        } else {
          // Tier 2 overtime (2.0x or higher, but not public holiday)
          breakdown.tier2OvertimeHours += overtimeHours;
          breakdown.tier2OvertimePay += overtimeHours * rate * multiplier;
        }
      }
    }

    return breakdown;
  }

  /**
   * Validate export records before generating file
   */
  private async validateExport(records: NZPayrollExportRecord[]): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const record of records) {
      // ERRORS (block export)
      if (!record.irdNumber) {
        errors.push(`Employee ${record.employeeName} (${record.employeeId}) missing IRD number`);
      }
      
      if (!record.taxCode) {
        errors.push(`Employee ${record.employeeName} (${record.employeeId}) missing tax code`);
      }
      
      if (record.totals.netPay < 0) {
        errors.push(`Employee ${record.employeeName} (${record.employeeId}) has negative net pay: $${record.totals.netPay}`);
      }

      // Validate net pay calculation
      const calculatedNet = record.totals.grossPay - record.totals.totalDeductions;
      if (Math.abs(calculatedNet - record.totals.netPay) > 0.02) {
        errors.push(`Employee ${record.employeeName} (${record.employeeId}) net pay mismatch: expected $${calculatedNet.toFixed(2)}, got $${record.totals.netPay.toFixed(2)}`);
      }

      // WARNINGS (allow but flag)
      if (record.earnings.regular.hours > 60) {
        warnings.push(`Employee ${record.employeeName} (${record.employeeId}) has ${record.earnings.regular.hours} regular hours - verify this is correct`);
      }
      
      if (record.earnings.overtime.hours > 20) {
        warnings.push(`Employee ${record.employeeName} (${record.employeeId}) has ${record.earnings.overtime.hours} overtime hours - high overtime detected`);
      }

      if (record.totals.grossPay === 0) {
        warnings.push(`Employee ${record.employeeName} (${record.employeeId}) has zero gross pay`);
      }

      // Validate minimum wage
      const MIN_WAGE_NZ_2024 = 23.15;
      if (record.earnings.regular.rate < MIN_WAGE_NZ_2024) {
        warnings.push(`Employee ${record.employeeName} (${record.employeeId}) has hourly rate $${record.earnings.regular.rate} below minimum wage ($${MIN_WAGE_NZ_2024})`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate export file in requested format
   */
  private async generateFile(
    records: NZPayrollExportRecord[],
    format: 'csv' | 'json' | 'excel',
    companyId: string,
    payPeriodStart: Date,
    payPeriodEnd: Date,
    exportedBy: string,
    warnings: string[]
  ): Promise<PayrollExportResult> {
    const periodStr = `${formatDate(payPeriodStart, 'yyyy-MM-dd')}_${formatDate(payPeriodEnd, 'yyyy-MM-dd')}`;
    
    switch (format) {
      case 'csv':
        return this.generateCSV(records, periodStr, warnings, companyId, payPeriodStart, payPeriodEnd, exportedBy);
      case 'json':
        return this.generateJSON(records, periodStr, warnings, companyId, payPeriodStart, payPeriodEnd, exportedBy);
      case 'excel':
        return this.generateExcel(records, periodStr, warnings, companyId, payPeriodStart, payPeriodEnd, exportedBy);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate CSV export
   */
  private async generateCSV(
    records: NZPayrollExportRecord[],
    periodStr: string,
    warnings: string[],
    companyId: string,
    payPeriodStart: Date,
    payPeriodEnd: Date,
    exportedBy: string
  ): Promise<PayrollExportResult> {
    // Flatten records for CSV
    const flatRecords = records.map(flattenPayrollRecord);

    // Define CSV headers
    const headers = [
      'Employee ID', 'IRD Number', 'Employee Name', 'Email', 'Tax Code', 'Date of Birth',
      'Regular Hours', 'Regular Rate', 'Regular Pay',
      'Overtime Hours', 'Overtime Rate', 'Overtime Multiplier', 'Overtime Pay',
      'Public Holiday Hours', 'Public Holiday Rate', 'Public Holiday Multiplier', 'Public Holiday Pay', 'Public Holiday Name', 'Alternative Day Granted',
      'Allowances', 'Bonuses', 'Commission', 'Reimbursements',
      'PAYE Tax', 'ACC Levy',
      'Student Loan Deduction', 'Student Loan Balance',
      'KiwiSaver Employee', 'KiwiSaver Employee Rate', 'KiwiSaver Employer', 'KiwiSaver Employer Rate', 'ESCT', 'KiwiSaver Opted Out',
      'Union Fees', 'Insurance', 'Childcare Levy', 'Other Deductions',
      'Annual Leave Balance', 'Sick Leave Balance', 'Alternative Days Balance',
      'Total Hours', 'Gross Pay', 'Total Deductions', 'Net Pay', 'Employer Cost',
      'Pay Period Start', 'Pay Period End', 'Payment Date', 'Pay Frequency',
      'Department', 'Location', 'Job Role', 'Bank Account',
      'Exported At', 'Exported By'
    ];

    // Build CSV rows
    const rows = flatRecords.map(r => [
      r.employeeId, r.irdNumber, escapeCSV(r.employeeName), escapeCSV(r.employeeEmail), r.taxCode, r.dateOfBirth || '',
      r.regularHours.toFixed(2), r.regularRate.toFixed(2), r.regularPay.toFixed(2),
      r.overtimeHours.toFixed(2), r.overtimeRate.toFixed(2), r.overtimeMultiplier.toFixed(2), r.overtimePay.toFixed(2),
      r.publicHolidayHours.toFixed(2), r.publicHolidayRate.toFixed(2), r.publicHolidayMultiplier.toFixed(2), r.publicHolidayPay.toFixed(2), escapeCSV(r.publicHolidayName || ''), r.alternativeDayGranted ? 'Yes' : 'No',
      r.allowances.toFixed(2), r.bonuses.toFixed(2), r.commission.toFixed(2), r.reimbursements.toFixed(2),
      r.payeTax.toFixed(2), r.accLevyDeduction.toFixed(2),
      r.studentLoanDeduction.toFixed(2), r.studentLoanBalance?.toFixed(2) || '',
      r.kiwiSaverEmployee.toFixed(2), (r.kiwiSaverEmployeeRate * 100).toFixed(1) + '%', r.kiwiSaverEmployer.toFixed(2), (r.kiwiSaverEmployerRate * 100).toFixed(1) + '%', r.esctDeduction.toFixed(2), r.kiwiSaverOptedOut ? 'Yes' : 'No',
      r.unionFees.toFixed(2), r.insuranceDeductions.toFixed(2), r.childcareLevy.toFixed(2), r.otherDeductions.toFixed(2),
      r.annualLeaveBalance.toFixed(2), r.sickLeaveBalance.toFixed(2), r.alternativeDaysBalance.toString(),
      r.totalHours.toFixed(2), r.grossPay.toFixed(2), r.totalDeductions.toFixed(2), r.netPay.toFixed(2), r.employerCost.toFixed(2),
      r.payPeriodStart, r.payPeriodEnd, r.paymentDate, r.payFrequency,
      escapeCSV(r.department || ''), escapeCSV(r.location || ''), escapeCSV(r.jobRole || ''), escapeCSV(r.bankAccount || ''),
      r.exportedAt, escapeCSV(r.exportedBy)
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const filename = `payroll_export_${periodStr}.csv`;

    // Log export
    await this.logExportEvent(companyId, exportedBy, payPeriodStart, payPeriodEnd, records.length, 'csv', filename);

    return {
      data: csvContent,
      filename,
      mimeType: 'text/csv',
      recordCount: records.length,
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy,
        companyId,
        payPeriodStart: formatDate(payPeriodStart, 'yyyy-MM-dd'),
        payPeriodEnd: formatDate(payPeriodEnd, 'yyyy-MM-dd'),
      },
      warnings,
      errors: [],
    };
  }

  /**
   * Generate JSON export
   */
  private async generateJSON(
    records: NZPayrollExportRecord[],
    periodStr: string,
    warnings: string[],
    companyId: string,
    payPeriodStart: Date,
    payPeriodEnd: Date,
    exportedBy: string
  ): Promise<PayrollExportResult> {
    const jsonData = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportedBy,
        companyId,
        payPeriodStart: formatDate(payPeriodStart, 'yyyy-MM-dd'),
        payPeriodEnd: formatDate(payPeriodEnd, 'yyyy-MM-dd'),
        recordCount: records.length,
        exportVersion: '1.0',
        warnings,
      },
      records,
    };

    const filename = `payroll_export_${periodStr}.json`;

    // Log export
    await this.logExportEvent(companyId, exportedBy, payPeriodStart, payPeriodEnd, records.length, 'json', filename);

    return {
      data: JSON.stringify(jsonData, null, 2),
      filename,
      mimeType: 'application/json',
      recordCount: records.length,
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy,
        companyId,
        payPeriodStart: formatDate(payPeriodStart, 'yyyy-MM-dd'),
        payPeriodEnd: formatDate(payPeriodEnd, 'yyyy-MM-dd'),
      },
      warnings,
      errors: [],
    };
  }

  /**
   * Generate Excel export
   */
  private async generateExcel(
    records: NZPayrollExportRecord[],
    periodStr: string,
    warnings: string[],
    companyId: string,
    payPeriodStart: Date,
    payPeriodEnd: Date,
    exportedBy: string
  ): Promise<PayrollExportResult> {
    // Flatten records
    const flatRecords = records.map(flattenPayrollRecord);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['NZ Payroll Export'],
      ['Period:', `${formatDate(payPeriodStart, 'yyyy-MM-dd')} to ${formatDate(payPeriodEnd, 'yyyy-MM-dd')}`],
      ['Exported:', new Date().toISOString()],
      ['Exported By:', exportedBy],
      ['Total Employees:', records.length],
      [''],
      ['Summary Totals:'],
      ['Gross Pay:', records.reduce((sum, r) => sum + r.totals.grossPay, 0).toFixed(2)],
      ['PAYE Tax:', records.reduce((sum, r) => sum + r.deductions.paye.tax, 0).toFixed(2)],
      ['KiwiSaver Employee:', records.reduce((sum, r) => sum + r.deductions.kiwiSaver.employee, 0).toFixed(2)],
      ['KiwiSaver Employer:', records.reduce((sum, r) => sum + r.deductions.kiwiSaver.employer, 0).toFixed(2)],
      ['Net Pay:', records.reduce((sum, r) => sum + r.totals.netPay, 0).toFixed(2)],
      ['Employer Cost:', records.reduce((sum, r) => sum + r.totals.employerCost, 0).toFixed(2)],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Payroll data sheet
    const payrollSheet = XLSX.utils.json_to_sheet(flatRecords);
    XLSX.utils.book_append_sheet(workbook, payrollSheet, 'Payroll Data');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `payroll_export_${periodStr}.xlsx`;

    // Log export
    await this.logExportEvent(companyId, exportedBy, payPeriodStart, payPeriodEnd, records.length, 'excel', filename);

    return {
      data: buffer,
      filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      recordCount: records.length,
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy,
        companyId,
        payPeriodStart: formatDate(payPeriodStart, 'yyyy-MM-dd'),
        payPeriodEnd: formatDate(payPeriodEnd, 'yyyy-MM-dd'),
      },
      warnings,
      errors: [],
    };
  }

  /**
   * Log export event for audit trail
   */
  private async logExportEvent(
    companyId: string,
    exportedBy: string,
    payPeriodStart: Date,
    payPeriodEnd: Date,
    recordCount: number,
    format: string,
    filename: string
  ): Promise<void> {
    try {
      const db = getPrisma();
      if (!db) return;
      
      await db.globalAuditLog.create({
        data: {
          id: `audit_${Date.now()}`,
          companyId,
          actorId: exportedBy,
          action: 'CREATED',
          entityType: 'EMPLOYEE',
          entityId: 'payroll_export',
          metadata: {
            type: 'PAYROLL_EXPORT',
            payPeriodStart: formatDate(payPeriodStart, 'yyyy-MM-dd'),
            payPeriodEnd: formatDate(payPeriodEnd, 'yyyy-MM-dd'),
            recordCount,
            format,
            filename,
            exportedAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('[PayrollExport] Failed to log export event:', error);
      // Don't throw - logging failure shouldn't break export
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Escape CSV field value
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}
