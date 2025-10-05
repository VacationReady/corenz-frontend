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
    const summary = await prisma.$transaction(
      async (tx) => {
        // Helpers to safely batch large IN() deletes/updates to avoid parameter/lock issues
        const chunk = <T,>(items: T[], size = 100) => {
          const result: T[][] = [];
          for (let i = 0; i < items.length; i += size) {
            result.push(items.slice(i, i + size));
          }
          return result;
        };

        const runInChunks = async <T>(
          ids: T[],
          handler: (batch: T[]) => Promise<unknown>,
        ) => {
          for (const batch of chunk(ids)) {
            if (!batch.length) continue;
            await handler(batch);
          }
        };

        // Gather all employees in this company except the current user
        const employees = await tx.employee.findMany({
          where: {
            companyId,
            NOT: { userId: currentUserId },
          },
          select: { id: true, userId: true },
        });

        const employeeIds = employees.map((emp) => emp.id);
        const userIds = employees
          .map((emp) => emp.userId)
          .filter((userId): userId is string => typeof userId === "string" && userId.length > 0);

        // Wipe all employee-scoped data in safe chunks
        if (employeeIds.length) {
          const employeeScopedDeletions: Array<
            (ids: string[]) => Promise<unknown>
          > = [
            (ids) =>
              tx.documentSignatureArtifact.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.documentSignatureEmployee.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.documentSignatureField.deleteMany({
                where: { assignedEmployeeId: { in: ids } },
              }),
            (ids) =>
              tx.documentAcknowledgement.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.driverLicence.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.emergencyContact.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.employeeAuditLog.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.employeeOffboarding.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.employeePerformanceReview.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.employeeWorkingPatternAssignment.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.employmentCheck.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.formAssignment.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.formDataRecord.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.formSubmission.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.surveyRecipient.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.surveyResponse.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.leaveEntitlement.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.leaveRequest.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.onboardingInstance.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.trainingRecord.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.transactionalChangeRequest.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.actionItem.deleteMany({
                where: { relatedEmployeeId: { in: ids } },
              }),
          ];

          for (const deleteOperation of employeeScopedDeletions) {
            await runInChunks(employeeIds, deleteOperation);
          }
        }

        // Wipe user-scoped data for those employees (requests they made, tokens, sessions, etc.)
        let scrubbedUsers = 0;

        if (userIds.length) {
          const userScopedOperations: Array<
            (ids: string[]) => Promise<unknown>
          > = [
            (ids) =>
              tx.leaveRequest.deleteMany({
                where: {
                  companyId,
                  OR: [
                    { requesterId: { in: ids } },
                    { approvedById: { in: ids } },
                  ],
                },
              }),
            (ids) =>
              tx.actionItem.deleteMany({
                where: {
                  companyId,
                  assignedToId: { in: ids },
                },
              }),
            (ids) =>
              tx.activationToken.deleteMany({ where: { userId: { in: ids } } }),
            (ids) => tx.newsPost.deleteMany({ where: { authorId: { in: ids } } }),
            (ids) =>
              tx.newsReaction.deleteMany({ where: { userId: { in: ids } } }),
            (ids) =>
              tx.newsBookmark.deleteMany({ where: { userId: { in: ids } } }),
            (ids) =>
              tx.globalAuditLog.deleteMany({
                where: { companyId, actorId: { in: ids } },
              }),
            // We'll set role/canManageTenants as part of the bulk scrub below.
          ];

          for (const operation of userScopedOperations) {
            await runInChunks(userIds, operation);
          }

          // Explicitly clear Sessions in chunks using raw SQL (NextAuth sessions)
          for (const batch of chunk(userIds)) {
            if (!batch.length) continue;
            try {
              await tx.$executeRaw(
                Prisma.sql`DELETE FROM "Session" WHERE "userId" IN (${Prisma.join(
                  batch,
                )})`,
              );
            } catch (error) {
              console.warn(
                "Failed to remove persisted sessions during reset",
                error,
              );
            }
          }

          // Bulk-scrub users with a single UPDATE using id-derived placeholder email.
          const userScope = Prisma.sql`${Prisma.join(userIds)}`;
          const placeholderSuffix = `@${RESET_EMAIL_DOMAIN}`;
          const scrubbed = await tx.$queryRaw<Array<{ count: bigint }>>(
            Prisma.sql`
              SELECT COUNT(*)::int AS count
              FROM (
                UPDATE "User"
                SET
                  "email" = "id" || ${placeholderSuffix},
                  "firstName" = 'Deleted',
                  "lastName" = 'User',
                  "phone" = NULL,
                  "managerId" = NULL,
                  "permissionProfileId" = NULL,
                  "departmentId" = NULL,
                  "jobRoleId" = NULL,
                  "genderOptionId" = NULL,
                  "isActivated" = FALSE,
                  "role" = ${Role.EMPLOYEE},
                  "canManageTenants" = FALSE,
                  "updatedAt" = NOW()
                WHERE "id" IN (${userScope})
                RETURNING 1
              ) AS updated
            `,
          );
          scrubbedUsers = Number(scrubbed[0]?.count ?? 0);
        }

        // Remove employees themselves (excluding the current user)
        const { count: removedEmployees } = await tx.employee.deleteMany({
          where: { companyId, NOT: { userId: currentUserId } },
        });

        // Company-level reference data
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
          scrubbedUsers,
          removedDepartments: departments.count,
          removedJobRoles: jobRoles.count,
          removedWorkingPatterns: workingPatterns.count,
          removedGenderOptions: genderOptions.count,
          removedEventCategories: eventCategories.count,
          removedEventRules: eventRules.count + eventRuleOverrides.count,
        } as const;
      },
      {
        maxWait: 5_000,
        timeout: 60_000,
      },
    );

    const resetActor = session.user.email ?? currentUserId;

    await auditLog({
      entityId: companyId,
      entityType: "COMPANY",
      action: "RESET",
      actorId: currentUserId,
      actorType: "USER",
      summary: `Company data reset by ${resetActor}`,
      metadata: {
        resetBy: resetActor,
        ...summary,
      },
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
