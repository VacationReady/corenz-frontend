import { prisma } from "@/lib/prisma";

export interface AuditLogData {
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorType: "USER" | "SYSTEM";
  changes?: any;
  metadata?: any;
  companyId?: string;
}

export async function auditLog(data: AuditLogData) {
  try {
    await prisma.globalAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        actorId: data.actorId,
        actorType: data.actorType,
        changes: data.changes,
        metadata: data.metadata,
        companyId: data.companyId,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging failures shouldn't break the main operation
  }
}
