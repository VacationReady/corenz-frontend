import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createBlockSchema = z.object({
  phaseId: z.string().min(1, "Phase ID is required"),
  name: z.string().min(1, "Block name is required"),
  description: z.string().optional(),
  blockType: z.enum([
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
  ]),
  order: z.number().optional(),
  estimatedDuration: z.number().optional(),
  isRequired: z.boolean().optional(),
  slaHours: z.number().optional(),
  responsibleRole: z.string().optional(),
  automationConfig: z.record(z.any()).optional(),
  assets: z.record(z.any()).optional(),
  successCriteria: z.record(z.any()).optional(),
});

/**
 * GET /api/journeys/[id]/blocks
 * List all experience blocks for a journey
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify journey belongs to company
    const journey = await prisma.journeyTemplate.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        phases: {
          include: {
            experienceBlocks: {
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    // Flatten blocks with phase information
    const blocks = journey.phases.flatMap((phase: any) =>
      phase.experienceBlocks.map((block: any) => ({
        ...block,
        phaseName: phase.name,
        phaseOrder: phase.order,
      }))
    );

    return NextResponse.json({ blocks });
  } catch (error) {
    console.error("Error fetching journey blocks:", error);
    return NextResponse.json(
      { error: "Failed to fetch blocks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/journeys/[id]/blocks
 * Create a new experience block within a phase
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createBlockSchema.parse(body);

    // Verify journey exists and belongs to company
    const journey = await prisma.journeyTemplate.findFirst({
      where: {
        id,
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

    // Check for governance locks on the journey
    const activeLocks = journey.governanceLocks.filter(
      (lock: { unlockedAt: any }) => !lock.unlockedAt
    );
    if (activeLocks.length > 0) {
      return NextResponse.json(
        { error: "Journey is locked for editing", locks: activeLocks },
        { status: 423 }
      );
    }

    // Verify phase belongs to this journey
    const phase = journey.phases.find((p: { id: string }) => p.id === validatedData.phaseId);
    if (!phase) {
      return NextResponse.json(
        { error: "Phase not found in this journey" },
        { status: 404 }
      );
    }

    // Calculate order if not provided - append to end of phase
    const maxOrder = Math.max(...phase.experienceBlocks.map((b: { order: number }) => b.order), -1);
    const blockOrder = validatedData.order ?? maxOrder + 1;

    // If order was specified and blocks exist at that position, shift them
    if (validatedData.order !== undefined && phase.experienceBlocks.some((b: { order: number }) => b.order >= blockOrder)) {
      await prisma.experienceBlock.updateMany({
        where: {
          journeyPhaseId: validatedData.phaseId,
          order: { gte: blockOrder },
        },
        data: {
          order: { increment: 1 },
        },
      });
    }

    // Create the new block
    const newBlock = await prisma.experienceBlock.create({
      data: {
        id: crypto.randomUUID(),
        journeyPhaseId: validatedData.phaseId,
        name: validatedData.name,
        description: validatedData.description,
        blockType: validatedData.blockType,
        order: blockOrder,
        estimatedDuration: validatedData.estimatedDuration,
        isRequired: validatedData.isRequired ?? true,
        slaHours: validatedData.slaHours,
        responsibleRole: validatedData.responsibleRole,
        automationConfig: validatedData.automationConfig,
        assets: validatedData.assets,
        successCriteria: validatedData.successCriteria,
      },
    });

    // Update journey version and lastModifiedBy
    await prisma.journeyTemplate.update({
      where: { id },
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
        action: "CREATED",
        entityType: "EXPERIENCE_BLOCK" as any,
        entityId: newBlock.id,
        metadata: {
          journeyId: id,
          journeyName: journey.name,
          phaseName: phase.name,
          blockName: newBlock.name,
          blockType: newBlock.blockType,
        },
      },
    });

    return NextResponse.json(newBlock, { status: 201 });
  } catch (error) {
    console.error("Error creating experience block:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create block" },
      { status: 500 }
    );
  }
}















