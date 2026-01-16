import { NextRequest, NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

const createSurveySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  formId: z.string(),
  deadline: z.string().optional().or(z.literal("")).transform((val) => {
    if (!val || val === "") return undefined;
    // Handle datetime-local format (YYYY-MM-DDTHH:mm) by converting to ISO string
    if (val && !val.includes('Z') && !val.includes('+') && !val.includes('-', 10)) {
      return new Date(val).toISOString();
    }
    return val;
  }).pipe(z.string().datetime().optional().or(z.undefined())),
  anonymizationLevel: z.enum(["public", "department", "location", "full"]).default("public"),
  targetAudience: z.object({
    departments: z.array(z.string()).optional(),
    jobRoles: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    roles: z.array(z.string()).optional(),
    employees: z.array(z.string()).optional(),
    excludedEmployees: z.array(z.string()).optional(),
    allEmployees: z.boolean().optional(),
  }).optional(),
});

async function getHandler(request: NextRequest) {
  try {
    const session = await getMobileSession(request);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const scope = searchParams.get("scope");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {
      companyId: session.user.companyId,
    };

    if (status) {
      where.status = status;
    }

    // Handle scope parameter for mobile app
    if ((scope === 'assigned' || scope === 'completed') && session.user.id) {
      // Get employee ID from user ID
      const employee = await prisma.employee.findFirst({
        where: { userId: session.user.id, companyId: session.user.companyId },
        select: { id: true },
      });

      if (employee) {
        if (scope === 'assigned') {
          // Get surveys assigned to this employee
          where.SurveyRecipients = {
            some: {
              employeeId: employee.id,
            },
          };
        } else if (scope === 'completed') {
          // Get surveys the employee has completed
          where.SurveyResponses = {
            some: {
              respondentId: employee.id,
            },
          };
        }
      }
    }

    const [surveys, total] = await Promise.all([
      prisma.survey.findMany({
        where,
        include: {
          Form: true,
          CreatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              SurveyRecipients: true,
              SurveyResponses: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.survey.count({ where }),
    ]);

    return NextResponse.json({
      surveys: surveys.map(survey => ({
        ...survey,
        totalRecipients: survey._count.SurveyRecipients,
        responses: survey._count.SurveyResponses,
        responseRate: survey._count.SurveyRecipients > 0 
          ? (survey._count.SurveyResponses / survey._count.SurveyRecipients) * 100 
          : 0,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching surveys:", error);
    return NextResponse.json(
      { error: "Failed to fetch surveys" },
      { status: 500 }
    );
  }
}

async function postHandler(request: NextRequest) {
  try {
    const session = await getMobileSession(request);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createSurveySchema.parse(body);

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

    const survey = await prisma.survey.create({
      data: {
        id: crypto.randomUUID(),
        name: validatedData.name,
        description: validatedData.description,
        formId: validatedData.formId,
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : null,
        companyId: session.user.companyId,
        createdById: session.user.id,
        metadata: {
          ...validatedData.targetAudience,
          anonymizationLevel: validatedData.anonymizationLevel,
        },
        updatedAt: new Date(),
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

    return NextResponse.json(survey, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Survey validation error:", error.errors);
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating survey:", error);
    return NextResponse.json(
      { error: "Failed to create survey" },
      { status: 500 }
    );
  }
}

// Apply feature guard
const surveysGuard = withFeatureGuard(FEATURE_KEYS.SURVEYS);
export const GET = surveysGuard(getHandler);
export const POST = surveysGuard(postHandler);
