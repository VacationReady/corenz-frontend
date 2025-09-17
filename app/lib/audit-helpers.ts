import { prisma } from "@/lib/prisma";
import { dispatchTransactionalNotifications } from "@/lib/transactional-notifications";

export interface AuditDiff {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export function serialize(obj: any, key: string): string | null {
  const val = obj?.[key];
  if (val === null || val === undefined) return null;
  if (typeof val === "string" && val.trim() === "") return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export function serializeValue(val: any): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string" && val.trim() === "") return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export function computeDiffs(
  before: Record<string, any>,
  after: Record<string, any>,
  allowedFields: readonly string[]
): AuditDiff[] {
  const diffs: AuditDiff[] = [];
  
  for (const field of allowedFields) {
    const oldValue = serialize(before, field);
    const newValue = serialize(after, field);
    
    if (oldValue !== newValue) {
      diffs.push({
        field,
        oldValue,
        newValue,
      });
    }
  }
  
  return diffs;
}

export interface CreateAuditLogsOptions {
  skipNotifications?: boolean;
}

export async function createAuditLogs(
  {
    companyId,
    employeeId,
    section,
    diffs,
    reasons,
    changedById,
  }: {
    companyId: string;
    employeeId: string;
    section: string;
    diffs: AuditDiff[];
    reasons: Record<string, string>;
    changedById: string;
  },
  options: CreateAuditLogsOptions = {}
): Promise<void> {
  if (diffs.length === 0) return;

  // Validate that all required reasons are provided
  for (const diff of diffs) {
    const isSynthetic = diff.field === "__create__" || diff.field === "__delete__";
    const requiresReason = isSynthetic || Boolean(diff.newValue);
    if (requiresReason && (!reasons[diff.field] || reasons[diff.field].trim() === "")) {
      throw new Error(`Reason required for field: ${diff.field}`);
    }
  }

  // Create audit log entries
  await prisma.employeeAuditLog.createMany({
    data: diffs.map((diff) => ({
      companyId,
      employeeId,
      section,
      field: diff.field,
      oldValue: diff.oldValue,
      newValue: diff.newValue,
      reason: reasons[diff.field] || "Field cleared", // Default reason for cleared fields
      changedById,
    })),
  });

  // Dispatch transactional notifications unless skipped
  if (!options.skipNotifications) {
    try {
      await dispatchTransactionalNotifications({
        companyId,
        employeeId,
        section,
        diffs,
        reasons,
        changedById
      });
    } catch (error) {
      // Log but don't throw - we don't want notification failures to break audit logging
      console.error('Failed to dispatch transactional notifications:', error);
    }
  }
}

export function validateReasons(
  diffs: AuditDiff[],
  reasons: Record<string, string>
): string[] {
  const errors: string[] = [];
  
  for (const diff of diffs) {
    const isSynthetic = diff.field === "__create__" || diff.field === "__delete__";
    const requiresReason = isSynthetic || Boolean(diff.newValue);
    if (requiresReason && (!reasons[diff.field] || reasons[diff.field].trim() === "")) {
      errors.push(`Reason required for field: ${diff.field}`);
    }
  }
  
  return errors;
}

// Helper to build diffs for simple create flows (e.g., FormData-based creates)
export function formatDiffsForFormData(values: Record<string, any>): AuditDiff[] {
  const diffs: AuditDiff[] = [];
  for (const [field, value] of Object.entries(values)) {
    diffs.push({
      field,
      oldValue: null,
      newValue: serializeValue(value),
    });
  }
  return diffs;
}

