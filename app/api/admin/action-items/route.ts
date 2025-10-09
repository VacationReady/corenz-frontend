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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING";
    const type = searchParams.get("type");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "100");

    // Build where clause
    const where: any = {
      companyId: session.user.companyId,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (type && type !== "all") {
      // Filter by type prefix (e.g., "PERFORMANCE" matches all performance types)
      where.type = {
        contains: type,
      };
    }

    if (priority && priority !== "all") {
      where.priority = priority;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
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
      take: limit,
    });

    // Calculate if overdue and days overdue
    const now = new Date();
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
    console.error("Failed to fetch admin action items:", error);
    return NextResponse.json(
      { error: "Failed to fetch action items" },
      { status: 500 }
    );
  }
}
