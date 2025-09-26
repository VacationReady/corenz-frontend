import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// Simple string list stored on Company.extraDocumentCategories (JSON) or fallback to distinct Document.category

async function readCategories(companyId: string): Promise<string[]> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { extraDocumentCategories: true },
  });
  const extra = (company?.extraDocumentCategories as any) || [];
  const docs = await prisma.document.findMany({
    where: { companyId, category: { not: null } },
    distinct: ["category"],
    select: { category: true },
  });
  const fromDocs = docs.map((d) => d.category as string).filter(Boolean);
  return Array.from(new Set(["Contract","Visa","Right to Work","Passport","Training Certificate","ID Document","Policy","Performance Review","Other", ...extra, ...fromDocs]));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json([], { status: 200 });
  const items = await readCategories(session.user.companyId);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name } = await req.json();
  const trimmed = String(name || "").trim();
  if (!trimmed) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const company = await prisma.company.findUnique({ where: { id: session.user.companyId }, select: { extraDocumentCategories: true } });
  const extra = ((company?.extraDocumentCategories as any) || []) as string[];
  if (!extra.includes(trimmed)) extra.push(trimmed);
  await prisma.company.update({ where: { id: session.user.companyId }, data: { extraDocumentCategories: extra as any } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name } = await req.json();
  const trimmed = String(name || "").trim();
  const company = await prisma.company.findUnique({ where: { id: session.user.companyId }, select: { extraDocumentCategories: true } });
  const extra = ((company?.extraDocumentCategories as any) || []) as string[];
  const next = extra.filter((x) => x !== trimmed);
  await prisma.company.update({ where: { id: session.user.companyId }, data: { extraDocumentCategories: next as any } });
  return NextResponse.json({ ok: true });
}


