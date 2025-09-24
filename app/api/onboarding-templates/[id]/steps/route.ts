import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET: Fetch steps for a template
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify template belongs to company
    const { id } = await context.params;
    const template = await prisma.onboardingTemplate.findFirst({
      where: {
        id: id,
        companyId: session.user.companyId,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Onboarding template not found" },
        { status: 404 },
      );
    }

    const steps = await prisma.onboardingStep.findMany({
      where: {
        templateId: id,
      },
      include: {
        Document: {
          select: { id: true, name: true },
        },
        Form: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(steps);
  } catch (error) {
    console.error("Error fetching onboarding steps:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: Create a new step
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      type,
      label,
      order,
      documentId,
      uploadType,
      instruction,
      formId,
      taskOwnerId,
      trainingId,
      slaDays,
      dependencies = [],
      metadata,
    } = body;

    // Verify template belongs to company
    const { id } = await context.params;
    const template = await prisma.onboardingTemplate.findFirst({
      where: {
        id: id,
        companyId: session.user.companyId,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Onboarding template not found" },
        { status: 404 },
      );
    }

    // Validation
    if (!type || !label || order === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: type, label, order" },
        { status: 400 },
      );
    }

    // Validate document exists if provided
    if (documentId) {
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          companyId: session.user.companyId,
        },
      });
      if (!document) {
        return NextResponse.json(
          { error: "Invalid document ID" },
          { status: 400 },
        );
      }
    }

    // Validate form exists if provided
    if (formId) {
      const form = await prisma.form.findFirst({
        where: {
          id: formId,
          companyId: session.user.companyId,
        },
      });
      if (!form) {
        return NextResponse.json({ error: "Invalid form ID" }, { status: 400 });
      }
    }

    // Validate task owner exists if provided
    if (taskOwnerId) {
      const taskOwner = await prisma.user.findFirst({
        where: {
          id: taskOwnerId,
          companyId: session.user.companyId,
        },
      });
      if (!taskOwner) {
        return NextResponse.json(
          { error: "Invalid task owner ID" },
          { status: 400 },
        );
      }
    }

    // Validate dependencies exist if provided
    if (dependencies.length > 0) {
      const validDependencies = await prisma.onboardingStep.count({
        where: {
          id: { in: dependencies },
          templateId: params.id,
        },
      });
      if (validDependencies !== dependencies.length) {
        return NextResponse.json(
          { error: "One or more invalid dependency step IDs" },
          { status: 400 },
        );
      }
    }

    // Check for duplicate label in template
    const existingStep = await prisma.onboardingStep.findFirst({
      where: {
        templateId: id,
        label,
      },
    });

    if (existingStep) {
      return NextResponse.json(
        { error: "A step with this label already exists in the template" },
        { status: 400 },
      );
    }

    const step = await prisma.onboardingStep.create({
      data: {
        id: crypto.randomUUID(),
        templateId: id,
        type,
        label,
        order,
        documentId: documentId || null,
        uploadType: uploadType || null,
        instruction: instruction || null,
        formId: formId || null,
        taskOwnerId: taskOwnerId || null,
        trainingId: trainingId || null,
        slaDays: slaDays || null,
        dependencies,
        metadata: metadata || null,
      },
      include: {
        Document: {
          select: { id: true, name: true },
        },
        Form: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return NextResponse.json(step, { status: 201 });
  } catch (error) {
    console.error("Error creating onboarding step:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
