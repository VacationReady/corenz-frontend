import { prisma } from "@/lib/prisma";

export interface AuditLogData {
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorType: "USER" | "SYSTEM";
  summary?: string;
  changes?: any;
  metadata?: any;
  companyId?: string;
  employeeId?: string;
  section?: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export async function auditLog(data: AuditLogData) {
  try {
    // Use EmployeeAuditLog for employee-related operations
    if (data.entityType === "EMPLOYEE" && data.employeeId) {
      await prisma.employeeAuditLog.create({
        data: {
          companyId: data.companyId!,
          employeeId: data.employeeId,
          section: data.section || "CSV_IMPORT",
          field: data.field || "__create__",
          oldValue: data.oldValue || undefined,
          newValue: data.newValue || "Employee created via CSV import",
          reason: data.reason || "CSV Import",
          changedById: data.actorId,
        },
      });
    } else {
      // Use GlobalAuditLog for non-employee operations
      await prisma.globalAuditLog.create({
        data: {
          id: crypto.randomUUID(),
          entityType: data.entityType as any, // Will be validated by Prisma
          entityId: data.entityId,
          action: data.action as any, // Will be validated by Prisma
          actorId: data.actorId,
          actorType: data.actorType as any, // Will be validated by Prisma
          changes: data.changes,
          metadata: data.metadata,
          companyId: data.companyId!,
        },
      });
    }
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging failures shouldn't break the main operation
  }
}
