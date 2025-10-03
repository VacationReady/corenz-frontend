import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createAutomationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  formId: z.string(),
  trigger: z.enum(["SCHEDULED", "ONBOARDING_COMPLETE", "ANNIVERSARY", "PERFORMANCE_REVIEW", "CUSTOM"]),
  frequency: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY", "CUSTOM"]).optional(),
  scheduleConfig: z.record(z.any()).optional(),
  targetAudience: z.record(z.any()),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");

    const where: any = {
      companyId: session.user.companyId,
    };

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const automations = await prisma.surveyAutomation.findMany({
      where,
      include: {
        Form: true,
        Survey: true,
        CreatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            SurveyAutomationRuns: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      automations: automations.map(automation => ({
        ...automation,
        totalRuns: automation._count.SurveyAutomationRuns,
      })),
    });
  } catch (error) {
    console.error("Error fetching survey automations:", error);
    return NextResponse.json(
      { error: "Failed to fetch automations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createAutomationSchema.parse(body);

    // Verify form exists and belongs to company
    const form = await prisma.form.findFirst({
      where: {
        id: validatedData.formId,
        companyId: session.user.companyId,
        formType: "SURVEY",
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: "Survey template not found" },
        { status: 404 }
      );
    }

    // Calculate next run time based on frequency
    let nextRunAt: Date | null = null;
    if (validatedData.trigger === "SCHEDULED" && validatedData.frequency) {
      const now = new Date();
      switch (validatedData.frequency) {
        case "WEEKLY":
          nextRunAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case "MONTHLY":
          nextRunAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
          break;
        case "QUARTERLY":
          nextRunAt = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
          break;
        case "ANNUALLY":
          nextRunAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
          break;
      }
    }

    const automation = await prisma.surveyAutomation.create({
      data: {
        id: crypto.randomUUID(),
        name: validatedData.name,
        description: validatedData.description,
        formId: validatedData.formId,
        trigger: validatedData.trigger,
        frequency: validatedData.frequency,
        scheduleConfig: validatedData.scheduleConfig,
        targetAudience: validatedData.targetAudience,
        isActive: validatedData.isActive,
        nextRunAt,
        companyId: session.user.companyId,
        createdById: session.user.id,
      },
      include: {
        Form: true,
        CreatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(automation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating survey automation:", error);
    return NextResponse.json(
      { error: "Failed to create automation" },
      { status: 500 }
    );
  }
}
