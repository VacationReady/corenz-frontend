import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

const updateTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  type: z.enum([
    "ONE_TO_ONE",
    "PROBATION_REVIEW",
    "QUARTERLY_REVIEW",
    "ANNUAL_REVIEW",
    "MID_YEAR_REVIEW",
    "PROJECT_RETROSPECTIVE",
    "REVIEW_CYCLE",
    "THREE_SIXTY",
    "CUSTOM",
  ]).optional(),
  icon: z.string().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(["PRIVATE", "TEAM", "DEPARTMENT", "COMPANY"]).optional(),
  audienceFilters: z.object({
    locations: z.array(z.string()).optional(),
    departments: z.array(z.string()).optional(),
    jobRoles: z.array(z.string()).optional(),
  }).optional(),
  reviewerAssignments: z.array(z.object({
    role: z.enum(["SELF", "MANAGER", "PEER", "DIRECT_REPORT", "SKIP_LEVEL", "HR"]),
    dueOffsetDays: z.number().optional(),
    isRequired: z.boolean().optional(),
    minReviewers: z.number().optional(),
    maxReviewers: z.number().optional(),
  })).optional(),
  bestPracticePackIds: z.array(z.string()).optional(),
  sections: z.array(z.object({
    id: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    order: z.number(),
    isRequired: z.boolean().optional(),
    questions: z.array(z.object({
      id: z.string().optional(),
      question: z.string(),
      description: z.string().optional(),
      type: z.enum(["TEXT", "TEXTAREA", "RATING", "MULTIPLE_CHOICE", "YES_NO", "DATE", "NUMBER"]),
      order: z.number(),
      isRequired: z.boolean().optional(),
      options: z.any().optional(),
    })),
  })).optional(),
});

function isManagerOrAdmin(role?: string | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER" || role === "HR";
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const template = await prisma.performanceTemplate.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        Creator: {
          select: { id: true, firstName: true, lastName: true },
        },
        sections: {
          orderBy: { order: "asc" },
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("[template-get]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify template exists and belongs to company
    const existingTemplate = await prisma.performanceTemplate.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const body = await req.json();
    const validated = updateTemplateSchema.parse(body);

    const { sections, ...templateData } = validated;

    // Update template fields
    const updatedTemplate = await prisma.performanceTemplate.update({
      where: { id: params.id },
      data: {
        ...templateData,
        version: { increment: 1 },
      },
    });

    // Handle sections update if provided
    if (sections) {
      // Delete existing sections and questions
      await prisma.templateQuestion.deleteMany({
        where: {
          section: {
            templateId: params.id,
          },
        },
      });

      await prisma.templateSection.deleteMany({
        where: { templateId: params.id },
      });

      // Create new sections and questions
      for (const section of sections) {
        const createdSection = await prisma.templateSection.create({
          data: {
            id: section.id || crypto.randomUUID(),
            templateId: params.id,
            title: section.title,
            description: section.description,
            order: section.order,
            isRequired: section.isRequired || false,
          },
        });

        if (section.questions && section.questions.length > 0) {
          await Promise.all(
            section.questions.map((question) =>
              prisma.templateQuestion.create({
                data: {
                  id: question.id || crypto.randomUUID(),
                  sectionId: createdSection.id,
                  question: question.question,
                  description: question.description,
                  type: question.type,
                  order: question.order,
                  isRequired: question.isRequired || false,
                  options: question.options || null,
                },
              })
            )
          );
        }
      }
    }

    // Fetch complete updated template
    const completeTemplate = await prisma.performanceTemplate.findUnique({
      where: { id: params.id },
      include: {
        Creator: {
          select: { id: true, firstName: true, lastName: true },
        },
        sections: {
          orderBy: { order: "asc" },
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    return NextResponse.json({ template: completeTemplate });
  } catch (error) {
    console.error("[template-put]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify template exists and belongs to company
    const existingTemplate = await prisma.performanceTemplate.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Check if template is being used
    // TODO: Add check for active review cycles using this template

    // Delete questions first
    await prisma.templateQuestion.deleteMany({
      where: {
        section: {
          templateId: params.id,
        },
      },
    });

    // Delete sections
    await prisma.templateSection.deleteMany({
      where: { templateId: params.id },
    });

    // Delete template
    await prisma.performanceTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[template-delete]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
