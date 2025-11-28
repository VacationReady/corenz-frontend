"use server";

/**
 * Server Actions for Employee Management
 * 
 * Next.js 15 server actions for employee mutations.
 * These replace client-side API calls for better performance and security.
 * 
 * Related:
 * - Prompt 6: Paginated API implementation
 * - Prompt 7: Frontend pagination updates
 * - Prompt 8: Server-first architecture
 */

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";

/**
 * Delete an employee
 * Server action that replaces DELETE /api/employees/[id]
 * 
 * Uses a transaction to delete all related records before deleting the employee.
 * This mirrors the comprehensive delete logic in app/api/employees/[id]/route.ts
 */
export async function deleteEmployeeAction(employeeId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.companyId) {
    return { success: false, error: "Unauthorized" };
  }

  // Only ADMIN can delete employees
  if (session.user.role !== "ADMIN") {
    return { success: false, error: "Forbidden" };
  }

  try {
    // Verify employee belongs to company and get user data
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId: session.user.companyId,
      },
      include: { User: true },
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    const userId = employee.userId;
    const companyId = employee.companyId ?? employee.User?.companyId ?? undefined;

    // Use a transaction to delete all related records
    await prisma.$transaction(async (tx) => {
      // Onboarding instances and nested data
      await tx.onboardingStepResponse.deleteMany({
        where: {
          OnboardingStepInstance: { OnboardingInstance: { employeeId } },
        },
      });
      await tx.onboardingStepInstance.deleteMany({
        where: { OnboardingInstance: { employeeId } },
      });
      await tx.onboardingInstance.deleteMany({ where: { employeeId } });

      // Form related
      await tx.formDataRecord.deleteMany({ where: { employeeId } });
      await tx.formSubmission.deleteMany({ where: { employeeId } });
      await tx.formAssignment.deleteMany({ where: { employeeId } });

      // Employment and compliance
      await tx.documentAcknowledgement.deleteMany({ where: { employeeId } });
      await tx.employmentCheck.deleteMany({ where: { employeeId } });
      await tx.driverLicence.deleteMany({ where: { employeeId } });
      await tx.trainingRecord.deleteMany({ where: { employeeId } });
      await tx.emergencyContact.deleteMany({ where: { employeeId } });

      // Document signatures
      await tx.documentSignatureArtifact.deleteMany({ where: { employeeId } });
      await tx.documentSignatureEmployee.deleteMany({ where: { employeeId } });

      // Performance reviews
      await tx.employeePerformanceReview.deleteMany({ where: { employeeId } });

      // Audit logs (include records where this user acted on others)
      await tx.permissionAudit.deleteMany({
        where: {
          OR: [{ employeeId: userId }, { changedById: userId }],
        },
      });
      await tx.employeeAuditLog.deleteMany({
        where: {
          OR: [{ employeeId }, { changedById: userId }],
        },
      });
      await tx.personalInfoAudit.deleteMany({
        where: {
          OR: [{ subjectUserId: userId }, { changedById: userId }],
        },
      });
      await tx.globalAuditLog.deleteMany({ where: { actorId: userId } });
      await tx.employeePerformanceReview.updateMany({
        where: { reviewerId: userId },
        data: { reviewerId: null },
      });
      await tx.user.updateMany({ where: { managerId: userId }, data: { managerId: null } });

      // Leave
      await tx.leaveEntitlement.deleteMany({ where: { employeeId } });
      await tx.leaveRequest.deleteMany({
        where: {
          OR: [
            { employeeId },
            { requesterId: userId },
            { approvedById: userId },
          ],
        },
      });
      await tx.leaveApprovalDecision.deleteMany({ where: { approverId: userId } });

      // Offboarding (tasks cascade on offboarding delete)
      await tx.employeeOffboarding.deleteMany({ where: { employeeId } });

      // Documents: delete records (storage cleanup handled separately if needed)
      await tx.document.deleteMany({ where: { employeeId } });

      // Onboarding assignments for this user
      await tx.onboardingAssignment.deleteMany({ where: { userId } });

      // Activation token
      await tx.activationToken.deleteMany({ where: { userId } });

      // Saved reports and authored news posts
      await tx.savedReport.deleteMany({ where: { createdBy: userId } });
      await tx.newsPost.deleteMany({ where: { authorId: userId } });

      // Approvals configuration where user is an approver
      await tx.approvalWorkflowStageApprover.deleteMany({ where: { userId } });

      // Offboarding tasks assigned to / completed by this user across the company
      await tx.offboardingTask.updateMany({
        where: { assignedTo: userId },
        data: { assignedTo: null },
      });
      await tx.offboardingTask.updateMany({
        where: { completedBy: userId },
        data: { completedBy: null },
      });

      // Reassign documents uploaded by this user to a fallback user
      let fallbackUserId: string | undefined;
      if (companyId) {
        const fallbackAdmin = await tx.user.findFirst({
          where: { companyId, id: { not: userId }, role: "ADMIN" },
          select: { id: true },
        });
        if (fallbackAdmin) {
          fallbackUserId = fallbackAdmin.id;
        } else {
          const fallbackAny = await tx.user.findFirst({
            where: { companyId, id: { not: userId } },
            select: { id: true },
          });
          fallbackUserId = fallbackAny?.id;
        }
      }
      if (fallbackUserId) {
        await tx.document.updateMany({ where: { uploaderId: userId }, data: { uploaderId: fallbackUserId } });
      } else {
        await tx.document.deleteMany({ where: { uploaderId: userId, employeeId: null } });
      }

      // Department head ownership -> set to null
      await tx.department.updateMany({ where: { headId: userId }, data: { headId: null } });

      // Onboarding templates updatedBy -> set to null
      await tx.onboardingTemplate.updateMany({ where: { updatedById: userId }, data: { updatedById: null } });

      // Offboarding records where this user participated for other employees
      await tx.employeeOffboarding.updateMany({
        where: { accessRemovedBy: userId },
        data: { accessRemovedBy: null },
      });
      await tx.employeeOffboarding.updateMany({
        where: { assetsReturnedTo: userId },
        data: { assetsReturnedTo: null },
      });
      await tx.employeeOffboarding.updateMany({
        where: { handoverAssignedTo: userId },
        data: { handoverAssignedTo: null },
      });
      await tx.employeeOffboarding.updateMany({
        where: { hrReviewCompletedBy: userId },
        data: { hrReviewCompletedBy: null },
      });
      await tx.employeeOffboarding.updateMany({
        where: { interviewerUserId: userId },
        data: { interviewerUserId: null },
      });
      if (fallbackUserId) {
        await tx.employeeOffboarding.updateMany({
          where: { initiatedById: userId },
          data: { initiatedById: fallbackUserId },
        });
      }

      // Working pattern assignments
      await tx.employeeWorkingPatternAssignment.deleteMany({
        where: { employeeId },
      });

      // Finally delete employee then user
      await tx.employee.delete({ where: { id: employeeId } });
      await tx.user.delete({ where: { id: userId } });
    }, { timeout: 20000 });

    // Revalidate employees page
    revalidatePath("/employees");
    
    return { success: true };
  } catch (error) {
    console.error("[deleteEmployeeAction]", error);
    return { success: false, error: "Failed to delete employee" };
  }
}

/**
 * Send activation email to employee
 * Server action that sends activation email directly (no API call needed)
 */
export async function sendActivationEmailAction(employeeId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.companyId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Verify employee belongs to company and get user data
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId: session.user.companyId,
      },
      include: {
        User: true,
      },
    });

    if (!employee?.User) {
      return { success: false, error: "Employee not found" };
    }

    // Create or rotate activation token
    const activationToken = randomBytes(32).toString("hex");
    await prisma.activationToken.upsert({
      where: { userId: employee.User.id },
      update: { token: activationToken },
      create: { 
        id: crypto.randomUUID(), 
        userId: employee.User.id, 
        token: activationToken 
      },
    });

    // Build activation link
    const redirectPath = employee.onboardingTemplateId
      ? `/${employee.id}/onboarding`
      : `/dashboard`;
    const baseUrl = getAppBaseUrl();
    const activationLink = `${baseUrl}/activate?token=${activationToken}&companyId=${encodeURIComponent(
      session.user.companyId,
    )}&redirect=${encodeURIComponent(redirectPath)}`;

    // Get employee name for email
    const employeeName =
      `${employee.User.firstName ?? ""} ${employee.User.lastName ?? ""}`.trim() ||
      employee.User.email;

    // Render email template
    const { html, text } = renderPeopleCoreEmail({
      preheader: "Activate your PeopleCore account",
      title: "Activate Your PeopleCore Account",
      intro: [
        `Hi ${employeeName},`,
        "Welcome to PeopleCore! Use the button below to activate your account and get started.",
      ],
      ctas: {
        label: "Activate Account",
        href: activationLink,
      },
      outro: [
        "If you weren't expecting this email, please ignore it.",
        "Thank you,",
        "The PeopleCore Team",
      ],
    });

    // Send email via Resend
    await resend.emails.send({
      from: "noreply@peoplecore.co.nz",
      to: employee.User.email,
      subject: "Activate Your PeopleCore Account",
      html,
      text,
    });

    return { success: true };
  } catch (error) {
    console.error("[sendActivationEmailAction]", error);
    return { success: false, error: "Failed to send activation email" };
  }
}

/**
 * Refresh employees data
 * Revalidates the employees page cache
 */
export async function refreshEmployeesAction() {
  revalidatePath("/employees");
  return { success: true };
}
