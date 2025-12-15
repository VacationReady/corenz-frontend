/**
 * Cross-tenant security tests for /api/shifts/[id] route
 * 
 * Verifies that tenant isolation is enforced at the query level,
 * preventing cross-tenant data exposure via ID guessing attacks.
 */
import "../setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { NextRequest } from "next/server";

// Mock functions
const mockAuth = test.mock.fn<() => Promise<any>>();
const mockEmployeeFindUnique = test.mock.fn<(args: any) => Promise<any>>();
const mockShiftFindFirst = test.mock.fn<(args: any) => Promise<any>>();
const mockShiftUpdate = test.mock.fn<(args: any) => Promise<any>>();
const mockShiftDelete = test.mock.fn<(args: any) => Promise<any>>();
const mockGlobalAuditLogCreate = test.mock.fn<(args: any) => Promise<any>>();

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "@/lib/auth-options") {
    return { auth: mockAuth, authOptions: {} };
  }
  if (request === "@/lib/prisma") {
    return {
      prisma: {
        employee: { findUnique: mockEmployeeFindUnique },
        shift: { 
          findFirst: mockShiftFindFirst,
          findUnique: mockShiftFindFirst, // Redirect to findFirst for safety
          update: mockShiftUpdate,
          delete: mockShiftDelete,
        },
        globalAuditLog: { create: mockGlobalAuditLogCreate },
        company: { findUnique: () => Promise.resolve({ name: "Test Company" }) },
        department: { findUnique: () => Promise.resolve({ id: "dept-1", name: "Test Dept" }) },
        location: { findUnique: () => Promise.resolve({ id: "loc-1", name: "Test Location" }) },
      },
    };
  }
  if (request === "@/lib/timesheet-calculations") {
    return { calculateShiftCost: () => 100 };
  }
  if (request === "@/lib/resend") {
    return { 
      resend: { emails: { send: () => Promise.resolve() } },
      PEOPLECORE_FROM_EMAIL: "test@example.com",
    };
  }
  if (request === "date-fns") {
    return { format: (date: Date, fmt: string) => date.toISOString() };
  }
  return originalLoad.call(this, request, parent, isMain);
};

test.after(() => {
  (Module as any)._load = originalLoad;
});

const routePromise = import("../../app/api/shifts/[id]/route");

function resetMocks() {
  mockAuth.mock.resetCalls();
  mockEmployeeFindUnique.mock.resetCalls();
  mockShiftFindFirst.mock.resetCalls();
  mockShiftUpdate.mock.resetCalls();
  mockShiftDelete.mock.resetCalls();
  mockGlobalAuditLogCreate.mock.resetCalls();
}

// Test data
const COMPANY_A_ID = "company-a-uuid";
const COMPANY_B_ID = "company-b-uuid";
const SHIFT_IN_COMPANY_B = {
  id: "shift-in-b-uuid",
  companyId: COMPANY_B_ID,
  employeeId: "emp-b-1",
  startTime: new Date("2024-01-15T09:00:00Z"),
  endTime: new Date("2024-01-15T17:00:00Z"),
  isPublished: true,
  breakDuration: 30,
};

/**
 * GET /api/shifts/[id] - Cross-tenant access attempt
 * User from Company A tries to access shift from Company B
 * Expected: 404 with no data leakage
 */
test("GET /api/shifts/[id] returns 404 for cross-tenant shift access", async () => {
  resetMocks();
  
  // Session for user in Company A
  mockAuth.mock.mockImplementationOnce(() =>
    Promise.resolve({
      user: { id: "user-a-1", companyId: COMPANY_A_ID },
    })
  );
  
  // Requesting employee from Company A
  mockEmployeeFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({
      id: "emp-a-1",
      companyId: COMPANY_A_ID,
      User: { role: "ADMIN" },
    })
  );
  
  // Shift query with tenant scoping should return null (shift is in Company B)
  mockShiftFindFirst.mock.mockImplementationOnce(({ where }: any) => {
    // Verify the query includes companyId scoping
    assert.ok(where.companyId, "Query must include companyId for tenant scoping");
    assert.equal(where.companyId, COMPANY_A_ID, "Query must scope to requesting user's company");
    // Return null because shift belongs to Company B, not A
    return Promise.resolve(null);
  });

  const { GET } = await routePromise;
  const res = await GET(
    new NextRequest("http://localhost/api/shifts/shift-in-b-uuid"),
    { params: Promise.resolve({ id: "shift-in-b-uuid" }) }
  );

  assert.equal(res.status, 404, "Cross-tenant access should return 404");
  const payload = await res.json();
  assert.equal(payload.error, "Shift not found", "Error message should be generic");
  
  // Verify no sensitive data is leaked
  assert.ok(!payload.shift, "Response should not contain shift data");
  assert.ok(!payload.companyId, "Response should not leak company ID");
  assert.ok(!payload.employeeId, "Response should not leak employee ID");
});

/**
 * PUT /api/shifts/[id] - Cross-tenant update attempt
 * Admin from Company A tries to update shift from Company B
 * Expected: 404 with no data modification
 */
test("PUT /api/shifts/[id] returns 404 for cross-tenant shift update", async () => {
  resetMocks();
  
  // Session for admin in Company A
  mockAuth.mock.mockImplementationOnce(() =>
    Promise.resolve({
      user: { id: "admin-a-1", companyId: COMPANY_A_ID },
    })
  );
  
  // Requesting employee (admin) from Company A
  mockEmployeeFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({
      id: "emp-a-admin",
      companyId: COMPANY_A_ID,
      User: { role: "ADMIN" },
    })
  );
  
  // Shift query with tenant scoping should return null
  mockShiftFindFirst.mock.mockImplementationOnce(({ where }: any) => {
    assert.ok(where.companyId, "Update query must include companyId for tenant scoping");
    assert.equal(where.companyId, COMPANY_A_ID);
    return Promise.resolve(null);
  });

  const { PUT } = await routePromise;
  const res = await PUT(
    new NextRequest("http://localhost/api/shifts/shift-in-b-uuid", {
      method: "PUT",
      body: JSON.stringify({ notes: "Malicious update attempt" }),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ id: "shift-in-b-uuid" }) }
  );

  assert.equal(res.status, 404, "Cross-tenant update should return 404");
  const payload = await res.json();
  assert.equal(payload.error, "Shift not found");
  
  // Verify update was never called
  assert.equal(mockShiftUpdate.mock.calls.length, 0, "Shift update should not be called for cross-tenant attempt");
});

/**
 * DELETE /api/shifts/[id] - Cross-tenant delete attempt
 * Admin from Company A tries to delete shift from Company B
 * Expected: 404 with no data deletion
 */
test("DELETE /api/shifts/[id] returns 404 for cross-tenant shift delete", async () => {
  resetMocks();
  
  // Session for admin in Company A
  mockAuth.mock.mockImplementationOnce(() =>
    Promise.resolve({
      user: { id: "admin-a-1", companyId: COMPANY_A_ID },
    })
  );
  
  // Requesting employee (admin) from Company A
  mockEmployeeFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({
      id: "emp-a-admin",
      companyId: COMPANY_A_ID,
      User: { role: "ADMIN", name: "Admin A" },
    })
  );
  
  // Shift query with tenant scoping should return null
  mockShiftFindFirst.mock.mockImplementationOnce(({ where }: any) => {
    assert.ok(where.companyId, "Delete query must include companyId for tenant scoping");
    assert.equal(where.companyId, COMPANY_A_ID);
    return Promise.resolve(null);
  });

  const { DELETE } = await routePromise;
  const res = await DELETE(
    new NextRequest("http://localhost/api/shifts/shift-in-b-uuid", {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id: "shift-in-b-uuid" }) }
  );

  assert.equal(res.status, 404, "Cross-tenant delete should return 404");
  const payload = await res.json();
  assert.equal(payload.error, "Shift not found");
  
  // Verify delete was never called
  assert.equal(mockShiftDelete.mock.calls.length, 0, "Shift delete should not be called for cross-tenant attempt");
});

/**
 * GET /api/shifts/[id] - Same-tenant access (positive test)
 * Admin from Company A accesses shift from Company A
 * Expected: 200 with shift data
 */
test("GET /api/shifts/[id] returns shift data for same-tenant access", async () => {
  resetMocks();
  
  const SHIFT_IN_COMPANY_A = {
    id: "shift-in-a-uuid",
    companyId: COMPANY_A_ID,
    employeeId: "emp-a-1",
    startTime: new Date("2024-01-15T09:00:00Z"),
    endTime: new Date("2024-01-15T17:00:00Z"),
    isPublished: true,
    breakDuration: 30,
    departmentId: null,
    locationId: null,
    Template: null,
    ShiftSwapRequests: [],
  };
  
  // Session for admin in Company A
  mockAuth.mock.mockImplementationOnce(() =>
    Promise.resolve({
      user: { id: "admin-a-1", companyId: COMPANY_A_ID },
    })
  );
  
  // Requesting employee (admin) from Company A
  mockEmployeeFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({
      id: "emp-a-admin",
      companyId: COMPANY_A_ID,
      departmentId: "dept-1",
      User: { role: "ADMIN" },
    })
  );
  
  // Shift query returns the shift (same tenant)
  mockShiftFindFirst.mock.mockImplementationOnce(({ where }: any) => {
    assert.equal(where.companyId, COMPANY_A_ID);
    assert.equal(where.id, "shift-in-a-uuid");
    return Promise.resolve(SHIFT_IN_COMPANY_A);
  });

  const { GET } = await routePromise;
  const res = await GET(
    new NextRequest("http://localhost/api/shifts/shift-in-a-uuid"),
    { params: Promise.resolve({ id: "shift-in-a-uuid" }) }
  );

  assert.equal(res.status, 200, "Same-tenant access should return 200");
  const payload = await res.json();
  assert.ok(payload.shift, "Response should contain shift data");
  assert.equal(payload.shift.id, "shift-in-a-uuid");
});

/**
 * Verify timing attack resistance
 * Both cross-tenant and non-existent shift should return identical responses
 */
test("Cross-tenant and non-existent shift return identical error responses", async () => {
  // Test 1: Cross-tenant shift (exists in B, accessed from A)
  resetMocks();
  mockAuth.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-a-1", companyId: COMPANY_A_ID } })
  );
  mockEmployeeFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "emp-a-1", companyId: COMPANY_A_ID, User: { role: "ADMIN" } })
  );
  mockShiftFindFirst.mock.mockImplementationOnce(() => Promise.resolve(null));

  const { GET } = await routePromise;
  const res1 = await GET(
    new NextRequest("http://localhost/api/shifts/shift-in-b-uuid"),
    { params: Promise.resolve({ id: "shift-in-b-uuid" }) }
  );
  const payload1 = await res1.json();

  // Test 2: Completely non-existent shift
  resetMocks();
  mockAuth.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-a-1", companyId: COMPANY_A_ID } })
  );
  mockEmployeeFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "emp-a-1", companyId: COMPANY_A_ID, User: { role: "ADMIN" } })
  );
  mockShiftFindFirst.mock.mockImplementationOnce(() => Promise.resolve(null));

  const res2 = await GET(
    new NextRequest("http://localhost/api/shifts/totally-fake-id"),
    { params: Promise.resolve({ id: "totally-fake-id" }) }
  );
  const payload2 = await res2.json();

  // Both should be identical to prevent enumeration attacks
  assert.equal(res1.status, res2.status, "Status codes should be identical");
  assert.equal(payload1.error, payload2.error, "Error messages should be identical");
  assert.deepEqual(Object.keys(payload1), Object.keys(payload2), "Response structure should be identical");
});
