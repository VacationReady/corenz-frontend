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

    const events = await Promise.all(
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

    return NextResponse.json(events);
  } catch (error) {
    console.error("[CALENDAR_EVENTS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 },
    );
  } finally {
    try {
      await prisma.$disconnect();
    } catch (_) {}
  }
}

