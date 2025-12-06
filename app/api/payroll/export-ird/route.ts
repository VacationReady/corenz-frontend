/**
 * NZ IRD-Compliant Payroll Export API
 * POST /api/payroll/export-ird
 * 
 * Exports complete payroll with tax calculations for IRD compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { stringify } from 'csv-stringify/sync';
import * as XLSX from 'xlsx';
import { validatePayrollExport, formatValidationResult } from '@/lib/payroll/validators';
import { flattenPayrollRecord } from '@/types/nz-payroll-export';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { companyId, periodStart, periodEnd, paymentDate, format = 'CSV', employeeIds } = body;

    // Validate required fields
    if (!companyId || !periodStart || !periodEnd || !paymentDate) {
      return NextResponse.json(
        { error: 'Missing required fields: companyId, periodStart, periodEnd, paymentDate' },
        { status: 400 }
      );
    }

    // Verify user access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || user.companyId !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Admin can export IRD-compliant payroll' },
        { status: 403 }
      );
    }

    // Fetch payroll calculations for the period
    const calculations = await prisma.payrollCalculation.findMany({
      where: {
        companyId,
        payPeriodStart: { gte: new Date(periodStart) },
        payPeriodEnd: { lte: new Date(periodEnd) },
        status: { in: ['CALCULATED', 'APPROVED', 'EXPORTED'] },
        ...(employeeIds && employeeIds.length > 0
          ? { employeeId: { in: employeeIds } }
          : {}),
      },
      include: {
        Employee: {
          include: {
            User: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            Department: {
              select: { name: true },
            },
            Location: {
              select: { name: true },
            },
          },
        },
        Timesheet: {
          include: {
            TimesheetEntries: true,
          },
        },
      },
      orderBy: {
        payPeriodStart: 'asc',
      },
    });

    if (calculations.length === 0) {
      return NextResponse.json({
        error: 'No payroll calculations found for the period',
      }, { status: 404 });
    }

    // Validate payroll data
    const employeeData = calculations.map(calc => ({
      employeeId: calc.employeeId,
      employeeName: `${calc.Employee.User.firstName} ${calc.Employee.User.lastName}`,
      irdNumber: calc.Employee.irdNumber,
      taxCode: calc.Employee.taxCode as any,
      grossPay: parseFloat(calc.grossPay.toString()),
      netPay: parseFloat(calc.netPay.toString()),
      paye: parseFloat(calc.payeTax.toString()),
      totalDeductions: parseFloat(calc.totalDeductions.toString()),
      overtimeHours: calc.Timesheet.overtimeHours ? parseFloat(calc.Timesheet.overtimeHours.toString()) : 0,
      kiwiSaverEmployeeRate: calc.Employee.kiwiSaverEmployeeRate
        ? parseFloat(calc.Employee.kiwiSaverEmployeeRate.toString())
        : null,
      kiwiSaverEmployer: parseFloat(calc.kiwiSaverEmployer.toString()),
      hasStudentLoan: calc.Employee.hasStudentLoan,
    }));

    const validation = validatePayrollExport(employeeData);

    if (!validation.isValid) {
      // Return validation errors
      return NextResponse.json({
        error: 'Payroll validation failed',
        validation: {
          criticalErrors: validation.criticalErrors,
          errors: validation.errors,
          warnings: validation.warnings,
          summary: validation.summary,
        },
        report: formatValidationResult(validation),
      }, { status: 400 });
    }

    // Prepare export data
    const exportRecords = calculations.map(calc => {
      const employee = calc.Employee;
      const timesheet = calc.Timesheet;
      const entries = timesheet.TimesheetEntries;

      // Sum hours from entries
      const regularHours = entries.reduce(
        (sum, e) => sum + parseFloat(e.regularHours?.toString() || '0'),
        0
      );
      const overtimeHours = entries.reduce(
        (sum, e) => sum + parseFloat(e.overtimeHours?.toString() || '0'),
        0
      );
      const publicHolidayHours = entries.reduce(
        (sum, e) => sum + parseFloat(e.publicHolidayHours?.toString() || '0'),
        0
      );

      return {
        // Employee Identity
        employeeId: employee.id,
        employeeName: `${employee.User.firstName} ${employee.User.lastName}`,
        employeeEmail: employee.User.email,
        irdNumber: employee.irdNumber || '',
        taxCode: employee.taxCode || '',
        dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.toISOString().split('T')[0] : '',

        // Earnings
        regularHours: regularHours.toFixed(2),
        regularRate: employee.hourlyRate ? parseFloat(employee.hourlyRate.toString()).toFixed(2) : '0.00',
        regularPay: parseFloat(calc.regularPay.toString()).toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
        overtimeRate: overtimeHours > 0 && employee.hourlyRate
          ? (parseFloat(employee.hourlyRate.toString()) * 1.5).toFixed(2)
          : '0.00',
        overtimeMultiplier: overtimeHours > 0 ? '1.50' : '0.00',
        overtimePay: parseFloat(calc.overtimePay.toString()).toFixed(2),
        publicHolidayHours: publicHolidayHours.toFixed(2),
        publicHolidayRate: publicHolidayHours > 0 && employee.hourlyRate
          ? (parseFloat(employee.hourlyRate.toString()) * 2.0).toFixed(2)
          : '0.00',
        publicHolidayPay: parseFloat(calc.publicHolidayPay.toString()).toFixed(2),
        allowances: parseFloat(calc.allowances.toString()).toFixed(2),
        bonuses: parseFloat(calc.bonuses.toString()).toFixed(2),
        grossPay: parseFloat(calc.grossPay.toString()).toFixed(2),

        // Deductions
        payeTax: parseFloat(calc.payeTax.toString()).toFixed(2),
        accLevy: parseFloat(calc.accLevy.toString()).toFixed(2),
        studentLoanDeduction: parseFloat(calc.studentLoanDeduction.toString()).toFixed(2),
        kiwiSaverEmployee: parseFloat(calc.kiwiSaverEmployee.toString()).toFixed(2),
        kiwiSaverEmployeeRate: parseFloat(calc.kiwiSaverEmployeeRate.toString()).toFixed(4),
        kiwiSaverEmployer: parseFloat(calc.kiwiSaverEmployer.toString()).toFixed(2),
        kiwiSaverEmployerRate: parseFloat(calc.kiwiSaverEmployerRate.toString()).toFixed(4),
        esctDeduction: parseFloat(calc.esctDeduction.toString()).toFixed(2),
        totalDeductions: parseFloat(calc.totalDeductions.toString()).toFixed(2),

        // Totals
        netPay: parseFloat(calc.netPay.toString()).toFixed(2),
        employerCost: parseFloat(calc.employerCost.toString()).toFixed(2),

        // Leave Balances
        annualLeaveBalance: parseFloat(employee.annualLeaveBalance.toString()).toFixed(2),
        sickLeaveBalance: parseFloat(employee.sickLeaveBalance.toString()).toFixed(2),
        alternativeDaysBalance: employee.alternativeDaysBalance.toString(),

        // Metadata
        payPeriodStart: calc.payPeriodStart.toISOString().split('T')[0],
        payPeriodEnd: calc.payPeriodEnd.toISOString().split('T')[0],
        paymentDate: calc.paymentDate.toISOString().split('T')[0],
        payFrequency: calc.payFrequency,
        taxYear: calc.taxYear,
        department: employee.Department?.name || '',
        location: employee.Location?.name || '',
        bankAccount: employee.bankAccountNumber || '',
        calculatedAt: calc.calculatedAt.toISOString(),
      };
    });

    // Mark as exported
    await prisma.payrollCalculation.updateMany({
      where: {
        id: { in: calculations.map(c => c.id) },
      },
      data: {
        status: 'EXPORTED',
        exportedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId,
        action: 'CREATED',
        entityType: 'EMPLOYEE',
        entityId: `payroll-export-${Date.now()}`,
        metadata: {
          type: 'IRD_PAYROLL_EXPORT',
          format,
          periodStart,
          periodEnd,
          totalEmployees: calculations.length,
          validationStatus: 'PASSED',
          warnings: validation.warnings.length,
        },
      },
    });

    // Generate export based on format
    if (format === 'CSV') {
      const csv = stringify(exportRecords, {
        header: true,
        columns: Object.keys(exportRecords[0]),
      });

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payroll_ird_compliant_${periodStart}_${periodEnd}.csv"`,
        },
      });
    }

    if (format === 'EXCEL' || format === 'XLSX') {
      const ws = XLSX.utils.json_to_sheet(exportRecords);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Payroll');

      // Add summary sheet
      const summary = [
        { Field: 'Export Date', Value: new Date().toISOString().split('T')[0] },
        { Field: 'Period Start', Value: periodStart },
        { Field: 'Period End', Value: periodEnd },
        { Field: 'Payment Date', Value: paymentDate },
        { Field: 'Total Employees', Value: calculations.length },
        { Field: 'Total Gross Pay', Value: calculations.reduce((sum, c) => sum + parseFloat(c.grossPay.toString()), 0).toFixed(2) },
        { Field: 'Total Net Pay', Value: calculations.reduce((sum, c) => sum + parseFloat(c.netPay.toString()), 0).toFixed(2) },
        { Field: 'Total PAYE', Value: calculations.reduce((sum, c) => sum + parseFloat(c.payeTax.toString()), 0).toFixed(2) },
        { Field: 'Total ACC', Value: calculations.reduce((sum, c) => sum + parseFloat(c.accLevy.toString()), 0).toFixed(2) },
        { Field: 'Total KiwiSaver (Employee)', Value: calculations.reduce((sum, c) => sum + parseFloat(c.kiwiSaverEmployee.toString()), 0).toFixed(2) },
        { Field: 'Total KiwiSaver (Employer)', Value: calculations.reduce((sum, c) => sum + parseFloat(c.kiwiSaverEmployer.toString()), 0).toFixed(2) },
        { Field: 'Total Employer Cost', Value: calculations.reduce((sum, c) => sum + parseFloat(c.employerCost.toString()), 0).toFixed(2) },
      ];

      const wsSummary = XLSX.utils.json_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="payroll_ird_compliant_${periodStart}_${periodEnd}.xlsx"`,
        },
      });
    }

    // JSON format
    return NextResponse.json({
      success: true,
      exportDate: new Date().toISOString(),
      periodStart,
      periodEnd,
      paymentDate,
      totalEmployees: calculations.length,
      validation: {
        passed: true,
        warnings: validation.warnings.length,
        summary: validation.summary,
      },
      records: exportRecords,
    });
  } catch (error) {
    console.error('IRD payroll export error:', error);
    return NextResponse.json(
      {
        error: 'Failed to export IRD-compliant payroll',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
