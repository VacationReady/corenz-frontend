import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// Default categories that are always available
const DEFAULT_CATEGORIES = [
  "Contract",
  "Visa",
  "Right to Work",
  "Passport",
  "Training Certificate",
  "ID Document",
  "Policy",
  "Performance Review",
  "Other",
  "Uncategorised",
];

async function readCategories(companyId: string): Promise<string[]> {
  // Get company's custom categories
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { documentCategories: true },
  });
  const customCategories: string[] = Array.isArray(company?.documentCategories)
    ? (company.documentCategories as string[])
    : [];

  // Get distinct categories from existing documents
  const docs = await prisma.document.findMany({
    where: { companyId, category: { not: null } },
    distinct: ["category"],
    select: { category: true },
  });
  const fromDocs = docs
    .map((d) => d.category as string)
    .filter(Boolean)
    .map((c) => (c === "Uncategorized" ? "Uncategorised" : c));

  // Merge defaults + custom + from documents (deduplicated)
  return Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories, ...fromDocs]));
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) return NextResponse.json([], { status: 200 });
  const items = await readCategories(session.user.companyId);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name } = await req.json();
  const trimmed = String(name || "").trim();
  if (!trimmed) return NextResponse.json({ error: "Name required" }, { status: 400 });

  // Get current custom categories
  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { documentCategories: true },
  });
  const existing: string[] = Array.isArray(company?.documentCategories)
    ? (company.documentCategories as string[])
    : [];

  // Check for duplicates (including defaults)
  const allCategories = await readCategories(session.user.companyId);
  if (allCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    return NextResponse.json({ error: "Category already exists" }, { status: 400 });
  }

  // Add new category
  await prisma.company.update({
    where: { id: session.user.companyId },
    data: { documentCategories: [...existing, trimmed] },
  });

  return NextResponse.json({ ok: true, name: trimmed });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name } = await req.json();
  const trimmed = String(name || "").trim();
  if (!trimmed) return NextResponse.json({ error: "Name required" }, { status: 400 });

  // Prevent deleting default categories
  if (DEFAULT_CATEGORIES.includes(trimmed)) {
    return NextResponse.json({ error: "Cannot delete default category" }, { status: 400 });
  }

  // Check if category has any documents (cascade check)
  const documentCount = await prisma.document.count({
    where: {
      companyId: session.user.companyId,
      category: trimmed,
    },
  });

  if (documentCount > 0) {
    return NextResponse.json(
      { 
        error: `Cannot delete category: ${documentCount} document(s) are using this category. Please reassign or delete these documents first.`,
        documentCount 
      },
      { status: 400 }
    );
  }

  // Get current custom categories and remove the specified one
  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { documentCategories: true },
  });
  const existing: string[] = Array.isArray(company?.documentCategories)
    ? (company.documentCategories as string[])
    : [];

  const updated = existing.filter((c) => c !== trimmed);
  await prisma.company.update({
    where: { id: session.user.companyId },
    data: { documentCategories: updated },
  });

  return NextResponse.json({ ok: true });
}


