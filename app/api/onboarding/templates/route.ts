import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await prisma.onboardingTemplate.findMany({
    where: { companyId: session.user.companyId },
    include: {
      departments: { select: { id: true, name: true } },
      jobRoles: { select: { id: true, name: true } },
      steps: {
        orderBy: { order: "asc" },
        include: { document: { select: { id: true, name: true } } }
      }
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // body should have: name, description, departments (array of ids), jobRoles (array of ids)
    const { name, description, departments, jobRoles, steps } = body;

    const template = await prisma.onboardingTemplate.create({
  data: {
    name,
    description: description || "",
    companyId: session.user.companyId,
    departments: departments && departments.length > 0
      ? { connect: departments.map((id: string) => ({ id })) }
      : undefined,
    jobRoles: jobRoles && jobRoles.length > 0
      ? { connect: jobRoles.map((id: string) => ({ id })) }
      : undefined,
    steps: steps && steps.length > 0
      ? {
          create: steps.map((step: any, i: number) => ({
            type: step.type,
            title: step.title,
            description: step.description,
            order: i + 1,
            required: !!step.required,
            documentId: step.documentId || null,
            formFields: step.formFields || [],
            uploadType: step.uploadType || null,
          })),
        }
      : undefined,
  },
  include: {
    departments: { select: { id: true, name: true } },
    jobRoles: { select: { id: true, name: true } },
    steps: true,
  }
});

    return NextResponse.json(template);
  } catch (err) {
    console.error("Failed to create onboarding template", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, description, departments, jobRoles } = body;

    const template = await prisma.onboardingTemplate.update({
      where: { id },
      data: {
        name,
        description: description || "",
        departments: {
          set: [],
          connect: departments && departments.length > 0
            ? departments.map((id: string) => ({ id }))
            : [],
        },
        jobRoles: {
          set: [],
          connect: jobRoles && jobRoles.length > 0
            ? jobRoles.map((id: string) => ({ id }))
            : [],
        },
      },
      include: {
        departments: { select: { id: true, name: true } },
        jobRoles: { select: { id: true, name: true } },
        steps: true
      }
    });

    return NextResponse.json(template);
  } catch (err) {
    console.error("Failed to update onboarding template", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    // Delete all steps first (to avoid constraint issues), then the template itself
    await prisma.onboardingStep.deleteMany({ where: { templateId: id } });
    await prisma.onboardingTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete onboarding template", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
