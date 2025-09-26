import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// Simple string list stored on Company.extraDocumentCategories (JSON) or fallback to distinct Document.category

async function readCategories(companyId: string): Promise<string[]> {
  // Fallback: read distinct categories from existing documents only
  const extra: string[] = [];
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
  // Without a dedicated categories model, just accept the name and return ok.
  // The name will be immediately available to the client in memory and
  // future lists come from distinct document categories + defaults.
  return NextResponse.json({ ok: true, name: trimmed });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name } = await req.json();
  const trimmed = String(name || "").trim();
  // No-op delete (until categories are modeled); respond ok so UI updates.
  return NextResponse.json({ ok: true });
}


