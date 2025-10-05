import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { Prisma, Role } from "@prisma/client";

const RESET_EMAIL_DOMAIN = "reset.peoplecore.invalid";
const CHUNK_SIZE = 200;

const chunkValues = <T>(values: readonly T[], chunkSize: number): T[][] => {
  if (values.length === 0) {
    return [];
  }

  const result: T[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    result.push(values.slice(index, index + chunkSize));
  }

  return result;
};

const runChunked = async <T>(
  values: readonly T[],
  chunkSize: number,
  handler: (chunk: T[]) => Promise<void>,
) => {
  const chunks = chunkValues(values, chunkSize);
  for (const chunk of chunks) {
    if (chunk.length > 0) {
      await handler(chunk);
    }
  }
};

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

        const employeeIds = Array.from(new Set(employees.map((emp) => emp.id)));
        const userIds = Array.from(
          new Set(
            employees
              .map((emp) => emp.userId)
              .filter(
                (userId): userId is string =>
                  typeof userId === "string" && userId.length > 0,
              ),
          ),
        );

        let removedEmployees = 0;
        let scrubbedUsers = 0;

        if (employeeIds.length) {
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.documentSignatureArtifact.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.documentSignatureEmployee.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.documentSignatureField.deleteMany({
              where: { assignedEmployeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.documentAcknowledgement.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.driverLicence.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.emergencyContact.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.employeeAuditLog.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.employeeOffboarding.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.employeePerformanceReview.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.employeeWorkingPatternAssignment.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.employmentCheck.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.formAssignment.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.formDataRecord.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.formSubmission.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.surveyRecipient.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.surveyResponse.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.leaveEntitlement.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.leaveRequest.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.onboardingInstance.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.trainingRecord.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.transactionalChangeRequest.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.actionItem.deleteMany({
              where: { relatedEmployeeId: { in: chunk } },
            });
          });
          await runChunked(employeeIds, CHUNK_SIZE, async (chunk) => {
            await tx.document.deleteMany({
              where: { employeeId: { in: chunk } },
            });
          });
        }

        if (userIds.length) {
          await runChunked(userIds, CHUNK_SIZE, async (chunk) => {
            await tx.leaveRequest.deleteMany({
              where: {
                companyId,
                OR: [
                  { requesterId: { in: chunk } },
                  { approvedById: { in: chunk } },
                ],
              },
            });
          });
          await runChunked(userIds, CHUNK_SIZE, async (chunk) => {
            await tx.actionItem.deleteMany({
              where: { companyId, assignedToId: { in: chunk } },
            });
          });
          await runChunked(userIds, CHUNK_SIZE, async (chunk) => {
            await tx.activationToken.deleteMany({
              where: { userId: { in: chunk } },
            });
          });
          await runChunked(userIds, CHUNK_SIZE, async (chunk) => {
            await tx.newsPost.deleteMany({
              where: { authorId: { in: chunk } },
            });
          });
          await runChunked(userIds, CHUNK_SIZE, async (chunk) => {
            await tx.newsReaction.deleteMany({
              where: { userId: { in: chunk } },
            });
          });
          await runChunked(userIds, CHUNK_SIZE, async (chunk) => {
            await tx.newsBookmark.deleteMany({
              where: { userId: { in: chunk } },
            });
          });
          await runChunked(userIds, CHUNK_SIZE, async (chunk) => {
            await tx.globalAuditLog.deleteMany({
              where: { companyId, actorId: { in: chunk } },
            });
          });
          const placeholderSuffix = `@${RESET_EMAIL_DOMAIN}`;

          await runChunked(userIds, CHUNK_SIZE, async (chunk) => {
            const idList = Prisma.join(
              chunk.map((id) => Prisma.sql`${id}`),
            );

            const updatedCount = await tx.$executeRaw(
              Prisma.sql`
                UPDATE "User"
                SET
                  "email" = concat('deleted-', "id"::text, ${placeholderSuffix}),
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
                WHERE "companyId" = ${companyId}
                  AND "id" = ANY(ARRAY[${idList}]::uuid[])
              `,
            );

            scrubbedUsers += Number(updatedCount ?? 0);
          });
        }

        const deletionResult = await tx.employee.deleteMany({
          where: { id: { in: employeeIds } },
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
