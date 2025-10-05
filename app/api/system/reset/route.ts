import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { Prisma, Role } from "@prisma/client";

const RESET_EMAIL_DOMAIN = "reset.peoplecore.invalid";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = session.user.role as Role | undefined;
  const isPrivileged =
    userRole === Role.ADMIN ||
    userRole === Role.SUPER_ADMIN ||
    Boolean(session.user.canManageTenants);

  if (!isPrivileged) {
    return NextResponse.json(
      { error: "Only administrators can reset company data." },
      { status: 403 },
    );
  }

  const companyId = session.user.companyId;
  const currentUserId = session.user.id;

  try {
    const summary = await prisma.$transaction(async (tx) => {
      const employees = await tx.employee.findMany({
        where: {
          companyId,
          NOT: { userId: currentUserId },
        },
        select: { id: true, userId: true },
      });

      const employeeIds = employees.map((emp) => emp.id);
      const userIds = employees.map((emp) => emp.userId);

      if (employeeIds.length) {
        await Promise.all([
          tx.documentSignatureArtifact.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.documentSignatureEmployee.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.documentSignatureField.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.documentAcknowledgement.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.driverLicence.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.emergencyContact.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.employeeAuditLog.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.employeeOffboarding.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.employeePerformanceReview.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.employeeWorkingPatternAssignment.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.employmentCheck.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.formAssignment.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.formDataRecord.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.formSubmission.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.surveyRecipient.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.surveyResponse.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.leaveEntitlement.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.leaveRequest.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.onboardingInstance.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.trainingRecord.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.transactionalChangeRequest.deleteMany({
            where: { employeeId: { in: employeeIds } },
          }),
          tx.actionItem.deleteMany({
            where: { relatedEmployeeId: { in: employeeIds } },
          }),
        ]);
      }

      if (userIds.length) {
        const userScopedTasks = [
          tx.leaveRequest.deleteMany({
            where: {
              companyId,
              OR: [
                { requesterId: { in: userIds } },
                { approvedById: { in: userIds } },
              ],
            },
          }),
          tx.actionItem.deleteMany({
            where: {
              companyId,
              assignedToId: { in: userIds },
            },
          }),
          tx.activationToken.deleteMany({ where: { userId: { in: userIds } } }),
          tx.newsPost.deleteMany({ where: { authorId: { in: userIds } } }),
          tx.newsReaction.deleteMany({ where: { userId: { in: userIds } } }),
          tx.newsBookmark.deleteMany({ where: { userId: { in: userIds } } }),
          tx.globalAuditLog.deleteMany({
            where: { companyId, actorId: { in: userIds } },
          }),
          tx.user.updateMany({
            where: { id: { in: userIds } },
            data: { role: Role.EMPLOYEE, canManageTenants: false },
          }),
        ];

        await Promise.all(userScopedTasks);

        try {
          await tx.$executeRaw(
            Prisma.sql`DELETE FROM "Session" WHERE "userId" IN (${Prisma.join(
              userIds,
            )})`,
          );
        } catch (error) {
          console.warn("Failed to remove persisted sessions during reset", error);
        }
      }

      const { count: removedEmployees } = await tx.employee.deleteMany({
        where: { id: { in: employeeIds } },
      });

      for (const userId of userIds) {
        const placeholderEmail = `${userId}@${RESET_EMAIL_DOMAIN}`;
        await tx.user.update({
          where: { id: userId },
          data: {
            email: placeholderEmail,
            firstName: "Deleted",
            lastName: "User",
            phone: null,
            managerId: null,
            permissionProfileId: null,
            departmentId: null,
            jobRoleId: null,
            genderOptionId: null,
            isActivated: false,
            role: Role.EMPLOYEE,
            canManageTenants: false,
          },
        });
      }

      const departments = await tx.department.deleteMany({ where: { companyId } });
      const jobRoles = await tx.jobRole.deleteMany({ where: { companyId } });
      const workingPatterns = await tx.workingPattern.deleteMany({
        where: { companyId },
      });
      const genderOptions = await tx.genderOption.deleteMany({
        where: { companyId },
      });
      const eventRuleOverrides = await tx.eventRuleOverride.deleteMany({
        where: { companyId },
      });
      const eventRules = await tx.eventRule.deleteMany({ where: { companyId } });
      const eventCategories = await tx.eventCategory.deleteMany({
        where: { companyId, systemDefined: false },
      });

      return {
        removedEmployees,
        scrubbedUsers: userIds.length,
        removedDepartments: departments.count,
        removedJobRoles: jobRoles.count,
        removedWorkingPatterns: workingPatterns.count,
        removedGenderOptions: genderOptions.count,
        removedEventCategories: eventCategories.count,
        removedEventRules: eventRules.count + eventRuleOverrides.count,
      } as const;
    });

    await auditLog({
      entityId: companyId,
      entityType: "COMPANY",
      action: "RESET",
      actorId: currentUserId,
      actorType: "USER",
      summary: `Company data reset by ${session.user.email ?? currentUserId}`,
      metadata: summary,
    });

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("Failed to reset company data", error);
    return NextResponse.json(
      {
        error:
          "We couldn't reset the data. Please try again or contact support if the issue persists.",
      },
      { status: 500 },
    );
  }
}
