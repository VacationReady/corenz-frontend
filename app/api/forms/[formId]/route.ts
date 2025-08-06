import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET a single form by ID
export async function GET(_: Request, { params }: { params: { formId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await prisma.form.findFirst({
    where: { id: params.formId, companyId: session.user.companyId },
  });

  if (!form)
    return NextResponse.json({ error: "Form not found" }, { status: 404 });

  return NextResponse.json(form);
}

// UPDATE a form
export async function PUT(req: Request, { params }: { params: { formId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    name,
    slug,
    description,
    formType,
    schema,
    isActive,
    visibleToRoles,
    visibleToDepartments,
    visibleToJobRoles,
  } = await req.json();

  // Validate slug format if provided
  if (slug) {
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: "Slug can only contain lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    // Check for duplicate name or slug (excluding current form)
    const existingForm = await prisma.form.findFirst({
      where: {
        companyId: session.user.companyId,
        id: { not: params.formId },
        OR: [{ name }, { slug }],
      },
    });

    if (existingForm) {
      if (existingForm.name === name) {
        return NextResponse.json(
          { error: "A form with this name already exists" },
          { status: 400 }
        );
      }
      if (existingForm.slug === slug) {
        return NextResponse.json(
          { error: "A form with this path already exists" },
          { status: 400 }
        );
      }
    }
  }

  const updateData: any = { name, slug, description, formType, schema, isActive };

  if (visibleToRoles !== undefined) updateData.visibleToRoles = visibleToRoles;
  if (visibleToDepartments !== undefined) updateData.visibleToDepartments = visibleToDepartments;
  if (visibleToJobRoles !== undefined) updateData.visibleToJobRoles = visibleToJobRoles;

  const updated = await prisma.form.update({
    where: { id: params.formId, companyId: session.user.companyId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

// DELETE a form
export async function DELETE(_: Request, { params }: { params: { formId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.form.delete({
    where: { id: params.formId, companyId: session.user.companyId },
  });

  return NextResponse.json({ message: "Form deleted" });
}
