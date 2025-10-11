import { prisma } from "@/lib/prisma";

export interface AuditLogData {
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorType: "USER" | "SYSTEM" | "API";
  summary?: string;
  changes?: any;
  metadata?: any;
  companyId: string;
  // Employee-specific fields
  employeeId?: string;
  section?: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

/**
 * Unified audit logger that writes to GlobalAuditLog.
 * For employee-related events, optionally dual-writes to EmployeeAuditLog if UNIFIED_AUDIT_DUALWRITE=true.
 */
export async function auditLog(data: AuditLogData) {
  try {
    const isDualWriteEnabled = process.env.UNIFIED_AUDIT_DUALWRITE === "true";
    
    // Prepare metadata with employeeId and section if provided
    const metadata = {
      ...data.metadata,
      ...(data.employeeId && { employeeId: data.employeeId }),
      ...(data.section && { section: data.section }),
    };

    // Prepare changes structure for employee field updates
    let changes = data.changes;
    if (data.entityType === "EMPLOYEE" && data.field) {
      changes = {
        field: data.field,
        oldValue: data.oldValue,
        newValue: data.newValue,
        reason: data.reason,
      };
    }

    // Always write to GlobalAuditLog
    await prisma.globalAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: data.entityType as any,
        entityId: data.entityId,
        action: data.action as any,
        actorId: data.actorId,
        actorType: data.actorType as any,
        changes,
        metadata,
        companyId: data.companyId,
      },
    });

    // Dual-write to EmployeeAuditLog if enabled and this is an employee field change
    if (
      isDualWriteEnabled &&
      data.entityType === "EMPLOYEE" &&
      data.field &&
      data.employeeId
    ) {
      await prisma.employeeAuditLog.create({
        data: {
          companyId: data.companyId,
          employeeId: data.employeeId,
          section: data.section || "GENERAL",
          field: data.field,
          oldValue: data.oldValue || null,
          newValue: data.newValue || null,
          reason: data.reason || "Updated",
          changedById: data.actorId,
        },
      });
    }
  } catch (error) {
    console.warn("Failed to create audit log:", error);
    // Never throw - audit logging failures shouldn't break the main operation
  }
}

/**
 * Helper function to create audit logs for employee field changes.
 * Automatically detects changes between old and new values and creates individual audit entries.
 */
export async function createAuditLogs(params: {
  employeeId: string;
  companyId: string;
  section: string;
  oldValues: Record<string, any>;
  newValues: Record<string, any>;
  actorId: string;
  reasons?: Record<string, string>;
}) {
  const { employeeId, companyId, section, oldValues, newValues, actorId, reasons = {} } = params;

  // Detect changes by comparing old and new values
  const changedFields = Object.keys(newValues).filter((field) => {
    const oldVal = oldValues[field];
    const newVal = newValues[field];
    
    // Handle null/undefined equivalence
    if ((oldVal === null || oldVal === undefined) && (newVal === null || newVal === undefined)) {
      return false;
    }
    
    return oldVal !== newVal;
  });

  // Create an audit log for each changed field
  for (const field of changedFields) {
    await auditLog({
      entityType: "EMPLOYEE",
      entityId: employeeId,
      action: "UPDATED",
      actorId,
      actorType: "USER",
      companyId,
      employeeId,
      section,
      field,
      oldValue: String(oldValues[field] ?? ""),
      newValue: String(newValues[field] ?? ""),
      reason: reasons[field] || "Updated",
    });
  }
}
