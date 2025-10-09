import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
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
  ]),
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
    title: z.string(),
    description: z.string().optional(),
    order: z.number(),
    isRequired: z.boolean().optional(),
    questions: z.array(z.object({
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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const isActive = searchParams.get("isActive");
    const includeSections = searchParams.get("includeSections") === "true";

    const templates = await prisma.performanceTemplate.findMany({
      where: {
        companyId: session.user.companyId,
        ...(type && { type: type as any }),
        ...(isActive && { isActive: isActive === "true" }),
      },
      include: {
        Creator: {
          select: { id: true, firstName: true, lastName: true },
        },
        ...(includeSections && {
          sections: {
            orderBy: { order: "asc" },
            include: {
              questions: {
                orderBy: { order: "asc" },
              },
            },
          },
        }),
      },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[templates-get]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = templateSchema.parse(body);

    const { sections, ...templateData } = validated;

    const template = await prisma.performanceTemplate.create({
      data: {
        id: crypto.randomUUID(),
        companyId: session.user.companyId,
        name: templateData.name,
        description: templateData.description,
        type: templateData.type,
        icon: templateData.icon,
        isDefault: templateData.isDefault || false,
        isActive: templateData.isActive !== false,
        tags: templateData.tags || [],
        visibility: templateData.visibility || "COMPANY",
        audienceFilters: templateData.audienceFilters || Prisma.JsonNull,
        reviewerAssignments: templateData.reviewerAssignments || Prisma.JsonNull,
        bestPracticePackIds: templateData.bestPracticePackIds || [],
        createdBy: session.user.id,
      },
      include: {
        Creator: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Create sections and questions if provided
    if (sections && sections.length > 0) {
      for (const section of sections) {
        const createdSection = await prisma.templateSection.create({
          data: {
            id: crypto.randomUUID(),
            templateId: template.id,
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
                  id: crypto.randomUUID(),
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

    // Fetch the complete template with sections and questions
    const completeTemplate = await prisma.performanceTemplate.findUnique({
      where: { id: template.id },
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

    return NextResponse.json({ template: completeTemplate }, { status: 201 });
  } catch (error) {
    console.error("[templates-post]", error);
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
