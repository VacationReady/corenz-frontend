import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/forms";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, slug, description, formType, schema, audience } = body || {};

  if (!name || !schema) {
    return NextResponse.json(
      { error: "Name and schema are required" },
      { status: 400 },
    );
  }

  const baseSlug = (slug || name)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const uniqueSlug = await generateUniqueSlug(baseSlug, async (candidate) => {
    const exists = await prisma.form.findFirst({
      where: { slug: candidate, companyId: session.user.companyId },
    });
    return Boolean(exists);
  });

  const created = await prisma.form.create({
    data: {
      name,
      slug: uniqueSlug,
      description,
      formType: formType || "SUBMISSION",
      schema,
      companyId: session.user.companyId,
      visibleToRoles: audience?.visibleToRoles || [
        "ADMIN",
        "MANAGER",
        "EMPLOYEE",
      ],
      visibleToDepartments: audience?.visibleToDepartments || [],
      visibleToJobRoles: audience?.visibleToJobRoles || [],
    },
  });

  return NextResponse.json(created, { status: 201 });
}
