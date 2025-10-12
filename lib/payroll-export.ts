import { parse } from 'papaparse';
import * as XLSX from 'xlsx';

export interface TimesheetData {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  periodStart: Date;
  periodEnd: Date;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  hourlyRate: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  department?: string;
  location?: string;
  taxCode?: string;
  irdNumber?: string;
}

export interface PayrollExportOptions {
  format: 'CSV' | 'EXCEL' | 'JSON';
  includeOvertimeSeparately: boolean;
  includeTaxInfo: boolean;
  includePayCalculations: boolean;
  customFields?: string[];
}

/**
 * Export timesheets to CSV format
 */
export function exportToCSV(
  timesheets: TimesheetData[],
  options: PayrollExportOptions
): string {
  const headers: string[] = [
    'Employee ID',
    'Employee Name',
    'Employee Email',
    'Period Start',
    'Period End',
  ];

  if (options.includeOvertimeSeparately) {
    headers.push('Regular Hours', 'Overtime Hours', 'Total Hours');
  } else {
    headers.push('Total Hours');
  }

  if (options.includePayCalculations) {
    headers.push('Hourly Rate');
    if (options.includeOvertimeSeparately) {
      headers.push('Regular Pay', 'Overtime Pay');
    }
    headers.push('Total Pay');
  }

  if (options.includeTaxInfo) {
    headers.push('Tax Code', 'IRD Number');
  }

  headers.push('Department', 'Location');

  const rows = timesheets.map((ts) => {
    const row: (string | number)[] = [
      ts.employeeId,
      ts.employeeName,
      ts.employeeEmail,
      ts.periodStart.toISOString().split('T')[0],
      ts.periodEnd.toISOString().split('T')[0],
    ];

    if (options.includeOvertimeSeparately) {
      row.push(ts.regularHours, ts.overtimeHours, ts.totalHours);
    } else {
      row.push(ts.totalHours);
    }

    if (options.includePayCalculations) {
      row.push(ts.hourlyRate);
      if (options.includeOvertimeSeparately) {
        row.push(ts.regularPay, ts.overtimePay);
      }
      row.push(ts.totalPay);
    }

    if (options.includeTaxInfo) {
      row.push(ts.taxCode || '', ts.irdNumber || '');
    }

    row.push(ts.department || '', ts.location || '');

    return row;
  });

  // Build CSV
  let csv = headers.join(',') + '\n';
  rows.forEach((row) => {
    csv += row.map((cell) => `"${cell}"`).join(',') + '\n';
  });

  return csv;
}

/**
 * Export timesheets to Excel format
 */
export function exportToExcel(
  timesheets: TimesheetData[],
  options: PayrollExportOptions
): Buffer {
  const headers: string[] = [
    'Employee ID',
    'Employee Name',
    'Employee Email',
    'Period Start',
    'Period End',
  ];

  if (options.includeOvertimeSeparately) {
    headers.push('Regular Hours', 'Overtime Hours', 'Total Hours');
  } else {
    headers.push('Total Hours');
  }

  if (options.includePayCalculations) {
    headers.push('Hourly Rate');
    if (options.includeOvertimeSeparately) {
      headers.push('Regular Pay', 'Overtime Pay');
    }
    headers.push('Total Pay');
  }

  if (options.includeTaxInfo) {
    headers.push('Tax Code', 'IRD Number');
  }

  headers.push('Department', 'Location');

  const data = timesheets.map((ts) => {
    const row: Record<string, any> = {
      'Employee ID': ts.employeeId,
      'Employee Name': ts.employeeName,
      'Employee Email': ts.employeeEmail,
      'Period Start': ts.periodStart.toISOString().split('T')[0],
      'Period End': ts.periodEnd.toISOString().split('T')[0],
    };

    if (options.includeOvertimeSeparately) {
      row['Regular Hours'] = ts.regularHours;
      row['Overtime Hours'] = ts.overtimeHours;
      row['Total Hours'] = ts.totalHours;
    } else {
      row['Total Hours'] = ts.totalHours;
    }

    if (options.includePayCalculations) {
      row['Hourly Rate'] = ts.hourlyRate;
      if (options.includeOvertimeSeparately) {
        row['Regular Pay'] = ts.regularPay;
        row['Overtime Pay'] = ts.overtimePay;
      }
      row['Total Pay'] = ts.totalPay;
    }

    if (options.includeTaxInfo) {
      row['Tax Code'] = ts.taxCode || '';
      row['IRD Number'] = ts.irdNumber || '';
    }

    row['Department'] = ts.department || '';
    row['Location'] = ts.location || '';

    return row;
  });

  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Timesheets');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

/**
 * Export timesheets to JSON format
 */
export function exportToJSON(
  timesheets: TimesheetData[],
  options: PayrollExportOptions
): string {
  const data = timesheets.map((ts) => {
    const record: Record<string, any> = {
      employeeId: ts.employeeId,
      employeeName: ts.employeeName,
      employeeEmail: ts.employeeEmail,
      periodStart: ts.periodStart.toISOString(),
      periodEnd: ts.periodEnd.toISOString(),
    };

    if (options.includeOvertimeSeparately) {
      record.regularHours = ts.regularHours;
      record.overtimeHours = ts.overtimeHours;
      record.totalHours = ts.totalHours;
    } else {
      record.totalHours = ts.totalHours;
    }

    if (options.includePayCalculations) {
      record.hourlyRate = ts.hourlyRate;
      if (options.includeOvertimeSeparately) {
        record.regularPay = ts.regularPay;
        record.overtimePay = ts.overtimePay;
      }
      record.totalPay = ts.totalPay;
    }

    if (options.includeTaxInfo) {
      record.taxCode = ts.taxCode;
      record.irdNumber = ts.irdNumber;
    }

    record.department = ts.department;
    record.location = ts.location;

    return record;
  });

  return JSON.stringify(data, null, 2);
}

/**
 * Main export function
 */
export function exportPayrollData(
  timesheets: TimesheetData[],
  options: PayrollExportOptions
): { data: string | Buffer; filename: string; mimeType: string } {
  const timestamp = new Date().toISOString().split('T')[0];

  switch (options.format) {
    case 'CSV':
      return {
        data: exportToCSV(timesheets, options),
        filename: `payroll_export_${timestamp}.csv`,
        mimeType: 'text/csv',
      };

    case 'EXCEL':
      return {
        data: exportToExcel(timesheets, options),
        filename: `payroll_export_${timestamp}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

    case 'JSON':
      return {
        data: exportToJSON(timesheets, options),
        filename: `payroll_export_${timestamp}.json`,
        mimeType: 'application/json',
      };

    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

/**
 * Generate payroll summary
 */
export function generatePayrollSummary(timesheets: TimesheetData[]): {
  totalEmployees: number;
  totalHours: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalPay: number;
  averageHoursPerEmployee: number;
  byDepartment: Map<string, { hours: number; pay: number; employees: number }>;
} {
  const byDepartment = new Map<string, { hours: number; pay: number; employees: number }>();

  const summary = {
    totalEmployees: timesheets.length,
    totalHours: 0,
    totalRegularHours: 0,
    totalOvertimeHours: 0,
    totalPay: 0,
    averageHoursPerEmployee: 0,
    byDepartment,
  };

  for (const ts of timesheets) {
    summary.totalHours += ts.totalHours;
    summary.totalRegularHours += ts.regularHours;
    summary.totalOvertimeHours += ts.overtimeHours;
    summary.totalPay += ts.totalPay;

    // Track by department
    const dept = ts.department || 'Unassigned';
    const deptData = byDepartment.get(dept) || { hours: 0, pay: 0, employees: 0 };
    deptData.hours += ts.totalHours;
    deptData.pay += ts.totalPay;
    deptData.employees += 1;
    byDepartment.set(dept, deptData);
  }

  summary.averageHoursPerEmployee = summary.totalHours / summary.totalEmployees || 0;

  return summary;
}
