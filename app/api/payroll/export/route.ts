import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import ExcelJS from "exceljs";
import { stringify } from "csv-stringify/sync";

const exportRequestSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  format: z.enum(["CSV", "EXCEL", "JSON"]),
  departmentId: z.string().optional(),
  employeeIds: z.array(z.string()).optional(),
  includeBreaks: z.boolean().optional(),
  includeNotes: z.boolean().optional(),
});

type PayrollEntry = {
  employeeId: string;
  employeeName: string;
  email: string;
  department: string;
  date: string;
  clockIn: string;
  clockOut: string;
  breakDuration: number;
  totalHours: number;
  overtimeHours: number;
  hourlyRate: number;
  totalCost: number;
  location: string;
  notes: string;
  status: string;
  approvedBy: string;
  approvedAt: string;
};

type PayrollExportData = {
  exportDate: string;
  periodStart: string;
  periodEnd: string;
  totalEmployees: number;
  totalHours: number;
  totalCost: number;
  employees: {
    employeeId: string;
    name: string;
    email: string;
    department: string;
    entries: {
      date: string;
      clockIn: string;
      clockOut: string;
      breakDuration: number;
      totalHours: number;
      overtimeHours: number;
      hourlyRate: number;
      totalCost: number;
      location: string;
      notes: string;
      status: string;
      approvedBy: string;
      approvedAt: string;
    }[];
    summary: {
      totalHours: number;
      overtimeHours: number;
      totalCost: number;
    };
  }[];
};

/**
 * Calculate overtime hours based on threshold
 */
function calculateOvertimeHours(totalHours: number, threshold: number): number {
  return Math.max(0, totalHours - threshold);
}

/**
 * POST /api/payroll/export
 * Export timesheet data for payroll processing
 * Permission: ADMIN or MANAGER (own department)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = exportRequestSchema.parse(body);

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        departmentId: true,
        User: {
          select: {
            role: true,
            name: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
    }

    const isAdmin = employee.User.role === "ADMIN";
    const isManager = employee.User.role === "MANAGER";

    if (!isAdmin && !isManager) {
      return NextResponse.json(
        { error: "Only admins and managers can export payroll data" },
        { status: 403 }
      );
    }

    // Get company settings for overtime threshold
    let settings = await prisma.timeTrackingSettings.findUnique({
      where: { companyId: employee.companyId },
    });

    if (!settings) {
      // Create default settings if not exists
      settings = await prisma.timeTrackingSettings.create({
        data: {
          companyId: employee.companyId,
        },
      });
    }

    const overtimeThreshold = settings.overtimeThreshold || 40;

    // Build query filters
    const whereClause: any = {
      employee: {
        companyId: employee.companyId,
      },
      status: "APPROVED",
      submittedAt: {
        gte: new Date(data.startDate),
        lte: new Date(data.endDate),
      },
    };

    // Manager can only see their department
    if (isManager && !isAdmin) {
      whereClause.employee = {
        ...whereClause.employee,
        departmentId: employee.departmentId,
      };
    }

    // Apply department filter
    if (data.departmentId) {
      whereClause.employee = {
        ...whereClause.employee,
        departmentId: data.departmentId,
      };
    }

    // Apply employee filter
    if (data.employeeIds && data.employeeIds.length > 0) {
      whereClause.employeeId = {
        in: data.employeeIds,
      };
    }

    // Fetch approved timesheets
    const timesheets = await prisma.timesheet.findMany({
      where: whereClause,
      include: {
        Employee: {
          include: {
            User: {
              select: {
                name: true,
                email: true,
              },
            },
            Department: {
              select: {
                name: true,
              },
            },
          },
        },
        TimesheetEntries: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            breakMinutes: true,
            hours: true,
            notes: true,
          },
        },
        ApprovalStages: {
          where: {
            status: "APPROVED",
          },
          include: {
            Decisions: {
              select: {
                User: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        periodStart: "asc",
      },
    });

    // Process timesheets into payroll entries
    const payrollEntries: PayrollEntry[] = [];
    const employeeMap = new Map<
      string,
      {
        employeeId: string;
        name: string;
        email: string;
        department: string;
        entries: any[];
      }
    >();

    for (const timesheet of timesheets) {
      const employeeName = timesheet.Employee.User?.name || "Unknown";
      const employeeEmail = timesheet.Employee.User?.email || "";
      const department = timesheet.Employee.Department?.name || "Unassigned";
      const hourlyRate = (timesheet.Employee as any).hourlyRate || 0;

      for (const entry of timesheet.TimesheetEntries) {
        const clockIn = entry.clockIn ? new Date(entry.clockIn) : null;
        const clockOut = entry.clockOut ? new Date(entry.clockOut) : null;

        if (!clockIn || !clockOut) continue;

        const totalMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);
        const breakMinutes = entry.breakDuration || 0;
        const workedMinutes = totalMinutes - breakMinutes;
        const totalHours = parseFloat((workedMinutes / 60).toFixed(2));

        const approval = timesheet.ApprovalStages[0];
        const approvedBy = approval?.approver?.User?.name || "System";
        const approvedAt = approval?.createdAt
          ? new Date(approval.createdAt).toISOString()
          : "";

        const payrollEntry: PayrollEntry = {
          employeeId: timesheet.employeeId,
          employeeName,
          email: employeeEmail,
          department,
          date: new Date(entry.date).toISOString().split("T")[0],
          clockIn: clockIn.toTimeString().slice(0, 8),
          clockOut: clockOut.toTimeString().slice(0, 8),
          breakDuration: data.includeBreaks !== false ? breakMinutes : 0,
          totalHours,
          overtimeHours: 0, // Calculated later per week
          hourlyRate,
          totalCost: parseFloat((totalHours * hourlyRate).toFixed(2)),
          location: entry.location?.name || "",
          notes: data.includeNotes !== false ? (entry.notes || "") : "",
          status: timesheet.approvalStatus,
          approvedBy,
          approvedAt,
        };

        payrollEntries.push(payrollEntry);

        // Group by employee
        if (!employeeMap.has(timesheet.employeeId)) {
          employeeMap.set(timesheet.employeeId, {
            employeeId: timesheet.employeeId,
            name: employeeName,
            email: employeeEmail,
            department,
            entries: [],
          });
        }
        employeeMap.get(timesheet.employeeId)!.entries.push({
          date: payrollEntry.date,
          clockIn: payrollEntry.clockIn,
          clockOut: payrollEntry.clockOut,
          breakDuration: payrollEntry.breakDuration,
          totalHours: payrollEntry.totalHours,
          overtimeHours: 0,
          hourlyRate: payrollEntry.hourlyRate,
          totalCost: payrollEntry.totalCost,
          location: payrollEntry.location,
          notes: payrollEntry.notes,
          status: payrollEntry.status,
          approvedBy: payrollEntry.approvedBy,
          approvedAt: payrollEntry.approvedAt,
        });
      }
    }

    // Calculate totals
    const totalHours = payrollEntries.reduce((sum, e) => sum + e.totalHours, 0);
    const totalCost = payrollEntries.reduce((sum, e) => sum + e.totalCost, 0);

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random()}`,
        actorId: session.user.id,
        companyId: employee.companyId,
        action: 'CREATED',
        entityType: 'EMPLOYEE',
        entityId: "payroll_export",
        metadata: {
          type: "PAYROLL_EXPORT",
          format: data.format,
          startDate: data.startDate,
          endDate: data.endDate,
          totalRecords: payrollEntries.length,
          totalEmployees: employeeMap.size,
          exportedBy: employee.User.name,
        },
      },
    });

    // Generate export based on format
    if (data.format === "CSV") {
      const csvData = payrollEntries.map((entry) => ({
        "Employee ID": entry.employeeId,
        "Employee Name": entry.employeeName,
        Department: entry.department,
        Date: entry.date,
        "Clock In": entry.clockIn,
        "Clock Out": entry.clockOut,
        "Break Duration (mins)": entry.breakDuration,
        "Total Hours": entry.totalHours,
        "Overtime Hours": entry.overtimeHours,
        "Hourly Rate": entry.hourlyRate,
        "Total Cost": entry.totalCost,
        Location: entry.location,
        Notes: entry.notes,
        Status: entry.status,
        "Approved By": entry.approvedBy,
        "Approved At": entry.approvedAt,
      }));

      const csv = stringify(csvData, {
        header: true,
        columns: [
          "Employee ID",
          "Employee Name",
          "Department",
          "Date",
          "Clock In",
          "Clock Out",
          "Break Duration (mins)",
          "Total Hours",
          "Overtime Hours",
          "Hourly Rate",
          "Total Cost",
          "Location",
          "Notes",
          "Status",
          "Approved By",
          "Approved At",
        ],
      });

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="payroll_export_${data.startDate}_${data.endDate}.csv"`,
        },
      });
    }

    if (data.format === "EXCEL") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Payroll Data");

      // Add headers
      worksheet.columns = [
        { header: "Employee ID", key: "employeeId", width: 15 },
        { header: "Employee Name", key: "employeeName", width: 20 },
        { header: "Department", key: "department", width: 15 },
        { header: "Date", key: "date", width: 12 },
        { header: "Clock In", key: "clockIn", width: 12 },
        { header: "Clock Out", key: "clockOut", width: 12 },
        { header: "Break Duration (mins)", key: "breakDuration", width: 20 },
        { header: "Total Hours", key: "totalHours", width: 12 },
        { header: "Overtime Hours", key: "overtimeHours", width: 15 },
        { header: "Hourly Rate", key: "hourlyRate", width: 12 },
        { header: "Total Cost", key: "totalCost", width: 12 },
        { header: "Location", key: "location", width: 15 },
        { header: "Notes", key: "notes", width: 30 },
        { header: "Status", key: "status", width: 12 },
        { header: "Approved By", key: "approvedBy", width: 20 },
        { header: "Approved At", key: "approvedAt", width: 20 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF3B82F6" },
      };

      // Add data rows
      payrollEntries.forEach((entry) => {
        worksheet.addRow(entry);
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="payroll_export_${data.startDate}_${data.endDate}.xlsx"`,
        },
      });
    }

    // JSON format
    const employees = Array.from(employeeMap.values()).map((emp) => {
      const totalHours = emp.entries.reduce((sum, e) => sum + e.totalHours, 0);
      const totalCost = emp.entries.reduce((sum, e) => sum + e.totalCost, 0);
      const overtimeHours = calculateOvertimeHours(totalHours, typeof overtimeThreshold === 'number' ? overtimeThreshold : parseFloat(overtimeThreshold.toString()));

      return {
        ...emp,
        summary: {
          totalHours: parseFloat(totalHours.toFixed(2)),
          overtimeHours: parseFloat(overtimeHours.toFixed(2)),
          totalCost: parseFloat(totalCost.toFixed(2)),
        },
      };
    });

    const jsonData: PayrollExportData = {
      exportDate: new Date().toISOString(),
      periodStart: data.startDate,
      periodEnd: data.endDate,
      totalEmployees: employeeMap.size,
      totalHours: parseFloat(totalHours.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      employees,
    };

    return NextResponse.json(jsonData);
  } catch (error) {
    console.error("Payroll export error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid export parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to export payroll data" }, { status: 500 });
  }
}
