import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET: List all forms for the company
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const forms = await prisma.form.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(forms);
}

// POST: Create a new form
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, schema, visibleToRoles, visibleToDepartments, visibleToJobRoles } = await req.json();

  if (!name || !schema) {
    return NextResponse.json({ error: "Name and schema are required" }, { status: 400 });
  }

  const slug = name.toLowerCase().replace(/\s+/g, '-');

const form = await prisma.form.create({
  data: {
    name,
    description,
    schema,
    companyId: session.user.companyId,
    visibleToRoles: visibleToRoles || ["ADMIN", "MANAGER", "EMPLOYEE"],
    visibleToDepartments: visibleToDepartments || [],
    visibleToJobRoles: visibleToJobRoles || [],
    slug, // ✅ required
  },
});

  return NextResponse.json(form, { status: 201 });
}
