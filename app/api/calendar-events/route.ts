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
    } else if (isManager) {
      const allowedUserIds = [session.user.id, ...subordinateUserIds];
      leaveWhere.Employee = {
        User: {
          id: {
            in: allowedUserIds.length > 0 ? allowedUserIds : ["no-match"],
          },
        },
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

        // Force blue color for annual leave events
        const categoryName = req.EventCategory?.name ?? "";
        const isAnnualLeave = categoryName.toLowerCase().includes("annual") || categoryName.toLowerCase().includes("holiday");
        const eventColor = isAnnualLeave ? '#3B82F6' : (req.EventCategory?.color || '#3B82F6');
        
        // FullCalendar uses exclusive end dates for all-day events
        // Format dates as YYYY-MM-DD for proper multi-day spanning
        const startDate = new Date(req.startDate);
        const endDate = new Date(req.endDate);
        endDate.setDate(endDate.getDate() + 1); // Add 1 day for exclusive end
        
        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        
        return {
          id: req.id,
          title: `${req.EventCategory?.name ?? "Leave"} - ${displayName}`,
          start: formatDate(startDate),
          end: formatDate(endDate),
          allDay: true,
          type: "leave",
          reason: req.reason ?? null,
          categoryName: req.EventCategory?.name ?? null,
          categoryIconKey: req.EventCategory?.iconKey ?? null,
          eventCategoryId: req.EventCategory?.id ?? null,
          backgroundColor: eventColor,
          borderColor: eventColor,
          textColor: '#FFFFFF',
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

    if (isEmployee && selfEmployee) {
      const selfEmployeeId = selfEmployee.id;
      filteredLeaveEvents = leaveEvents.filter((event: any) => {
        const eventEmployeeId = event.employee?.id as string | undefined;
        const categoryName = (event.categoryName as string | null) || "";
        const lower = categoryName.toLowerCase();
        const isSickness = lower.includes("sick");
        const isAnnualLeave = lower.includes("annual");

        // Always allow the logged-in employee to see their own events
        if (eventEmployeeId && eventEmployeeId === selfEmployeeId) {
          return true;
        }

        // For colleagues in their department, only show annual leave and never sickness
        if (isSickness) {
          return false;
        }

        return isAnnualLeave;
      });
    }

    const shiftWhere: any = {
      companyId,
      isPublished: true,
      employeeId: { not: null },
      startTime: {
        gte: hasValidFrom ? fromDate : undefined,
        lte: hasValidTo ? toDate : undefined,
      },
    };

    if (isEmployee && selfEmployee) {
      shiftWhere.Employee = {
        OR: [
          { id: selfEmployee.id },
          selfEmployee.departmentId
            ? { departmentId: selfEmployee.departmentId }
            : undefined,
        ].filter(Boolean),
      };
    } else if (isManager) {
      const allowedUserIds = [session.user.id, ...subordinateUserIds];
      shiftWhere.Employee = {
        User: {
          id: {
            in: allowedUserIds.length > 0 ? allowedUserIds : ["no-match"],
          },
        },
      };
    } else {
      if (department) {
        shiftWhere.Employee = {
          ...(shiftWhere.Employee || {}),
          Department: { is: { name: department } },
        };
      }
      if (departmentId) {
        shiftWhere.departmentId = departmentId;
      }
    }

    const shifts = await prisma.shift.findMany({
      where: shiftWhere,
      include: {
        Employee: {
          include: {
            User: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
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
        Location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    const shiftEvents = await Promise.all(
      shifts.map(async (shift: any) => {
        const user = shift.Employee?.User;
        const displayName = user?.name || 
          `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 
          'Unknown';

        let profileImageUrl: string | null = null;
        if (user?.profileImageUrl) {
          try {
            const { data: signed } = await supabase.storage
              .from('documents')
              .createSignedUrl(user.profileImageUrl, 60 * 5);
            profileImageUrl = signed?.signedUrl ?? null;
          } catch (_err) {
            profileImageUrl = null;
          }
        }

        const duration = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60);

        return {
          id: shift.id,
          title: `🕒 ${displayName} - ${shift.role || 'Shift'}`,
          start: shift.startTime,
          end: shift.endTime,
          allDay: false,
          type: 'shift',
          shiftId: shift.id,
          locationName: shift.location?.name ?? null,
          locationId: shift.location?.id ?? null,
          duration: duration.toFixed(1),
          notes: shift.notes,
          employee: {
            id: shift.Employee?.id,
            name: displayName,
            department: shift.Employee?.Department?.name ?? null,
            profileImageUrl,
          },
          // Use different color for shifts
          backgroundColor: '#3B82F6',
          borderColor: '#2563EB',
          textColor: '#FFFFFF',
        };
      })
    );

    return NextResponse.json([...filteredLeaveEvents, ...shiftEvents]);
  } catch (error) {
    console.error("[CALENDAR_EVENTS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 },
    );
  }
}

