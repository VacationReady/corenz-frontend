import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateJourneyPhasesAI, type JourneyScopingData } from "@/lib/ai/journey-assistant";

const createJourneySchema = z.object({
  name: z.string().min(1, "Journey name is required"),
  description: z.string().optional(),
  persona: z.string().min(1, "Target persona is required"),
  duration: z.number().min(1).max(365),
  category: z.string().min(1, "Category is required"),
  businessGoals: z.array(z.string()).min(1, "At least one business goal is required"),
  geography: z.string().optional(),
  lifecycleStage: z.string().optional(),
  customGoals: z.string().optional(),
});

// GET /api/journeys - List all journey templates for the company
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const persona = searchParams.get("persona");

    const where: any = {
      companyId: session.user.companyId,
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (category) {
      where.category = category;
    }

    if (persona) {
      where.persona = persona;
    }

    const journeys = await prisma.journeyTemplate.findMany({
      where,
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
        governanceLocks: true,
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            instances: true,
            comments: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(journeys);
  } catch (error) {
    console.error("Error fetching journeys:", error);
    return NextResponse.json(
      { error: "Failed to fetch journeys" },
      { status: 500 }
    );
  }
}

// POST /api/journeys - Create a new journey template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createJourneySchema.parse(body);

    // Generate AI-powered journey structure based on the scoping data
    const scopingData: JourneyScopingData = {
      name: validatedData.name,
      description: validatedData.description,
      persona: validatedData.persona,
      duration: validatedData.duration,
      category: validatedData.category,
      businessGoals: validatedData.businessGoals,
      geography: validatedData.geography,
      lifecycleStage: validatedData.lifecycleStage,
      customGoals: validatedData.customGoals,
    };
    
    // Use AI-powered generation (with fallback to templates if AI fails)
    const aiGeneratedPhases = await generateJourneyPhasesAI(scopingData);

    const journey = await prisma.journeyTemplate.create({
      data: {
        id: crypto.randomUUID(),
        companyId: session.user.companyId,
        createdBy: session.user.id,
        name: validatedData.name,
        description: validatedData.description,
        persona: validatedData.persona,
        duration: validatedData.duration,
        category: validatedData.category,
        businessGoals: validatedData.businessGoals,
        tags: generateTags(validatedData),
        phases: {
          create: aiGeneratedPhases.map((phase: any, index: number) => ({
            name: phase.name,
            description: phase.description,
            order: index + 1,
            duration: phase.duration,
            phaseType: phase.phaseType,
            experienceBlocks: {
              create: phase.experienceBlocks.map((block: any, blockIndex: number) => ({
                name: block.name,
                description: block.description,
                blockType: block.blockType,
                order: blockIndex + 1,
                estimatedDuration: block.estimatedDuration,
                slaHours: block.slaHours,
                responsibleRole: block.responsibleRole,
                automationConfig: block.automationConfig,
                assets: block.assets,
                successCriteria: block.successCriteria,
              })),
            },
          })),
        },
        metricBindings: {
          create: generateDefaultMetrics(validatedData),
        },
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

    return NextResponse.json(journey, { status: 201 });
  } catch (error) {
    console.error("Error creating journey:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create journey" },
      { status: 500 }
    );
  }
}

// Note: AI journey generation has been moved to app/lib/ai/journey-assistant.ts
// The generateJourneyPhasesAI function is imported and used above

// Helper function to generate default metrics based on journey type
function generateDefaultMetrics(scopingData: any) {
  const baseMetrics: any[] = [
    {
      id: crypto.randomUUID(),
      metricName: "Completion Rate",
      metricType: "COMPLETION_RATE" as const,
      targetValue: 90,
      isKPI: true,
    },
    {
      id: crypto.randomUUID(),
      metricName: "Satisfaction Score",
      metricType: "SATISFACTION_SCORE" as const, 
      targetValue: 8.0,
      isKPI: true,
    },
  ];

  // Add category-specific metrics
  if (scopingData.category === "onboarding") {
    baseMetrics.push({
      id: crypto.randomUUID(),
      metricName: "Time to Productivity",
      metricType: "TIME_TO_COMPLETE" as const,
      targetValue: scopingData.duration * 0.8, // 80% of planned duration
      isKPI: true,
    });
  }

  if (scopingData.businessGoals.includes("Increase retention rates")) {
    baseMetrics.push({
      id: crypto.randomUUID(),
      metricName: "Retention Rate",
      metricType: "RETENTION_RATE" as const,
      targetValue: 95,
      isKPI: true,
    });
  }

  return baseMetrics;
}

// Helper function to generate tags based on scoping data
function generateTags(scopingData: any) {
  const tags = [scopingData.category, scopingData.persona];
  
  if (scopingData.geography) {
    tags.push(scopingData.geography);
  }
  
  if (scopingData.lifecycleStage) {
    tags.push(scopingData.lifecycleStage);
  }

  // Add goal-based tags
  scopingData.businessGoals.forEach((goal: string) => {
    if (goal.includes("retention")) tags.push("retention");
    if (goal.includes("satisfaction")) tags.push("satisfaction");
    if (goal.includes("productivity")) tags.push("productivity");
  });

  return tags;
}
