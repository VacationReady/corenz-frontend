import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import slugify from "slugify";
import { randomBytes, randomUUID } from "crypto";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";
import { seedTenantReferenceData } from "@/lib/tenant-seed";

const COOKIE_NAME = "tenant_admin_session";

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  return session?.value === "authenticated";
}

const createTenantSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(120),
  adminEmail: z.string().email("Enter a valid email address"),
  adminName: z.string().min(1, "Admin name is required").max(120),
});

export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            User: true,
            Employee: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const serialized = companies.map((company) => ({
      id: company.id,
      name: company.name,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
      userCount: company._count.User,
      employeeCount: company._count.Employee,
    }));

    return NextResponse.json({ companies: serialized });
  } catch (error) {
    console.error("Tenant admin - fetch tenants error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createTenantSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { companyName, adminEmail, adminName } = parsed.data;
    const normalizedCompanyName = companyName.trim();

    // Check if admin email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: adminEmail.trim(), mode: "insensitive" } as any },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: "Admin email is already in use in another tenant" },
        { status: 409 }
      );
    }

    // Check if company name already exists
    const existingCompany = await prisma.company.findFirst({
      where: { name: normalizedCompanyName },
    });

    if (existingCompany) {
      return NextResponse.json(
        { error: "A tenant with this company name already exists" },
        { status: 409 }
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

    // Create tenant with full seeding
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

      // Seed essential reference data for new tenant
      await seedTenantReferenceData(tx, company.id);

      return {
        company,
        adminUser,
        activationToken: activationToken.token,
      };
    });

    // Send activation email to the tenant admin
    try {
      const appBaseUrl = getAppBaseUrl();
      const redirectPath = "/dashboard";
      const activationLink = `${appBaseUrl}/activate?token=${result.activationToken}&companyId=${encodeURIComponent(
        result.company.id,
      )}&redirect=${encodeURIComponent(redirectPath)}`;
      
      const { html, text } = renderPeopleCoreEmail({
        preheader: `Activate your PeopleCore account`,
        title: "You're invited to PeopleCore",
        intro: [
          `Welcome to your new PeopleCore space for ${result.company.name}.`,
          `Click the button below to activate your admin account and set a password.`,
        ],
        ctas: {
          label: "Activate your account",
          href: activationLink,
        },
        outro: [
          `If you didn't expect this, please ignore this email.`,
        ],
      });
      
      await resend.emails.send({
        from: "noreply@peoplecore.co.nz",
        to: result.adminUser.email,
        subject: "Activate your PeopleCore admin account",
        html,
        text,
      });
    } catch (e) {
      console.warn("[tenant-admin] Failed to send activation email:", e);
    }

    return NextResponse.json({
      id: result.company.id,
      name: result.company.name,
      createdAt: result.company.createdAt.toISOString(),
      updatedAt: result.company.updatedAt.toISOString(),
      adminEmail: result.adminUser.email,
      activationToken: result.activationToken,
      userCount: 1,
      employeeCount: 1,
    }, { status: 201 });
  } catch (error) {
    console.error("Tenant admin - create tenant error:", error);
    return NextResponse.json(
      { error: "Failed to create tenant" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    // Delete the company (cascade deletes will handle related records)
    await prisma.company.delete({
      where: { id: companyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tenant admin - delete tenant error:", error);
    return NextResponse.json(
      { error: "Failed to delete tenant" },
      { status: 500 }
    );
  }
}
