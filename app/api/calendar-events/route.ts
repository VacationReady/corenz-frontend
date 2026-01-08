import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileSession } from "@/lib/mobile-session";
import supabase from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// Type definitions for calendar visibility settings
type CalendarEmployeeScope = "OWN" | "DEPARTMENT" | "COMPANY";

interface CalendarVisibilitySettings {
  calendarEmployeeScope: CalendarEmployeeScope;
}

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
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

    // Fetch calendar visibility settings for the company
    // Use raw query to handle case where Prisma client hasn't been regenerated yet
    let visibilitySettings: CalendarVisibilitySettings = {
      calendarEmployeeScope: "DEPARTMENT",
    };
    
    try {
      const visibilityResult = await prisma.$queryRaw<Array<{
        calendarEmployeeScope: string | null;
      }>>`
        SELECT "calendarEmployeeScope" 
        FROM "Company" 
        WHERE id = ${companyId}
      `;
      if (visibilityResult && visibilityResult.length > 0) {
        visibilitySettings = {
          calendarEmployeeScope: (visibilityResult[0].calendarEmployeeScope as CalendarEmployeeScope) ?? "DEPARTMENT",
        };
      }
    } catch {
      // Columns don't exist yet (migration not applied), use defaults
      console.log("[CALENDAR_EVENTS] Using default visibility settings (migration may not be applied yet)");
    }

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
      // Include both APPROVED and PENDING leave requests
      approvalStatus: { in: ["APPROVED", "PENDING"] },
      ...(hasValidFrom || hasValidTo
        ? {
            AND: [
              hasValidTo ? { startDate: { lte: toDate! } } : {},
              hasValidFrom ? { endDate: { gte: fromDate! } } : {},
            ],
          }
        : {}),
    };

    // Build visibility scope based on role and settings
    if (isEmployee && selfEmployee) {
      const employeeScope = visibilitySettings.calendarEmployeeScope;
      
      if (employeeScope === "OWN") {
        // Only own leave
        leaveWhere.Employee = { id: selfEmployee.id };
      } else if (employeeScope === "DEPARTMENT") {
        // Own leave + department colleagues
        leaveWhere.Employee = {
          OR: [
            { id: selfEmployee.id },
            selfEmployee.departmentId
              ? { departmentId: selfEmployee.departmentId }
              : undefined,
          ].filter(Boolean),
        };
      } else if (employeeScope === "COMPANY") {
        // Company-wide visibility (no employee filter needed, just companyId)
        // Leave the Employee filter empty to get all company leave
      }
    } else if (isManager && selfEmployee) {
      // SECURITY: Managers are NEVER allowed company-wide visibility
      // They can only see: their own leave + direct reports + department colleagues (if scope allows)
      // The COMPANY scope is reserved for admins only
      const employeeScope = visibilitySettings.calendarEmployeeScope;
      const allowedUserIds = [session.user.id, ...subordinateUserIds];
      
      // Build the base visibility - always include self and direct reports
      const scopeConditions: any[] = [
        { User: { id: { in: allowedUserIds } } },
      ];
      
      // For DEPARTMENT or COMPANY scope, add department colleagues
      // Note: COMPANY scope for managers is treated as DEPARTMENT for security
      // Managers should never see employees outside their org scope
      if ((employeeScope === "DEPARTMENT" || employeeScope === "COMPANY") && selfEmployee.departmentId) {
        scopeConditions.push({ departmentId: selfEmployee.departmentId });
      }
      
      // Always apply the restricted filter for managers
      leaveWhere.Employee = {
        OR: scopeConditions,
      };
    } else if (isAdmin) {
      // Admins: apply department/departmentId filters if provided, otherwise full visibility
      leaveWhere.Employee = {
        ...(department ? { Department: { is: { name: department } } } : {}),
        ...(departmentId ? { departmentId } : {}),
      };
    } else {
      // Fallback for other roles
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
        OtherEntitlement: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    // Fetch category visibility settings separately using raw query
    // This handles the case where Prisma client hasn't been regenerated yet
    let categoryVisibilityMap: Map<string, boolean> = new Map();
    try {
      const categoryVisibility = await prisma.$queryRaw<Array<{
        id: string;
        includeInGeneralVisibility: boolean | null;
      }>>`
        SELECT id, "includeInGeneralVisibility" 
        FROM "EventCategory" 
        WHERE "companyId" = ${companyId}
      `;
      categoryVisibility.forEach((cat) => {
        // Default to true if null (for backwards compatibility)
        categoryVisibilityMap.set(cat.id, cat.includeInGeneralVisibility !== false);
      });
    } catch {
      // Column doesn't exist yet (migration not applied), all categories visible by default
      console.log("[CALENDAR_EVENTS] Category visibility column not found, using defaults");
    }

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
        const categoryColor = req.EventCategory?.color || '#3B82F6';
        
        // Determine color based on approval status
        // Pending = amber, Approved = category color, Declined = red
        let eventColor = categoryColor;
        const status = (req.approvalStatus || '').toUpperCase();
        if (status === 'PENDING') {
          eventColor = '#f59e0b'; // Amber for pending
        } else if (status === 'DECLINED') {
          eventColor = '#ef4444'; // Red for declined
        }
        // APPROVED uses the category color (default)
        
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
        
        // Determine if this is an other entitlement booking (admin-only visibility)
        const isOtherEntitlement = req.leaveType === "OTHER_ENTITLEMENT" || Boolean(req.otherEntitlementId);
        
        // Check if this category is excluded from general visibility
        const categoryId = req.EventCategory?.id;
        const excludedFromGeneralVisibility = categoryId 
          ? categoryVisibilityMap.get(categoryId) === false 
          : false;
        
        return {
          id: req.id,
          title: isOtherEntitlement && req.OtherEntitlement?.name 
            ? `${req.OtherEntitlement.name} - ${displayName}`
            : `${req.EventCategory?.name ?? "Leave"} - ${displayName}`,
          start: formatDateLocal(startDate),
          end: formatDateLocal(exclusiveEndDate),
          allDay: true,
          type: "leave",
          reason: req.reason ?? null,
          categoryName: isOtherEntitlement && req.OtherEntitlement?.name 
            ? req.OtherEntitlement.name 
            : (req.EventCategory?.name ?? null),
          categoryIconKey: req.EventCategory?.iconKey ?? null,
          eventCategoryId: req.EventCategory?.id ?? null,
          approvalStatus: req.approvalStatus,
          backgroundColor: eventColor,
          borderColor: eventColor,
          textColor: '#FFFFFF',
          // Internal flags for filtering (not exposed to UI directly)
          _isSickness: isSickness,
          _isOtherEntitlement: isOtherEntitlement,
          _excludedFromGeneralVisibility: excludedFromGeneralVisibility,
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

    // SECURITY: Apply role-based visibility filtering
    // - EMPLOYEE: Can see their own leave (all types) + colleagues' NON-sickness leave
    //             + colleagues' leave only if category has includeInGeneralVisibility=true
    //             NEVER sees sickness from colleagues
    // - MANAGER: Can see their own leave (all types) + direct reports' leave (all types including sickness)
    //            + department colleagues' NON-sickness leave with includeInGeneralVisibility=true
    // - ADMIN/SUPER_ADMIN: Full visibility across all employees
    
    if (isEmployee && selfEmployee) {
      const selfEmployeeId = selfEmployee.id;
      filteredLeaveEvents = leaveEvents.filter((event: any) => {
        const eventEmployeeId = event.employee?.id as string | undefined;
        const isOwnEvent = eventEmployeeId === selfEmployeeId;
        
        // Always show own leave events (including own sickness and excluded categories)
        if (isOwnEvent) {
          return true;
        }
        
        // For colleagues: NEVER show other entitlement bookings - admin-only visibility
        if (event._isOtherEntitlement) {
          return false;
        }
        
        // For colleagues: NEVER show sickness - this is a critical security requirement
        if (event._isSickness) {
          return false;
        }
        
        // For colleagues: Don't show categories excluded from general visibility
        if (event._excludedFromGeneralVisibility) {
          return false;
        }
        
        // Show non-sickness, non-excluded leave from colleagues (annual leave, etc.)
        return true;
      });
    } else if (isManager && selfEmployee) {
      const selfEmployeeId = selfEmployee.id;
      // Get user IDs of direct reports for sickness visibility check
      const directReportUserIds = new Set([session.user.id, ...subordinateUserIds]);
      
      filteredLeaveEvents = leaveEvents.filter((event: any) => {
        const eventEmployeeId = event.employee?.id as string | undefined;
        const isOwnEvent = eventEmployeeId === selfEmployeeId;
        const isDirectReport = event._employeeUserId && directReportUserIds.has(event._employeeUserId);
        
        // Always show own leave events (including own sickness and excluded categories)
        if (isOwnEvent) {
          return true;
        }
        
        // For ALL non-own events: NEVER show other entitlement bookings - admin-only visibility
        // This includes direct reports - managers cannot see other entitlement bookings
        if (event._isOtherEntitlement) {
          return false;
        }
        
        // Always show direct reports' leave (all types including sickness and excluded categories)
        if (isDirectReport) {
          return true;
        }
        
        // For non-direct-report colleagues: NEVER show sickness
        if (event._isSickness) {
          return false;
        }
        
        // For non-direct-report colleagues: Don't show categories excluded from general visibility
        if (event._excludedFromGeneralVisibility) {
          return false;
        }
        
        // Show non-sickness, non-excluded leave from department colleagues
        return true;
      });
    }
    // ADMIN/SUPER_ADMIN: No filtering - full visibility (default behavior)
    
    // Remove internal flags before sending response
    const sanitizedEvents = filteredLeaveEvents.map(({ _isSickness, _isOtherEntitlement, _excludedFromGeneralVisibility, _employeeUserId, ...event }) => event);

    return NextResponse.json(sanitizedEvents);
  } catch (error) {
    console.error("[CALENDAR_EVENTS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 },
    );
  }
}

