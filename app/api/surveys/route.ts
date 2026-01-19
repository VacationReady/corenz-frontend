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
    console.log('[surveys] Session:', { userId: session?.user?.id, companyId: session?.user?.companyId });
    
    if (!session?.user?.companyId) {
      console.error('[surveys] Unauthorized: No session or missing companyId');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const scope = searchParams.get("scope");
    console.log('[surveys] Query params:', { status, scope });
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {
      companyId: session.user.companyId,
    };

    if (status) {
      // Convert to uppercase to match SurveyStatus enum (DRAFT, ACTIVE, PAUSED)
      where.status = status.toUpperCase();
    }

    // Handle scope parameter for mobile app
    if ((scope === 'assigned' || scope === 'completed') && session.user.id) {
      // Get employee ID from user ID
      const employee = await prisma.employee.findFirst({
        where: { userId: session.user.id, companyId: session.user.companyId },
        select: { id: true },
      });

      console.log('[surveys] Employee lookup:', { userId: session.user.id, employeeId: employee?.id });

      if (!employee) {
        console.warn('[surveys] No employee found for user, returning empty surveys');
        return NextResponse.json({
          surveys: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0,
          },
        });
      }

      if (scope === 'assigned') {
        // Get surveys assigned to this employee that they haven't responded to yet
        where.SurveyRecipients = {
          some: {
            employeeId: employee.id,
            status: { in: ['PENDING', 'REMINDED'] },
          },
        };
      } else if (scope === 'completed') {
        // Get surveys the employee has completed
        where.SurveyResponses = {
          some: {
            employeeId: employee.id,
          },
        };
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
      surveys: surveys.map(survey => {
        const metadata = survey.metadata as any;
        const formSchema = survey.Form?.schema as any;
        
        // Normalize form schema to include questions array for mobile compatibility
        let normalizedSchema = formSchema;
        if (formSchema) {
          const questions: any[] = [];
          const sections = formSchema.sections || formSchema.pages || [formSchema];
          
          sections.forEach((section: any) => {
            const fields = section.fields || section.elements || [];
            fields.forEach((field: any) => {
              if (field.id) {
                questions.push({
                  id: field.id,
                  label: field.label || field.text || field.title,
                  text: field.label || field.text || field.title,
                  type: field.type,
                  required: field.required || false,
                  options: field.choices || field.options || field.values,
                  optionItems: field.optionItems, // Include optionItems for smiley face chips
                  max: field.max || field.rateMax,
                });
              }
            });
          });
          
          normalizedSchema = {
            ...formSchema,
            questions,
          };
        }
        
        return {
          id: survey.id,
          name: survey.name,
          title: survey.name,
          description: survey.description,
          type: survey.Form?.formType || 'SURVEY',
          status: survey.status.toLowerCase(),
          formSchema: normalizedSchema,
          startDate: survey.sentDate,
          sentDate: survey.sentDate,
          endDate: survey.deadline,
          deadline: survey.deadline,
          createdAt: survey.createdAt,
          anonymizationLevel: metadata?.anonymizationLevel || 'public',
          totalRecipients: survey._count.SurveyRecipients,
          responses: survey._count.SurveyResponses,
          responseRate: survey._count.SurveyRecipients > 0 
            ? (survey._count.SurveyResponses / survey._count.SurveyRecipients) * 100 
            : 0,
          Form: survey.Form ? {
            name: survey.Form.name,
            formType: survey.Form.formType,
          } : null,
          CreatedBy: survey.CreatedBy ? {
            name: survey.CreatedBy.name,
            email: survey.CreatedBy.email,
          } : null,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[surveys] Error fetching surveys:", error);
    console.error("[surveys] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: "Failed to fetch surveys", details: error instanceof Error ? error.message : String(error) },
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

// Apply feature guard only to POST (creation) - GET needs to work for mobile
const surveysGuard = withFeatureGuard(FEATURE_KEYS.SURVEYS);
export const GET = getHandler; // Mobile-compatible - uses getMobileSession internally
export const POST = surveysGuard(postHandler);
