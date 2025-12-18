import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/timesheets/pending
 * Fetch timesheets by status (defaults to pending)
 * Query params: status=PENDING|APPROVED|DECLINED (optional)
 * Permission: ADMIN or MANAGER
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        userId: true,
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
    const status = searchParams.get("status"); // PENDING, APPROVED, DECLINED
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    // Show PENDING timesheets that have been submitted
    const employeeFilter: any = {
      companyId: employee.companyId,
    };

    // MANAGERS: Restrict to their department and direct reports
    if (isManager && !isAdmin) {
      const managerFilterGroups: any[] = [];

      if (employee.departmentId) {
        managerFilterGroups.push({ departmentId: employee.departmentId });
      }

      if (employee.userId) {
        managerFilterGroups.push({
          User: {
            managerId: employee.userId,
          },
        });
      }

      if (managerFilterGroups.length > 0) {
        employeeFilter.OR = managerFilterGroups;
      }
      
      // If manager selects a specific department filter, validate it's their department
      if (departmentId && departmentId !== employee.departmentId) {
        return NextResponse.json(
          { error: "Managers can only view timesheets from their own department" },
          { status: 403 }
        );
      }
    }

    // Build status filter
    // For ADMIN: Show ALL timesheets including drafts (no submittedAt filter)
    // For MANAGER: Only show submitted timesheets
    let statusFilter: any;
    if (status === "APPROVED") {
      statusFilter = { approvalStatus: "APPROVED" };
    } else if (status === "DECLINED") {
      statusFilter = { approvalStatus: "DECLINED" };
    } else if (status === "ALL") {
      // Admin can view all timesheets regardless of status
      statusFilter = {};
    } else {
      // Default to pending timesheets
      if (isAdmin) {
        // Admin sees ALL pending timesheets (including drafts)
        statusFilter = { approvalStatus: "PENDING" };
      } else {
        // Manager only sees submitted pending timesheets
        statusFilter = {
          approvalStatus: "PENDING",
          submittedAt: { not: null },
        };
      }
    }

    const whereClause: any = {
      Employee: employeeFilter,
      ...statusFilter,
    };

    // ADMIN: Apply department filter if specified
    if (isAdmin && departmentId) {
      whereClause.Employee = {
        ...employeeFilter,
        departmentId,
      };
    }
    
    // MANAGER: If department filter specified and valid, apply it
    if (isManager && !isAdmin && departmentId && departmentId === employee.departmentId) {
      whereClause.Employee = {
        ...employeeFilter,
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
            select: {
              id: true,
              hourlyRate: true,
              salaryAmount: true,
              User: {
                select: {
                  name: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  profileImageUrl: true,
                },
              },
              Department: {
                select: {
                  name: true,
                },
              },
            },
          },
          ClockEntries: {
            select: {
              id: true,
              clockInTime: true,
              clockOutTime: true,
              status: true,
              shiftId: true,
            },
            orderBy: {
              clockInTime: 'asc',
            },
          },
          TimesheetEntries: {
            select: {
              id: true,
              date: true,
              hours: true,
              startTime: true,
              endTime: true,
              breakMinutes: true,
              notes: true,
              isOvertime: true,
              entryType: true,
              shiftId: true,
              scheduledStartTime: true,
              scheduledEndTime: true,
              varianceMinutes: true,
              varianceType: true,
              reconciliationStatus: true,
              Shift: {
                select: {
                  id: true,
                  startTime: true,
                  endTime: true,
                  role: true,
                  attendanceStatus: true,
                },
              },
            },
            orderBy: {
              date: 'asc',
            },
          },
        },
        orderBy: status === "APPROVED" 
          ? { approvedAt: "desc" } // Most recent first for approved
          : status === "DECLINED"
          ? { updatedAt: "desc" } // Most recent first for declined
          : { submittedAt: "asc" }, // Oldest first for pending
        take: limit,
        skip: offset,
      }),
      prisma.timesheet.count({ where: whereClause }),
    ]);

    // Calculate total hours for each timesheet
    const enrichedTimesheets = timesheets.map((timesheet) => {
      let totalHours = 0;

      for (const entry of timesheet.TimesheetEntries) {
        if (entry.startTime && entry.endTime) {
          const startTime = new Date(entry.startTime);
          const endTime = new Date(entry.endTime);
          const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
          const breakMinutes = entry.breakMinutes || 0;
          const workedMinutes = totalMinutes - breakMinutes;
          totalHours += workedMinutes / 60;
        }
      }

      // Construct employee name from available fields
      const user = timesheet.Employee.User;
      let employeeName = "Unknown";
      if (user?.name) {
        employeeName = user.name;
      } else if (user?.firstName || user?.lastName) {
        employeeName = [user.firstName, user.lastName].filter(Boolean).join(" ");
      }

      // Calculate cost based on hourly rate or salary
      const hourlyRate = timesheet.Employee.hourlyRate 
        ? parseFloat(timesheet.Employee.hourlyRate.toString())
        : null;
      const salaryAmount = timesheet.Employee.salaryAmount
        ? parseFloat(timesheet.Employee.salaryAmount.toString())
        : null;
      
      // Calculate estimated cost
      let estimatedCost: number | null = null;
      if (hourlyRate) {
        estimatedCost = totalHours * hourlyRate;
      } else if (salaryAmount) {
        // Assume annual salary, calculate hourly equivalent (2080 hours/year standard)
        const hourlyEquivalent = salaryAmount / 2080;
        estimatedCost = totalHours * hourlyEquivalent;
      }

      return {
        id: timesheet.id,
        employeeId: timesheet.employeeId,
        employeeName,
        employeeEmail: user?.email || "",
        employeeAvatar: user?.profileImageUrl,
        department: timesheet.Employee.Department?.name || "Unassigned",
        periodStart: timesheet.periodStart,
        periodEnd: timesheet.periodEnd,
        totalHours: parseFloat(totalHours.toFixed(2)),
        status: timesheet.approvalStatus,
        submittedAt: timesheet.submittedAt,
        approvedAt: timesheet.approvedAt,
        rejectedReason: timesheet.rejectedReason,
        notes: null,
        // Cost information
        hourlyRate,
        salaryAmount,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost.toFixed(2)) : null,
        payType: hourlyRate ? 'HOURLY' : salaryAmount ? 'SALARY' : 'UNKNOWN',
        // Clock entries for reference
        clockEntryCount: timesheet.ClockEntries?.length || 0,
        entries: timesheet.TimesheetEntries.map((entry: any) => ({
          id: entry.id,
          date: entry.date,
          startTime: entry.startTime,
          endTime: entry.endTime,
          breakMinutes: entry.breakMinutes,
          hours: entry.hours,
          notes: entry.notes,
          isOvertime: entry.isOvertime,
          entryType: entry.entryType || 'MANUAL',
          // Shift reconciliation info
          shiftId: entry.shiftId,
          scheduledStartTime: entry.scheduledStartTime,
          scheduledEndTime: entry.scheduledEndTime,
          varianceMinutes: entry.varianceMinutes,
          varianceType: entry.varianceType,
          reconciliationStatus: entry.reconciliationStatus,
          shift: entry.Shift ? {
            id: entry.Shift.id,
            startTime: entry.Shift.startTime,
            endTime: entry.Shift.endTime,
            role: entry.Shift.role,
            attendanceStatus: entry.Shift.attendanceStatus,
          } : null,
        })),
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
