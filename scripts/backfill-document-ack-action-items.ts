import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

import { prisma } from "@/lib/prisma";
import {
  createActionItemsBulk,
  CreateActionItemParams,
} from "@/lib/action-items-helper";

const MS_IN_DAY = 24 * 60 * 60 * 1000;

function defaultDueDate(signatureDueAt: Date | null): Date {
  if (signatureDueAt) {
    return signatureDueAt;
  }
  return new Date(Date.now() + 7 * MS_IN_DAY);
}

async function ensureCompanyEmployees(
  companyId: string,
  departmentIds: string[],
  jobRoleIds: string[]
) {
  const filters: any[] = [];
  if (departmentIds.length > 0) {
    filters.push({ departmentId: { in: departmentIds } });
  }
  if (jobRoleIds.length > 0) {
    filters.push({ jobRoleId: { in: jobRoleIds } });
  }

  const where: any = {
    isActive: true,
    User: { companyId },
  };

  if (filters.length > 0) {
    where.OR = filters;
  }

  return prisma.employee.findMany({
    where,
    select: {
      id: true,
      userId: true,
    },
  });
}

async function main() {
  console.log("🚀 Starting document acknowledgement backfill...\n");

  const documents = await prisma.document.findMany({
    where: {
      requiresAck: true,
      deletedAt: null,
    },
    include: {
      Department: { select: { id: true } },
      JobRole: { select: { id: true } },
      DocumentAcknowledgement: { select: { employeeId: true } },
      Employee: {
        select: {
          id: true,
          userId: true,
          isActive: true,
        },
      },
    },
  });

  console.log(`📄 Found ${documents.length} documents that require acknowledgement.\n`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const doc of documents) {
    const dueDate = defaultDueDate(doc.signatureDueAt);
    const acknowledgedEmployeeIds = new Set(
      doc.DocumentAcknowledgement.map((ack) => ack.employeeId)
    );

    const existingItems = await prisma.actionItem.findMany({
      where: {
        companyId: doc.companyId,
        type: "DOCUMENT_ACKNOWLEDGEMENT",
        metadata: {
          path: ["documentId"],
          equals: doc.id,
        },
      },
      select: {
        assignedToId: true,
      },
    });
    const alreadyAssigned = new Set(
      existingItems
        .map((item) => item.assignedToId)
        .filter((id): id is string => Boolean(id))
    );

    const payload: CreateActionItemParams[] = [];

    if (doc.employeeId) {
      const employee = doc.Employee;
      if (!employee?.isActive || !employee.userId) {
        totalSkipped++;
        continue;
      }

      if (acknowledgedEmployeeIds.has(employee.id)) {
        totalSkipped++;
      } else if (!alreadyAssigned.has(employee.userId)) {
        payload.push({
          companyId: doc.companyId,
          type: "DOCUMENT_ACKNOWLEDGEMENT",
          title: `Acknowledge document: ${doc.name}`,
          description: doc.category || undefined,
          assignedToId: employee.userId,
          relatedEmployeeId: employee.id,
          dueDate,
          priority: "HIGH",
          metadata: {
            documentId: doc.id,
            documentName: doc.name,
            documentPath: doc.path,
            documentCategory: doc.category,
            requiresSignature: doc.requiresSignature,
          },
        });
      } else {
        totalSkipped++;
      }
    } else {
      const departmentIds = doc.Department.map((dept) => dept.id);
      const jobRoleIds = doc.JobRole.map((role) => role.id);
      const employees = await ensureCompanyEmployees(
        doc.companyId,
        departmentIds,
        jobRoleIds
      );

      for (const employee of employees) {
        if (!employee.userId) {
          totalSkipped++;
          continue;
        }

        if (acknowledgedEmployeeIds.has(employee.id)) {
          totalSkipped++;
          continue;
        }

        if (alreadyAssigned.has(employee.userId)) {
          totalSkipped++;
          continue;
        }

        payload.push({
          companyId: doc.companyId,
          type: "DOCUMENT_ACKNOWLEDGEMENT",
          title: `Acknowledge document: ${doc.name}`,
          description: doc.category || undefined,
          assignedToId: employee.userId,
          relatedEmployeeId: employee.id,
          dueDate,
          priority: "HIGH",
          metadata: {
            documentId: doc.id,
            documentName: doc.name,
            documentPath: doc.path,
            documentCategory: doc.category,
            requiresSignature: doc.requiresSignature,
          },
        });
      }
    }

    if (payload.length > 0) {
      await createActionItemsBulk(payload);
      totalCreated += payload.length;
      console.log(
        `✅ Created ${payload.length} action item(s) for document "${doc.name}" (${doc.id}).`
      );
    } else {
      console.log(
        `ℹ️  No new action items needed for document "${doc.name}" (${doc.id}).`
      );
    }
  }

  console.log("\n============================");
  console.log("Backfill summary");
  console.log("============================");
  console.log(`✅ Action items created: ${totalCreated}`);
  console.log(`⏭️  Entries skipped: ${totalSkipped}`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("\n❌ Backfill failed", error);
  await prisma.$disconnect();
  process.exit(1);
});
