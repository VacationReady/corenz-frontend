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

// Mock next-auth + auth() for onboarding instances API tests
const originalLoad = (Module as any)._load;
let mockSession: any = null;

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

const originalEmployeeModel = prisma.employee;
const originalInstanceModel = prisma.onboardingInstance;

function resetMocks() {
  mockSession = null;
  (prisma as any).employee = originalEmployeeModel;
  (prisma as any).onboardingInstance = originalInstanceModel;
}

test("Onboarding Instances API auth guards", async (t) => {
  const run = async (name: string, fn: () => Promise<void>) => {
    await t.test(name, async () => {
      resetMocks();
      await fn();
    });
  };

  await run("returns 401 for unauthenticated requests", async () => {
    const req = new NextRequest("http://localhost/api/onboarding/instances/emp1");
    const res = await callGet(req, { params: { employeeId: "emp1" } });
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthorized");
  });

  await run("returns 401 for session without companyId", async () => {
    mockSession = {
      user: { id: "user1", email: "test@example.com" },
    };

    const req = new NextRequest("http://localhost/api/onboarding/instances/emp1");
    const res = await callGet(req, { params: { employeeId: "emp1" } });
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthorized");
  });

  await run("returns 404 for non-existent employee", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "test@example.com" },
    };

    (prisma as any).employee = {
      findUnique: async () => null,
    };

    const req = new NextRequest("http://localhost/api/onboarding/instances/emp999");
    const res = await callGet(req, { params: { employeeId: "emp999" } });
    const data = await res.json();

    assert.equal(res.status, 404);
    assert.equal(data.error, "Employee not found");
  });

  await run("returns 403 for cross-tenant access attempt", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "test@example.com" },
    };

    (prisma as any).employee = {
      findUnique: async () => ({
        id: "emp1",
        companyId: "company2",
      }),
    };

    const req = new NextRequest("http://localhost/api/onboarding/instances/emp1");
    const res = await callGet(req, { params: { employeeId: "emp1" } });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.equal(data.error, "Forbidden: Cross-tenant access denied");
  });

  await run("returns 404 when no active instance exists for valid employee", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "test@example.com" },
    };

    (prisma as any).employee = {
      findUnique: async () => ({
        id: "emp1",
        companyId: "company1",
      }),
    };

    (prisma as any).onboardingInstance = {
      findFirst: async () => null,
    };

    const req = new NextRequest("http://localhost/api/onboarding/instances/emp1");
    const res = await callGet(req, { params: { employeeId: "emp1" } });
    const data = await res.json();

    assert.equal(res.status, 404);
    assert.equal(data.error, "No active onboarding found");
  });

  await run("successfully returns instance for valid tenant-scoped request", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "test@example.com" },
    };

    (prisma as any).employee = {
      findUnique: async () => ({
        id: "emp1",
        companyId: "company1",
      }),
    };

    let capturedWhere: any = null;

    (prisma as any).onboardingInstance = {
      findFirst: async ({ where }: any) => {
        capturedWhere = where;
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
    assert.equal(capturedWhere?.employeeId, "emp1");
    assert.equal(capturedWhere?.OnboardingTemplate?.companyId, "company1");

    const payrollStep = data.steps[0];
    assert.equal(payrollStep.type, "payroll-setup");
    assert.equal(payrollStep.label, "Complete Payroll Setup");
  });

  await run("tenant scope prevents cross-tenant template access", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "test@example.com" },
    };

    (prisma as any).employee = {
      findUnique: async () => ({
        id: "emp1",
        companyId: "company1",
      }),
    };

    let queryWasScoped = false;

    (prisma as any).onboardingInstance = {
      findFirst: async ({ where }: any) => {
        if (where.OnboardingTemplate?.companyId === "company1") {
          queryWasScoped = true;
        }
        return null;
      },
    };

    const req = new NextRequest("http://localhost/api/onboarding/instances/emp1");
    await callGet(req, { params: { employeeId: "emp1" } });

    assert.ok(queryWasScoped, "Query must include OnboardingTemplate.companyId filter");
  });

  await run("correctly maps all step types from database enums to UI types", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "test@example.com" },
    };

    (prisma as any).employee = {
      findUnique: async () => ({
        id: "emp1",
        companyId: "company1",
      }),
    };

    (prisma as any).onboardingInstance = {
      findFirst: async () => ({
        id: "inst1",
        OnboardingStepInstance: [
          { id: "inst-1", stepId: "step-1", status: "pending", OnboardingStepResponse: [] },
          { id: "inst-2", stepId: "step-2", status: "pending", OnboardingStepResponse: [] },
          { id: "inst-3", stepId: "step-3", status: "pending", OnboardingStepResponse: [] },
          { id: "inst-4", stepId: "step-4", status: "pending", OnboardingStepResponse: [] },
          { id: "inst-5", stepId: "step-5", status: "pending", OnboardingStepResponse: [] },
          { id: "inst-6", stepId: "step-6", status: "pending", OnboardingStepResponse: [] },
        ],
        OnboardingTemplate: {
          name: "Comprehensive Step Types",
          OnboardingStep: [
            {
              id: "step-1",
              type: "PAYROLL_SETUP",
              label: "Payroll Setup",
              instruction: "Configure payroll",
              uploadType: null,
              documentId: null,
              metadata: { fields: ["bankAccount"] },
              formId: null,
              order: 1,
              Document: null,
              Form: null,
            },
            {
              id: "step-2",
              type: "BENEFITS_ENROLLMENT",
              label: "Enroll in Benefits",
              instruction: "Choose benefits",
              uploadType: null,
              documentId: null,
              metadata: {},
              formId: null,
              order: 2,
              Document: null,
              Form: null,
            },
            {
              id: "step-3",
              type: "EQUIPMENT_CHECKLIST",
              label: "Equipment Sign-off",
              instruction: "Confirm equipment",
              uploadType: null,
              documentId: null,
              metadata: { items: [] },
              formId: null,
              order: 3,
              Document: null,
              Form: null,
            },
            {
              id: "step-4",
              type: "MANAGER_CHECKIN",
              label: "Meet Manager",
              instruction: "Schedule meeting",
              uploadType: null,
              documentId: null,
              metadata: {},
              formId: null,
              order: 4,
              Document: null,
              Form: null,
            },
            {
              id: "step-5",
              type: "COMPLIANCE_TRAINING",
              label: "Compliance Training",
              instruction: "Complete training",
              uploadType: null,
              documentId: null,
              metadata: {},
              formId: null,
              order: 5,
              Document: null,
              Form: null,
            },
            {
              id: "step-6",
              type: "JOURNEY_AUTOMATION",
              label: "Automated Journey",
              instruction: "Workflow trigger",
              uploadType: null,
              documentId: null,
              metadata: {},
              formId: null,
              order: 6,
              Document: null,
              Form: null,
            },
          ],
        },
      }),
    };

    const req = new NextRequest("http://localhost/api/onboarding/instances/emp1");
    const res = await callGet(req, { params: { employeeId: "emp1" } });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.steps.length, 6, "Should have 6 steps");

    // Verify all types are correctly mapped from DB enum to UI hyphenated format
    const expectedMappings = [
      { type: "payroll-setup", label: "Payroll Setup" },
      { type: "benefits-enrollment", label: "Enroll in Benefits" },
      { type: "equipment-checklist", label: "Equipment Sign-off" },
      { type: "manager-checkin", label: "Meet Manager" },
      { type: "compliance-training", label: "Compliance Training" },
      { type: "journey-automation", label: "Automated Journey" },
    ];

    expectedMappings.forEach((expected, idx) => {
      const step = data.steps[idx];
      assert.equal(
        step.type,
        expected.type,
        `Step ${idx + 1} type should be "${expected.type}" not "${step.type}"`,
      );
      assert.equal(
        step.label,
        expected.label,
        `Step ${idx + 1} label should match`,
      );
      // Verify metadata is hydrated
      assert.ok(
        step.metadata !== undefined,
        `Step ${idx + 1} should have metadata object`,
      );
    });
  });

  await run("metadata is hydrated for all step types", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "test@example.com" },
    };

    (prisma as any).employee = {
      findUnique: async () => ({
        id: "emp1",
        companyId: "company1",
      }),
    };

    (prisma as any).onboardingInstance = {
      findFirst: async () => ({
        id: "inst1",
        OnboardingStepInstance: [
          { id: "inst-1", stepId: "step-1", status: "pending", OnboardingStepResponse: [] },
        ],
        OnboardingTemplate: {
          name: "Metadata Test",
          OnboardingStep: [
            {
              id: "step-1",
              type: "PAYROLL_SETUP",
              label: "NZ Payroll",
              instruction: "Enter IRD details",
              uploadType: null,
              documentId: null,
              metadata: {
                fields: [
                  {
                    id: "irdNumber",
                    label: "IRD number",
                    placeholder: "123-456-789",
                    required: true,
                    fieldType: "irdNumber",
                  },
                  {
                    id: "taxCode",
                    label: "Tax code",
                    placeholder: "e.g. M SL",
                    required: true,
                    fieldType: "text",
                  },
                  {
                    id: "kiwiSaverRate",
                    label: "KiwiSaver rate",
                    required: false,
                    fieldType: "kiwiSaverEmployeeRate",
                  },
                ],
                nzCompliance: true,
                presetSlug: "nz-ird-number",
                tenantScope: ["company1"],
              },
              formId: null,
              order: 1,
              Document: null,
              Form: null,
            },
          ],
        },
      }),
    };

    const req = new NextRequest("http://localhost/api/onboarding/instances/emp1");
    const res = await callGet(req, { params: { employeeId: "emp1" } });
    const data = await res.json();

    assert.equal(res.status, 200);
    const step = data.steps[0];
    
    // Verify all metadata fields are preserved and normalized
    assert.ok(step.metadata, "Step should have metadata");
    assert.ok(Array.isArray(step.metadata.fields), "Fields should be an array");
    assert.equal(step.metadata.fields.length, 3, "Should have 3 fields");
    
    // Verify field structure is normalized correctly
    const irdField = step.metadata.fields.find((f: any) => f.id === "irdNumber");
    assert.ok(irdField, "IRD field should exist");
    assert.equal(irdField.fieldType, "irdNumber", "IRD field type should be preserved");
    assert.equal(irdField.required, true, "IRD field should be required");
    
    const taxField = step.metadata.fields.find((f: any) => f.id === "taxCode");
    assert.ok(taxField, "Tax code field should exist");
    assert.equal(taxField.fieldType, "text", "Tax code field type should be preserved");
    
    const kiwiField = step.metadata.fields.find((f: any) => f.id === "kiwiSaverRate");
    assert.ok(kiwiField, "KiwiSaver field should exist");
    assert.equal(kiwiField.fieldType, "kiwiSaverEmployeeRate", "KiwiSaver field type should be preserved");
    
    // Verify preset metadata is preserved
    assert.equal(
      step.metadata.presetSlug,
      "nz-ird-number",
      "Preset slug should be preserved",
    );
    assert.ok(
      Array.isArray(step.metadata.tenantScope),
      "Tenant scope should be preserved as array",
    );
    assert.ok(
      step.metadata.tenantScope.includes("company1"),
      "Tenant scope should include company1",
    );
  });
});
