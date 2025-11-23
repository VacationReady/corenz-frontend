import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: actionItemId } = await context.params;

    // Fetch the action item
    const actionItem = await prisma.actionItem.findUnique({
      where: { id: actionItemId },
    });

    if (!actionItem || actionItem.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Action item not found" }, { status: 404 });
    }

    // Update the action item to completed
    const updated = await prisma.actionItem.update({
      where: { id: actionItemId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error("Failed to complete action item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to complete action item" },
      { status: 500 }
    );
  }
}

