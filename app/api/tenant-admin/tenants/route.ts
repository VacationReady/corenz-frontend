import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import slugify from "slugify";
import { randomBytes, randomUUID } from "crypto";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";
import { seedTenantReferenceData } from "@/lib/tenant-seed";
import { verifySignedToken, TENANT_ADMIN_COOKIE_NAME } from "@/lib/tenant-admin-auth";

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(TENANT_ADMIN_COOKIE_NAME);
  if (!session?.value) return false;
  const { valid } = verifySignedToken(session.value);
  return valid;
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

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Delete all related records in the correct order within a transaction
    // Many relations don't have onDelete: Cascade, so we must delete manually
    await prisma.$transaction(async (tx) => {
      // Delete user-related records first (depends on User)
      await tx.activationToken.deleteMany({ where: { User: { companyId } } });
      await tx.newsBookmark.deleteMany({ where: { companyId } });
      await tx.newsReaction.deleteMany({ where: { companyId } });
      
      // Delete tenant switch tokens
      await tx.tenantSwitchToken.deleteMany({ where: { companyId } });

      // Delete approval workflow related records
      await tx.leaveApprovalDecision.deleteMany({ where: { stage: { leaveRequest: { companyId } } } });
      await tx.leaveApprovalStage.deleteMany({ where: { leaveRequest: { companyId } } });
      await tx.approvalWorkflowStageApprover.deleteMany({ where: { stage: { workflow: { companyId } } } });
      await tx.approvalWorkflowStage.deleteMany({ where: { workflow: { companyId } } });
      await tx.approvalWorkflow.deleteMany({ where: { companyId } });

      // Delete leave-related records
      await tx.leaveRequest.deleteMany({ where: { companyId } });
      await tx.leaveEntitlement.deleteMany({ where: { companyId } });
      await tx.leavePolicyAssignment.deleteMany({ where: { companyId } });
      await tx.leavePolicy.deleteMany({ where: { companyId } });

      // Delete onboarding related records
      await tx.onboardingReminder.deleteMany({ where: { companyId } });
      await tx.onboardingStepAuditLog.deleteMany({ where: { companyId } });
      await tx.onboardingTemplateTelemetryEvent.deleteMany({ where: { companyId } });
      await tx.onboardingStepResponse.deleteMany({ where: { OnboardingStepInstance: { OnboardingInstance: { Employee: { companyId } } } } });
      await tx.onboardingStepInstance.deleteMany({ where: { OnboardingInstance: { Employee: { companyId } } } });
      await tx.onboardingInstance.deleteMany({ where: { Employee: { companyId } } });
      await tx.templateStepVersion.deleteMany({ where: { TemplateVersion: { companyId } } });
      await tx.onboardingStep.deleteMany({ where: { OnboardingTemplate: { companyId } } });
      await tx.templateVersion.deleteMany({ where: { companyId } });
      await tx.onboardingTemplate.deleteMany({ where: { companyId } });

      // Delete employee offboarding records
      await tx.offboardingTask.deleteMany({ where: { EmployeeOffboarding: { Employee: { companyId } } } });
      await tx.employeeOffboarding.deleteMany({ where: { Employee: { companyId } } });
      await tx.exitInterviewFormTemplate.deleteMany({ where: { companyId } });

      // Delete document related records
      await tx.documentAcknowledgement.deleteMany({ where: { Document: { companyId } } });
      await tx.documentSignatureArtifact.deleteMany({ where: { Document: { companyId } } });
      await tx.documentSignatureDepartment.deleteMany({ where: { Document: { companyId } } });
      await tx.documentSignatureJobRole.deleteMany({ where: { Document: { companyId } } });
      await tx.documentSignatureEmployee.deleteMany({ where: { Document: { companyId } } });
      await tx.documentSignatureField.deleteMany({ where: { Document: { companyId } } });
      await tx.document.deleteMany({ where: { companyId } });

      // Delete form related records
      await tx.formSubmission.deleteMany({ where: { Form: { companyId } } });
      await tx.formAssignment.deleteMany({ where: { Form: { companyId } } });
      await tx.formDataRecord.deleteMany({ where: { Form: { companyId } } });
      await tx.form.deleteMany({ where: { companyId } });

      // Delete survey related records
      await tx.surveyResponse.deleteMany({ where: { Survey: { companyId } } });
      await tx.surveyRecipient.deleteMany({ where: { Survey: { companyId } } });
      await tx.survey.deleteMany({ where: { companyId } });
      await tx.surveyAutomation.deleteMany({ where: { companyId } });

      // Delete training related records
      await tx.trainingRecord.deleteMany({ where: { Employee: { companyId } } });
      await tx.course.deleteMany({ where: { companyId } });
      await tx.trainingProvider.deleteMany({ where: { companyId } });

      // Delete news records
      await tx.newsPost.deleteMany({ where: { companyId } });

      // Delete automation records
      await tx.automationExecution.deleteMany({ where: { companyId } });
      await tx.automationJob.deleteMany({ where: { companyId } });
      await tx.automationRule.deleteMany({ where: { companyId } });

      // Delete event related records
      await tx.eventRule.deleteMany({ where: { companyId } });
      await tx.eventRuleOverride.deleteMany({ where: { companyId } });
      await tx.eventSubcategory.deleteMany({ where: { companyId } });
      await tx.eventCategory.deleteMany({ where: { companyId } });
      await tx.expiryRule.deleteMany({ where: { companyId } });
      await tx.blackoutDate.deleteMany({ where: { companyId } });

      // Delete saved reports
      await tx.reportSendHistory.deleteMany({ where: { companyId } });
      await tx.savedReport.deleteMany({ where: { companyId } });

      // Delete working pattern records (must delete assignments first due to FK constraint)
      await tx.employeeWorkingPatternAssignment.deleteMany({ where: { WorkingPattern: { companyId } } });
      await tx.workingPatternDay.deleteMany({ where: { WorkingPatternWeek: { WorkingPattern: { companyId } } } });
      await tx.workingPatternWeek.deleteMany({ where: { WorkingPattern: { companyId } } });
      await tx.workingPattern.deleteMany({ where: { companyId } });

      // Delete notification records
      await tx.transactionalNotificationPreference.deleteMany({ where: { companyId } });
      await tx.transactionalChangeRequest.deleteMany({ where: { companyId } });
      await tx.notificationChannel.deleteMany({ where: { companyId } });
      await tx.notificationSettings.deleteMany({ where: { companyId } });

      // Delete performance management records
      await tx.reviewSubmission.deleteMany({ where: { Cycle: { companyId } } });
      await tx.cycleInsight.deleteMany({ where: { Cycle: { companyId } } });
      await tx.cycleParticipant.deleteMany({ where: { Cycle: { companyId } } });
      await tx.performanceReviewCycle.deleteMany({ where: { companyId } });
      await tx.meetingActionItem.deleteMany({ where: { Meeting: { companyId } } });
      await tx.meetingAgendaItem.deleteMany({ where: { Meeting: { companyId } } });
      await tx.performanceMeeting.deleteMany({ where: { companyId } });
      await tx.performanceTemplateQuestion.deleteMany({ where: { Section: { Template: { companyId } } } });
      await tx.performanceTemplateSection.deleteMany({ where: { Template: { companyId } } });
      await tx.performanceTemplate.deleteMany({ where: { companyId } });
      await tx.performanceNotificationRule.deleteMany({ where: { companyId } });
      await tx.employeePerformanceReview.deleteMany({ where: { companyId } });

      // Delete personal objectives
      await tx.personalObjectiveComment.deleteMany({ where: { Objective: { companyId } } });
      await tx.personalObjectiveMilestone.deleteMany({ where: { Objective: { companyId } } });
      await tx.personalObjectiveUpdate.deleteMany({ where: { Objective: { companyId } } });
      await tx.personalObjective.deleteMany({ where: { companyId } });

      // Delete action items
      await tx.actionItem.deleteMany({ where: { companyId } });

      // Delete journey related records
      await tx.journeyComment.deleteMany({ where: { journeyTemplate: { companyId } } });
      await tx.journeyCollaborator.deleteMany({ where: { journeyTemplate: { companyId } } });
      await tx.journeyVersion.deleteMany({ where: { journeyTemplate: { companyId } } });
      await tx.journeyInstance.deleteMany({ where: { journeyTemplate: { companyId } } });
      await tx.journeyPhase.deleteMany({ where: { journeyTemplate: { companyId } } });
      await tx.journeyTemplate.deleteMany({ where: { companyId } });

      // Delete persona profiles
      await tx.personaProfile.deleteMany({ where: { companyId } });

      // Delete company objectives
      await tx.companyObjective.deleteMany({ where: { companyId } });

      // Delete shift/rota records
      await tx.shiftSwapRequest.deleteMany({ where: { Shift: { companyId } } });
      await tx.shiftRequirement.deleteMany({ where: { RotaGroup: { companyId } } });
      await tx.shift.deleteMany({ where: { companyId } });
      await tx.shiftTemplate.deleteMany({ where: { companyId } });
      await tx.rotaGroupMember.deleteMany({ where: { RotaGroup: { companyId } } });
      await tx.rotaGroup.deleteMany({ where: { companyId } });

      // Delete availability/scheduling records
      await tx.availabilityPattern.deleteMany({ where: { companyId } });
      await tx.availabilityException.deleteMany({ where: { companyId } });
      await tx.scheduleConflict.deleteMany({ where: { companyId } });

      // Delete timesheet and payroll records
      await tx.breakRecord.deleteMany({ where: { companyId } });
      await tx.timesheetEntryAudit.deleteMany({ where: { companyId } });
      await tx.timesheetApprovalDecision.deleteMany({ where: { Stage: { Timesheet: { companyId } } } });
      await tx.timesheetApprovalStage.deleteMany({ where: { Timesheet: { companyId } } });
      await tx.timesheetEntry.deleteMany({ where: { Timesheet: { companyId } } });
      await tx.clockEntry.deleteMany({ where: { companyId } });
      await tx.timesheet.deleteMany({ where: { companyId } });
      await tx.overtimeAuditLog.deleteMany({ where: { companyId } });
      await tx.payrollCalculation.deleteMany({ where: { companyId } });
      await tx.payrollExport.deleteMany({ where: { companyId } });

      // Delete audit logs
      await tx.globalAuditLog.deleteMany({ where: { companyId } });
      await tx.employeeAuditLog.deleteMany({ where: { companyId } });
      await tx.personalInfoAudit.deleteMany({ where: { companyId } });
      await tx.permissionAudit.deleteMany({ where: { Employee: { companyId } } });

      // Delete SSO and SCIM configuration
      await tx.sCIMConfiguration.deleteMany({ where: { companyId } });
      await tx.sSOConfiguration.deleteMany({ where: { companyId } });

      // Delete branding configuration
      await tx.brandingConfiguration.deleteMany({ where: { companyId } });

      // Delete reference data options
      await tx.contractTypeOption.deleteMany({ where: { companyId } });
      await tx.employmentTypeOption.deleteMany({ where: { companyId } });
      await tx.genderOption.deleteMany({ where: { companyId } });

      // Delete employee-related records that reference Employee (before deleting Employee)
      await tx.driverLicence.deleteMany({ where: { Employee: { companyId } } });
      await tx.emergencyContact.deleteMany({ where: { Employee: { companyId } } });
      await tx.employmentCheck.deleteMany({ where: { Employee: { companyId } } });

      // Delete employee records (must be before User and Department)
      await tx.employee.deleteMany({ where: { companyId } });

      // Clear department head references before deleting users (circular reference)
      await tx.department.updateMany({ 
        where: { companyId },
        data: { headId: null }
      });
      
      // Delete users (after Employee since Employee references User)
      await tx.user.deleteMany({ where: { companyId } });

      // Delete permission profiles (after User since User references PermissionProfile)
      await tx.permissionProfile.deleteMany({ where: { companyId } });

      // Delete job roles
      await tx.jobRole.deleteMany({ where: { companyId } });

      // Delete departments (after User and Employee)
      await tx.department.deleteMany({ where: { companyId } });

      // Finally delete the company
      await tx.company.delete({ where: { id: companyId } });
    }, {
      timeout: 120000, // 120 second timeout for large tenants with lots of data
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
