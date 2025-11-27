import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateInstanceSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ON_HOLD"]).optional(),
  progress: z.number().min(0).max(100).optional(),
  currentPhaseId: z.string().optional(),
  currentBlockId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * GET /api/journeys/instances/[instanceId]
 * Get a specific journey instance with full details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch instance with tenant isolation through both journey and participant
    const instance = await prisma.journeyInstance.findFirst({
      where: {
        id: instanceId,
        // Tenant isolation: verify journey belongs to company
        journeyTemplate: {
          companyId: session.user.companyId,
        },
        // Extra safety: verify participant belongs to company
        participant: {
          companyId: session.user.companyId,
        },
      },
      include: {
        journeyTemplate: {
          include: {
            phases: {
              include: {
                experienceBlocks: {
                  orderBy: { order: "asc" },
                },
              },
              orderBy: { order: "asc" },
            },
            metricBindings: true,
          },
        },
        participant: {
          include: {
            User: {
              select: { id: true, name: true, email: true },
            },
            Department: {
              select: { id: true, name: true },
            },
            JobRole: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }

    return NextResponse.json(instance);
  } catch (error) {
    console.error("Error fetching journey instance:", error);
    return NextResponse.json(
      { error: "Failed to fetch instance" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/journeys/instances/[instanceId]
 * Update a journey instance (progress, status, current position)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = updateInstanceSchema.parse(body);

    // Verify instance exists and belongs to company (tenant isolation)
    const existingInstance = await prisma.journeyInstance.findFirst({
      where: {
        id: instanceId,
        journeyTemplate: {
          companyId: session.user.companyId,
        },
        participant: {
          companyId: session.user.companyId,
        },
      },
      include: {
        journeyTemplate: {
          select: { id: true, name: true, companyId: true },
        },
        participant: {
          select: { id: true, firstName: true, lastName: true, companyId: true },
        },
      },
    });

    if (!existingInstance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
      
      // Set completedAt when marking as completed
      if (validatedData.status === "COMPLETED") {
        updateData.completedAt = new Date();
        updateData.progress = 100;
      }
    }
    
    if (validatedData.progress !== undefined) {
      updateData.progress = validatedData.progress;
    }
    
    if (validatedData.currentPhaseId !== undefined) {
      updateData.currentPhaseId = validatedData.currentPhaseId;
    }
    
    if (validatedData.currentBlockId !== undefined) {
      updateData.currentBlockId = validatedData.currentBlockId;
    }
    
    if (validatedData.metadata !== undefined) {
      updateData.metadata = {
        ...((existingInstance.metadata as any) || {}),
        ...validatedData.metadata,
      };
    }

    // Update instance
    const updatedInstance = await prisma.journeyInstance.update({
      where: { id: instanceId },
      data: updateData,
      include: {
        journeyTemplate: {
          select: { id: true, name: true },
        },
        participant: {
          include: {
            User: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    // Create audit log for significant status changes
    if (validatedData.status) {
      await prisma.globalAuditLog.create({
        data: {
          id: crypto.randomUUID(),
          companyId: session.user.companyId,
          actorId: session.user.id,
          actorType: "USER",
          action: "UPDATED",
          entityType: "JOURNEY_INSTANCE" as any,
          entityId: instanceId,
          metadata: {
            journeyName: existingInstance.journeyTemplate.name,
            participantName: `${existingInstance.participant.firstName} ${existingInstance.participant.lastName}`,
            previousStatus: existingInstance.status,
            newStatus: validatedData.status,
          },
        },
      });
    }

    return NextResponse.json(updatedInstance);
  } catch (error) {
    console.error("Error updating journey instance:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update instance" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/journeys/instances/[instanceId]
 * Cancel/delete a journey instance
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify instance exists and belongs to company (tenant isolation)
    const instance = await prisma.journeyInstance.findFirst({
      where: {
        id: instanceId,
        journeyTemplate: {
          companyId: session.user.companyId,
        },
        participant: {
          companyId: session.user.companyId,
        },
      },
      include: {
        journeyTemplate: {
          select: { id: true, name: true },
        },
        participant: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }

    // Soft delete by marking as cancelled (preserves audit trail)
    await prisma.journeyInstance.update({
      where: { id: instanceId },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
        metadata: {
          ...((instance.metadata as any) || {}),
          cancelledBy: session.user.id,
          cancelledAt: new Date().toISOString(),
        },
      },
    });

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        companyId: session.user.companyId,
        actorId: session.user.id,
        actorType: "USER",
        action: "DELETED",
        entityType: "JOURNEY_INSTANCE" as any,
        entityId: instanceId,
        metadata: {
          journeyName: instance.journeyTemplate.name,
          participantName: `${instance.participant.firstName} ${instance.participant.lastName}`,
          previousStatus: instance.status,
        },
      },
    });

    return NextResponse.json({ 
      message: "Instance cancelled successfully",
      id: instanceId,
    });
  } catch (error) {
    console.error("Error cancelling journey instance:", error);
    return NextResponse.json(
      { error: "Failed to cancel instance" },
      { status: 500 }
    );
  }
}

