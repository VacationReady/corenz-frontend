import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// ✅ GET: List all forms for the company (with optional type filtering)
export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Support filtering by form type (e.g., ?type=SURVEY or ?type=FORM,TABLE)
  const { searchParams } = new URL(req.url);
  const typeParam = searchParams.get("type");

  const whereClause: any = { companyId: session.user.companyId };

  if (typeParam) {
    const types = typeParam.split(",").map(t => t.trim());
    whereClause.formType = types.length === 1 ? types[0] : { in: types };
  }

  const forms = await prisma.form.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(forms);
}

// ✅ POST: Create a new form
export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    name,
    slug: providedSlug,
    description,
    formType,
    schema,
    visibleToRoles,
    visibleToDepartments,
    visibleToJobRoles,
    autoSave,
  } = await req.json();

  // Validate required fields
  if (!name || !schema) {
    return NextResponse.json(
      { error: "Name and schema are required" },
      { status: 400 },
    );
  }

  // Generate slug from name if not provided
  const slug =
    providedSlug ||
    name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

  // Validate slug format
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return NextResponse.json(
      {
        error: "Slug can only contain lowercase letters, numbers, and hyphens",
      },
      { status: 400 },
    );
  }

  // Check for duplicate name or slug
  const existingForm = await prisma.form.findFirst({
    where: {
      companyId: session.user.companyId,
      OR: [{ name }, { slug }],
    },
  });

  if (existingForm) {
    if (existingForm.name === name) {
      return NextResponse.json(
        { error: "A form with this name already exists" },
        { status: 400 },
      );
    }
    if (existingForm.slug === slug) {
      return NextResponse.json(
        { error: "A form with this path already exists" },
        { status: 400 },
      );
    }
  }

  // Debug logging for visibility settings
  console.log("DEBUG: Creating form with visibility settings:", {
    name,
    formType: formType || "FORM",
    visibleToRoles: visibleToRoles || ["ADMIN", "MANAGER", "EMPLOYEE"],
    visibleToDepartments: visibleToDepartments || [],
    visibleToJobRoles: visibleToJobRoles || [],
    autoSave: autoSave || false,
  });

  // Create form
  const form = await prisma.form.create({
    data: {
      id: crypto.randomUUID(),
      updatedAt: new Date(),
      name,
      slug,
      description,
      formType: formType || "FORM",
      schema,
      companyId: session.user.companyId,
      visibleToRoles: visibleToRoles || ["ADMIN", "MANAGER", "EMPLOYEE"],
      visibleToDepartments: visibleToDepartments || [],
      visibleToJobRoles: visibleToJobRoles || [],
      autoSave: autoSave || false,
    },
  });

  console.log("DEBUG: Form created successfully with ID:", form.id);

  return NextResponse.json(form, { status: 201 });
}

