import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json([], { status: 200 });
  const items = await prisma.genderOption.findMany({
    where: { companyId: session.user.companyId, active: true },
    orderBy: { order: "asc" },
    select: { id: true, key: true, label: true },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { key, label, order = 0, active = true } = await req.json();
  if (!key || !label) return NextResponse.json({ error: "key and label required" }, { status: 400 });
  const item = await prisma.genderOption.upsert({
    where: { companyId_key: { companyId: session.user.companyId, key } },
    update: { label, order, active },
    create: { companyId: session.user.companyId, key, label, order, active },
  } as any);
  return NextResponse.json(item);
}


