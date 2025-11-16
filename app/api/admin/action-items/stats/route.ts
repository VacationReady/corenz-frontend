import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access this endpoint
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Get all pending action items
    const allPending = await prisma.actionItem.findMany({
      where: {
        companyId: session.user.companyId,
        status: "PENDING",
      },
      include: {
        assignedTo: {
          select: {
            Employee: {
              select: {
                Department: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        RelatedEmployee: {
          select: {
            Department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Calculate stats
    const totalPending = allPending.length;
    const totalOverdue = allPending.filter(
      (item: any) => item.dueDate && new Date(item.dueDate) < now
    ).length;
    const dueToday = allPending.filter(
      (item: any) => item.dueDate && new Date(item.dueDate) <= todayEnd && new Date(item.dueDate) >= now
    ).length;
    const dueThisWeek = allPending.filter(
      (item: any) => item.dueDate && new Date(item.dueDate) <= weekEnd && new Date(item.dueDate) > todayEnd
    ).length;

    // Group by type
    const byType: Record<string, number> = {};
    allPending.forEach((item: any) => {
      byType[item.type] = (byType[item.type] || 0) + 1;
    });

    // Group by department
    const byDepartment: Record<string, number> = {};
    allPending.forEach((item: any) => {
      const dept =
        item.RelatedEmployee?.Department?.name ||
        item.assignedTo?.Employee?.[0]?.Department?.name ||
        "Unassigned";
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    });

    // Calculate completion rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completedLast30 = await prisma.actionItem.count({
      where: {
        companyId: session.user.companyId,
        status: "COMPLETED",
        completedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const totalLast30 = await prisma.actionItem.count({
      where: {
        companyId: session.user.companyId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const completionRate = totalLast30 > 0 ? Math.round((completedLast30 / totalLast30) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalPending,
        totalOverdue,
        dueToday,
        dueThisWeek,
        byType,
        byDepartment,
        completionRate,
      },
    });
  } catch (error) {
    console.error("Failed to fetch action item stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
