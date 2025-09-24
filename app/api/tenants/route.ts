import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import slugify from "slugify";
import { randomBytes, randomUUID } from "crypto";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";

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

    // Attempt to send activation email to the tenant admin
    try {
      const appBaseUrl = getAppBaseUrl();
      const redirectPath = "/dashboard";
      const activationLink = `${appBaseUrl}/activate?token=${result.activationToken}&redirect=${encodeURIComponent(redirectPath)}`;
      const { html, text } = renderPeopleCoreEmail({
        preheader: `Activate your PeopleCore account`,
        title: "You're invited to PeopleCore",
        intro: [
          `Welcome to your new PeopleCore space for ${result.company.name}.`,
          `Click the button below to activate your admin account and set a password.`,
        ],
        cta: {
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
      console.warn("[tenants][POST] Failed to send activation email:", e);
    }

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

// DELETE a tenant and all associated data by companyId
const deleteTenantSchema = z.object({
  companyId: z.string().min(1, "companyId is required"),
  confirm: z.string().optional(),
});

export async function DELETE(req: NextRequest) {
  const { session, homeCompanyId, error } = await requireSuperAdmin();
  if (error) return error;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof deleteTenantSchema>;
  try {
    parsed = deleteTenantSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { companyId } = parsed;

  // Safety rails: do not allow deleting your own home tenant or main production tenant
  if (homeCompanyId && companyId === homeCompanyId) {
    return NextResponse.json(
      { error: "Refusing to delete your home tenant" },
      { status: 400 },
    );
  }
  if (
    process.env.NEXT_PUBLIC_MAIN_PRODUCTION_COMPANY_ID &&
    companyId === process.env.NEXT_PUBLIC_MAIN_PRODUCTION_COMPANY_ID
  ) {
    return NextResponse.json(
      { error: "Refusing to delete main production tenant" },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const users = await tx.user.findMany({
        where: { companyId },
        select: { id: true },
      });
      const userIds = users.map((u) => u.id);

      const employees = await tx.employee.findMany({
        where: { companyId },
        select: { id: true },
      });
      const employeeIds = employees.map((e) => e.id);

      const documents = await tx.document.findMany({
        where: { companyId },
        select: { id: true },
      });
      const documentIds = documents.map((d) => d.id);

      // Email/news/notifications
      await tx.newsReaction.deleteMany({ where: { companyId } });
      await tx.newsBookmark.deleteMany({ where: { companyId } });
      await tx.newsPost.deleteMany({ where: { companyId } });
      await tx.transactionalNotificationPreference.deleteMany({ where: { companyId } });
      await tx.notificationChannel.deleteMany({ where: { companyId } });
      await tx.notificationSettings.deleteMany({ where: { companyId } });

      // Approvals and leave
      await tx.approvalWorkflow.deleteMany({ where: { companyId } });
      await tx.leaveRequest.deleteMany({ where: { companyId } });
      await tx.leavePolicyAssignment.deleteMany({ where: { companyId } });
      await tx.leavePolicy.deleteMany({ where: { companyId } });
      await tx.leaveEntitlement.deleteMany({ where: { companyId } });

      // Events and rules
      await tx.eventRuleOverride.deleteMany({ where: { companyId } });
      await tx.eventRule.deleteMany({ where: { companyId } });
      await tx.eventSubcategory.deleteMany({ where: { companyId } });
      await tx.eventCategory.deleteMany({ where: { companyId } });

      // Forms
      await tx.formAssignment.deleteMany({
        where: {
          OR: [
            { Employee: { companyId } },
            { Form: { companyId } },
          ],
        },
      });
      await tx.formSubmission.deleteMany({
        where: {
          OR: [
            { Employee: { companyId } },
            { Form: { companyId } },
          ],
        },
      });
      await tx.formDataRecord.deleteMany({
        where: {
          OR: [
            { Employee: { companyId } },
            { Form: { companyId } },
          ],
        },
      });
      await tx.form.deleteMany({ where: { companyId } });

      // Onboarding
      await tx.onboardingStepResponse.deleteMany({
        where: { OnboardingStepInstance: { OnboardingInstance: { Employee: { companyId } } } },
      });
      await tx.onboardingStepInstance.deleteMany({
        where: { OnboardingInstance: { Employee: { companyId } } },
      });
      await tx.onboardingInstance.deleteMany({ where: { Employee: { companyId } } });
      await tx.onboardingAssignment.deleteMany({ where: { User: { companyId } } });
      await tx.onboardingStep.deleteMany({ where: { OnboardingTemplate: { companyId } } });
      await tx.onboardingTemplate.deleteMany({ where: { companyId } });

      // Documents and signatures
      if (documentIds.length) {
        await tx.documentSignatureArtifact.deleteMany({ where: { documentId: { in: documentIds } } });
      }
      await tx.documentSignatureDepartment.deleteMany({ where: { Document: { companyId } } });
      await tx.documentSignatureJobRole.deleteMany({ where: { Document: { companyId } } });
      await tx.documentSignatureEmployee.deleteMany({ where: { Document: { companyId } } });
      await tx.documentSignatureField.deleteMany({ where: { Document: { companyId } } });
      await tx.documentAcknowledgement.deleteMany({
        where: {
          OR: [
            { Document: { companyId } },
            { Employee: { companyId } },
          ],
        },
      });
      await tx.trainingRecord.deleteMany({ where: { Employee: { companyId } } });
      await tx.driverLicence.deleteMany({ where: { Employee: { companyId } } });
      await tx.employmentCheck.deleteMany({ where: { Employee: { companyId } } });
      await tx.document.deleteMany({ where: { companyId } });

      // HR core
      await tx.employeePerformanceReview.deleteMany({ where: { companyId } });
      await tx.employeeAuditLog.deleteMany({ where: { companyId } });
      await tx.permissionAudit.deleteMany({
        where: {
          OR: [
            { User_PermissionAudit_changedByIdToUser: { companyId } },
            { User_PermissionAudit_employeeIdToUser: { companyId } },
          ],
        },
      });
      await tx.globalAuditLog.deleteMany({ where: { companyId } });
      await tx.savedReport.deleteMany({ where: { companyId } });

      // Automation
      await tx.automationExecution.deleteMany({ where: { companyId } });
      await tx.automationJob.deleteMany({ where: { companyId } });
      await tx.automationRule.deleteMany({ where: { companyId } });

      // Options/config
      await tx.genderOption.deleteMany({ where: { companyId } });
      await tx.contractTypeOption.deleteMany({ where: { companyId } });
      await tx.employmentTypeOption.deleteMany({ where: { companyId } });
      await tx.notificationSettings.deleteMany({ where: { companyId } });
      await tx.brandingConfiguration.deleteMany({ where: { companyId } });
      await tx.scimConfiguration.deleteMany({ where: { companyId } });
      await tx.ssoConfiguration.deleteMany({ where: { companyId } });
      await tx.transactionalNotificationPreference.deleteMany({ where: { companyId } });
      await tx.location.deleteMany({ where: { companyId } });
      await tx.trainingProvider.deleteMany({ where: { companyId } });
      await tx.course.deleteMany({ where: { companyId } });
      await tx.expiryRule.deleteMany({ where: { companyId } });

      // Working patterns
      await tx.workingPattern.deleteMany({ where: { companyId } });

      // Relationships to roles/structures
      await tx.jobRole.deleteMany({ where: { companyId } });
      await tx.department.deleteMany({ where: { companyId } });

      // Users and tokens
      if (userIds.length) {
        await tx.activationToken.deleteMany({ where: { userId: { in: userIds } } });
      }
      await tx.user.deleteMany({ where: { companyId } });
      await tx.permissionProfile.deleteMany({ where: { companyId } });

      // Employees last (after dependents cleared)
      await tx.employee.deleteMany({ where: { companyId } });

      // Finally, the company
      await tx.company.delete({ where: { id: companyId } });
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[tenants][DELETE] Failed to delete tenant:", e);
    return NextResponse.json(
      { error: "Failed to delete tenant. See server logs for details." },
      { status: 500 },
    );
  }
}
