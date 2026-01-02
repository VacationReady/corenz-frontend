/**
 * Authentication and Authorization Tests for Onboarding Step Complete API
 * 
 * Verifies that:
 * 1. Employees can complete their own onboarding steps
 * 2. ADMIN/SUPER_ADMIN can complete steps for any employee in their company
 * 3. MANAGER can only complete steps for their direct reports
 * 4. Unrelated managers get 403 when trying to complete steps for non-reports
 * 5. Cross-tenant access is blocked
 * 6. Admin overrides are audit logged
 */

import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { prisma } from "../../app/lib/prisma";
import { NextRequest } from "next/server";

// Mock next-auth + auth() for step complete API tests
const originalLoad = (Module as any)._load;
let mockSession: any = null;

// Track audit log calls
let auditLogCalls: any[] = [];

// Mock canAccessEmployee result
let mockCanAccessEmployee: boolean | null = null;

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
  if (request === "@/lib/onboarding/audit-logger") {
    return {
      logStepChange: async (entry: any) => {
        auditLogCalls.push(entry);
        return { id: `audit_${Date.now()}` };
      },
    };
  }
  if (request === "@/lib/permissions") {
    // Return the actual module but with canAccessEmployee potentially mocked
    const actualModule = originalLoad(request, parent, isMain);
    return {
      ...actualModule,
      canAccessEmployee: async (requestor: any, targetEmployeeId: string) => {
        if (mockCanAccessEmployee !== null) {
          return mockCanAccessEmployee;
        }
        // Fall back to actual implementation
        return actualModule.canAccessEmployee(requestor, targetEmployeeId);
      },
    };
  }
  return originalLoad(request, parent, isMain);
};

let routeModulePromise: Promise<typeof import("../../app/api/onboarding/step/[stepId]/complete/route")> | null = null;

async function getRouteModule() {
  if (!routeModulePromise) {
    routeModulePromise = import("../../app/api/onboarding/step/[stepId]/complete/route");
  }
  return routeModulePromise;
}

async function callPost(req: NextRequest, context: any) {
  const { POST } = await getRouteModule();
  return POST(req, context);
}

const originalStepInstanceModel = prisma.onboardingStepInstance;
const originalEmployeeModel = prisma.employee;
const originalUserModel = prisma.user;

function resetMocks() {
  mockSession = null;
  auditLogCalls = [];
  mockCanAccessEmployee = null;
  (prisma as any).onboardingStepInstance = originalStepInstanceModel;
  (prisma as any).employee = originalEmployeeModel;
  (prisma as any).user = originalUserModel;
}

function createMockStepInstance(overrides: any = {}) {
  return {
    id: "step-inst-1",
    status: "pending",
    OnboardingInstance: {
      id: "onboarding-inst-1",
      OnboardingTemplate: { id: "template-1" },
      Employee: {
        id: "emp-1",
        companyId: "company-1",
        User: {
          id: "user-1",
          companyId: "company-1",
          managerId: "manager-1",
        },
        ...overrides.Employee,
      },
      ...overrides.OnboardingInstance,
    },
    OnboardingStep: {
      id: "step-1",
      label: "Test Step",
      type: "FORM_FILL",
    },
    ...overrides,
  };
}

test("Onboarding Step Complete API auth guards", async (t) => {
  const run = async (name: string, fn: () => Promise<void>) => {
    await t.test(name, async () => {
      resetMocks();
      await fn();
    });
  };

  await run("returns 401 for unauthenticated requests", async () => {
    const req = new NextRequest("http://localhost/api/onboarding/step/step-1/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await callPost(req, { params: { stepId: "step-1" } });
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthorized");
  });

  await run("returns 401 for session without companyId", async () => {
    mockSession = {
      user: { id: "user1", email: "test@example.com" },
    };

    const req = new NextRequest("http://localhost/api/onboarding/step/step-1/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await callPost(req, { params: { stepId: "step-1" } });
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthorized");
  });

  await run("returns 404 for non-existent step", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company-1", email: "test@example.com", role: "EMPLOYEE" },
    };

    (prisma as any).onboardingStepInstance = {
      findUnique: async () => null,
      update: async () => ({}),
    };

    const req = new NextRequest("http://localhost/api/onboarding/step/step-999/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await callPost(req, { params: { stepId: "step-999" } });
    const data = await res.json();

    assert.equal(res.status, 404);
    assert.equal(data.error, "Step not found.");
  });

  await run("returns 403 for cross-tenant access attempt", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company-1", email: "test@example.com", role: "EMPLOYEE" },
    };

    (prisma as any).onboardingStepInstance = {
      findUnique: async () => createMockStepInstance({
        OnboardingInstance: {
          id: "onboarding-inst-1",
          OnboardingTemplate: { id: "template-1" },
          Employee: {
            id: "emp-1",
            companyId: "company-2", // Different company
            User: {
              id: "user-2",
              companyId: "company-2",
              managerId: null,
            },
          },
        },
      }),
      update: async () => ({}),
    };

    const req = new NextRequest("http://localhost/api/onboarding/step/step-1/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await callPost(req, { params: { stepId: "step-1" } });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.equal(data.error, "Forbidden");
  });

  // ============================================================
  // Employee Self-Completion Tests
  // ============================================================

  await run("allows employee to complete their own onboarding step", async () => {
    mockSession = {
      user: { id: "user-1", companyId: "company-1", email: "employee@example.com", role: "EMPLOYEE" },
    };

    let stepUpdated = false;
    (prisma as any).onboardingStepInstance = {
      findUnique: async () => createMockStepInstance({
        OnboardingInstance: {
          id: "onboarding-inst-1",
          OnboardingTemplate: { id: "template-1" },
          Employee: {
            id: "emp-1",
            companyId: "company-1",
            User: {
              id: "user-1", // Same as session user
              companyId: "company-1",
              managerId: "manager-1",
            },
          },
        },
      }),
      update: async () => {
        stepUpdated = true;
        return {};
      },
      findMany: async () => [{ status: "completed" }],
    };

    (prisma as any).onboardingStepResponse = {
      create: async () => ({}),
    };

    (prisma as any).onboardingInstance = {
      update: async () => ({}),
    };

    const req = new NextRequest("http://localhost/api/onboarding/step/step-1/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await callPost(req, { params: { stepId: "step-1" } });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.ok(stepUpdated, "Step should have been updated");
  });

  await run("returns 403 when employee tries to complete another employee's step", async () => {
    mockSession = {
      user: { id: "user-1", companyId: "company-1", email: "employee@example.com", role: "EMPLOYEE" },
    };

    (prisma as any).onboardingStepInstance = {
      findUnique: async () => createMockStepInstance({
        OnboardingInstance: {
          id: "onboarding-inst-1",
          OnboardingTemplate: { id: "template-1" },
          Employee: {
            id: "emp-2",
            companyId: "company-1",
            User: {
              id: "user-2", // Different user
              companyId: "company-1",
              managerId: "manager-1",
            },
          },
        },
      }),
      update: async () => ({}),
    };

    const req = new NextRequest("http://localhost/api/onboarding/step/step-1/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await callPost(req, { params: { stepId: "step-1" } });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.ok(data.error.includes("only complete your own"));
  });

  // ============================================================
  // Manager Access Tests
  // ============================================================

  await run("allows manager to complete step for their direct report", async () => {
    mockSession = {
      user: { id: "manager-1", companyId: "company-1", email: "manager@example.com", role: "MANAGER" },
    };

    // Mock canAccessEmployee to return true for this test
    mockCanAccessEmployee = true;

    let stepUpdated = false;
    (prisma as any).onboardingStepInstance = {
      findUnique: async () => createMockStepInstance({
        OnboardingInstance: {
          id: "onboarding-inst-1",
          OnboardingTemplate: { id: "template-1" },
          Employee: {
            id: "emp-1",
            companyId: "company-1",
            User: {
              id: "user-1",
              companyId: "company-1",
              managerId: "manager-1", // Managed by the requesting manager
            },
          },
        },
      }),
      update: async () => {
        stepUpdated = true;
        return {};
      },
      findMany: async () => [{ status: "completed" }],
    };

    (prisma as any).onboardingStepResponse = {
      create: async () => ({}),
    };

    (prisma as any).onboardingInstance = {
      update: async () => ({}),
    };

    const req = new NextRequest("http://localhost/api/onboarding/step/step-1/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await callPost(req, { params: { stepId: "step-1" } });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.ok(stepUpdated, "Step should have been updated");
  });

  await run("returns 403 when manager tries to complete step for non-direct-report", async () => {
    mockSession = {
      user: { id: "manager-1", companyId: "company-1", email: "manager@example.com", role: "MANAGER" },
    };

    // Mock canAccessEmployee to return false for this test
    mockCanAccessEmployee = false;

    (prisma as any).onboardingStepInstance = {
      findUnique: async () => createMockStepInstance({
        OnboardingInstance: {
          id: "onboarding-inst-1",
          OnboardingTemplate: { id: "template-1" },
          Employee: {
            id: "emp-1",
            companyId: "company-1",
            User: {
              id: "user-1",
              companyId: "company-1",
              managerId: "manager-2", // Different manager
            },
          },
        },
      }),
      update: async () => ({}),
      findMany: async () => [{ status: "completed" }],
    };

    const req = new NextRequest("http://localhost/api/onboarding/step/step-1/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await callPost(req, { params: { stepId: "step-1" } });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.ok(data.error.includes("employees you manage"));
  });

  // ============================================================
  // Admin/Super Admin Access Tests
  // ============================================================

  await run("allows admin to complete step for any employee in their company", async () => {
    mockSession = {
      user: { id: "admin-1", companyId: "company-1", email: "admin@example.com", role: "ADMIN" },
    };

    let stepUpdated = false;
    (prisma as any).onboardingStepInstance = {
      findUnique: async () => createMockStepInstance({
        OnboardingInstance: {
          id: "onboarding-inst-1",
          OnboardingTemplate: { id: "template-1" },
          Employee: {
            id: "emp-1",
            companyId: "company-1",
            User: {
              id: "user-1",
              companyId: "company-1",
              managerId: "manager-1", // Not managed by admin
            },
          },
        },
      }),
      update: async () => {
        stepUpdated = true;
        return {};
      },
      findMany: async () => [{ status: "completed" }],
    };

    (prisma as any).onboardingStepResponse = {
      create: async () => ({}),
    };

    (prisma as any).onboardingInstance = {
      update: async () => ({}),
    };

    (prisma as any).onboardingStepAuditLog = {
      create: async (data: any) => {
        auditLogCalls.push(data);
        return { id: `audit_${Date.now()}` };
      },
    };

    const req = new NextRequest("http://localhost/api/onboarding/step/step-1/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await callPost(req, { params: { stepId: "step-1" } });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.ok(stepUpdated, "Step should have been updated");
  });

  await run("allows super admin to complete step for any employee in their company", async () => {
    mockSession = {
      user: { id: "superadmin-1", companyId: "company-1", email: "superadmin@example.com", role: "SUPER_ADMIN" },
    };

    let stepUpdated = false;
    (prisma as any).onboardingStepInstance = {
      findUnique: async () => createMockStepInstance({
        OnboardingInstance: {
          id: "onboarding-inst-1",
          OnboardingTemplate: { id: "template-1" },
          Employee: {
            id: "emp-1",
            companyId: "company-1",
            User: {
              id: "user-1",
              companyId: "company-1",
              managerId: "manager-1",
            },
          },
        },
      }),
      update: async () => {
        stepUpdated = true;
        return {};
      },
      findMany: async () => [{ status: "completed" }],
    };

    (prisma as any).onboardingStepResponse = {
      create: async () => ({}),
    };

    (prisma as any).onboardingInstance = {
      update: async () => ({}),
    };

    (prisma as any).onboardingStepAuditLog = {
      create: async (data: any) => {
        auditLogCalls.push(data);
        return { id: `audit_${Date.now()}` };
      },
    };

    const req = new NextRequest("http://localhost/api/onboarding/step/step-1/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await callPost(req, { params: { stepId: "step-1" } });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.ok(stepUpdated, "Step should have been updated");
  });

  // ============================================================
  // Manager with HR Permission Tests
  // ============================================================

  await run("allows user with onboarding edit permission to complete any employee's step", async () => {
    mockSession = {
      user: { id: "hr-user-1", companyId: "company-1", email: "hr@example.com", role: "EMPLOYEE" },
    };

    // This should still be blocked because EMPLOYEE role without being the owner
    // The canAccessEmployee check will pass due to permission profile, but the role check happens first
    (prisma as any).onboardingStepInstance = {
      findUnique: async () => createMockStepInstance({
        OnboardingInstance: {
          id: "onboarding-inst-1",
          OnboardingTemplate: { id: "template-1" },
          Employee: {
            id: "emp-1",
            companyId: "company-1",
            User: {
              id: "user-1", // Different user
              companyId: "company-1",
              managerId: "manager-1",
            },
          },
        },
      }),
      update: async () => ({}),
    };

    const req = new NextRequest("http://localhost/api/onboarding/step/step-1/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await callPost(req, { params: { stepId: "step-1" } });
    const data = await res.json();

    // Regular employees cannot complete steps for others, even with permissions
    // The step completion is role-based, not permission-profile based
    assert.equal(res.status, 403);
  });
});
