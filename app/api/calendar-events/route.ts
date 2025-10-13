import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department");
  const departmentId = searchParams.get("departmentId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const hasValidFrom = fromDate instanceof Date && !isNaN(fromDate.getTime());
    const hasValidTo = toDate instanceof Date && !isNaN(toDate.getTime());

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        companyId: session.user.companyId,
        approvalStatus: "APPROVED",
        Employee: {
          ...(department ? { Department: { is: { name: department } } } : {}),
          ...(departmentId ? { departmentId } : {}),
        },
        ...(hasValidFrom || hasValidTo
          ? {
              // overlap where (start <= to) AND (end >= from)
              AND: [
                hasValidTo ? { startDate: { lte: toDate! } } : {},
                hasValidFrom ? { endDate: { gte: fromDate! } } : {},
              ],
            }
          : {}),
      },
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

        return {
          id: req.id,
          title: `${req.EventCategory?.name ?? "Leave"} - ${displayName}`,
          start: req.startDate,
          end: req.endDate,
          allDay: true,
          type: "leave",
          reason: req.reason ?? null,
          categoryName: req.EventCategory?.name ?? null,
          eventCategoryId: req.EventCategory?.id ?? null,
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

    // Fetch published shifts in date range
    const shifts = await prisma.shift.findMany({
      where: {
        companyId: session.user.companyId,
        isPublished: true,
        employeeId: { not: null }, // Only assigned shifts
        startTime: {
          gte: hasValidFrom ? fromDate : undefined,
          lte: hasValidTo ? toDate : undefined,
        },
        ...(department ? {
          employee: {
            Department: { is: { name: department } }
          }
        } : {}),
        ...(departmentId ? {
          departmentId
        } : {}),
      },
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
      orderBy: { startTime: 'asc' },
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

    return NextResponse.json([...leaveEvents, ...shiftEvents]);
  } catch (error) {
    console.error("[CALENDAR_EVENTS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 },
    );
  }
}

