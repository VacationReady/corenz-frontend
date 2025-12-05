import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access this endpoint
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Build where clause based on category
    const where: any = {
      companyId: session.user.companyId,
      status: "PENDING", // Only show pending items
    };

    switch (category) {
      case "pending":
        // All pending items (no additional filter)
        break;
      
      case "overdue":
        where.dueDate = {
          lt: now,
        };
        break;
      
      case "dueToday":
        where.dueDate = {
          gte: now,
          lte: todayEnd,
        };
        break;
      
      case "dueThisWeek":
        where.dueDate = {
          gt: todayEnd,
          lte: weekEnd,
        };
        break;
      
      default:
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const actionItems = await prisma.actionItem.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            firstName: true,
            lastName: true,
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
            id: true,
            User: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            Department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 100,
    });

    // Calculate if overdue and days overdue
    const enrichedItems = actionItems.map((item: any) => {
      const isOverdue = item.dueDate && new Date(item.dueDate) < now && item.status === "PENDING";
      const daysOverdue = isOverdue
        ? Math.floor((now.getTime() - new Date(item.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        status: item.status,
        priority: item.priority,
        dueDate: item.dueDate,
        createdAt: item.createdAt,
        assignedTo: item.assignedTo ? {
          id: item.assignedTo.id,
          name: item.assignedTo.name || `${item.assignedTo.firstName || ''} ${item.assignedTo.lastName || ''}`.trim(),
          email: item.assignedTo.email,
          department: item.assignedTo.Employee?.[0]?.Department?.name,
        } : null,
        relatedEmployee: item.RelatedEmployee ? {
          id: item.RelatedEmployee.id,
          name: `${item.RelatedEmployee.User?.firstName || ''} ${item.RelatedEmployee.User?.lastName || ''}`.trim(),
          department: item.RelatedEmployee.Department?.name,
        } : null,
        metadata: item.metadata,
        isOverdue,
        daysOverdue,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedItems,
    });
  } catch (error) {
    console.error("Failed to fetch action items by category:", error);
    return NextResponse.json(
      { error: "Failed to fetch action items" },
      { status: 500 }
    );
  }
}

