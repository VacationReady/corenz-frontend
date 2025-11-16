/**
 * Authentication and Authorization Tests for Onboarding Instances API
 * 
 * Verifies that:
 * 1. Unauthenticated requests return 401
 * 2. Cross-tenant access attempts return 403
 * 3. Valid tenant-scoped requests succeed
 * 4. Employee verification works correctly
 */

import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { prisma } from "../../app/lib/prisma";
import { NextRequest } from "next/server";

// Mock next-auth getServerSession
const originalLoad = (Module as any)._load;
let mockSession: any = null;

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next-auth") {
    return {
      getServerSession: async () => mockSession,
    };
  }
  if (request === "@/lib/supabase-admin") {
    return {
      storage: {
        from: () => ({
          createSignedUrl: async () => ({ data: { signedUrl: "https://signed" }, error: null }),
        }),
      },
    };
  }
  return originalLoad(request, parent, isMain);
};

let routeModulePromise: Promise<typeof import("../../app/api/onboarding/instances/[employeeId]/route")> | null = null;

async function getRouteModule() {
  if (!routeModulePromise) {
    routeModulePromise = import("../../app/api/onboarding/instances/[employeeId]/route");
  }
  return routeModulePromise;
}

async function callGet(req: NextRequest, context: any) {
  const { GET } = await getRouteModule();
  return GET(req, context);
}

test("GET /api/onboarding/instances/[employeeId] - returns 401 for unauthenticated requests", async () => {
  // No session
  mockSession = null;

  const req = new NextRequest("http://localhost/api/onboarding/instances/emp1");
  const res = await callGet(req, { params: { employeeId: "emp1" } });
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.error, "Unauthorized");
});

test("GET /api/onboarding/instances/[employeeId] - returns 401 for session without companyId", async () => {
  // Session without companyId
  mockSession = {
    user: { id: "user1", email: "test@example.com" },
  };

  const req = new NextRequest("http://localhost/api/onboarding/instances/emp1");
  const res = await callGet(req, { params: { employeeId: "emp1" } });
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.error, "Unauthorized");
});

test("GET /api/onboarding/instances/[employeeId] - returns 404 for non-existent employee", async () => {
  mockSession = {
    user: { id: "user1", companyId: "company1", email: "test@example.com" },
  };

  // Mock prisma to return no employee
  (prisma as any).employee = {
    findUnique: async () => null,
  };

  const req = new NextRequest("http://localhost/api/onboarding/instances/emp999");
  const res = await callGet(req, { params: { employeeId: "emp999" } });
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.error, "Employee not found");
});

test("GET /api/onboarding/instances/[employeeId] - returns 403 for cross-tenant access attempt", async () => {
  mockSession = {
    user: { id: "user1", companyId: "company1", email: "test@example.com" },
  };

  // Mock employee belonging to different company
  (prisma as any).employee = {
    findUnique: async () => ({
      id: "emp1",
      companyId: "company2", // Different company!
    }),
  };

  const req = new NextRequest("http://localhost/api/onboarding/instances/emp1");
  const res = await callGet(req, { params: { employeeId: "emp1" } });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.error, "Forbidden: Cross-tenant access denied");
});

test("GET /api/onboarding/instances/[employeeId] - returns 404 when no active instance exists for valid employee", async () => {
  mockSession = {
    user: { id: "user1", companyId: "company1", email: "test@example.com" },
  };

  // Mock employee in same company
  (prisma as any).employee = {
    findUnique: async () => ({
      id: "emp1",
      companyId: "company1",
    }),
  };

  // Mock no instance found
  (prisma as any).onboardingInstance = {
    findFirst: async () => null,
  };

  const req = new NextRequest("http://localhost/api/onboarding/instances/emp1");
  const res = await callGet(req, { params: { employeeId: "emp1" } });
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.error, "No active onboarding found");
});

test("GET /api/onboarding/instances/[employeeId] - successfully returns instance for valid tenant-scoped request", async () => {
  mockSession = {
    user: { id: "user1", companyId: "company1", email: "test@example.com" },
  };

  // Mock employee in same company
  (prisma as any).employee = {
    findUnique: async () => ({
      id: "emp1",
      companyId: "company1",
    }),
  };

  // Mock onboarding instance
  (prisma as any).onboardingInstance = {
    findFirst: async ({ where }: any) => {
      // Verify tenant scope is enforced in query
      assert.equal(where.employeeId, "emp1");
      assert.equal(where.OnboardingTemplate.companyId, "company1");

      return {
        id: "inst1",
        OnboardingStepInstance: [
          {
            id: "inst-step-1",
            stepId: "step-payroll",
            status: "pending",
            OnboardingStepResponse: [],
          },
        ],
        OnboardingTemplate: {
          name: "New Hire Onboarding",
          OnboardingStep: [
            {
              id: "step-payroll",
              type: "PAYROLL_SETUP",
              label: "Complete Payroll Setup",
              instruction: "Enter your bank details",
              uploadType: null,
              documentId: null,
              metadata: { fields: ["bankAccount", "taxNumber"] },
              formId: null,
              order: 1,
              Document: null,
              Form: null,
            },
          ],
        },
      };
    },
  };

  const req = new NextRequest("http://localhost/api/onboarding/instances/emp1");
  const res = await callGet(req, { params: { employeeId: "emp1" } });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.template.name, "New Hire Onboarding");
  assert.equal(data.steps.length, 1);
  
  // Verify step type mapping
  const payrollStep = data.steps[0];
  assert.equal(payrollStep.type, "payroll-setup"); // Hyphenated format
  assert.equal(payrollStep.label, "Complete Payroll Setup");
});

test("GET /api/onboarding/instances/[employeeId] - tenant scope prevents cross-tenant template access", async () => {
  mockSession = {
    user: { id: "user1", companyId: "company1", email: "test@example.com" },
  };

  // Mock employee in same company
  (prisma as any).employee = {
    findUnique: async () => ({
      id: "emp1",
      companyId: "company1",
    }),
  };

  let queryWasScoped = false;

  // Mock to verify query includes tenant scope
  (prisma as any).onboardingInstance = {
    findFirst: async ({ where }: any) => {
      // Check that the where clause includes tenant scoping
      if (where.OnboardingTemplate?.companyId === "company1") {
        queryWasScoped = true;
      }
      return null; // No instance found (expected for this test)
    },
  };

  const req = new NextRequest("http://localhost/api/onboarding/instances/emp1");
  await callGet(req, { params: { employeeId: "emp1" } });

  assert.ok(queryWasScoped, "Query must include OnboardingTemplate.companyId filter");
});
