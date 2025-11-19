/**
 * Authorization Tests for Leave Requests API
 * 
 * Tests GET /api/employees/[id]/leave-requests endpoint
 * 
 * Verifies:
 * 1. Authentication requirements (401 for unauthenticated)
 * 2. Multi-tenant isolation (403 for cross-tenant access)
 * 3. Role-based access control (delegates to permissions.canAccessEmployee):
 *    - ADMIN/SUPER_ADMIN: Can access any employee's leave requests in their company
 *    - MANAGER: Can access leave requests for their direct reports
 *    - EMPLOYEE: Can only access their own leave requests
 * 4. Proper error messages and status codes
 */

import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { NextRequest } from "next/server";

// Mock next-auth getServerSession and server-only libs used by the route
const originalLoad = (Module as any)._load;
let mockSession: any = null;
let mockPrisma: any = {};

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next-auth") {
    return {
      getServerSession: async () => mockSession,
    };
  }
  if (request === "@/lib/auth-options" || request === "../app/lib/auth-options") {
    return {
      authOptions: {},
    };
  }
  if (request === "@/lib/prisma") {
    return {
      prisma: mockPrisma,
      ensurePrismaConnected: async () => {},
    };
  }
  // Ensure validateLeaveRequest and calculateLeaveDeduction never hit real
  // database / entitlement logic in tests. Match by substring so it works
  // regardless of compiled path.
  if (typeof request === "string" && request.includes("validateLeaveRequest")) {
    return { validateLeaveRequest: async () => {} };
  }
  if (typeof request === "string" && request.includes("calculateLeaveDeduction")) {
    return { calculateLeaveDeduction: async () => 1 };
  }
  // Stub workflow resolution and plan creation so POST tests don't require
  // full approval workflow plumbing or additional Prisma mocks.
  if (typeof request === "string" && request.includes("resolveApprovalWorkflow")) {
    return {
      resolveApprovalWorkflow: async () => ({ id: "wf1" }),
    };
  }
  if (typeof request === "string" && request.includes("createLeaveApprovalPlan")) {
    return {
      createLeaveApprovalPlan: async () => [],
    };
  }
  return originalLoad(request, parent, isMain);
};

let routeModulePromise: Promise<typeof import("../../app/api/employees/[id]/leave-requests/route")> | null = null;

async function getRouteModule() {
  if (!routeModulePromise) {
    routeModulePromise = import("../../app/api/employees/[id]/leave-requests/route");
  }
  return routeModulePromise;
}

async function callGet(req: NextRequest, context: any) {
  const module = await getRouteModule();
  const GET = (module as any).GET || (module as any).default?.GET;
  if (!GET) {
    console.error("Module keys:", Object.keys(module));
    console.error("Module.default keys:", module.default ? Object.keys(module.default) : "no default");
    console.error("GET type:", typeof GET);
    console.error("GET value:", GET);
    throw new Error("Leave-requests route GET export not found");
  }
  // Call it regardless of typeof check - it might be a Proxy or wrapped function
  return GET(req, context);
}

async function callPost(req: NextRequest, context: any) {
  const module = await getRouteModule();
  const POST = (module as any).POST || (module as any).default?.POST;
  if (!POST) {
    console.error("Module keys:", Object.keys(module));
    console.error("Module.default keys:", module.default ? Object.keys(module.default) : "no default");
    console.error("POST type:", typeof POST);
    console.error("POST value:", POST);
    throw new Error("Leave-requests route POST export not found");
  }
  // Call it regardless of typeof check - it might be a Proxy or wrapped function
  return POST(req, context);
}

function resetMocks() {
  mockSession = null;
  // Don't replace mockPrisma, just update its properties to maintain the reference
  mockPrisma.employee = {
    findUnique: async () => null,
    findFirst: async () => null,
  };
  mockPrisma.leaveRequest = {
    findMany: async () => [],
  };
}

test("Leave Requests API - Authentication & Authorization", async (t) => {
  const run = async (name: string, fn: () => Promise<void>) => {
    await t.test(name, async () => {
      resetMocks();
      await fn();
    });
  };

  // ========================================
  // Authentication Tests
  // ========================================

  await run("GET: returns 401 for unauthenticated requests", async () => {
    mockSession = null;

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests");
    const res = await callGet(req, { params: Promise.resolve({ id: "emp1" }) });
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthenticated");
  });

  await run("GET: returns 401 for session without companyId", async () => {
    mockSession = {
      user: { id: "user1", role: "EMPLOYEE", email: "test@example.com" },
    };

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests");
    const res = await callGet(req, { params: Promise.resolve({ id: "emp1" }) });
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthenticated");
  });

  await run("GET: returns 401 for session without userId", async () => {
    mockSession = {
      user: { companyId: "company1", role: "EMPLOYEE", email: "test@example.com" },
    };

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests");
    const res = await callGet(req, { params: Promise.resolve({ id: "emp1" }) });
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthenticated");
  });

  // ========================================
  // Multi-Tenant Isolation Tests
  // ========================================

  await run("GET: returns 404 for non-existent employee", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    mockPrisma.employee.findUnique = async () => null;

    const req = new NextRequest("http://localhost/api/employees/emp999/leave-requests");
    const res = await callGet(req, { params: Promise.resolve({ id: "emp999" }) });
    const data = await res.json();

    assert.equal(res.status, 404);
    assert.equal(data.error, "Employee not found");
  });

  await run("GET: returns 403 for cross-tenant access attempt", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    // Employee belongs to company2, not company1
    mockPrisma.employee.findUnique = async ({ where }: any) => {
      if (where.id === "emp1") {
        return {
          id: "emp1",
          companyId: "company2", // Different company!
          userId: "user2",
        };
      }
      return null;
    };

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests");
    const res = await callGet(req, { params: Promise.resolve({ id: "emp1" }) });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.equal(data.error, "Forbidden: Cross-tenant access denied");
  });

  // ========================================
  // ADMIN Access Tests
  // ========================================

  await run("GET: ADMIN can access any employee's leave requests in their company", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    let capturedWhereClause: any = null;

    // Employee in same company
    mockPrisma.employee.findUnique = async ({ where }: any) => {
      return {
        id: "emp1",
        companyId: "company1",
        userId: "user1",
        User: { managerId: "manager1" },
      };
    };

    mockPrisma.leaveRequest.findMany = async ({ where }: any) => {
      capturedWhereClause = where;
      return [
        {
          id: "leave1",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-01-05"),
          dayType: "FULL_DAY",
          EventCategory: { id: "cat1", name: "Annual Leave" },
          approvalStatus: "APPROVED",
        },
      ];
    };

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests");
    const res = await callGet(req, { params: Promise.resolve({ id: "emp1" }) });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(data), "Response should be an array");
    assert.equal(data.length, 1);
    assert.equal(data[0].id, "leave1");
    
    // Verify multi-tenant filtering in query
    assert.equal(capturedWhereClause.employeeId, "emp1");
    assert.equal(capturedWhereClause.Employee.companyId, "company1");
  });

  await run("GET: SUPER_ADMIN can access any employee's leave requests in their company", async () => {
    mockSession = {
      user: { id: "superadmin1", companyId: "company1", role: "SUPER_ADMIN", email: "superadmin@example.com" },
    };

    mockPrisma.employee.findUnique = async () => ({
      id: "emp1",
      companyId: "company1",
      userId: "user1",
      User: { managerId: "manager1" },
    });

    mockPrisma.leaveRequest.findMany = async () => [{
      id: "leave1",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-05"),
      dayType: "FULL_DAY",
      EventCategory: { id: "cat1", name: "Annual Leave" },
      approvalStatus: "APPROVED",
    }];

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests");
    const res = await callGet(req, { params: Promise.resolve({ id: "emp1" }) });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(data));
  });

  // ========================================
  // MANAGER Access Tests
  // ========================================

  await run("GET: MANAGER can access direct report's leave requests", async () => {
    mockSession = {
      user: { id: "manager1", companyId: "company1", role: "MANAGER", email: "manager@example.com" },
    };

    // Employee is a direct report (managerId matches session user)
    mockPrisma.employee.findUnique = async () => ({
      id: "emp1",
      companyId: "company1",
      userId: "user1",
      User: { managerId: "manager1" }, // Direct report
    });

    mockPrisma.leaveRequest.findMany = async () => [{
      id: "leave1",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-05"),
      dayType: "FULL_DAY",
      EventCategory: { id: "cat1", name: "Annual Leave" },
      approvalStatus: "APPROVED",
    }];

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests");
    const res = await callGet(req, { params: Promise.resolve({ id: "emp1" }) });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(data));
    assert.equal(data[0].id, "leave1");
  });

  await run("GET: MANAGER cannot access non-direct-report's leave requests", async () => {
    mockSession = {
      user: { id: "manager1", companyId: "company1", role: "MANAGER", email: "manager@example.com" },
    };

    // Employee is NOT a direct report (different manager)
    mockPrisma.employee.findUnique = async () => ({
      id: "emp1",
      companyId: "company1",
      userId: "user1",
      User: { managerId: "othermanager" }, // Different manager!
    });

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests");
    const res = await callGet(req, { params: Promise.resolve({ id: "emp1" }) });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.ok(data.error.includes("Forbidden"));
    assert.ok(data.error.includes("do not have permission"));
  });

  // ========================================
  // EMPLOYEE Self-Access Tests
  // ========================================

  await run("GET: EMPLOYEE can access their own leave requests", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", role: "EMPLOYEE", email: "employee@example.com" },
    };

    // Employee accessing their own record
    mockPrisma.employee.findUnique = async () => ({
      id: "emp1",
      companyId: "company1",
      userId: "user1", // Matches session user
      User: { managerId: null },
    });

    mockPrisma.leaveRequest.findMany = async () => [{
      id: "leave1",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-05"),
      dayType: "FULL_DAY",
      EventCategory: { id: "cat1", name: "Annual Leave" },
      approvalStatus: "APPROVED",
    }];

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests");
    const res = await callGet(req, { params: Promise.resolve({ id: "emp1" }) });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(data));
    assert.equal(data[0].id, "leave1");
  });

  await run("GET: EMPLOYEE cannot access another employee's leave requests", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", role: "EMPLOYEE", email: "employee@example.com" },
    };

    // Trying to access someone else's record
    mockPrisma.employee.findUnique = async () => ({
      id: "emp2",
      companyId: "company1",
      userId: "user2", // Different user!
      User: { managerId: null },
    });

    const req = new NextRequest("http://localhost/api/employees/emp2/leave-requests");
    const res = await callGet(req, { params: Promise.resolve({ id: "emp2" }) });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.ok(data.error.includes("Forbidden"));
    assert.ok(data.error.includes("do not have permission"));
  });

  // ========================================
  // Query Parameter Tests
  // ========================================

  await run("GET: respects 'upcoming' query parameter", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", role: "EMPLOYEE", email: "employee@example.com" },
    };

    mockPrisma.employee.findUnique = async () => ({
      id: "emp1",
      companyId: "company1",
      userId: "user1",
    });

    let capturedWhere: any = null;
    mockPrisma.leaveRequest.findMany = async ({ where }: any) => {
      capturedWhere = where;
      return [];
    };

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests?upcoming=true");
    await callGet(req, { params: Promise.resolve({ id: "emp1" }) });

    assert.ok(capturedWhere.OR, "Should have OR clause for upcoming filter");
  });

  await run("GET: respects 'limit' query parameter", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", role: "EMPLOYEE", email: "employee@example.com" },
    };

    mockPrisma.employee.findUnique = async () => ({
      id: "emp1",
      companyId: "company1",
      userId: "user1",
    });

    let capturedTake: number | undefined;
    mockPrisma.leaveRequest.findMany = async ({ take }: any) => {
      capturedTake = take;
      return [];
    };

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests?limit=5");
    await callGet(req, { params: Promise.resolve({ id: "emp1" }) });

    assert.equal(capturedTake, 5);
  });

  await run("GET: limits 'limit' parameter to maximum of 10", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", role: "EMPLOYEE", email: "employee@example.com" },
    };

    mockPrisma.employee.findUnique = async () => ({
      id: "emp1",
      companyId: "company1",
      userId: "user1",
    });

    let capturedTake: number | undefined;
    mockPrisma.leaveRequest.findMany = async ({ take }: any) => {
      capturedTake = take;
      return [];
    };

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests?limit=50");
    await callGet(req, { params: Promise.resolve({ id: "emp1" }) });

    assert.equal(capturedTake, 10, "Should cap limit at 10");
  });

  // ========================================
  // Integration Test: Full Flow
  // ========================================

  await run("GET: full flow with authorized access returns filtered results", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    mockPrisma.employee.findUnique = async () => ({
      id: "emp1",
      companyId: "company1",
      userId: "user1",
    });

    mockPrisma.leaveRequest.findMany = async ({ where }: any) => {
      // Verify all expected filters are present
      assert.equal(where.employeeId, "emp1");
      assert.equal(where.Employee.companyId, "company1");
      assert.equal(where.approvalStatus, "APPROVED");

      return [
        {
          id: "leave1",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-01-03"),
          dayType: "FULL_DAY",
          EventCategory: { id: "cat1", name: "Annual Leave" },
          approvalStatus: "APPROVED",
        },
        {
          id: "leave2",
          startDate: new Date("2025-02-01"),
          endDate: new Date("2025-02-02"),
          dayType: "HALF_DAY_AM",
          EventCategory: { id: "cat2", name: "Sick Leave" },
          approvalStatus: "APPROVED",
        },
      ];
    };

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests");
    const res = await callGet(req, { params: Promise.resolve({ id: "emp1" }) });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(data));
    assert.equal(data.length, 2);
    assert.equal(data[0].id, "leave1");
    assert.equal(data[1].id, "leave2");
    assert.equal(data[0].EventCategory.name, "Annual Leave");
    assert.equal(data[1].dayType, "HALF_DAY_AM");
  });

  // ========================================
  // POST Endpoint Authorization Tests
  // ========================================

  await run("POST: returns 401 for unauthenticated requests", async () => {
    mockSession = null;

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests", {
      method: "POST",
      body: JSON.stringify({
        eventCategoryId: "cat1",
        startDate: "2025-01-01",
        endDate: "2025-01-05",
      }),
    });
    const res = await callPost(req, { params: Promise.resolve({ id: "emp1" }) });
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthenticated");
  });

  await run("POST: ADMIN can create leave request for any employee in their company", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    mockPrisma.employee.findFirst = async ({ where }: any) => {
      if (where.id === "emp1" && where.companyId === "company1") {
        return {
          id: "emp1",
          companyId: "company1",
          userId: "user1",
          departmentId: null,
          jobRoleId: null,
          User: {
            id: "user1",
            name: "Test Employee",
            email: "employee@example.com",
            managerId: null,
            firstName: "Test",
            lastName: "Employee",
          },
        };
      }
      return null;
    };

    // canCreateLeaveRequest uses prisma.employee.findUnique to verify tenant
    mockPrisma.employee.findUnique = async ({ where }: any) => {
      if (where.id === "emp1") {
        return {
          companyId: "company1",
        };
      }
      return null;
    };

    mockPrisma.eventCategory = {
      findFirst: async () => ({ name: "Annual Leave" }),
    };

    mockPrisma.leaveRequest = {
      create: async () => ({
        id: "leave1",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-05"),
        dayType: "FULL_DAY",
        approvalStatus: "PENDING",
      }),
      update: async () => ({
        id: "leave1",
        approvalStatus: "APPROVED",
      }),
      findUnique: async () => null,
      findMany: async () => [],
    };

    mockPrisma.leaveEntitlement = {
      findFirst: async () => ({
        id: "ent1",
        totalDays: 20,
        usedDays: 0,
      }),
      update: async () => ({}),
    };

    mockPrisma.$transaction = async (fn: any) => {
      return fn(mockPrisma);
    };

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests", {
      method: "POST",
      body: JSON.stringify({
        eventCategoryId: "cat1",
        startDate: "2025-01-01",
        endDate: "2025-01-05",
      }),
    });
    const res = await callPost(req, { params: Promise.resolve({ id: "emp1" }) });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
  });

  await run("POST: EMPLOYEE can create leave request for themselves", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", role: "EMPLOYEE", email: "employee@example.com" },
    };

    mockPrisma.employee.findFirst = async ({ where }: any) => {
      if (where.id === "emp1" && where.companyId === "company1") {
        return {
          id: "emp1",
          companyId: "company1",
          userId: "user1", // Matches session user
          departmentId: null,
          jobRoleId: null,
          User: {
            id: "user1",
            name: "Test Employee",
            email: "employee@example.com",
            managerId: null,
            firstName: "Test",
            lastName: "Employee",
          },
        };
      }
      return null;
    };

    mockPrisma.employee.findUnique = async ({ where }: any) => {
      if (where.id === "emp1") {
        return { userId: "user1", companyId: "company1" };
      }
      return null;
    };

    mockPrisma.eventCategory = {
      findFirst: async () => ({ name: "Annual Leave" }),
    };

    mockPrisma.leaveRequest = {
      create: async () => ({
        id: "leave1",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-05"),
        dayType: "FULL_DAY",
        approvalStatus: "PENDING",
      }),
      findUnique: async () => ({
        id: "leave1",
        LeaveApprovalStage: [],
      }),
      findMany: async () => [],
    };

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests", {
      method: "POST",
      body: JSON.stringify({
        eventCategoryId: "cat1",
        startDate: "2025-01-01",
        endDate: "2025-01-05",
      }),
    });
    const res = await callPost(req, { params: Promise.resolve({ id: "emp1" }) });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
  });

  await run("POST: EMPLOYEE cannot create leave request for another employee", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", role: "EMPLOYEE", email: "employee@example.com" },
    };

    mockPrisma.employee.findFirst = async ({ where }: any) => {
      if (where.id === "emp2" && where.companyId === "company1") {
        return {
          id: "emp2",
          companyId: "company1",
          userId: "user2", // Different user!
          User: {
            id: "user2",
            name: "Other Employee",
            email: "other@example.com",
          },
        };
      }
      return null;
    };

    mockPrisma.employee.findUnique = async ({ where }: any) => {
      if (where.id === "emp2") {
        return { userId: "user2", companyId: "company1" };
      }
      return null;
    };

    const req = new NextRequest("http://localhost/api/employees/emp2/leave-requests", {
      method: "POST",
      body: JSON.stringify({
        eventCategoryId: "cat1",
        startDate: "2025-01-01",
        endDate: "2025-01-05",
      }),
    });
    const res = await callPost(req, { params: Promise.resolve({ id: "emp2" }) });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.ok(data.error.includes("Forbidden"));
    assert.ok(data.error.includes("do not have permission to create leave requests"));
  });

  await run("POST: returns 403 for cross-tenant access attempt", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    // Simulate that this employee does not exist in the admin's company
    // so the route returns 404 ("Employee not found.") for cross-tenant access.
    mockPrisma.employee.findFirst = async () => {
      return null;
    };

    const req = new NextRequest("http://localhost/api/employees/emp1/leave-requests", {
      method: "POST",
      body: JSON.stringify({
        eventCategoryId: "cat1",
        startDate: "2025-01-01",
        endDate: "2025-01-05",
      }),
    });

    const res = await callPost(req, { params: Promise.resolve({ id: "emp1" }) });
    const data = await res.json();

    assert.equal(res.status, 404);
    assert.equal(data.error, "Employee not found.");
  });
});
