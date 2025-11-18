import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { status } = await req.json();

    // Validate status
    const validStatuses = ["TODO", "IN_PROGRESS", "COMPLETED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Check if action item exists and user has access
    const existingItem = await prisma.meetingActionItem.findUnique({
      where: { id },
      include: {
        Meeting: {
          select: { 
            companyId: true,
            participantIds: true,
            organizerId: true,
          },
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Action item not found" },
        { status: 404 }
      );
    }

    // Verify company access
    if (existingItem.Meeting.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify user is either the assignee, organizer, or participant in the meeting
    const isAssignee = existingItem.assigneeId === session.user.id;
    const isOrganizer = existingItem.Meeting.organizerId === session.user.id;
    const isParticipant = existingItem.Meeting.participantIds.includes(session.user.id);
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "MANAGER", "HR"].includes(session.user.role || "");

    if (!isAssignee && !isOrganizer && !isParticipant && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update the action item
    const updatedItem = await prisma.meetingActionItem.update({
      where: { id },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
        updatedAt: new Date(),
      },
      include: {
        Assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      actionItem: updatedItem,
    });
  } catch (error) {
    console.error("Failed to update meeting action item:", error);
    return NextResponse.json(
      { error: "Failed to update action item" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const actionItem = await prisma.meetingActionItem.findUnique({
      where: { id },
      include: {
        Meeting: {
          select: {
            id: true,
            title: true,
            companyId: true,
            participantIds: true,
            organizerId: true,
          },
        },
        Assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!actionItem) {
      return NextResponse.json(
        { error: "Action item not found" },
        { status: 404 }
      );
    }

    // Verify company access
    if (actionItem.Meeting.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      actionItem,
    });
  } catch (error) {
    console.error("Failed to fetch meeting action item:", error);
    return NextResponse.json(
      { error: "Failed to fetch action item" },
      { status: 500 }
    );
  }
}
