import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileSession } from "@/lib/mobile-session";
import supabase from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getMobileSession(req);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.companyId;
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department");
  const departmentId = searchParams.get("departmentId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const role = session.user.role;
    const isEmployee = role === "EMPLOYEE";
    const isManager = role === "MANAGER";

    async function getAllSubordinates(managerUserId: string): Promise<string[]> {
      const directReports = await prisma.user.findMany({
        where: { managerId: managerUserId, companyId },
        select: { id: true },
      });

      const subordinateIds = directReports.map((u) => u.id);
      if (subordinateIds.length === 0) {
        return [];
      }

      for (const subId of subordinateIds) {
        const indirectReports = await getAllSubordinates(subId);
        subordinateIds.push(...indirectReports);
      }

      return subordinateIds;
    }

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const hasValidFrom = fromDate instanceof Date && !isNaN(fromDate.getTime());
    const hasValidTo = toDate instanceof Date && !isNaN(toDate.getTime());

    let selfEmployee: { id: string; departmentId: string | null } | null = null;

    if (isEmployee || isManager) {
      selfEmployee = await prisma.employee.findFirst({
        where: {
          userId,
          companyId,
        },
        select: {
          id: true,
          departmentId: true,
        },
      });

      if (!selfEmployee) {
        return NextResponse.json([]);
      }
    }

    const subordinateUserIds = isManager
      ? await getAllSubordinates(userId)
      : [];

    const leaveWhere: any = {
      companyId,
      approvalStatus: "APPROVED",
      ...(hasValidFrom || hasValidTo
        ? {
            AND: [
              hasValidTo ? { startDate: { lte: toDate! } } : {},
              hasValidFrom ? { endDate: { gte: fromDate! } } : {},
            ],
          }
        : {}),
    };

    if (isEmployee && selfEmployee) {
      leaveWhere.Employee = {
        OR: [
          { id: selfEmployee.id },
          selfEmployee.departmentId
            ? { departmentId: selfEmployee.departmentId }
            : undefined,
        ].filter(Boolean),
      };
    } else if (isManager && selfEmployee) {
      // Managers see: own leave + direct reports + entire department
      const allowedUserIds = [session.user.id, ...subordinateUserIds];
      leaveWhere.Employee = {
        OR: [
          // Own leave and direct reports
          { User: { id: { in: allowedUserIds } } },
          // Department colleagues (if manager has a department)
          selfEmployee.departmentId
            ? { departmentId: selfEmployee.departmentId }
            : undefined,
        ].filter(Boolean),
      };
    } else {
      leaveWhere.Employee = {
        ...(department ? { Department: { is: { name: department } } } : {}),
        ...(departmentId ? { departmentId } : {}),
      };
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: leaveWhere,
      include: {
        Employee: {
          include: {
            User: true,
            Department: true,
          },
        },
        EventCategory: {
          select: {
            name: true,
            id: true,
            iconKey: true,
            color: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    // Helper to detect if a leave request is sickness
    // Checks both first-class leaveType field and category name for backward compatibility
    const isSicknessLeave = (req: any): boolean => {
      if (req.leaveType === "SICK") return true;
      const categoryName = (req.EventCategory?.name || "").toLowerCase();
      return categoryName.includes("sick");
    };

    const leaveEvents = await Promise.all(
      leaveRequests.map(async (req: any) => {
        const user = req.Employee?.User;
        const displayName =
          (user?.name ||
            `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
            "Unknown");

        let profileImageUrl: string | null = null;
        if (user?.profileImageUrl) {
          try {
            const { data: signed } = await supabase.storage
              .from("documents")
              .createSignedUrl(user.profileImageUrl, 60 * 5);
            profileImageUrl = signed?.signedUrl ?? null;
          } catch (_err) {
            profileImageUrl = null;
          }
        }

        // Use category color from database, fallback to blue if not set
        const eventColor = req.EventCategory?.color || '#3B82F6';
        
        // FullCalendar uses exclusive end dates for all-day events
        // Format dates as YYYY-MM-DD for proper multi-day spanning
        // Use UTC methods to avoid timezone shifts
        const startDate = new Date(req.startDate);
        const endDate = new Date(req.endDate);
        
        // Format date preserving the intended date regardless of timezone
        const formatDateLocal = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        // Add 1 day for exclusive end (FullCalendar convention for all-day events)
        const exclusiveEndDate = new Date(endDate);
        exclusiveEndDate.setDate(exclusiveEndDate.getDate() + 1);
        
        // Determine if this is a sickness event for filtering purposes
        const isSickness = isSicknessLeave(req);
        
        return {
          id: req.id,
          title: `${req.EventCategory?.name ?? "Leave"} - ${displayName}`,
          start: formatDateLocal(startDate),
          end: formatDateLocal(exclusiveEndDate),
          allDay: true,
          type: "leave",
          reason: req.reason ?? null,
          categoryName: req.EventCategory?.name ?? null,
          categoryIconKey: req.EventCategory?.iconKey ?? null,
          eventCategoryId: req.EventCategory?.id ?? null,
          approvalStatus: req.approvalStatus,
          backgroundColor: eventColor,
          borderColor: eventColor,
          textColor: '#FFFFFF',
          // Internal flags for filtering (not exposed to UI directly)
          _isSickness: isSickness,
          _employeeUserId: req.Employee?.User?.id ?? null,
          // Provide both employee (camelCase) for UI and Employee (PascalCase) for compatibility
          employee: {
            id: req.Employee?.id,
            name: displayName,
            department: req.Employee?.Department?.name ?? null,
            locationId: req.Employee?.locationId ?? null,
            profileImageUrl,
          },
          Employee: {
            id: req.Employee?.id,
            name: displayName,
            department: req.Employee?.Department?.name ?? null,
            locationId: req.Employee?.locationId ?? null,
            profileImageUrl,
          },
        };
      }),
    );

    let filteredLeaveEvents = leaveEvents;

    // SECURITY: Apply role-based sickness visibility filtering
    // - EMPLOYEE: Can see their own leave (all types) + colleagues' NON-sickness leave
    //             NEVER sees sickness from colleagues
    // - MANAGER: Can see their own leave (all types) + direct reports' leave (all types including sickness)
    //            + department colleagues' NON-sickness leave
    // - ADMIN/SUPER_ADMIN: Full visibility across all employees
    
    if (isEmployee && selfEmployee) {
      const selfEmployeeId = selfEmployee.id;
      filteredLeaveEvents = leaveEvents.filter((event: any) => {
        const eventEmployeeId = event.employee?.id as string | undefined;
        const isOwnEvent = eventEmployeeId === selfEmployeeId;
        
        // Always show own leave events (including own sickness)
        if (isOwnEvent) {
          return true;
        }
        
        // For colleagues: NEVER show sickness - this is a critical security requirement
        if (event._isSickness) {
          return false;
        }
        
        // Show non-sickness leave from colleagues (annual leave, etc.)
        return true;
      });
    } else if (isManager && selfEmployee) {
      const selfEmployeeId = selfEmployee.id;
      // Get user IDs of direct reports for sickness visibility check
      const directReportUserIds = new Set([session.user.id, ...subordinateUserIds]);
      
      filteredLeaveEvents = leaveEvents.filter((event: any) => {
        const eventEmployeeId = event.employee?.id as string | undefined;
        const isOwnEvent = eventEmployeeId === selfEmployeeId;
        
        // Always show own leave events (including own sickness)
        if (isOwnEvent) {
          return true;
        }
        
        // For sickness events: only show if it's a direct report
        if (event._isSickness) {
          // Check if this employee's user is in the direct reports list
          return event._employeeUserId && directReportUserIds.has(event._employeeUserId);
        }
        
        // Show all non-sickness leave (annual leave, etc.) from department
        return true;
      });
    }
    // ADMIN/SUPER_ADMIN: No filtering - full visibility (default behavior)
    
    // Remove internal flags before sending response
    const sanitizedEvents = filteredLeaveEvents.map(({ _isSickness, _employeeUserId, ...event }) => event);

    return NextResponse.json(sanitizedEvents);
  } catch (error) {
    console.error("[CALENDAR_EVENTS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 },
    );
  }
}

