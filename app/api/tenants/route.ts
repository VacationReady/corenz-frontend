import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import slugify from "slugify";
import { randomBytes, randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const MAIN_PRODUCTION_COMPANY_ID =
  process.env.NEXT_PUBLIC_MAIN_PRODUCTION_COMPANY_ID;

const createTenantSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(120),
  adminEmail: z.string().email("Enter a valid email address"),
  adminName: z.string().min(1, "Admin name is required").max(120),
});

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const homeCompanyId = session.user.homeCompanyId ?? session.user.companyId;
  const isSuperAdmin =
    session.user.role === "SUPER_ADMIN" &&
    (!MAIN_PRODUCTION_COMPANY_ID ||
      homeCompanyId === MAIN_PRODUCTION_COMPANY_ID);

  if (!isSuperAdmin) {
    return {
      error: NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      ),
    };
  }

  return { session, homeCompanyId };
}

export async function GET() {
  const { session, homeCompanyId, error } = await requireSuperAdmin();
  if (error) return error;
  if (!session || !homeCompanyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await prisma.company.findMany({
    select: { id: true, name: true, createdAt: true, updatedAt: true },
    orderBy: { name: "asc" },
  });

  const ordered = companies.slice().sort((a, b) => {
    if (a.id === homeCompanyId) return -1;
    if (b.id === homeCompanyId) return 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ companies: ordered });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSuperAdmin();
  if (error) return error;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { companyName, adminEmail, adminName } = parsed.data;
  const normalizedCompanyName = companyName.trim();

  const existingCompany = await prisma.company.findFirst({
    where: { name: normalizedCompanyName },
    select: { id: true },
  });

  if (existingCompany) {
    return NextResponse.json(
      { error: "A tenant with this company name already exists" },
      { status: 409 },
    );
  }

  const now = new Date();
  const cleanedCode = slugify(normalizedCompanyName, {
    lower: true,
    strict: true,
    trim: true,
  });
  const randomSuffix = randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  const companyCode = `${cleanedCode.slice(0, 12) || "tenant"}-${randomSuffix}`.toUpperCase();

  const [firstName, ...rest] = adminName.trim().split(/\s+/);
  const lastName = rest.length ? rest.join(" ") : null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          id: randomUUID(),
          name: normalizedCompanyName,
          code: companyCode,
          updatedAt: now,
        },
      });

      const department = await tx.department.create({
        data: {
          id: randomUUID(),
          name: "General",
          companyId: company.id,
          updatedAt: now,
        },
      });

      const adminPermissions = JSON.stringify({
        dashboard: ["read"],
        approvals: ["read", "edit"],
        employees: ["read", "edit", "delete"],
        calendar: ["read", "edit", "delete"],
        documents: ["read", "edit", "delete"],
        reports: ["read", "edit", "delete"],
        "org-chart": ["read"],
        news: ["read", "edit", "delete"],
        settings: ["read", "edit", "delete"],
        onboarding: ["read", "edit", "delete"],
        offboarding: ["read", "edit", "delete"],
        forms: ["read", "edit", "delete"],
        "leave-requests": ["read", "edit", "delete"],
        "working-patterns": ["read", "edit", "delete"],
        departments: ["read", "edit", "delete"],
        "job-roles": ["read", "edit", "delete"],
        permissions: ["read", "edit", "delete"],
        "employee-overview": ["read", "edit"],
        "employee-documents": ["read", "edit", "delete"],
        "employee-driver-licenses": ["read", "edit", "delete"],
        "employee-employment-checks": ["read", "edit", "delete"],
        "employee-forms": ["read", "edit", "delete"],
        "employee-leave": ["read", "edit"],
        "employee-offboarding": ["read", "edit"],
        "employee-onboarding": ["read", "edit", "delete"],
        "employee-performance": ["read", "edit"],
        "employee-settings": ["read", "edit"],
        "employee-training": ["read", "edit", "delete"],
      });

      const managerPermissions = JSON.stringify({
        dashboard: ["read"],
        employees: ["read", "edit"],
        calendar: ["read", "edit"],
        documents: ["read", "edit"],
        reports: ["read"],
        "org-chart": ["read"],
        news: ["read"],
        "leave-requests": ["read", "edit"],
        "working-patterns": ["read"],
        onboarding: ["read"],
        offboarding: ["read"],
        "employee-overview": ["read", "edit"],
        "employee-documents": ["read", "edit"],
        "employee-driver-licenses": ["read", "edit"],
        "employee-employment-checks": ["read", "edit"],
        "employee-forms": ["read", "edit"],
        "employee-leave": ["read", "edit"],
        "employee-offboarding": ["read"],
        "employee-onboarding": ["read", "edit"],
        "employee-performance": ["read", "edit"],
        "employee-settings": ["read"],
        "employee-training": ["read", "edit"],
      });

      const employeePermissions = JSON.stringify({
        dashboard: ["read"],
        calendar: ["read"],
        documents: ["read"],
        news: ["read"],
        "leave-requests": ["read", "edit"],
        onboarding: ["read"],
        "employee-overview": ["read"],
        "employee-documents": ["read"],
        "employee-forms": ["read"],
        "employee-leave": ["read", "edit"],
        "employee-training": ["read"],
      });

      const adminProfile = await tx.permissionProfile.create({
        data: {
          id: randomUUID(),
          companyId: company.id,
          name: "Admin",
          description: "Full system access with administrative privileges",
          permissions: adminPermissions,
          builtIn: true,
          updatedAt: now,
        },
      });

      await tx.permissionProfile.create({
        data: {
          id: randomUUID(),
          companyId: company.id,
          name: "Manager",
          description: "Management access with employee oversight capabilities",
          permissions: managerPermissions,
          builtIn: true,
          updatedAt: now,
        },
      });

      await tx.permissionProfile.create({
        data: {
          id: randomUUID(),
          companyId: company.id,
          name: "Employee",
          description: "Standard employee access to essential features",
          permissions: employeePermissions,
          builtIn: true,
          updatedAt: now,
        },
      });

      const adminUser = await tx.user.create({
        data: {
          id: randomUUID(),
          email: adminEmail.trim(),
          firstName: firstName || "Admin",
          lastName,
          name: adminName.trim(),
          role: "ADMIN",
          password: "",
          companyId: company.id,
          departmentId: department.id,
          permissionProfileId: adminProfile.id,
          updatedAt: now,
        },
      });

      await tx.employee.create({
        data: {
          id: randomUUID(),
          userId: adminUser.id,
          companyId: company.id,
          departmentId: department.id,
          isActive: true,
        },
      });

      const activationTokenValue = randomBytes(32).toString("hex");
      const activationToken = await tx.activationToken.create({
        data: {
          id: randomUUID(),
          token: activationTokenValue,
          userId: adminUser.id,
        },
      });

      return {
        company,
        adminUser,
        activationToken: activationToken.token,
      };
    });

    return NextResponse.json(
      {
        company: result.company,
        adminUser: {
          id: result.adminUser.id,
          email: result.adminUser.email,
          firstName: result.adminUser.firstName,
          lastName: result.adminUser.lastName,
        },
        activationToken: result.activationToken,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Failed to create tenant", err);
    return NextResponse.json(
      { error: "Failed to create tenant" },
      { status: 500 },
    );
  }
}
