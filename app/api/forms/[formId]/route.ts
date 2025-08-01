import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { formId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await prisma.form.findFirst({
    where: { id: params.formId, companyId: session.user.companyId },
  });

  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  return NextResponse.json(form);
}

export async function PUT(req: Request, { params }: { params: { formId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, schema, isActive } = await req.json();

  const updated = await prisma.form.update({
    where: { id: params.formId, companyId: session.user.companyId },
    data: { name, description, schema, isActive },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { formId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.form.delete({
    where: { id: params.formId, companyId: session.user.companyId },
  });

  return NextResponse.json({ message: "Form deleted" });
}
