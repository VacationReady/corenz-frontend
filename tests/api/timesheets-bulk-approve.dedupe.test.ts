import "../setupEnv";

import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { NextRequest } from "next/server";

const mockAuth = test.mock.fn<() => Promise<any>>();
const mockEmployeeFindUnique = test.mock.fn<(args: any) => Promise<any>>();
const mockTimesheetFindMany = test.mock.fn<(args: any) => Promise<any[]>>();
const mockCancelPendingTimesheetApprovalActionItems = test.mock.fn<(timesheetId: string) => Promise<void>>();

const txTimesheetUpdate = test.mock.fn<(args: any) => Promise<any>>();
const txGlobalAuditLogCreate = test.mock.fn<(args: any) => Promise<any>>();

const mockTransaction = test.mock.fn<(fn: any) => Promise<any>>();

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "@/lib/auth-options") {
    return { auth: mockAuth };
  }
  if (request === "@/lib/prisma") {
    return {
      prisma: {
        employee: { findUnique: mockEmployeeFindUnique },
        timesheet: { findMany: mockTimesheetFindMany },
        $transaction: mockTransaction,
      },
    };
  }
  if (request === "@/lib/action-items-helper") {
    return {
      cancelPendingTimesheetApprovalActionItems: mockCancelPendingTimesheetApprovalActionItems,
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const routePromise = import("../../app/api/timesheets/bulk-approve/route");

function resetMocks() {
  mockAuth.mock.resetCalls();
  mockEmployeeFindUnique.mock.resetCalls();
  mockTimesheetFindMany.mock.resetCalls();
  mockCancelPendingTimesheetApprovalActionItems.mock.resetCalls();
  txTimesheetUpdate.mock.resetCalls();
  txGlobalAuditLogCreate.mock.resetCalls();
  mockTransaction.mock.resetCalls();
}

test.after(() => {
  (Module as any)._load = originalLoad;
});

test("POST /api/timesheets/bulk-approve dedupes timesheetIds and avoids duplicate approvals", async () => {
  resetMocks();

  mockAuth.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1" } }),
  );

  mockEmployeeFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({
      id: "emp-1",
      userId: "user-1",
      companyId: "comp-1",
      departmentId: null,
      User: { role: "ADMIN", name: "Admin", email: "admin@example.com" },
    }),
  );

  mockTimesheetFindMany.mock.mockImplementationOnce(({ where }: any) => {
    assert.deepEqual(
      where?.id?.in,
      ["ts-1", "ts-2"],
      "Expected API to query using deduped timesheetIds",
    );

    return Promise.resolve([
      {
        id: "ts-1",
        employeeId: "e-1",
        approvalStatus: "PENDING",
        periodStart: new Date("2025-01-01T00:00:00.000Z"),
        periodEnd: new Date("2025-01-07T00:00:00.000Z"),
        Employee: {
          companyId: "comp-1",
          departmentId: null,
          User: { name: "Alice", email: "alice@example.com", managerId: null },
        },
      },
      {
        id: "ts-2",
        employeeId: "e-2",
        approvalStatus: "PENDING",
        periodStart: new Date("2025-01-01T00:00:00.000Z"),
        periodEnd: new Date("2025-01-07T00:00:00.000Z"),
        Employee: {
          companyId: "comp-1",
          departmentId: null,
          User: { name: "Bob", email: "bob@example.com", managerId: null },
        },
      },
    ]);
  });

  mockTransaction.mock.mockImplementation(async (fn: any) => {
    return fn({
      timesheet: { update: txTimesheetUpdate },
      globalAuditLog: { create: txGlobalAuditLogCreate },
    });
  });

  txTimesheetUpdate.mock.mockImplementation(async ({ where }: any) => ({ id: where.id }));
  txGlobalAuditLogCreate.mock.mockImplementation(async () => ({ id: "audit-1" }));
  mockCancelPendingTimesheetApprovalActionItems.mock.mockImplementation(async () => {});

  const warnCalls: any[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    warnCalls.push(args);
  };

  try {
    const { POST } = await routePromise;

    const res = await POST(
      new NextRequest("http://localhost/api/timesheets/bulk-approve", {
        method: "POST",
        body: JSON.stringify({ timesheetIds: ["ts-1", "ts-1", "ts-2"] }),
      }),
    );

    assert.equal(res.status, 200);
    const payload = await res.json();

    assert.deepEqual(payload.summary, {
      total: 2,
      succeeded: 2,
      failed: 0,
    });

    assert.equal(
      txTimesheetUpdate.mock.calls.length,
      2,
      "Expected exactly one approval update per unique timesheet",
    );

    assert.ok(
      warnCalls.some((args) => String(args[0]).includes("deduped timesheetIds")),
      "Expected a console.warn about deduped timesheetIds",
    );
  } finally {
    console.warn = originalWarn;
  }
});
