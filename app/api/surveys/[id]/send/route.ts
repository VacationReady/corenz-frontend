import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const sendSurveySchema = z.object({
  targetAudience: z.object({
    departments: z.array(z.string()).optional(),
    jobRoles: z.array(z.string()).optional(),
    roles: z.array(z.string()).optional(),
    employees: z.array(z.string()).optional(),
    allEmployees: z.boolean().optional(),
  }).optional(),
  deadline: z.string().datetime().optional(),
  sendImmediately: z.boolean().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = sendSurveySchema.parse(body);

    // Verify survey exists and belongs to company
    const survey = await prisma.survey.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
        status: { in: ["DRAFT", "PAUSED"] },
      },
      include: {
        Form: true,
      },
    });

    if (!survey) {
      return NextResponse.json(
        { error: "Survey not found or cannot be sent" },
        { status: 404 }
      );
    }

    // Build employee query based on target audience
    const employeeWhere: any = {
      companyId: session.user.companyId,
      isActive: true,
    };

    if (validatedData.targetAudience) {
      const { departments, jobRoles, roles, employees, allEmployees } = validatedData.targetAudience;

      if (employees && employees.length > 0) {
        employeeWhere.id = { in: employees };
      } else if (!allEmployees) {
        const conditions = [];

        if (departments && departments.length > 0) {
          conditions.push({ departmentId: { in: departments } });
        }

        if (jobRoles && jobRoles.length > 0) {
          conditions.push({ jobRoleId: { in: jobRoles } });
        }

        if (roles && roles.length > 0) {
          conditions.push({ User: { role: { in: roles } } });
        }

        if (conditions.length > 0) {
          employeeWhere.OR = conditions;
        }
      }
    } else {
      // Default to all employees if no specific audience
      employeeWhere.User = { role: { not: "SUPER_ADMIN" } };
    }

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        User: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { error: "No employees found matching criteria" },
        { status: 400 }
      );
    }

    // Create action items for each employee
    const actionItems = await Promise.all(
      employees.map(async (employee) => {
        const actionItem = await prisma.actionItem.create({
          data: {
            id: crypto.randomUUID(),
            companyId: session.user.companyId,
            title: `Complete Survey: ${survey.name}`,
            description: survey.description || "Please complete this survey",
            type: "SURVEY",
            status: "PENDING",
            assignedToId: employee.userId,
            relatedEmployeeId: employee.id,
            dueDate: validatedData.deadline ? new Date(validatedData.deadline) : null,
            metadata: {
              surveyId: survey.id,
              formId: survey.formId,
              surveyName: survey.name,
              formSchema: survey.Form.schema,
            },
            updatedAt: new Date(),
          },
        });

        // Create survey recipient record
        await prisma.surveyRecipient.create({
          data: {
            id: crypto.randomUUID(),
            surveyId: survey.id,
            employeeId: employee.id,
            actionItemId: actionItem.id,
            status: "PENDING",
          },
        });

        return actionItem;
      })
    );

    // Update survey status and metadata
    const updatedSurvey = await prisma.survey.update({
      where: { id },
      data: {
        status: "ACTIVE",
        sentDate: new Date(),
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : null,
        totalRecipients: employees.length,
        metadata: validatedData.targetAudience,
      },
    });

    return NextResponse.json({
      survey: updatedSurvey,
      recipients: employees.length,
      actionItems: actionItems.length,
      message: `Survey sent to ${employees.length} employees`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error sending survey:", error);
    return NextResponse.json(
      { error: "Failed to send survey" },
      { status: 500 }
    );
  }
}
