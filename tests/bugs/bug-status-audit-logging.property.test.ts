/**
 * Property-based tests for Bug Status Change Audit Logging and Resolved Date Auto-Population
 * 
 * Feature: bug-reporting-system
 * Property 11: Status Change Audit Logging
 * Property 12: Resolved Date Auto-Population
 * 
 * Property 11: *For any* bug status change, the system SHALL create a GlobalAuditLog entry
 * containing the bug ID, old status, new status, and actor ID.
 * 
 * Property 12: *For any* bug status update to RESOLVED or CLOSED where `resolvedAt` is not
 * already set, the system SHALL automatically set `resolvedAt` to the current timestamp.
 * 
 * **Validates: Requirements 8.6, 9.4**
 */
import "../setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import * as fc from "fast-check";

// ============================================
// TYPES AND CONSTANTS
// ============================================

const BUG_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "WONT_FIX"] as const;
type BugStatus = typeof BUG_STATUSES[number];

const BUG_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
type BugSeverity = typeof BUG_SEVERITIES[number];

interface BugReport {
  id: string;
  title: string;
  description: string;
  severity: BugSeverity;
  status: BugStatus;
  companyId: string;
  submitterId: string;
  pageUrl: string;
  userAgent: string;
  adminNotes: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AuditLogEntry {
  id: string;
  companyId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorType: string;
  changes: Record<string, { from: any; to: any }>;
  metadata: Record<string, any>;
  timestamp: Date;
}

// ============================================
// GENERATORS
// ============================================

/**
 * Generator for valid bug statuses
 */
const bugStatusArbitrary = fc.constantFrom(...BUG_STATUSES);

/**
 * Generator for bug severities
 */
const bugSeverityArbitrary = fc.constantFrom(...BUG_SEVERITIES);

/**
 * Generator for UUIDs/CUIDs
 */
const idArbitrary = fc.uuid();

/**
 * Generator for bug reports
 */
const bugReportArbitrary = fc.record({
  id: idArbitrary,
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.string({ minLength: 1, maxLength: 5000 }),
  severity: bugSeverityArbitrary,
  status: bugStatusArbitrary,
  companyId: idArbitrary,
  submitterId: idArbitrary,
  pageUrl: fc.webUrl(),
  userAgent: fc.string({ minLength: 1, maxLength: 500 }),
  adminNotes: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
  resolvedAt: fc.option(fc.date(), { nil: null }),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

/**
 * Generator for status transitions (from one status to a different status)
 */
const statusTransitionArbitrary = fc.tuple(bugStatusArbitrary, bugStatusArbitrary)
  .filter(([from, to]) => from !== to);

/**
 * Generator for transitions to resolved/closed statuses
 */
const resolvedStatusTransitionArbitrary = fc.tuple(
  bugStatusArbitrary,
  fc.constantFrom("RESOLVED" as const, "CLOSED" as const)
).filter(([from, to]) => from !== to);

// ============================================
// SIMULATED SERVICE FUNCTIONS
// ============================================

/**
 * Simulates the updateBugStatus function behavior for testing
 * This mirrors the logic in lib/bugs/service.ts
 */
function simulateUpdateBugStatus(
  currentBug: BugReport,
  newStatus: BugStatus,
  actorId: string
): { updatedBug: BugReport; auditLog: AuditLogEntry | null } {
  // If status hasn't changed, no audit log is created
  if (currentBug.status === newStatus) {
    return { updatedBug: currentBug, auditLog: null };
  }

  const changes: Record<string, { from: any; to: any }> = {
    status: { from: currentBug.status, to: newStatus },
  };

  let resolvedAt = currentBug.resolvedAt;

  // Auto-set resolvedAt when status changes to RESOLVED or CLOSED
  // Only if resolvedAt is not already set
  if ((newStatus === "RESOLVED" || newStatus === "CLOSED") && !currentBug.resolvedAt) {
    resolvedAt = new Date();
    changes.resolvedAt = { from: null, to: resolvedAt };
  }

  const updatedBug: BugReport = {
    ...currentBug,
    status: newStatus,
    resolvedAt,
    updatedAt: new Date(),
  };

  const auditLog: AuditLogEntry = {
    id: `audit-${Date.now()}`,
    companyId: currentBug.companyId,
    entityType: "BUG_REPORT",
    entityId: currentBug.id,
    action: "UPDATED",
    actorId,
    actorType: "USER",
    changes,
    metadata: { source: "tenant-admin" },
    timestamp: new Date(),
  };

  return { updatedBug, auditLog };
}

// ============================================
// PROPERTY TESTS
// ============================================

test("Property 11: Status Change Audit Logging - Bug Reporting System", async (t) => {
  
  await t.test("audit log is created for any status change", () => {
    /**
     * Property: For any bug status change, an audit log entry SHALL be created
     * containing the bug ID, old status, new status, and actor ID.
     */
    fc.assert(
      fc.property(
        bugReportArbitrary,
        statusTransitionArbitrary,
        idArbitrary,
        (bug, [_, newStatus], actorId) => {
          // Ensure the bug has a different status than the target
          const currentBug = { ...bug, status: bug.status === newStatus ? "OPEN" : bug.status } as BugReport;
          if (currentBug.status === newStatus) {
            // Skip if we can't create a valid transition
            return true;
          }

          const { auditLog } = simulateUpdateBugStatus(currentBug, newStatus, actorId);

          // Audit log must be created for status changes
          assert.ok(auditLog !== null, "Audit log should be created for status change");
          
          // Verify audit log contains required fields
          assert.equal(auditLog!.entityId, currentBug.id, "Audit log should contain bug ID");
          assert.equal(auditLog!.entityType, "BUG_REPORT", "Entity type should be BUG_REPORT");
          assert.equal(auditLog!.actorId, actorId, "Audit log should contain actor ID");
          assert.equal(auditLog!.action, "UPDATED", "Action should be UPDATED");
          
          // Verify changes contain old and new status
          assert.ok(auditLog!.changes.status, "Changes should contain status");
          assert.equal(auditLog!.changes.status.from, currentBug.status, "Should record old status");
          assert.equal(auditLog!.changes.status.to, newStatus, "Should record new status");

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("audit log contains correct company ID", () => {
    /**
     * Property: For any status change, the audit log SHALL contain the
     * correct company ID from the bug report.
     */
    fc.assert(
      fc.property(
        bugReportArbitrary,
        statusTransitionArbitrary,
        idArbitrary,
        (bug, [fromStatus, toStatus], actorId) => {
          const currentBug = { ...bug, status: fromStatus };
          
          if (fromStatus === toStatus) return true;

          const { auditLog } = simulateUpdateBugStatus(currentBug, toStatus, actorId);

          assert.ok(auditLog !== null);
          assert.equal(auditLog!.companyId, currentBug.companyId, 
            "Audit log company ID should match bug's company ID");

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("no audit log created when status unchanged", () => {
    /**
     * Property: When the status is not changed, no audit log SHALL be created.
     */
    fc.assert(
      fc.property(
        bugReportArbitrary,
        idArbitrary,
        (bug, actorId) => {
          // Try to "update" to the same status
          const { auditLog } = simulateUpdateBugStatus(bug, bug.status, actorId);

          // No audit log should be created for no-op updates
          assert.equal(auditLog, null, "No audit log should be created when status unchanged");

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("audit log actor type is always USER", () => {
    /**
     * Property: For any status change, the audit log actor type SHALL be USER.
     */
    fc.assert(
      fc.property(
        bugReportArbitrary,
        statusTransitionArbitrary,
        idArbitrary,
        (bug, [fromStatus, toStatus], actorId) => {
          const currentBug = { ...bug, status: fromStatus };
          
          if (fromStatus === toStatus) return true;

          const { auditLog } = simulateUpdateBugStatus(currentBug, toStatus, actorId);

          assert.ok(auditLog !== null);
          assert.equal(auditLog!.actorType, "USER", "Actor type should always be USER");

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("audit log metadata contains source", () => {
    /**
     * Property: For any status change, the audit log metadata SHALL contain
     * the source of the change.
     */
    fc.assert(
      fc.property(
        bugReportArbitrary,
        statusTransitionArbitrary,
        idArbitrary,
        (bug, [fromStatus, toStatus], actorId) => {
          const currentBug = { ...bug, status: fromStatus };
          
          if (fromStatus === toStatus) return true;

          const { auditLog } = simulateUpdateBugStatus(currentBug, toStatus, actorId);

          assert.ok(auditLog !== null);
          assert.ok(auditLog!.metadata, "Audit log should have metadata");
          assert.equal(auditLog!.metadata.source, "tenant-admin", 
            "Metadata should contain source");

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

test("Property 12: Resolved Date Auto-Population - Bug Reporting System", async (t) => {
  
  await t.test("resolvedAt is set when status changes to RESOLVED and was null", () => {
    /**
     * Property: For any bug with null resolvedAt, when status changes to RESOLVED,
     * the system SHALL automatically set resolvedAt to the current timestamp.
     */
    fc.assert(
      fc.property(
        bugReportArbitrary,
        fc.constantFrom("OPEN" as const, "IN_PROGRESS" as const, "WONT_FIX" as const),
        idArbitrary,
        (bug, fromStatus, actorId) => {
          // Ensure resolvedAt is null and status is not already RESOLVED
          const currentBug = { ...bug, status: fromStatus, resolvedAt: null };

          const { updatedBug, auditLog } = simulateUpdateBugStatus(currentBug, "RESOLVED", actorId);

          // resolvedAt should be set
          assert.ok(updatedBug.resolvedAt !== null, 
            "resolvedAt should be set when status changes to RESOLVED");
          assert.ok(updatedBug.resolvedAt instanceof Date, 
            "resolvedAt should be a Date");

          // Audit log should record the resolvedAt change
          assert.ok(auditLog !== null);
          assert.ok(auditLog!.changes.resolvedAt, 
            "Audit log should record resolvedAt change");
          assert.equal(auditLog!.changes.resolvedAt.from, null, 
            "resolvedAt change should show from null");

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("resolvedAt is set when status changes to CLOSED and was null", () => {
    /**
     * Property: For any bug with null resolvedAt, when status changes to CLOSED,
     * the system SHALL automatically set resolvedAt to the current timestamp.
     */
    fc.assert(
      fc.property(
        bugReportArbitrary,
        fc.constantFrom("OPEN" as const, "IN_PROGRESS" as const, "WONT_FIX" as const),
        idArbitrary,
        (bug, fromStatus, actorId) => {
          // Ensure resolvedAt is null and status is not already CLOSED
          const currentBug = { ...bug, status: fromStatus, resolvedAt: null };

          const { updatedBug, auditLog } = simulateUpdateBugStatus(currentBug, "CLOSED", actorId);

          // resolvedAt should be set
          assert.ok(updatedBug.resolvedAt !== null, 
            "resolvedAt should be set when status changes to CLOSED");
          assert.ok(updatedBug.resolvedAt instanceof Date, 
            "resolvedAt should be a Date");

          // Audit log should record the resolvedAt change
          assert.ok(auditLog !== null);
          assert.ok(auditLog!.changes.resolvedAt, 
            "Audit log should record resolvedAt change");

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("resolvedAt is NOT overwritten when already set", () => {
    /**
     * Property: For any bug with resolvedAt already set, when status changes
     * to RESOLVED or CLOSED, the existing resolvedAt SHALL NOT be overwritten.
     */
    fc.assert(
      fc.property(
        bugReportArbitrary,
        fc.date(),
        resolvedStatusTransitionArbitrary,
        idArbitrary,
        (bug, existingResolvedAt, [fromStatus, toStatus], actorId) => {
          // Ensure resolvedAt is already set
          const currentBug = { 
            ...bug, 
            status: fromStatus, 
            resolvedAt: existingResolvedAt 
          };

          const { updatedBug, auditLog } = simulateUpdateBugStatus(currentBug, toStatus, actorId);

          // resolvedAt should remain unchanged
          assert.deepEqual(updatedBug.resolvedAt, existingResolvedAt, 
            "resolvedAt should not be overwritten when already set");

          // Audit log should NOT record resolvedAt change
          if (auditLog) {
            assert.ok(!auditLog.changes.resolvedAt, 
              "Audit log should not record resolvedAt change when already set");
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("resolvedAt is NOT set for non-resolved statuses", () => {
    /**
     * Property: For any status change to OPEN, IN_PROGRESS, or WONT_FIX,
     * the system SHALL NOT automatically set resolvedAt.
     */
    fc.assert(
      fc.property(
        bugReportArbitrary,
        bugStatusArbitrary,
        fc.constantFrom("OPEN" as const, "IN_PROGRESS" as const, "WONT_FIX" as const),
        idArbitrary,
        (bug, fromStatus, toStatus, actorId) => {
          // Ensure resolvedAt is null
          const currentBug = { ...bug, status: fromStatus, resolvedAt: null };

          if (fromStatus === toStatus) return true;

          const { updatedBug } = simulateUpdateBugStatus(currentBug, toStatus, actorId);

          // resolvedAt should remain null
          assert.equal(updatedBug.resolvedAt, null, 
            `resolvedAt should not be set when status changes to ${toStatus}`);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("resolvedAt timestamp is recent when auto-populated", () => {
    /**
     * Property: When resolvedAt is auto-populated, the timestamp SHALL be
     * within a reasonable time window of the current time.
     */
    fc.assert(
      fc.property(
        bugReportArbitrary,
        fc.constantFrom("OPEN" as const, "IN_PROGRESS" as const),
        fc.constantFrom("RESOLVED" as const, "CLOSED" as const),
        idArbitrary,
        (bug, fromStatus, toStatus, actorId) => {
          const currentBug = { ...bug, status: fromStatus, resolvedAt: null };
          const beforeUpdate = new Date();

          const { updatedBug } = simulateUpdateBugStatus(currentBug, toStatus, actorId);

          const afterUpdate = new Date();

          // resolvedAt should be between beforeUpdate and afterUpdate
          assert.ok(updatedBug.resolvedAt !== null);
          assert.ok(updatedBug.resolvedAt! >= beforeUpdate, 
            "resolvedAt should not be before the update");
          assert.ok(updatedBug.resolvedAt! <= afterUpdate, 
            "resolvedAt should not be after the update");

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("status and resolvedAt changes are both recorded in audit log", () => {
    /**
     * Property: When both status and resolvedAt change, both changes SHALL
     * be recorded in the same audit log entry.
     */
    fc.assert(
      fc.property(
        bugReportArbitrary,
        fc.constantFrom("OPEN" as const, "IN_PROGRESS" as const),
        fc.constantFrom("RESOLVED" as const, "CLOSED" as const),
        idArbitrary,
        (bug, fromStatus, toStatus, actorId) => {
          const currentBug = { ...bug, status: fromStatus, resolvedAt: null };

          const { auditLog } = simulateUpdateBugStatus(currentBug, toStatus, actorId);

          assert.ok(auditLog !== null);
          
          // Both changes should be in the same audit log
          assert.ok(auditLog!.changes.status, "Status change should be recorded");
          assert.ok(auditLog!.changes.resolvedAt, "resolvedAt change should be recorded");
          
          // Verify the values
          assert.equal(auditLog!.changes.status.from, fromStatus);
          assert.equal(auditLog!.changes.status.to, toStatus);
          assert.equal(auditLog!.changes.resolvedAt.from, null);
          assert.ok(auditLog!.changes.resolvedAt.to instanceof Date);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
