import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: actionItemId } = await context.params;
    const { reason } = await req.json();

    // Fetch the action item
    const actionItem = await prisma.actionItem.findUnique({
      where: { id: actionItemId },
    });

    if (!actionItem || actionItem.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Action item not found" }, { status: 404 });
    }

    // Update the action item to cancelled with reason
    const updated = await prisma.actionItem.update({
      where: { id: actionItemId },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          ...(actionItem.metadata as any),
          declinedBy: session.user.id,
          declinedAt: new Date().toISOString(),
          declineReason: reason || "No reason provided",
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error("Failed to decline action item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to decline action item" },
      { status: 500 }
    );
  }
}

