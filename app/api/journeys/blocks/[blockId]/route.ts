import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateBlockSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  blockType: z
    .enum([
      "TASK",
      "FORM",
      "COMMUNICATION",
      "TRAINING",
      "APPROVAL",
      "AUTOMATION",
      "MILESTONE",
      "SURVEY",
      "DOCUMENT",
      "MEETING",
    ])
    .optional(),
  order: z.number().optional(),
  estimatedDuration: z.number().nullable().optional(),
  isRequired: z.boolean().optional(),
  slaHours: z.number().nullable().optional(),
  responsibleRole: z.string().nullable().optional(),
  automationConfig: z.record(z.any()).nullable().optional(),
  assets: z.record(z.any()).nullable().optional(),
  successCriteria: z.record(z.any()).nullable().optional(),
});

/**
 * Helper to verify block access and get parent journey with tenant check
 */
async function getBlockWithTenantCheck(blockId: string, companyId: string) {
  const block = await prisma.experienceBlock.findFirst({
    where: { id: blockId },
    include: {
      journeyPhase: {
        include: {
          journeyTemplate: {
            include: {
              governanceLocks: true,
            },
          },
        },
      },
      governanceLocks: true,
    },
  });

  if (!block) {
    return { error: "Block not found", status: 404 };
  }

  // Multi-tenant safety check
  if (block.journeyPhase.journeyTemplate.companyId !== companyId) {
    return { error: "Unauthorized", status: 401 };
  }

  return { block };
}

/**
 * GET /api/journeys/blocks/[blockId]
 * Get a specific experience block
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ blockId: string }> }
) {
  try {
    const { blockId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getBlockWithTenantCheck(blockId, session.user.companyId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { block } = result;

    // Fetch additional data
    const [feedbackSignals, analytics] = await Promise.all([
      prisma.feedbackSignal.findMany({
        where: { experienceBlockId: blockId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      // Calculate engagement metrics from journey instances
      prisma.journeyInstance.findMany({
        where: {
          journeyTemplateId: block.journeyPhase.journeyTemplate.id,
          status: { in: ["IN_PROGRESS", "COMPLETED"] },
        },
        select: {
          currentBlockId: true,
          completedBlocks: true,
          status: true,
        },
      }),
    ]);

    // Calculate block-specific analytics
    const completedCount = analytics.filter((instance) => {
      const completed = instance.completedBlocks as string[] | null;
      return completed?.includes(blockId);
    }).length;

    const currentlyOnBlock = analytics.filter(
      (instance) => instance.currentBlockId === blockId
    ).length;

    return NextResponse.json({
      ...block,
      feedbackSignals,
      analytics: {
        completions: completedCount,
        currentlyActive: currentlyOnBlock,
        totalInstances: analytics.length,
      },
    });
  } catch (error) {
    console.error("Error fetching block:", error);
    return NextResponse.json(
      { error: "Failed to fetch block" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/journeys/blocks/[blockId]
 * Update an experience block
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ blockId: string }> }
) {
  try {
    const { blockId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = updateBlockSchema.parse(body);

    const result = await getBlockWithTenantCheck(blockId, session.user.companyId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { block } = result;
    const journey = block.journeyPhase.journeyTemplate;

    // Check for governance locks on the journey
    const journeyLocks = journey.governanceLocks.filter(
      (lock) => !lock.unlockedAt
    );
    if (journeyLocks.length > 0) {
      return NextResponse.json(
        { error: "Journey is locked for editing", locks: journeyLocks },
        { status: 423 }
      );
    }

    // Check for governance locks on the block itself
    const blockLocks = block.governanceLocks.filter((lock) => !lock.unlockedAt);
    if (blockLocks.length > 0) {
      return NextResponse.json(
        { error: "Block is locked for editing", locks: blockLocks },
        { status: 423 }
      );
    }

    // Handle order change - reorder other blocks if needed
    if (validatedData.order !== undefined && validatedData.order !== block.order) {
      const phaseId = block.journeyPhaseId;
      const oldOrder = block.order;
      const newOrder = validatedData.order;

      if (newOrder > oldOrder) {
        // Moving down: shift blocks between old and new positions up
        await prisma.experienceBlock.updateMany({
          where: {
            journeyPhaseId: phaseId,
            order: { gt: oldOrder, lte: newOrder },
            id: { not: blockId },
          },
          data: {
            order: { decrement: 1 },
          },
        });
      } else {
        // Moving up: shift blocks between new and old positions down
        await prisma.experienceBlock.updateMany({
          where: {
            journeyPhaseId: phaseId,
            order: { gte: newOrder, lt: oldOrder },
            id: { not: blockId },
          },
          data: {
            order: { increment: 1 },
          },
        });
      }
    }

    // Update the block
    const updatedBlock = await prisma.experienceBlock.update({
      where: { id: blockId },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        blockType: validatedData.blockType,
        order: validatedData.order,
        estimatedDuration: validatedData.estimatedDuration,
        isRequired: validatedData.isRequired,
        slaHours: validatedData.slaHours,
        responsibleRole: validatedData.responsibleRole,
        automationConfig: validatedData.automationConfig,
        assets: validatedData.assets,
        successCriteria: validatedData.successCriteria,
      },
    });

    // Update journey version and lastModifiedBy
    await prisma.journeyTemplate.update({
      where: { id: journey.id },
      data: {
        lastModifiedBy: session.user.id,
        version: { increment: 1 },
      },
    });

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        companyId: session.user.companyId,
        actorId: session.user.id,
        actorType: "USER",
        action: "UPDATED",
        entityType: "EXPERIENCE_BLOCK" as any,
        entityId: blockId,
        metadata: {
          journeyId: journey.id,
          journeyName: journey.name,
          blockName: updatedBlock.name,
          changes: Object.keys(validatedData),
        },
      },
    });

    return NextResponse.json(updatedBlock);
  } catch (error) {
    console.error("Error updating block:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update block" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/journeys/blocks/[blockId]
 * Delete an experience block
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ blockId: string }> }
) {
  try {
    const { blockId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getBlockWithTenantCheck(blockId, session.user.companyId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { block } = result;
    const journey = block.journeyPhase.journeyTemplate;

    // Check for governance locks on the journey
    const journeyLocks = journey.governanceLocks.filter(
      (lock) => !lock.unlockedAt
    );
    if (journeyLocks.length > 0) {
      return NextResponse.json(
        { error: "Journey is locked for editing", locks: journeyLocks },
        { status: 423 }
      );
    }

    // Check for governance locks on the block itself
    const blockLocks = block.governanceLocks.filter((lock) => !lock.unlockedAt);
    if (blockLocks.length > 0) {
      return NextResponse.json(
        { error: "Block is locked and cannot be deleted", locks: blockLocks },
        { status: 423 }
      );
    }

    // Check if there are active instances currently on this block
    const activeOnBlock = await prisma.journeyInstance.count({
      where: {
        journeyTemplateId: journey.id,
        currentBlockId: blockId,
        status: "IN_PROGRESS",
      },
    });

    if (activeOnBlock > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete block with active participants",
          activeParticipants: activeOnBlock,
        },
        { status: 409 }
      );
    }

    const phaseId = block.journeyPhaseId;
    const deletedOrder = block.order;
    const blockName = block.name;

    // Delete the block (cascade will handle related records)
    await prisma.experienceBlock.delete({
      where: { id: blockId },
    });

    // Reorder remaining blocks in the phase
    await prisma.experienceBlock.updateMany({
      where: {
        journeyPhaseId: phaseId,
        order: { gt: deletedOrder },
      },
      data: {
        order: { decrement: 1 },
      },
    });

    // Update journey version and lastModifiedBy
    await prisma.journeyTemplate.update({
      where: { id: journey.id },
      data: {
        lastModifiedBy: session.user.id,
        version: { increment: 1 },
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
        entityType: "EXPERIENCE_BLOCK" as any,
        entityId: blockId,
        metadata: {
          journeyId: journey.id,
          journeyName: journey.name,
          blockName: blockName,
        },
      },
    });

    return NextResponse.json({ message: "Block deleted successfully" });
  } catch (error) {
    console.error("Error deleting block:", error);
    return NextResponse.json(
      { error: "Failed to delete block" },
      { status: 500 }
    );
  }
}

