import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createExperimentSchema = z.object({
  name: z.string().min(1, "Experiment name is required"),
  description: z.string().optional(),
  targetBlockId: z.string().min(1, "Target block is required"),
  variants: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    trafficAllocation: z.number().min(0).max(100),
    isControl: z.boolean(),
    variantConfig: z.record(z.any()),
  })).min(2, "At least 2 variants required"),
  successMetric: z.enum(["COMPLETION_RATE", "SATISFACTION_SCORE", "TIME_TO_COMPLETE", "ENGAGEMENT_SCORE"]),
  targetSampleSize: z.number().min(10).optional(),
});

/**
 * GET /api/journeys/[id]/experiments
 * List all experiments for a journey
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
    });

    if (!journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    const experiments = await prisma.experimentVariant.findMany({
      where: {
        journeyTemplateId: id,
      },
      orderBy: { createdAt: "desc" },
    });

    // Group variants by experiment (using variantConfig.experimentId)
    const experimentGroups = new Map<string, any[]>();
    experiments.forEach((exp) => {
      const config = exp.variantConfig as any;
      const experimentId = config?.experimentId || exp.id;
      if (!experimentGroups.has(experimentId)) {
        experimentGroups.set(experimentId, []);
      }
      experimentGroups.get(experimentId)!.push(exp);
    });

    // Format as experiment objects
    const formattedExperiments = Array.from(experimentGroups.entries()).map(([experimentId, variants]) => {
      const controlVariant = variants.find(v => v.isControl) || variants[0];
      const config = controlVariant.variantConfig as any;
      
      return {
        id: experimentId,
        name: config?.experimentName || controlVariant.name,
        description: controlVariant.description,
        targetBlockId: config?.targetBlockId,
        successMetric: config?.successMetric || "COMPLETION_RATE",
        status: controlVariant.status,
        startDate: controlVariant.startDate,
        endDate: controlVariant.endDate,
        confidenceLevel: controlVariant.confidenceLevel,
        variants: variants.map(v => ({
          id: v.id,
          name: v.name,
          description: v.description,
          trafficAllocation: v.trafficAllocation,
          isControl: v.isControl,
          variantConfig: v.variantConfig,
          results: v.results,
        })),
        createdAt: controlVariant.createdAt,
        updatedAt: controlVariant.updatedAt,
      };
    });

    return NextResponse.json(formattedExperiments);
  } catch (error) {
    console.error("Error fetching experiments:", error);
    return NextResponse.json(
      { error: "Failed to fetch experiments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/journeys/[id]/experiments
 * Create a new experiment with variants
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
    const validatedData = createExperimentSchema.parse(body);

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
      },
    });

    if (!journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    // Verify target block exists in the journey
    const allBlocks = journey.phases.flatMap(p => p.experienceBlocks);
    const targetBlock = allBlocks.find(b => b.id === validatedData.targetBlockId);
    if (!targetBlock) {
      return NextResponse.json(
        { error: "Target block not found in journey" },
        { status: 400 }
      );
    }

    // Validate traffic allocation sums to 100
    const totalAllocation = validatedData.variants.reduce(
      (sum, v) => sum + v.trafficAllocation,
      0
    );
    if (Math.abs(totalAllocation - 100) > 0.01) {
      return NextResponse.json(
        { error: "Traffic allocation must sum to 100%" },
        { status: 400 }
      );
    }

    // Ensure exactly one control variant
    const controlCount = validatedData.variants.filter(v => v.isControl).length;
    if (controlCount !== 1) {
      return NextResponse.json(
        { error: "Exactly one variant must be marked as control" },
        { status: 400 }
      );
    }

    // Generate experiment ID
    const experimentId = crypto.randomUUID();

    // Create all variants
    const variants = await Promise.all(
      validatedData.variants.map((variant) =>
        prisma.experimentVariant.create({
          data: {
            id: crypto.randomUUID(),
            journeyTemplateId: id,
            name: variant.name,
            description: variant.description,
            trafficAllocation: variant.trafficAllocation,
            isControl: variant.isControl,
            status: "DRAFT",
            variantConfig: {
              ...variant.variantConfig,
              experimentId,
              experimentName: validatedData.name,
              targetBlockId: validatedData.targetBlockId,
              successMetric: validatedData.successMetric,
              targetSampleSize: validatedData.targetSampleSize,
            },
          },
        })
      )
    );

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        companyId: session.user.companyId,
        actorId: session.user.id,
        actorType: "USER",
        action: "CREATED",
        entityType: "EXPERIMENT_VARIANT" as any,
        entityId: experimentId,
        metadata: {
          journeyId: id,
          journeyName: journey.name,
          experimentName: validatedData.name,
          variantCount: variants.length,
        },
      },
    });

    return NextResponse.json({
      id: experimentId,
      name: validatedData.name,
      description: validatedData.description,
      targetBlockId: validatedData.targetBlockId,
      successMetric: validatedData.successMetric,
      status: "DRAFT",
      variants: variants.map(v => ({
        id: v.id,
        name: v.name,
        trafficAllocation: v.trafficAllocation,
        isControl: v.isControl,
      })),
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating experiment:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create experiment" },
      { status: 500 }
    );
  }
}














