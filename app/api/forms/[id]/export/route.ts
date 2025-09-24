import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await prisma.form.findFirst({
    where: { id, companyId: session.user.companyId },
  });
  if (!form)
    return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const payload = {
    name: form.name,
    slug: form.slug,
    description: form.description,
    formType: form.formType,
    schema: form.schema,
    audience: {
      visibleToRoles: form.visibleToRoles,
      visibleToDepartments: form.visibleToDepartments,
      visibleToJobRoles: form.visibleToJobRoles,
    },
  };

  return NextResponse.json(payload);
}
