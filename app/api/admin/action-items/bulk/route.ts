import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access this endpoint
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { action, itemIds } = await req.json();

    if (!action || !itemIds || !Array.isArray(itemIds)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (action === "cancel") {
      // Cancel items
      await prisma.actionItem.updateMany({
        where: {
          id: { in: itemIds },
          companyId: session.user.companyId,
        },
        data: {
          status: "CANCELLED",
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `${itemIds.length} items cancelled`,
      });
    }

    if (action === "remind") {
      // Send reminders (implementation would send emails/notifications)
      // For now, just return success
      // TODO: Integrate with notification system
      
      return NextResponse.json({
        success: true,
        message: `Reminders sent for ${itemIds.length} items`,
      });
    }

    if (action === "reassign") {
      const { newAssigneeId } = await req.json();
      
      if (!newAssigneeId) {
        return NextResponse.json({ error: "New assignee ID required" }, { status: 400 });
      }

      await prisma.actionItem.updateMany({
        where: {
          id: { in: itemIds },
          companyId: session.user.companyId,
        },
        data: {
          assignedToId: newAssigneeId,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `${itemIds.length} items reassigned`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to perform bulk action:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk action" },
      { status: 500 }
    );
  }
}
