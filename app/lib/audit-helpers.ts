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

function hasMeaningfulValue(value: string | null): boolean {
  if (value === null) return false;
  return value.trim() !== "";
}

export function diffRequiresReason(diff: AuditDiff): boolean {
  const isSynthetic = diff.field === "__create__" || diff.field === "__delete__";
  if (isSynthetic) {
    return true;
  }

  const hasOldValue = hasMeaningfulValue(diff.oldValue);
  const hasNewValue = hasMeaningfulValue(diff.newValue);

  return hasOldValue && hasNewValue;
}

function defaultReasonForDiff(diff: AuditDiff): string {
  const hasNewValue = hasMeaningfulValue(diff.newValue);
  const hasOldValue = hasMeaningfulValue(diff.oldValue);

  if (!hasNewValue) {
    return "Field cleared";
  }

  if (!hasOldValue) {
    return "Initial value set";
  }

  return "Change recorded";
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
    const requiresReason = diffRequiresReason(diff);
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
      reason:
        (reasons[diff.field] && reasons[diff.field].trim() !== ""
          ? reasons[diff.field]
          : defaultReasonForDiff(diff)),
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
    const requiresReason = diffRequiresReason(diff);
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

