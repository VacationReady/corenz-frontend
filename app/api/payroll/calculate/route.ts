/**
 * Payroll Calculation API
 * POST /api/payroll/calculate
 * 
 * Pre-calculates payroll for a pay period before export
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { PrismaClient } from '@prisma/client';
import { calculatePayroll, PayrollCalculationInput } from '@/lib/payroll/payroll-calculation-service';
import { PayFrequency } from '@/lib/payroll/paye-calculator';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { companyId, periodStart, periodEnd, paymentDate, employeeIds } = body;

    // Validate required fields
    if (!companyId || !periodStart || !periodEnd || !paymentDate) {
      return NextResponse.json(
        { error: 'Missing required fields: companyId, periodStart, periodEnd, paymentDate' },
        { status: 400 }
      );
    }

    // Verify user has access to company
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || user.companyId !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check permissions
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions - requires Admin or Manager role' },
        { status: 403 }
      );
    }

    // Parse optional reconciliation enforcement flag (default: true for production safety)
    const requireReconciliation = body.requireReconciliation !== false;

    // Fetch approved timesheets for the period
    const timesheets = await prisma.timesheet.findMany({
      where: {
        companyId,
        periodStart: { gte: new Date(periodStart) },
        periodEnd: { lte: new Date(periodEnd) },
        approvalStatus: 'APPROVED',
        ...(employeeIds && employeeIds.length > 0
          ? { employeeId: { in: employeeIds } }
          : {}),
      },
      include: {
        Employee: {
          select: {
            id: true,
            irdNumber: true,
            taxCode: true,
            hourlyRate: true,
            kiwiSaverEnrolled: true,
            kiwiSaverEmployeeRate: true,
            User: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        TimesheetEntries: {
          select: {
            id: true,
            regularHours: true,
            overtimeHours: true,
            publicHolidayHours: true,
            reconciliationStatus: true,
          },
        },
      },
    });

    if (timesheets.length === 0) {
      return NextResponse.json({
        success: true,
        calculations: [],
        summary: {
          totalEmployees: 0,
          totalGrossPay: 0,
          totalNetPay: 0,
          totalPAYE: 0,
          totalKiwiSaver: 0,
          totalEmployerCost: 0,
        },
        validationErrors: ['No approved timesheets found for the period'],
      });
    }

    // Calculate payroll for each timesheet
    const calculations = [];
    const errors = [];
    const skippedTimesheets: Array<{ timesheetId: string; employeeName: string; reason: string }> = [];

    // Reconciliation statuses that are safe for payroll
    const PAYROLL_SAFE_STATUSES = ['APPROVED', 'ADJUSTED'];

    for (const timesheet of timesheets) {
      try {
        const employee = timesheet.Employee;
        const entries = timesheet.TimesheetEntries;

        // Check reconciliation status of all entries
        const unreconciledEntries = entries.filter(
          (e) => !PAYROLL_SAFE_STATUSES.includes(e.reconciliationStatus || 'PENDING')
        );

        if (requireReconciliation && unreconciledEntries.length > 0) {
          const employeeName = `${employee.User.firstName} ${employee.User.lastName}`;
          skippedTimesheets.push({
            timesheetId: timesheet.id,
            employeeName,
            reason: `${unreconciledEntries.length} entry/entries not reconciled (status: ${Array.from(new Set(unreconciledEntries.map(e => e.reconciliationStatus || 'PENDING'))).join(', ')})`,
          });
          continue; // Skip this timesheet
        }

        // Sum hours from entries (only reconciled entries if enforcement is on)
        const entriesToProcess = requireReconciliation
          ? entries.filter((e) => PAYROLL_SAFE_STATUSES.includes(e.reconciliationStatus || 'PENDING'))
          : entries;

        const regularHours = entriesToProcess.reduce(
          (sum, e) => sum + parseFloat(e.regularHours?.toString() || '0'),
          0
        );
        const overtimeHours = entriesToProcess.reduce(
          (sum, e) => sum + parseFloat(e.overtimeHours?.toString() || '0'),
          0
        );
        const publicHolidayHours = entriesToProcess.reduce(
          (sum, e) => sum + parseFloat(e.publicHolidayHours?.toString() || '0'),
          0
        );

        const hourlyRate = employee.hourlyRate
          ? parseFloat(employee.hourlyRate.toString())
          : 25; // Default $25/hr

        const input: PayrollCalculationInput = {
          timesheetId: timesheet.id,
          employeeId: employee.id,
          companyId,
          payPeriodStart: timesheet.periodStart,
          payPeriodEnd: timesheet.periodEnd,
          paymentDate: new Date(paymentDate),
          payFrequency: 'WEEKLY' as PayFrequency, // Default to weekly
          regularHours,
          regularRate: hourlyRate,
          overtimeHours: overtimeHours > 0 ? overtimeHours : undefined,
          overtimeRate: overtimeHours > 0 ? hourlyRate * 1.5 : undefined,
          publicHolidayHours: publicHolidayHours > 0 ? publicHolidayHours : undefined,
          publicHolidayRate: publicHolidayHours > 0 ? hourlyRate * 2.0 : undefined,
          calculatedBy: session.user.id,
        };

        const result = await calculatePayroll(input);

        calculations.push({
          employeeId: employee.id,
          employeeName: `${employee.User.firstName} ${employee.User.lastName}`,
          grossPay: result.grossPay,
          netPay: result.netPay,
          paye: result.payeTax,
          kiwiSaver: result.kiwiSaverEmployee + result.kiwiSaverEmployer,
          warnings: result.warnings,
        });
      } catch (error) {
        console.error(`Failed to calculate payroll for timesheet ${timesheet.id}:`, error);
        errors.push(
          `${timesheet.Employee.User.firstName} ${timesheet.Employee.User.lastName}: ${
            error instanceof Error ? error.message : 'Calculation failed'
          }`
        );
      }
    }

    // Calculate summary
    const summary = {
      totalEmployees: calculations.length,
      totalGrossPay: calculations.reduce((sum, c) => sum + c.grossPay, 0),
      totalNetPay: calculations.reduce((sum, c) => sum + c.netPay, 0),
      totalPAYE: calculations.reduce((sum, c) => sum + c.paye, 0),
      totalKiwiSaver: calculations.reduce((sum, c) => sum + c.kiwiSaver, 0),
      totalEmployerCost: calculations.reduce(
        (sum, c) => sum + c.grossPay + (c.kiwiSaver / 2), // Approximate employer cost
        0
      ),
    };

    return NextResponse.json({
      success: true,
      calculations,
      summary,
      validationErrors: errors,
      skippedTimesheets,
      reconciliationEnforced: requireReconciliation,
    });
  } catch (error) {
    console.error('Payroll calculation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate payroll',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
