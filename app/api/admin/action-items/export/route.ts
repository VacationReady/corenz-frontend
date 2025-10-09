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

    const actionItems = await prisma.actionItem.findMany({
      where: {
        companyId: session.user.companyId,
      },
      include: {
        assignedTo: {
          select: {
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
        { createdAt: 'desc' },
      ],
    });

    // Generate CSV
    const csvHeader = "ID,Type,Title,Status,Priority,Assigned To,Department,Related Employee,Due Date,Created At,Completed At\n";
    const csvRows = actionItems.map((item: any) => {
      const assignedTo = item.assignedTo
        ? item.assignedTo.name || `${item.assignedTo.firstName || ''} ${item.assignedTo.lastName || ''}`.trim()
        : "";
      const department = item.assignedTo?.Employee?.[0]?.Department?.name || "";
      const relatedEmployee = item.RelatedEmployee
        ? `${item.RelatedEmployee.User?.firstName || ''} ${item.RelatedEmployee.User?.lastName || ''}`.trim()
        : "";
      
      return [
        item.id,
        item.type,
        `"${(item.title || '').replace(/"/g, '""')}"`,
        item.status,
        item.priority || "",
        `"${assignedTo}"`,
        `"${department}"`,
        `"${relatedEmployee}"`,
        item.dueDate ? new Date(item.dueDate).toISOString() : "",
        new Date(item.createdAt).toISOString(),
        item.completedAt ? new Date(item.completedAt).toISOString() : "",
      ].join(",");
    }).join("\n");

    const csv = csvHeader + csvRows;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="action-items-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Failed to export action items:", error);
    return NextResponse.json(
      { error: "Failed to export action items" },
      { status: 500 }
    );
  }
}
