import { prisma } from "@/lib/prisma";

export interface AuditDiff {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export function serialize(obj: any, key: string): string | null {
  const val = obj?.[key];
  if (val === null || val === undefined) return null;
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

export async function createAuditLogs({
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
}): Promise<void> {
  if (diffs.length === 0) return;

  // Validate that all required reasons are provided
  for (const diff of diffs) {
    // Only require reason if new value is non-empty (allow clearing fields without reason)
    if (diff.newValue && (!reasons[diff.field] || reasons[diff.field].trim() === "")) {
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
}

export function validateReasons(
  diffs: AuditDiff[],
  reasons: Record<string, string>
): string[] {
  const errors: string[] = [];
  
  for (const diff of diffs) {
    // Only require reason if new value is non-empty
    if (diff.newValue && (!reasons[diff.field] || reasons[diff.field].trim() === "")) {
      errors.push(`Reason required for field: ${diff.field}`);
    }
  }
  
  return errors;
}

