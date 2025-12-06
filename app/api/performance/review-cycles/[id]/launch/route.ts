import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createReviewCycleActionItems } from "@/lib/action-items-helper";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and managers can launch review cycles
    if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify cycle exists and belongs to company
    const cycle = await prisma.performanceReviewCycle.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Review cycle not found" }, { status: 404 });
    }

    // Check if already launched
    if (cycle.status === "ACTIVE" || cycle.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Review cycle already launched or completed" },
        { status: 400 }
      );
    }

    // Update cycle status to ACTIVE
    await prisma.performanceReviewCycle.update({
      where: { id },
      data: {
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });

    // Create action items for all participants
    const result = await createReviewCycleActionItems(id, session.user.companyId);

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        cycleId: id,
        actionItemsCreated: result.created,
        employeesInScope: result.employeesInScope,
      },
    });
  } catch (error: any) {
    console.error("Failed to launch review cycle:", error);
    return NextResponse.json(
      { error: error.message || "Failed to launch review cycle" },
      { status: 500 }
    );
  }
}
