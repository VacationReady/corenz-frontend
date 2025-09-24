import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").optional(),
  description: z.string().optional(),
  schemaJson: z
    .record(z.any())
    .refine((schema) => {
      return (
        schema && typeof schema === "object" && Array.isArray(schema.fields)
      );
    }, "Invalid form schema")
    .optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin/manager role
    if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    const template = await prisma.exitInterviewFormTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            EmployeeOffboarding: true,
            ExitInterviewSubmission: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching exit interview template:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch template",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin/manager role
    if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateTemplateSchema.parse(body);

    // Check if template exists
    const existingTemplate = await prisma.exitInterviewFormTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    const template = await prisma.exitInterviewFormTemplate.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        isActive: template.isActive,
        updatedAt: template.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating exit interview template:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to update template",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin/manager role
    if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    // Check if template exists and get usage count
    const template = await prisma.exitInterviewFormTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            EmployeeOffboarding: true,
            ExitInterviewSubmission: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    // Check if template is in use
    if (
      template._count.EmployeeOffboarding > 0 ||
      template._count.ExitInterviewSubmission > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot delete template that is in use. Deactivate it instead.",
        },
        { status: 400 },
      );
    }

    await prisma.exitInterviewFormTemplate.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting exit interview template:", error);
    return NextResponse.json(
      {
        error: "Failed to delete template",
      },
      { status: 500 },
    );
  }
}
