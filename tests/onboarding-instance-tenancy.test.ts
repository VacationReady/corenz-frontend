/**
 * Regression Tests for Onboarding Instance API Tenant Security
 * 
 * Covers:
 * - POST /api/onboarding/instances tenant boundary enforcement
 * - Template lookup scoped to tenant
 * - Cross-tenant access prevention
 */

import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { NextRequest } from "next/server";

// Mock next-auth getServerSession
const originalLoad = (Module as any)._load;
let mockSession: any = null;
let mockPrisma: any = {};

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next-auth") {
    return {
      getServerSession: async () => mockSession,
    };
  }
  if (request === "@/lib/prisma") {
    return { prisma: mockPrisma };
  }
  return originalLoad(request, parent, isMain);
};

let routeModulePromise: Promise<typeof import("../app/api/onboarding/instances/route")> | null = null;

async function getRouteModule() {
  if (!routeModulePromise) {
    routeModulePromise = import("../app/api/onboarding/instances/route");
  }
  return routeModulePromise;
}

async function callPost(body: any) {
  const { POST } = await getRouteModule();
  const req = new NextRequest("http://localhost/api/onboarding/instances", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return POST(req);
}

function resetMocks() {
  mockSession = null;
  mockPrisma = {
    employee: {
      findUnique: async () => null,
    },
    onboardingTemplate: {
      findFirst: async () => null,
    },
    onboardingInstance: {
      findFirst: async () => null,
      create: async () => null,
    },
  };
}

test.skip("Onboarding Instance POST API tenant security", async (t) => {
  const run = async (name: string, fn: () => Promise<void>) => {
    await t.test(name, async () => {
      resetMocks();
      await fn();
    });
  };

  await run("returns 401 for unauthenticated requests", async () => {
    const res = await callPost({ employeeId: "emp1" });
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthorized");
  });

  await run("returns 401 for session without companyId", async () => {
    mockSession = {
      user: { id: "user1", email: "test@example.com" },
    };

    const res = await callPost({ employeeId: "emp1" });
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthorized");
  });

  await run("returns 404 for non-existent employee", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "test@example.com" },
    };

    mockPrisma.employee = {
      findUnique: async () => null,
    };

    const res = await callPost({ employeeId: "emp999" });
    const data = await res.json();

    assert.equal(res.status, 404);
    assert.equal(data.error, "Employee not found");
  });

  await run("returns 403 for cross-tenant employee access", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "test@example.com" },
    };

    mockPrisma.employee = {
      findUnique: async () => ({
        id: "emp1",
        companyId: "company2", // Different company!
        Department: {},
        JobRole: {},
      }),
    };

    const res = await callPost({ employeeId: "emp1" });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.equal(data.error, "Forbidden: Cross-tenant access denied");
  });

  await run("template lookup is scoped to tenant", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "test@example.com" },
    };

    mockPrisma.employee = {
      findUnique: async () => ({
        id: "emp1",
        companyId: "company1",
        jobRoleId: "role1",
        departmentId: "dept1",
        Department: {},
        JobRole: {},
      }),
    };

    let templateQueryCompanyId: string | null = null;

    mockPrisma.onboardingTemplate = {
      findFirst: async ({ where }: any) => {
        templateQueryCompanyId = where.companyId || null;
        return {
          id: "template1",
          OnboardingStep: [
            {
              id: "step1",
              type: "FORM_FILL",
              label: "Fill Form",
              order: 1,
            },
          ],
        };
      },
    };

    mockPrisma.onboardingInstance = {
      findFirst: async () => null,
      create: async () => ({
        id: "instance1",
        OnboardingStepInstance: [],
      }),
    };

    const res = await callPost({ employeeId: "emp1" });

    assert.equal(res.status, 201);
    assert.equal(
      templateQueryCompanyId,
      "company1",
      "Template lookup must be scoped to session companyId",
    );
  });

  await run("prevents duplicate onboarding for same employee", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "test@example.com" },
    };

    mockPrisma.employee = {
      findUnique: async () => ({
        id: "emp1",
        companyId: "company1",
        Department: {},
        JobRole: {},
      }),
    };

    mockPrisma.onboardingInstance = {
      findFirst: async () => ({
        id: "existing-instance",
        status: "active",
      }),
    };

    const res = await callPost({ employeeId: "emp1" });
    const data = await res.json();

    assert.equal(res.status, 409);
    assert.equal(data.error, "Onboarding already in progress");
  });

  await run("successfully creates instance for valid tenant-scoped request", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "test@example.com" },
    };

    mockPrisma.employee = {
      findUnique: async () => ({
        id: "emp1",
        companyId: "company1",
        jobRoleId: "role1",
        Department: {},
        JobRole: {},
      }),
    };

    mockPrisma.onboardingTemplate = {
      findFirst: async () => ({
        id: "template1",
        OnboardingStep: [
          {
            id: "step1",
            type: "PAYROLL_SETUP",
            label: "Payroll Setup",
            order: 1,
          },
          {
            id: "step2",
            type: "SYSTEM_ACCESS",
            label: "System Access",
            order: 2,
          },
        ],
      }),
    };

    mockPrisma.onboardingInstance = {
      findFirst: async () => null,
      create: async ({ data }: any) => {
        assert.equal(data.employeeId, "emp1");
        assert.equal(data.templateId, "template1");
        assert.equal(data.status, "active");
        assert.ok(data.OnboardingStepInstance);
        assert.equal(data.OnboardingStepInstance.create.length, 2);
        
        return {
          id: "new-instance",
          OnboardingStepInstance: data.OnboardingStepInstance.create.map((step: any) => ({
            ...step,
          })),
        };
      },
    };

    const res = await callPost({ employeeId: "emp1" });
    const data = await res.json();

    assert.equal(res.status, 201);
    assert.ok(data.id);
    assert.ok(data.OnboardingStepInstance);
  });
});
