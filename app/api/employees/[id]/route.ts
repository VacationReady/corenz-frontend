import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canAccessEmployee } from "@/lib/permissions";
import supabase from "@/lib/supabase-admin";

// ✅ GET employee profile by Employee.id (not User.id)
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const employee = await prisma.employee.findUnique({
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

    return NextResponse.json(employee);
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
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id, companyId: session.user.companyId },
      include: { User: true },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 },
      );
    }

    // Only ADMIN can delete employees
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const employeeId = employee.id;
    const userId = employee.userId;
    const companyId =
      employee.companyId ?? employee.User?.companyId ?? undefined;

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

      // Finally delete employee then user
      await tx.employee.delete({ where: { id: employeeId } });
      await tx.user.delete({ where: { id: userId } });

      return { deleted: true, pathsToRemove };
    });

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
