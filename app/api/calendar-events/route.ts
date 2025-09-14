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
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        companyId: session.user.companyId,
        approvalStatus: "APPROVED",
        employee: {
          ...(department ? { department: { name: department } } : {}),
          ...(departmentId ? { departmentId } : {}),
        },
        ...(from || to
          ? {
              // overlap where (start <= to) AND (end >= from)
              AND: [
                to ? { startDate: { lte: new Date(to) } } : {},
                from ? { endDate: { gte: new Date(from) } } : {},
              ],
            }
          : {}),
      },
      include: {
        employee: {
          include: {
            user: true,
            department: true,
          },
        },
        eventCategory: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    const events = await Promise.all(
      leaveRequests.map(async (req) => {
        const user = req.employee.user;
        const displayName =
          user.name ||
          `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
          "Unknown";

        let profileImageUrl: string | null = null;
        if (user.profileImageUrl) {
          const { data: signed } = await supabase.storage
            .from("documents")
            .createSignedUrl(user.profileImageUrl, 60 * 5);
          profileImageUrl = signed?.signedUrl ?? null;
        }

        return {
          id: req.id,
          title: `${req.eventCategory.name} - ${displayName}`,
          start: req.startDate,
          end: req.endDate,
          allDay: true,
          reason: req.reason ?? null,
          employee: {
            id: req.employee.id,
            name: displayName,
            department: req.employee.department?.name ?? null,
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
  }
}
