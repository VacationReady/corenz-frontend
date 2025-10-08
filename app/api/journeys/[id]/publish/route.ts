import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// POST /api/journeys/[id]/publish - Publish a journey template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if journey exists and user has permission
    const journey = await prisma.journeyTemplate.findFirst({
      where: {
        id: id,
        companyId: session.user.companyId,
      },
      include: {
        phases: {
          include: {
            experienceBlocks: true,
          },
        },
        governanceLocks: true,
      },
    });

    if (!journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    // Check for governance locks
    const activeLocks = journey.governanceLocks.filter(
      lock => !lock.unlockedAt && lock.lockType === "APPROVAL_REQUIRED"
    );
    
    if (activeLocks.length > 0) {
      return NextResponse.json(
        { error: "Journey requires approval before publishing", locks: activeLocks },
        { status: 423 }
      );
    }

    // Validate journey completeness
    const validationErrors = validateJourneyForPublishing(journey);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Journey validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    // Publish the journey
    const publishedJourney = await prisma.journeyTemplate.update({
      where: { id: id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        lastModifiedBy: session.user.id,
      },
      include: {
        phases: {
          include: {
            experienceBlocks: true,
            decisionGateways: true,
          },
          orderBy: { order: "asc" },
        },
        metricBindings: true,
        experiments: true,
      },
    });

    // Create audit log entry
    await prisma.globalAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        companyId: session.user.companyId,
        actorId: session.user.id,
        actorType: "USER",
        action: "ACTIVATED",
        entityType: "AUTOMATION_RULE" as any,
        entityId: id,
        metadata: {
          journeyName: journey.name,
          version: journey.version,
          phases: journey.phases.length,
          blocks: journey.phases.reduce((sum, phase) => sum + phase.experienceBlocks.length, 0),
        },
      },
    });

    return NextResponse.json(publishedJourney);
  } catch (error) {
    console.error("Error publishing journey:", error);
    return NextResponse.json(
      { error: "Failed to publish journey" },
      { status: 500 }
    );
  }
}

// Helper function to validate journey for publishing
function validateJourneyForPublishing(journey: any): string[] {
  const errors: string[] = [];

  // Check basic requirements
  if (!journey.name || journey.name.trim().length === 0) {
    errors.push("Journey name is required");
  }

  if (!journey.persona) {
    errors.push("Target persona is required");
  }

  if (!journey.phases || journey.phases.length === 0) {
    errors.push("Journey must have at least one phase");
  }

  // Check phases
  journey.phases?.forEach((phase: any, index: number) => {
    if (!phase.name || phase.name.trim().length === 0) {
      errors.push(`Phase ${index + 1} must have a name`);
    }

    if (!phase.experienceBlocks || phase.experienceBlocks.length === 0) {
      errors.push(`Phase "${phase.name}" must have at least one experience block`);
    }

    // Check experience blocks
    phase.experienceBlocks?.forEach((block: any, blockIndex: number) => {
      if (!block.name || block.name.trim().length === 0) {
        errors.push(`Block ${blockIndex + 1} in phase "${phase.name}" must have a name`);
      }

      if (!block.blockType) {
        errors.push(`Block "${block.name}" must have a type`);
      }

      if (!block.responsibleRole) {
        errors.push(`Block "${block.name}" must have a responsible role assigned`);
      }
    });
  });

  // Check for orphaned blocks (blocks with no connections)
  // This would be more complex in a real implementation with graph analysis

  return errors;
}
