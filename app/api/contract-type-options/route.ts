import { NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  await ensurePrismaConnected();
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.contractTypeOption.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { order: "asc" },
    select: { id: true, label: true },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  await ensurePrismaConnected();
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { label } = (await req.json()) as { label?: string };
  if (!label || !label.trim()) {
    return NextResponse.json({ error: "Label required" }, { status: 400 });
  }
  const created = await prisma.contractTypeOption.create({
    data: {
      id: crypto.randomUUID(),
      companyId: session.user.companyId,
      label: label.trim(),
    },
    select: { id: true, label: true },
  });
  return NextResponse.json(created);
}

export async function DELETE(req: Request) {
  await ensurePrismaConnected();
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const item = await prisma.contractTypeOption.findUnique({ where: { id } });
  if (!item || item.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.contractTypeOption.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

