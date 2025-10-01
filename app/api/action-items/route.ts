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

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status") || "PENDING";
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build where clause
    const where: any = {
      companyId: session.user.companyId,
      status,
    };

    // Filter by assignee (assigned to the current user or specific employee)
    if (employeeId) {
      const employee = await prisma.employee.findFirst({
        where: { id: employeeId, companyId: session.user.companyId },
        select: { userId: true },
      });
      
      if (employee?.userId) {
        where.assignedToId = employee.userId;
      }
    } else {
      where.assignedToId = session.user.id;
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
          },
        },
        RelatedEmployee: {
          select: {
            id: true,
            User: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
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

    return NextResponse.json({
      success: true,
      data: actionItems.map((item: any) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        status: item.status,
        priority: item.priority,
        dueDate: item.dueDate,
        assignedTo: item.assignedTo,
        relatedEmployee: item.RelatedEmployee ? {
          id: item.RelatedEmployee.id,
          name: `${item.RelatedEmployee.User?.firstName || ''} ${item.RelatedEmployee.User?.lastName || ''}`.trim(),
        } : null,
        metadata: item.metadata,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch action items:", error);
    return NextResponse.json(
      { error: "Failed to fetch action items" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, status } = await req.json();

    const actionItem = await prisma.actionItem.update({
      where: { id },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: actionItem });
  } catch (error) {
    console.error("Failed to update action item:", error);
    return NextResponse.json(
      { error: "Failed to update action item" },
      { status: 500 }
    );
  }
}

