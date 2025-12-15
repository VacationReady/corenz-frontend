/**
 * Unit Tests for Cross-Tenant Security in Employee Creation
 * 
 * Tests that the POST /api/employees endpoint properly prevents
 * cross-tenant linking of managers, departments, job roles, locations,
 * and working patterns.
 */

import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { NextRequest } from "next/server";

// Mock setup
const originalLoad = (Module as any)._load;
let mockSession: any = null;
let mockPrisma: any = {};
let mockSupabase: any = { storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: null }) }) } };
let mockResend: any = { emails: { send: async () => ({ id: "mock-email-id" }) } };

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next-auth") {
    return {
      getServerSession: async () => mockSession,
    };
  }
  if (request === "@/lib/auth-options" || request === "../app/lib/auth-options") {
    return {
      auth: async () => mockSession,
    };
  }
  if (request === "@/lib/prisma") {
    return {
      prisma: mockPrisma,
      ensurePrismaConnected: async () => {},
    };
  }
  if (request === "@/lib/supabase-admin") {
    return { __esModule: true, default: mockSupabase, ...mockSupabase };
  }
  if (request === "@/lib/resend") {
    return { resend: mockResend };
  }
  if (request === "@/lib/email/template") {
    return {
      getAppBaseUrl: () => "http://localhost:3000",
      renderPeopleCoreEmail: () => ({ html: "<p>Test</p>", text: "Test" }),
    };
  }
  return originalLoad(request, parent, isMain);
};

let routeModulePromise: Promise<typeof import("../../app/api/employees/route")> | null = null;

async function getRouteModule() {
  if (!routeModulePromise) {
    routeModulePromise = import("../../app/api/employees/route");
  }
  return routeModulePromise;
}

async function callPost(req: NextRequest) {
  const { POST } = await getRouteModule();
  return POST(req);
}

function resetMocks() {
  mockSession = null;
  mockPrisma.employee = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (args: any) => ({ id: args.data.id || "new-emp-id", ...args.data }),
  };
  mockPrisma.user = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (args: any) => ({ id: args.data.id || "new-user-id", ...args.data }),
    update: async () => ({}),
  };
  mockPrisma.department = {
    findFirst: async () => null,
  };
  mockPrisma.jobRole = {
    findFirst: async () => null,
  };
  mockPrisma.location = {
    findFirst: async () => null,
  };
  mockPrisma.workingPattern = {
    findFirst: async () => null,
  };
  mockPrisma.activationToken = {
    upsert: async () => ({}),
  };
  mockPrisma.eventCategory = {
    findFirst: async () => null,
    create: async () => ({ id: "cat-id" }),
  };
  mockPrisma.leaveEntitlement = {
    create: async () => ({}),
  };
  mockPrisma.rotaGroup = {
    findMany: async () => [],
  };
  mockPrisma.rotaGroupMember = {
    createMany: async () => ({}),
  };
  mockPrisma.employeeWorkingPatternAssignment = {
    create: async () => ({}),
  };
  mockPrisma.permissionProfile = {
    findFirst: async () => null,
  };
}

function createPostRequest(body: any): NextRequest {
  return new NextRequest("http://localhost/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validEmployeePayload = {
  firstName: "Test",
  lastName: "Employee",
  email: "test@example.com",
  startDate: "2024-01-01",
  role: "EMPLOYEE",
  onboardingTemplateId: "none",
};

test("Cross-Tenant Security - Employee Creation", async (t) => {
  const run = async (name: string, fn: () => Promise<void>) => {
    await t.test(name, async () => {
      resetMocks();
      await fn();
    });
  };

  // ========================================
  // Manager Cross-Tenant Tests
  // ========================================

  await run("POST: rejects cross-tenant managerId with 400 error", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "companyA", role: "ADMIN", email: "admin@companya.com" },
    };

    // Manager exists in Company B, not Company A
    mockPrisma.employee.findFirst = async ({ where }: any) => {
      // Tenant-scoped query should NOT find the manager
      if (where.id === "manager-in-company-b" && where.companyId === "companyA") {
        return null; // Not found in Company A
      }
      return null;
    };

    // Ensure no existing user with this email
    mockPrisma.user.findFirst = async () => null;
    mockPrisma.user.findUnique = async () => null;

    const req = createPostRequest({
      ...validEmployeePayload,
      managerId: "manager-in-company-b",
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 400, "Should return 400 for cross-tenant manager");
    assert.equal(data.success, false);
    assert.ok(
      data.error.includes("Invalid manager"),
      `Error should mention invalid manager, got: ${data.error}`
    );
  });

  await run("POST: accepts valid same-tenant managerId", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "companyA", role: "ADMIN", email: "admin@companya.com" },
    };

    // Manager exists in Company A
    mockPrisma.employee.findFirst = async ({ where }: any) => {
      if (where.id === "manager-in-company-a" && where.companyId === "companyA") {
        return { userId: "manager-user-id" };
      }
      return null;
    };

    // Ensure no existing user with this email
    mockPrisma.user.findFirst = async () => null;
    mockPrisma.user.findUnique = async () => null;

    const req = createPostRequest({
      ...validEmployeePayload,
      managerId: "manager-in-company-a",
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 200, "Should return 200 for valid same-tenant manager");
    assert.equal(data.success, true);
  });

  await run("POST: does not leak existence of cross-tenant manager IDs", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "companyA", role: "ADMIN", email: "admin@companya.com" },
    };

    let queryWhere: any = null;
    mockPrisma.employee.findFirst = async ({ where }: any) => {
      queryWhere = where;
      return null;
    };

    mockPrisma.user.findFirst = async () => null;
    mockPrisma.user.findUnique = async () => null;

    const req = createPostRequest({
      ...validEmployeePayload,
      managerId: "manager-in-company-b",
    });

    const res = await callPost(req);
    const data = await res.json();

    // Verify the query was tenant-scoped
    assert.ok(queryWhere, "Should have made a query");
    assert.equal(queryWhere.companyId, "companyA", "Query should be scoped to tenant");
    assert.equal(queryWhere.id, "manager-in-company-b", "Query should include the manager ID");

    // Error message should be generic (not reveal if ID exists in another tenant)
    assert.equal(res.status, 400);
    assert.ok(
      !data.error.includes("another tenant") && !data.error.includes("Company B"),
      "Error should not reveal cross-tenant information"
    );
  });

  // ========================================
  // Department Cross-Tenant Tests
  // ========================================

  await run("POST: rejects cross-tenant departmentId with 400 error", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "companyA", role: "ADMIN", email: "admin@companya.com" },
    };

    mockPrisma.employee.findFirst = async () => null; // No manager
    mockPrisma.user.findFirst = async () => null;
    mockPrisma.user.findUnique = async () => null;

    // Department exists in Company B, not Company A
    mockPrisma.department.findFirst = async ({ where }: any) => {
      if (where.id === "dept-in-company-b" && where.companyId === "companyA") {
        return null;
      }
      return null;
    };

    const req = createPostRequest({
      ...validEmployeePayload,
      departmentId: "dept-in-company-b",
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 400, "Should return 400 for cross-tenant department");
    assert.equal(data.success, false);
    assert.ok(
      data.error.includes("Invalid department"),
      `Error should mention invalid department, got: ${data.error}`
    );
  });

  await run("POST: accepts valid same-tenant departmentId", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "companyA", role: "ADMIN", email: "admin@companya.com" },
    };

    mockPrisma.employee.findFirst = async () => null;
    mockPrisma.user.findFirst = async () => null;
    mockPrisma.user.findUnique = async () => null;

    mockPrisma.department.findFirst = async ({ where }: any) => {
      if (where.id === "dept-in-company-a" && where.companyId === "companyA") {
        return { id: "dept-in-company-a" };
      }
      return null;
    };

    const req = createPostRequest({
      ...validEmployeePayload,
      departmentId: "dept-in-company-a",
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 200, "Should return 200 for valid same-tenant department");
    assert.equal(data.success, true);
  });

  // ========================================
  // Job Role Cross-Tenant Tests
  // ========================================

  await run("POST: rejects cross-tenant jobRoleId with 400 error", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "companyA", role: "ADMIN", email: "admin@companya.com" },
    };

    mockPrisma.employee.findFirst = async () => null;
    mockPrisma.user.findFirst = async () => null;
    mockPrisma.user.findUnique = async () => null;
    mockPrisma.department.findFirst = async () => null;

    mockPrisma.jobRole.findFirst = async ({ where }: any) => {
      if (where.id === "role-in-company-b" && where.companyId === "companyA") {
        return null;
      }
      return null;
    };

    const req = createPostRequest({
      ...validEmployeePayload,
      jobRoleId: "role-in-company-b",
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 400, "Should return 400 for cross-tenant job role");
    assert.equal(data.success, false);
    assert.ok(
      data.error.includes("Invalid job role"),
      `Error should mention invalid job role, got: ${data.error}`
    );
  });

  // ========================================
  // Location Cross-Tenant Tests
  // ========================================

  await run("POST: rejects cross-tenant locationId with 400 error", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "companyA", role: "ADMIN", email: "admin@companya.com" },
    };

    mockPrisma.employee.findFirst = async () => null;
    mockPrisma.user.findFirst = async () => null;
    mockPrisma.user.findUnique = async () => null;
    mockPrisma.department.findFirst = async () => null;
    mockPrisma.jobRole.findFirst = async () => null;

    mockPrisma.location.findFirst = async ({ where }: any) => {
      // Location in Company B should not be found
      if (where.id === "location-in-company-b") {
        return null;
      }
      return null;
    };

    const req = createPostRequest({
      ...validEmployeePayload,
      locationId: "location-in-company-b",
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 400, "Should return 400 for cross-tenant location");
    assert.equal(data.success, false);
    assert.ok(
      data.error.includes("Invalid location"),
      `Error should mention invalid location, got: ${data.error}`
    );
  });

  await run("POST: accepts global location (companyId: null)", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "companyA", role: "ADMIN", email: "admin@companya.com" },
    };

    mockPrisma.employee.findFirst = async () => null;
    mockPrisma.user.findFirst = async () => null;
    mockPrisma.user.findUnique = async () => null;
    mockPrisma.department.findFirst = async () => null;
    mockPrisma.jobRole.findFirst = async () => null;

    mockPrisma.location.findFirst = async ({ where }: any) => {
      // Global location (companyId: null) should be accessible
      if (where.id === "global-location") {
        return { id: "global-location", name: "Global HQ" };
      }
      return null;
    };

    const req = createPostRequest({
      ...validEmployeePayload,
      locationId: "global-location",
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 200, "Should return 200 for global location");
    assert.equal(data.success, true);
  });

  // ========================================
  // Working Pattern Cross-Tenant Tests
  // ========================================

  await run("POST: rejects cross-tenant workingPatternId with 400 error", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "companyA", role: "ADMIN", email: "admin@companya.com" },
    };

    mockPrisma.employee.findFirst = async () => null;
    mockPrisma.user.findFirst = async () => null;
    mockPrisma.user.findUnique = async () => null;
    mockPrisma.department.findFirst = async () => null;
    mockPrisma.jobRole.findFirst = async () => null;
    mockPrisma.location.findFirst = async () => null;

    mockPrisma.workingPattern.findFirst = async ({ where }: any) => {
      if (where.id === "pattern-in-company-b" && where.companyId === "companyA") {
        return null;
      }
      return null;
    };

    const req = createPostRequest({
      ...validEmployeePayload,
      workingPatternId: "pattern-in-company-b",
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 400, "Should return 400 for cross-tenant working pattern");
    assert.equal(data.success, false);
    assert.ok(
      data.error.includes("Invalid working pattern"),
      `Error should mention invalid working pattern, got: ${data.error}`
    );
  });

  // ========================================
  // Combined Cross-Tenant Scenario
  // ========================================

  await run("POST: validates all foreign keys are tenant-scoped before creation", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "companyA", role: "ADMIN", email: "admin@companya.com" },
    };

    const validationOrder: string[] = [];

    mockPrisma.employee.findFirst = async ({ where }: any) => {
      if (where.id && where.companyId) {
        validationOrder.push("manager");
        return { userId: "manager-user-id" }; // Valid manager
      }
      return null;
    };

    mockPrisma.user.findFirst = async () => null;
    mockPrisma.user.findUnique = async () => null;

    mockPrisma.department.findFirst = async ({ where }: any) => {
      validationOrder.push("department");
      return { id: where.id }; // Valid
    };

    mockPrisma.jobRole.findFirst = async ({ where }: any) => {
      validationOrder.push("jobRole");
      return { id: where.id }; // Valid
    };

    mockPrisma.location.findFirst = async ({ where }: any) => {
      validationOrder.push("location");
      return { id: where.id, name: "Test Location" }; // Valid
    };

    mockPrisma.workingPattern.findFirst = async ({ where }: any) => {
      validationOrder.push("workingPattern");
      return { id: where.id }; // Valid
    };

    const req = createPostRequest({
      ...validEmployeePayload,
      managerId: "valid-manager",
      departmentId: "valid-dept",
      jobRoleId: "valid-role",
      locationId: "valid-location",
      workingPatternId: "valid-pattern",
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 200, "Should succeed when all foreign keys are valid");
    assert.equal(data.success, true);

    // Verify all validations occurred
    assert.ok(validationOrder.includes("manager"), "Should validate manager");
    assert.ok(validationOrder.includes("department"), "Should validate department");
    assert.ok(validationOrder.includes("jobRole"), "Should validate job role");
    assert.ok(validationOrder.includes("location"), "Should validate location");
    assert.ok(validationOrder.includes("workingPattern"), "Should validate working pattern");
  });

  await run("POST: fails fast on first invalid foreign key", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "companyA", role: "ADMIN", email: "admin@companya.com" },
    };

    let userCreateCalled = false;
    let employeeCreateCalled = false;

    mockPrisma.employee.findFirst = async () => null; // Invalid manager
    mockPrisma.user.findFirst = async () => null;
    mockPrisma.user.findUnique = async () => null;
    mockPrisma.user.create = async () => {
      userCreateCalled = true;
      return { id: "new-user" };
    };
    mockPrisma.employee.create = async () => {
      employeeCreateCalled = true;
      return { id: "new-emp" };
    };

    const req = createPostRequest({
      ...validEmployeePayload,
      managerId: "invalid-manager",
      departmentId: "valid-dept",
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 400, "Should fail on invalid manager");
    assert.equal(userCreateCalled, false, "Should not create user when validation fails");
    assert.equal(employeeCreateCalled, false, "Should not create employee when validation fails");
  });
});
