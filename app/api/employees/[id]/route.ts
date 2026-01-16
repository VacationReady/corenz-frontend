import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileSession } from "@/lib/mobile-session";
import { canAccessEmployee, hasPermission, UserWithProfile } from "@/lib/permissions";
import supabase from "@/lib/supabase-admin";
import { getSignedProfileUrl } from "@/lib/storage/signProfiles";

// ✅ GET employee profile by Employee.id (not User.id)
// Supports both web (NextAuth cookies) and mobile (JWT token) authentication
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    // Use getMobileSession which supports both web cookies and mobile JWT tokens
    const session = await getMobileSession(req);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id, // ✅ Use Employee.id for matching
        companyId: session.user.companyId,
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            dateOfBirth: true,
            profileImageUrl: true,
            pronouns: true,
            addressStreet: true,
            addressCity: true,
            addressPostcode: true,
            addressCountry: true,
            genderOptionId: true,
            nationalId: true,
          },
        },
        Department: { select: { id: true, name: true } },
        JobRole: { select: { id: true, name: true } },
        LeaveEntitlement: true,
        LeaveRequest: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 },
      );
    }

    // Access control: ADMIN has access; MANAGER can only access self or direct reports
    const allowed = await canAccessEmployee(
      {
        id: session.user.id,
        role: session.user.role as any,
        companyId: session.user.companyId,
      },
      id,
    );
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    // Sign profile image URL if present
    let signedProfileImageUrl: string | null = null;
    if (employee.User.profileImageUrl) {
      signedProfileImageUrl = await getSignedProfileUrl(employee.User.profileImageUrl);
    }

    // Return employee with signed profile URL
    return NextResponse.json({
      ...employee,
      User: {
        ...employee.User,
        profileImageUrl: signedProfileImageUrl,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching employee:",
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
    );
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 },
    );
  }
}

// ✅ DELETE employee by Employee.id
// Supports both web (NextAuth cookies) and mobile (JWT token) authentication
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    // Use getMobileSession which supports both web cookies and mobile JWT tokens
    const session = await getMobileSession(req);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const employee = await prisma.employee.findFirst({
      where: { id, companyId: session.user.companyId },
      include: { User: true },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 },
      );
    }

    // ✅ FIX: Check permission profiles for delete operations, not just role
    // This ensures custom permission profiles that restrict delete access are respected
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { PermissionProfile: true },
    });

    const userWithProfile: UserWithProfile = currentUser ? {
      ...currentUser,
      permissionProfile: currentUser.PermissionProfile,
    } : {
      id: session.user.id,
      role: session.user.role,
      companyId: session.user.companyId,
    } as UserWithProfile;

    // Check if user has "employees" delete permission via their permission profile
    // Note: hasPermission() already handles ADMIN/SUPER_ADMIN override internally
    if (!hasPermission(userWithProfile, "employees", "delete")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: insufficient permissions to delete employees" },
        { status: 403 },
      );
    }

    // 🔒 Bug Fix 2.2: Prevent self-deletion
    // Users should not be able to delete their own employee record
    if (employee.userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own employee record" },
        { status: 400 },
      );
    }

    // 🔒 Bug Fix 2.2: Prevent deletion of the last admin
    // Ensure at least one admin remains in the company
    if (employee.User?.role === "ADMIN" || employee.User?.role === "SUPER_ADMIN") {
      const adminCount = await prisma.user.count({
        where: { 
          companyId: session.user.companyId, 
          role: { in: ["ADMIN", "SUPER_ADMIN"] },
          id: { not: employee.userId },
        },
      });
      if (adminCount === 0) {
        return NextResponse.json(
          { success: false, error: "Cannot delete the last admin user in the company" },
          { status: 400 },
        );
      }
    }

    const employeeId = employee.id;
    const userId = employee.userId;
    const companyId =
      employee.companyId ?? employee.User?.companyId ?? undefined;

    // Extend interactive transaction timeout to handle many cascading deletes
    const transactionResult = await prisma.$transaction(async (tx) => {
      const pathsToRemove: string[] = [];

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
      await tx.leaveBalanceLedger.deleteMany({ where: { employeeId } });
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

      // Documents: delete only those attached to this employee
      const employeeDocs = await tx.document.findMany({
        where: { employeeId },
        select: { path: true },
      });
      if (employeeDocs.length) {
        pathsToRemove.push(...employeeDocs.map((doc) => doc.path));
      }
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

      // Reassign documents uploaded by this user to a fallback user (prefer ADMIN; otherwise any other user in the company). If no companyId
      // could be determined, still try to find any other user to take ownership; else delete company-level docs.
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
        // Reassign ALL documents uploaded by this user (both employee-attached and company-level)
        await tx.document.updateMany({ where: { uploaderId: userId }, data: { uploaderId: fallbackUserId } });
      } else {
        // As a last resort, delete company-level docs by this user (we already removed employee-specific docs above)
        const companyDocs = await tx.document.findMany({
          where: { uploaderId: userId, employeeId: null },
          select: { path: true },
        });
        if (companyDocs.length) pathsToRemove.push(...companyDocs.map((d) => d.path));
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

      // Time tracking & scheduling (ClockEntry, Timesheet, Shift, etc.)
      // First delete payroll calculations (has onDelete: Restrict)
      await tx.payrollCalculation.deleteMany({ where: { employeeId } });
      // Delete overtime audit logs for this employee
      await tx.overtimeAuditLog.deleteMany({ where: { employeeId } });
      // Delete timesheet entry audits where this employee is subject or changer
      await tx.timesheetEntryAudit.deleteMany({
        where: {
          OR: [{ employeeId }, { changedById: employeeId }],
        },
      });
      // Delete break records
      await tx.breakRecord.deleteMany({ where: { employeeId } });
      // Delete clock entries
      await tx.clockEntry.deleteMany({ where: { employeeId } });
      // Delete timesheets (both owned and approved by)
      await tx.timesheet.deleteMany({ where: { employeeId } });
      await tx.timesheet.updateMany({
        where: { approvedBy: employeeId },
        data: { approvedBy: null },
      });
      // Unassign shifts (optional relation)
      await tx.shift.updateMany({
        where: { employeeId },
        data: { employeeId: null },
      });
      // Availability patterns and exceptions
      await tx.availabilityPattern.deleteMany({ where: { employeeId } });
      await tx.availabilityException.deleteMany({ where: { employeeId } });
      // Schedule conflicts
      await tx.scheduleConflict.deleteMany({ where: { employeeId } });
      // Compliance violations
      await tx.complianceViolation.deleteMany({ where: { employeeId } });

      // Surveys
      await tx.surveyRecipient.deleteMany({ where: { employeeId } });
      await tx.surveyResponse.deleteMany({ where: { employeeId } });

      // Transactional change requests
      await tx.transactionalChangeRequest.deleteMany({ where: { employeeId } });

      // Action items (optional relation - set to null)
      await tx.actionItem.updateMany({
        where: { relatedEmployeeId: employeeId },
        data: { relatedEmployeeId: null },
      });

      // Journey instances
      await tx.journeyInstance.deleteMany({ where: { participantId: employeeId } });

      // Document signature fields (optional relation - set to null)
      await tx.documentSignatureField.updateMany({
        where: { assignedEmployeeId: employeeId },
        data: { assignedEmployeeId: null },
      });

      // Expiry notification logs (has cascade but ensure cleanup)
      await tx.expiryNotificationLog.deleteMany({ where: { employeeId } });

      // Rota group memberships (has cascade but ensure cleanup)
      await tx.rotaGroupMember.deleteMany({ where: { employeeId } });

      // Finally delete employee then user
      await tx.employee.delete({ where: { id: employeeId } });
      await tx.user.delete({ where: { id: userId } });

      return { deleted: true, pathsToRemove };
    }, { timeout: 30000 });

    const { pathsToRemove, ...result } = transactionResult;
    const uniquePaths = Array.from(
      new Set(pathsToRemove.filter((path): path is string => Boolean(path))),
    );

    if (uniquePaths.length) {
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove(uniquePaths);
      if (storageError) {
        console.error("Supabase remove error:", storageError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to delete associated document files.",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error(
      "Error deleting employee:",
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
    );
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 },
    );
  }
}
