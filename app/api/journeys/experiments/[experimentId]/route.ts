import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateExperimentSchema = z.object({
  action: z.enum(["start", "pause", "complete", "cancel", "update"]).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  variants: z.array(z.object({
    id: z.string(),
    trafficAllocation: z.number().min(0).max(100).optional(),
    variantConfig: z.record(z.any()).optional(),
  })).optional(),
});

/**
 * Helper to get experiment variants with tenant check
 */
async function getExperimentWithTenantCheck(experimentId: string, companyId: string) {
  // Find all variants belonging to this experiment
  const variants = await prisma.experimentVariant.findMany({
    where: {
      OR: [
        { id: experimentId },
        {
          variantConfig: {
            path: ["experimentId"],
            equals: experimentId,
          },
        },
      ],
    },
    include: {
      journeyTemplate: true,
    },
  });

  if (variants.length === 0) {
    return { error: "Experiment not found", status: 404 };
  }

  // Verify company ownership
  const journey = variants[0].journeyTemplate;
  if (journey.companyId !== companyId) {
    return { error: "Unauthorized", status: 401 };
  }

  return { variants, journey };
}

/**
 * GET /api/journeys/experiments/[experimentId]
 * Get experiment details with all variants and results
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> }
) {
  try {
    const { experimentId } = await params;
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getExperimentWithTenantCheck(experimentId, session.user.companyId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { variants, journey } = result;
    const controlVariant = variants.find((v: any) => v.isControl) || variants[0];
    const config = controlVariant.variantConfig as any;

    // Calculate experiment statistics
    const instances = await prisma.journeyInstance.findMany({
      where: {
        journeyTemplateId: journey.id,
        metadata: {
          path: ["experimentId"],
          equals: experimentId,
        },
      },
    });

    const variantStats = variants.map((variant: any) => {
      const variantInstances = instances.filter(
        (i: any) => (i.metadata as any)?.variantId === variant.id,
      );
      const completed = variantInstances.filter((i: any) => i.status === "COMPLETED").length;
      
      return {
        id: variant.id,
        name: variant.name,
        description: variant.description,
        trafficAllocation: variant.trafficAllocation,
        isControl: variant.isControl,
        variantConfig: variant.variantConfig,
        results: variant.results,
        statistics: {
          participants: variantInstances.length,
          completed,
          completionRate: variantInstances.length > 0 
            ? Math.round((completed / variantInstances.length) * 100) 
            : 0,
        },
      };
    });

    // Calculate statistical significance (simplified)
    const controlStats = variantStats.find((v: any) => v.isControl);
    const treatmentStats = variantStats.filter((v: any) => !v.isControl);
    
    let statisticalSignificance = null;
    if (controlStats && treatmentStats.length > 0 && instances.length >= 30) {
      // Simple z-test approximation
      const p1 = controlStats.statistics.completionRate / 100;
      const p2 = treatmentStats[0].statistics.completionRate / 100;
      const n1 = controlStats.statistics.participants;
      const n2 = treatmentStats[0].statistics.participants;
      
      if (n1 > 0 && n2 > 0) {
        const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
        const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
        const z = se > 0 ? Math.abs(p1 - p2) / se : 0;
        
        // Convert z-score to confidence level (approximate)
        statisticalSignificance = {
          zScore: z,
          confidenceLevel: z >= 1.96 ? 95 : z >= 1.645 ? 90 : z >= 1.28 ? 80 : null,
          isSignificant: z >= 1.96,
        };
      }
    }

    return NextResponse.json({
      id: experimentId,
      name: config?.experimentName || controlVariant.name,
      description: controlVariant.description,
      journeyId: journey.id,
      journeyName: journey.name,
      targetBlockId: config?.targetBlockId,
      successMetric: config?.successMetric || "COMPLETION_RATE",
      targetSampleSize: config?.targetSampleSize,
      status: controlVariant.status,
      startDate: controlVariant.startDate,
      endDate: controlVariant.endDate,
      variants: variantStats,
      totalParticipants: instances.length,
      statisticalSignificance,
      createdAt: controlVariant.createdAt,
      updatedAt: controlVariant.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching experiment:", error);
    return NextResponse.json(
      { error: "Failed to fetch experiment" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/journeys/experiments/[experimentId]
 * Update experiment or change its status (start/pause/complete/cancel)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> }
) {
  try {
    const { experimentId } = await params;
    const session = await auth();
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = updateExperimentSchema.parse(body);

    const result = await getExperimentWithTenantCheck(experimentId, session.user.companyId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { variants, journey } = result;

    // Handle status actions
    if (validatedData.action) {
      const statusMap: Record<string, any> = {
        start: { status: "RUNNING", startDate: new Date() },
        pause: { status: "PAUSED" },
        complete: { status: "COMPLETED", endDate: new Date() },
        cancel: { status: "CANCELLED", endDate: new Date() },
      };

      const updates = statusMap[validatedData.action];
      if (updates) {
        // Validate state transitions
        const currentStatus = variants[0].status;
        const validTransitions: Record<string, string[]> = {
          DRAFT: ["RUNNING", "CANCELLED"],
          RUNNING: ["PAUSED", "COMPLETED", "CANCELLED"],
          PAUSED: ["RUNNING", "COMPLETED", "CANCELLED"],
          COMPLETED: [],
          CANCELLED: [],
        };

        if (!validTransitions[currentStatus]?.includes(updates.status)) {
          return NextResponse.json(
            { error: `Cannot transition from ${currentStatus} to ${updates.status}` },
            { status: 400 }
          );
        }

        // Update all variants
        await prisma.experimentVariant.updateMany({
          where: {
            id: { in: variants.map((v: any) => v.id) },
          },
          data: updates,
        });

        // Create audit log
        await prisma.globalAuditLog.create({
          data: {
            id: crypto.randomUUID(),
            companyId: session.user.companyId,
            actorId: session.user.id,
            actorType: "USER",
            action: "UPDATED",
            entityType: "EXPERIMENT_VARIANT" as any,
            entityId: experimentId,
            metadata: {
              action: validatedData.action,
              previousStatus: currentStatus,
              newStatus: updates.status,
            },
          },
        });
      }
    }

    // Handle variant updates
    if (validatedData.variants) {
      for (const variantUpdate of validatedData.variants) {
        const variant = variants.find((v: any) => v.id === variantUpdate.id);
        if (variant) {
          const updateData: any = {};
          
          if (variantUpdate.trafficAllocation !== undefined) {
            updateData.trafficAllocation = variantUpdate.trafficAllocation;
          }
          
          if (variantUpdate.variantConfig) {
            updateData.variantConfig = {
              ...(variant.variantConfig as any),
              ...variantUpdate.variantConfig,
            };
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.experimentVariant.update({
              where: { id: variant.id },
              data: updateData,
            });
          }
        }
      }
    }

    // Update experiment name/description if provided
    if (validatedData.name || validatedData.description !== undefined) {
      for (const variant of variants as any[]) {
        const config = variant.variantConfig as any;
        await prisma.experimentVariant.update({
          where: { id: variant.id },
          data: {
            description: validatedData.description ?? variant.description,
            variantConfig: {
              ...config,
              experimentName: validatedData.name ?? config.experimentName,
            },
          },
        });
      }
    }

    return NextResponse.json({ 
      success: true,
      message: validatedData.action 
        ? `Experiment ${validatedData.action}ed successfully`
        : "Experiment updated successfully",
    });
  } catch (error) {
    console.error("Error updating experiment:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update experiment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/journeys/experiments/[experimentId]
 * Delete an experiment and all its variants
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> }
) {
  try {
    const { experimentId } = await params;
    const session = await auth();
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getExperimentWithTenantCheck(experimentId, session.user.companyId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { variants, journey } = result;

    // Don't allow deletion of running experiments
    if (variants.some((v: any) => v.status === "RUNNING")) {
      return NextResponse.json(
        { error: "Cannot delete a running experiment. Pause or complete it first." },
        { status: 400 }
      );
    }

    // Delete all variants
    await prisma.experimentVariant.deleteMany({
      where: {
        id: { in: variants.map((v: any) => v.id) },
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
        entityType: "EXPERIMENT_VARIANT" as any,
        entityId: experimentId,
        metadata: {
          journeyId: journey.id,
          journeyName: journey.name,
          variantCount: variants.length,
        },
      },
    });

    return NextResponse.json({ 
      success: true,
      message: "Experiment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting experiment:", error);
    return NextResponse.json(
      { error: "Failed to delete experiment" },
      { status: 500 }
    );
  }
}









