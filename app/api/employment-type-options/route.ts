import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json([], { status: 200 });
  const items = await prisma.employmentTypeOption.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const created = await prisma.employmentTypeOption.create({
    data: { companyId: session.user.companyId, label: body.label, order: body.order ?? 0 },
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const updated = await prisma.employmentTypeOption.update({
    where: { id: body.id },
    data: { label: body.label, order: body.order },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  await prisma.employmentTypeOption.delete({ where: { id: body.id } });
  return NextResponse.json({ ok: true });
}


