import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendSurveyNotification } from "@/lib/email/surveyNotification";

const sendSurveySchema = z.object({
  targetAudience: z.object({
    departments: z.array(z.string()).optional(),
    jobRoles: z.array(z.string()).optional(),
    roles: z.array(z.string()).optional(),
    employees: z.array(z.string()).optional(),
    excludedEmployees: z.array(z.string()).optional(),
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
      const { departments, jobRoles, roles, employees, excludedEmployees, allEmployees } = validatedData.targetAudience;

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

      // Apply excluded employees filter
      if (excludedEmployees && excludedEmployees.length > 0) {
        employeeWhere.id = employeeWhere.id 
          ? { ...employeeWhere.id, notIn: excludedEmployees }
          : { notIn: excludedEmployees };
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
            firstName: true,
            lastName: true,
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
        metadata: {
          ...(survey.metadata || {}),
          ...validatedData.targetAudience,
        },
      },
    });

    // Send email notifications
    try {
      const emailRecipients = employees.map(emp => ({
        email: emp.User.email,
        name: `${emp.User.firstName || ''} ${emp.User.lastName || ''}`.trim(),
      }));

      await sendSurveyNotification({
        surveyName: survey.name,
        surveyDescription: survey.description || undefined,
        surveyId: survey.id,
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : null,
        recipients: emailRecipients,
      });

      console.log(`Survey notifications sent to ${emailRecipients.length} recipients`);
    } catch (emailError) {
      console.error("Failed to send survey notification emails:", emailError);
      // Don't fail the entire operation if emails fail
    }

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
