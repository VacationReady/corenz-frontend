import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json([], { status: 200 });
  const items = await prisma.contractTypeOption.findMany({
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
  const created = await prisma.contractTypeOption.create({
    data: { companyId: session.user.companyId, label: body.label, order: body.order ?? 0 },
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  // Ensure update is constrained to the company
  const updated = await prisma.contractTypeOption.updateMany({
    where: { id: body.id, companyId: session.user.companyId },
    data: { label: body.label, order: body.order },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Refetch to return the updated record
  const item = await prisma.contractTypeOption.findFirst({ where: { id: body.id, companyId: session.user.companyId } });
  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  // Scope delete to the current company
  const result = await prisma.contractTypeOption.deleteMany({ where: { id: body.id, companyId: session.user.companyId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}


