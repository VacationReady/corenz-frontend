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
          .filter(
            (userId): userId is string =>
              typeof userId === "string" && userId.length > 0,
          );

        let removedEmployees = 0;
        let scrubbedUsers = 0;

        if (employeeIds.length) {
          const employeeScope = Prisma.sql`
            SELECT "id"
            FROM "Employee"
            WHERE "companyId" = ${companyId}
              AND ("userId" IS NULL OR "userId" <> ${currentUserId})
          `;

          const employeeScopedTargets: Array<{
            table: string;
            column?: string;
          }> = [
            { table: "DocumentSignatureArtifact" },
            { table: "DocumentSignatureEmployee" },
            { table: "DocumentSignatureField", column: '"assignedEmployeeId"' },
            { table: "DocumentAcknowledgement" },
            { table: "DriverLicence" },
            { table: "EmergencyContact" },
            { table: "EmployeeAuditLog" },
            { table: "EmployeeOffboarding" },
            { table: "EmployeePerformanceReview" },
            { table: "EmployeeWorkingPatternAssignment" },
            { table: "EmploymentCheck" },
            { table: "FormAssignment" },
            { table: "FormDataRecord" },
            { table: "FormSubmission" },
            { table: "SurveyRecipient" },
            { table: "SurveyResponse" },
            { table: "LeaveEntitlement" },
            { table: "LeaveRequest" },
            { table: "OnboardingInstance" },
            { table: "TrainingRecord" },
            { table: "TransactionalChangeRequest" },
            { table: "ActionItem", column: '"relatedEmployeeId"' },
          ];

          for (const { table, column = '"employeeId"' } of employeeScopedTargets) {
            await tx.$executeRaw(
              Prisma.sql`
                DELETE FROM ${Prisma.raw(`"${table}"`)}
                WHERE ${Prisma.raw(column)} IN (${employeeScope})
              `,
            );
          }
        }

        if (userIds.length) {
          const userScope = Prisma.sql`
            SELECT "userId"
            FROM "Employee"
            WHERE "companyId" = ${companyId}
              AND "userId" IS NOT NULL
              AND "userId" <> ${currentUserId}
          `;

          await tx.$executeRaw(
            Prisma.sql`
              DELETE FROM "LeaveRequest"
              WHERE "companyId" = ${companyId}
                AND (
                  "requesterId" IN (${userScope}) OR
                  "approvedById" IN (${userScope})
                )
            `,
          );

          const userScopedTargets: Array<{
            table: string;
            column?: string;
            extra?: Prisma.Sql;
          }> = [
            {
              table: "ActionItem",
              column: '"assignedToId"',
              extra: Prisma.sql`"companyId" = ${companyId}`,
            },
            { table: "ActivationToken" },
            { table: "NewsPost", column: '"authorId"' },
            { table: "NewsReaction" },
            { table: "NewsBookmark" },
          ];

          for (const { table, column = '"userId"', extra } of userScopedTargets) {
            const extraCondition = extra
              ? Prisma.sql`${extra} AND`
              : Prisma.sql``;

            await tx.$executeRaw(
              Prisma.sql`
                DELETE FROM ${Prisma.raw(`"${table}"`)}
                WHERE ${extraCondition} ${Prisma.raw(column)} IN (${userScope})
              `,
            );
          }

          await tx.$executeRaw(
            Prisma.sql`
              DELETE FROM "GlobalAuditLog"
              WHERE "companyId" = ${companyId}
                AND "actorId" IN (${userScope})
            `,
          );

          await tx.$executeRaw(
            Prisma.sql`
              DELETE FROM "Session"
              WHERE "userId" IN (${userScope})
            `,
          );

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

        const deletionResult = await tx.employee.deleteMany({
          where: { companyId, NOT: { userId: currentUserId } },
        });
        removedEmployees = deletionResult.count;

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
