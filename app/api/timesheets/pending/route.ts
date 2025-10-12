import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/timesheets/pending
 * Fetch pending timesheets awaiting approval
 * Permission: ADMIN or MANAGER
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyId: true,
        departmentId: true,
        User: {
          select: {
            role: true,
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
        { error: "Only admins and managers can view pending timesheets" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const whereClause: any = {
      employee: {
        companyId: employee.companyId,
      },
      status: "SUBMITTED",
    };

    // Manager can only see their department
    if (isManager && !isAdmin) {
      whereClause.employee = {
        ...whereClause.employee,
        departmentId: employee.departmentId,
      };
    }

    // Apply filters
    if (departmentId) {
      whereClause.employee = {
        ...whereClause.employee,
        departmentId,
      };
    }

    if (startDate || endDate) {
      whereClause.periodStart = {};
      if (startDate) {
        whereClause.periodStart.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.periodStart.lte = new Date(endDate);
      }
    }

    // Fetch timesheets with pagination
    const [timesheets, total] = await Promise.all([
      prisma.timesheet.findMany({
        where: whereClause,
        include: {
          Employee: {
            include: {
              User: {
                select: {
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
              Department: {
                select: {
                  name: true,
                },
              },
            },
          },
          entries: {
            select: {
              date: true,
              clockIn: true,
              clockOut: true,
              breakDuration: true,
            },
          },
        },
        orderBy: {
          submittedAt: "asc", // Oldest first
        },
        take: limit,
        skip: offset,
      }),
      prisma.timesheet.count({ where: whereClause }),
    ]);

    // Calculate total hours for each timesheet
    const enrichedTimesheets = timesheets.map((timesheet) => {
      let totalHours = 0;

      for (const entry of timesheet.TimesheetEntries) {
        if (entry.clockIn && entry.clockOut) {
          const clockIn = new Date(entry.clockIn);
          const clockOut = new Date(entry.clockOut);
          const totalMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);
          const breakMinutes = entry.breakDuration || 0;
          const workedMinutes = totalMinutes - breakMinutes;
          totalHours += workedMinutes / 60;
        }
      }

      return {
        id: timesheet.id,
        employeeId: timesheet.EmployeeId,
        employeeName: timesheet.Employee.User?.name || "Unknown",
        employeeEmail: timesheet.Employee.User?.email || "",
        employeeAvatar: timesheet.Employee.User?.avatarUrl,
        department: timesheet.Employee.Department?.name || "Unassigned",
        periodStart: timesheet.periodStart,
        periodEnd: timesheet.periodEnd,
        totalHours: parseFloat(totalHours.toFixed(2)),
        status: timesheet.approvalStatus,
        submittedAt: timesheet.submittedAt,
        notes: timesheet.submissionNotes,
      };
    });

    return NextResponse.json({
      timesheets: enrichedTimesheets,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("Pending timesheets fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending timesheets" },
      { status: 500 }
    );
  }
}
