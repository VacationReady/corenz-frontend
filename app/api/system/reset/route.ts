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
    console.log(`Starting system reset for company: ${companyId}, current user: ${currentUserId}`);
    
    const summary = await prisma.$transaction(
      async (tx) => {
        // Helpers to run generic operations in chunks using the global CHUNK_SIZE
        const runInChunks = async <T>(
          ids: T[],
          handler: (batch: T[]) => Promise<unknown>,
        ) => {
          await runChunked(ids, CHUNK_SIZE, async (batch) => {
            await handler(batch);
          });
        };

        // Gather all employees in this company except the current user
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
            // Time tracking related deletions
            (ids) =>
              tx.timesheet.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.clockEntry.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.shift.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.availabilityPattern.deleteMany({
                where: { employeeId: { in: ids } },
              }),
            (ids) =>
              tx.shiftSwapRequest.deleteMany({
                where: {
                  OR: [
                    { requesterEmployeeId: { in: ids } },
                    { targetEmployeeId: { in: ids } },
                  ],
                },
              }),
            // Ensure any employee-bound documents are removed
            (ids) =>
              tx.document.deleteMany({
                where: { employeeId: { in: ids } },
              }),
          ];

          for (const deleteOperation of employeeScopedDeletions) {
            await runInChunks(employeeIds, deleteOperation);
          }
        }

        // Remove employees themselves FIRST (excluding the current user)
        const { count: removedEmployees } = await tx.employee.deleteMany({
          where: { companyId, NOT: { userId: currentUserId } },
        });
        
        console.log(`Deleted ${removedEmployees} employees`);

        // Delete users completely instead of just scrubbing them
        let deletedUsers = 0;

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
                where: { companyId, assignedToId: { in: ids } },
              }),
            (ids) =>
              tx.activationToken.deleteMany({ where: { userId: { in: ids } } }),
            (ids) =>
              tx.newsPost.deleteMany({ where: { authorId: { in: ids } } }),
            (ids) =>
              tx.newsReaction.deleteMany({ where: { userId: { in: ids } } }),
            (ids) =>
              tx.newsBookmark.deleteMany({ where: { userId: { in: ids } } }),
            (ids) =>
              tx.globalAuditLog.deleteMany({
                where: { companyId, actorId: { in: ids } },
              }),
          ];

          for (const operation of userScopedOperations) {
            await runInChunks(userIds, operation);
          }

          // Delete users completely from the database (now safe since employees are deleted)
          await runInChunks(userIds, async (batch) => {
            try {
              console.log(`Attempting to delete ${batch.length} users: ${batch.join(', ')}`);
              const { count } = await tx.user.deleteMany({
                where: { id: { in: batch } },
              });
              deletedUsers += count;
              console.log(`Successfully deleted ${count} users`);
            } catch (error) {
              console.error("Failed to delete some users during reset", error);
              console.error("User IDs that failed:", batch);
            }
          });
        }

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
        // Time tracking company-level data
        const timeTrackingSettings = await tx.timeTrackingSettings.deleteMany({
          where: { companyId },
        });
        const shiftTemplates = await tx.shiftTemplate.deleteMany({
          where: { companyId },
        });

        return {
          removedEmployees,
          deletedUsers,
          removedDepartments: departments.count,
          removedJobRoles: jobRoles.count,
          removedWorkingPatterns: workingPatterns.count,
          removedGenderOptions: genderOptions.count,
          removedEventCategories: eventCategories.count,
          removedEventRules: eventRules.count + eventRuleOverrides.count,
          removedTimeTrackingSettings: timeTrackingSettings.count,
          removedShiftTemplates: shiftTemplates.count,
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
      companyId: companyId,
      summary: `Company data reset by ${resetActor}`,
      metadata: {
        resetBy: resetActor,
        ...summary,
      },
    });

    console.log(`System reset completed successfully:`, summary);
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
