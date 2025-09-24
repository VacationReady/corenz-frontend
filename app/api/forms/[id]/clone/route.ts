import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/forms";
import { Prisma } from "@prisma/client";

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const original = await prisma.form.findFirst({
    where: { id, companyId: session.user.companyId },
  });
  if (!original)
    return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const baseName = `${original.name} (Copy)`;
  const baseSlug = `${original.slug}-copy`;

  const uniqueSlug = await generateUniqueSlug(baseSlug, async (slug) => {
    const exists = await prisma.form.findFirst({
      where: { slug, companyId: session.user.companyId },
    });
    return Boolean(exists);
  });

  const cloned = await prisma.form.create({
    data: {
      id: crypto.randomUUID(),
      updatedAt: new Date(),
      name: baseName,
      slug: uniqueSlug,
      description: original.description,
      formType: original.formType,
      schema:
        original.schema === null
          ? Prisma.JsonNull
          : (original.schema as Prisma.InputJsonValue),
      companyId: original.companyId,
      visibleToRoles: original.visibleToRoles,
      visibleToDepartments: original.visibleToDepartments,
      visibleToJobRoles: original.visibleToJobRoles,
      isActive: original.isActive,
    },
  });

  return NextResponse.json(cloned, { status: 201 });
}
