/**
 * Comprehensive metadata persistence tests for onboarding templates
 * 
 * Verifies that:
 * 1. Metadata is correctly saved to the database
 * 2. Metadata is correctly loaded from the database
 * 3. Tenant-specific metadata (NZ checklists, payroll schemas) persists across save/reload cycles
 * 4. Metadata normalization preserves all required fields
 */

import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { prisma } from "../app/lib/prisma";
import { NextRequest } from "next/server";

const originalLoad = (Module as any)._load;
let mockSession: any = {
  user: { id: "user1", companyId: "company1", email: "admin@example.com", role: "ADMIN" },
};

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next-auth") {
    return {
      getServerSession: async () => mockSession,
    };
  }
  return originalLoad(request, parent, isMain);
};

let routeModulePromise: Promise<typeof import("../app/api/onboarding/templates/route")> | null = null;

async function getRouteModule() {
  if (!routeModulePromise) {
    routeModulePromise = import("../app/api/onboarding/templates/route");
  }
  return routeModulePromise;
}

async function callPost(req: NextRequest) {
  const { POST } = await getRouteModule();
  return POST(req);
}

async function callPut(req: NextRequest) {
  const { PUT } = await getRouteModule();
  return PUT(req);
}

async function callGet(req: NextRequest) {
  const { GET } = await getRouteModule();
  return GET(req);
}

const originalUserModel = prisma.user;
const originalTemplateModel = prisma.onboardingTemplate;
const originalStepModel = prisma.onboardingStep;

function resetMocks() {
  (prisma as any).user = originalUserModel;
  (prisma as any).onboardingTemplate = originalTemplateModel;
  (prisma as any).onboardingStep = originalStepModel;
}

test("Metadata persistence through save/reload cycles", async (t) => {
  const run = async (name: string, fn: () => Promise<void>) => {
    await t.test(name, async () => {
      resetMocks();
      await fn();
    });
  };

  await run("NZ payroll setup metadata persists across save and reload", async () => {
    const savedTemplate: any = {
      id: "template1",
      companyId: "company1",
      name: "NZ Onboarding",
      description: "Template with NZ compliance",
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: "user1",
      updatedById: "user1",
    };

    const savedSteps: any[] = [];

    (prisma as any).user = {
      findUnique: async () => ({
        id: "user1",
        role: "ADMIN",
        PermissionProfile: null,
      }),
    };

    (prisma as any).onboardingTemplate = {
      create: async ({ data }: any) => {
        Object.assign(savedTemplate, data);
        return savedTemplate;
      },
      findUnique: async ({ where, select }: any) => {
        if (where.id !== savedTemplate.id) return null;
        return {
          ...savedTemplate,
          User: { id: "user1", name: "Admin", email: "admin@example.com" },
          Department: [],
          JobRole: [],
          OnboardingStep: savedSteps,
        };
      },
    };

    (prisma as any).onboardingStep = {
      createMany: async ({ data }: any) => {
        savedSteps.push(...data);
        return { count: data.length };
      },
    };

    // 1. Create template with NZ-specific metadata
    const createPayload = {
      name: "NZ Onboarding",
      description: "Template with NZ compliance",
      departments: [],
      jobRoles: [],
      steps: [
        {
          type: "payroll-setup",
          title: "Complete IRD Number",
          description: "Enter your IRD details",
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
        },
        {
          type: "upload-document",
          title: "Upload Bank Details",
          description: "Provide your NZ bank account",
          uploadType: "other",
          metadata: {
            validationRules: {
              accountFormat: "NZ",
              requireBranch: true,
            },
            presetSlug: "nz-bank-account",
            tenantScope: ["company1"],
          },
        },
        {
          type: "equipment-checklist",
          title: "Equipment Sign-off",
          description: "Confirm equipment receipt",
          metadata: {
            items: [
              { id: "laptop", label: "Laptop", required: true, notes: "HP EliteBook" },
              { id: "phone", label: "Mobile Phone", required: false, notes: "" },
            ],
          },
        },
      ],
    };

    const createReq = new NextRequest("http://localhost/api/onboarding/templates", {
      method: "POST",
      body: JSON.stringify(createPayload),
    });

    const createRes = await callPost(createReq);
    const createData = await createRes.json();

    assert.equal(createRes.status, 200, "Template creation should succeed");
    assert.ok(createData.id, "Created template should have an ID");

    // 2. Verify steps were saved with metadata
    assert.equal(savedSteps.length, 3, "Should have saved 3 steps");

    const payrollStep = savedSteps[0];
    assert.ok(payrollStep.metadata, "Payroll step should have metadata");
    assert.ok(
      Array.isArray(payrollStep.metadata.fields),
      "Payroll step metadata should include fields array",
    );
    assert.equal(payrollStep.metadata.fields.length, 3, "Should have 3 fields");
    
    // Verify normalized fields contain expected IDs
    const fieldIds = payrollStep.metadata.fields.map((f: any) => f.id);
    assert.ok(fieldIds.includes("irdNumber"), "Should include irdNumber field");
    assert.ok(fieldIds.includes("taxCode"), "Should include taxCode field");
    assert.ok(fieldIds.includes("kiwiSaverRate"), "Should include kiwiSaverRate field");
    
    assert.equal(
      payrollStep.metadata.presetSlug,
      "nz-ird-number",
      "Preset slug should be preserved",
    );

    const uploadStep = savedSteps[1];
    assert.ok(uploadStep.metadata.validationRules, "Upload step should have validation rules");
    assert.equal(
      uploadStep.metadata.validationRules.accountFormat,
      "NZ",
      "NZ account format should be preserved",
    );

    const equipmentStep = savedSteps[2];
    assert.ok(Array.isArray(equipmentStep.metadata.items), "Equipment items should be an array");
    assert.equal(equipmentStep.metadata.items.length, 2, "Should have 2 equipment items");
    assert.equal(
      equipmentStep.metadata.items[0].notes,
      "HP EliteBook",
      "Equipment notes should be preserved",
    );

    // 3. Load the template via GET and verify metadata is hydrated
    const getReq = new NextRequest(
      `http://localhost/api/onboarding/templates?id=${createData.id}`,
    );
    const getRes = await callGet(getReq);
    const loadedTemplate = await getRes.json();

    assert.equal(getRes.status, 200, "Template load should succeed");
    assert.equal(loadedTemplate.steps.length, 3, "Loaded template should have 3 steps");

    // Verify payroll metadata
    const loadedPayroll = loadedTemplate.steps.find(
      (s: any) => s.label === "Complete IRD Number",
    );
    assert.ok(loadedPayroll, "Should find payroll step");
    assert.ok(Array.isArray(loadedPayroll.metadata.fields), "Loaded fields should be an array");
    assert.equal(loadedPayroll.metadata.fields.length, 3, "Should have 3 fields");
    
    // Verify loaded fields contain expected IDs
    const loadedFieldIds = loadedPayroll.metadata.fields.map((f: any) => f.id);
    assert.ok(loadedFieldIds.includes("irdNumber"), "Should include irdNumber field");
    assert.ok(loadedFieldIds.includes("taxCode"), "Should include taxCode field");
    assert.ok(loadedFieldIds.includes("kiwiSaverRate"), "Should include kiwiSaverRate field");
    
    assert.equal(
      loadedPayroll.metadata.presetSlug,
      "nz-ird-number",
      "Loaded preset slug should match",
    );

    // Verify upload metadata
    const loadedUpload = loadedTemplate.steps.find(
      (s: any) => s.label === "Upload Bank Details",
    );
    assert.ok(loadedUpload, "Should find upload step");
    assert.equal(
      loadedUpload.metadata.validationRules?.accountFormat,
      "NZ",
      "Loaded validation rules should be preserved",
    );

    // Verify equipment metadata
    const loadedEquipment = loadedTemplate.steps.find(
      (s: any) => s.label === "Equipment Sign-off",
    );
    assert.ok(loadedEquipment, "Should find equipment step");
    assert.equal(
      loadedEquipment.metadata.items[0].notes,
      "HP EliteBook",
      "Loaded equipment notes should be preserved",
    );
  });

  await run("Metadata normalization preserves all required fields", async () => {
    const savedSteps: any[] = [];

    (prisma as any).user = {
      findUnique: async () => ({
        id: "user1",
        role: "ADMIN",
        PermissionProfile: null,
      }),
    };

    (prisma as any).onboardingTemplate = {
      create: async ({ data }: any) => ({
        id: "template2",
        companyId: "company1",
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findUnique: async () => ({
        id: "template2",
        companyId: "company1",
        name: "Test",
        description: null,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "user1",
        updatedById: "user1",
        User: { id: "user1", name: "Admin", email: "admin@example.com" },
        Department: [],
        JobRole: [],
        OnboardingStep: savedSteps,
      }),
    };

    (prisma as any).onboardingStep = {
      createMany: async ({ data }: any) => {
        savedSteps.push(...data);
        return { count: data.length };
      },
    };

    const createPayload = {
      name: "Metadata Test",
      description: "Testing metadata normalization",
      departments: [],
      jobRoles: [],
      steps: [
        {
          type: "payroll-setup",
          title: "Payroll",
          description: "Setup payroll",
          metadata: {
            fields: ["bankAccount"],
            customField: "customValue",
          },
        },
        {
          type: "welcome-survey",
          title: "Survey",
          description: "Welcome survey",
          metadata: {
            questions: [{ id: "q1", text: "How are you?" }],
          },
        },
        {
          type: "manager-checkin",
          title: "Check-in",
          description: "Meet your manager",
          metadata: {
            scheduledAt: "2025-01-01",
            agenda: ["Introduction", "Goals"],
          },
        },
      ],
    };

    const createReq = new NextRequest("http://localhost/api/onboarding/templates", {
      method: "POST",
      body: JSON.stringify(createPayload),
    });

    const createRes = await callPost(createReq);
    assert.equal(createRes.status, 200, "Should create template");

    // Verify each step type has its normalized metadata structure
    const payrollStep = savedSteps.find((s) => s.label === "Payroll");
    assert.ok(payrollStep.metadata.fields, "Payroll metadata should have fields");
    
    const surveyStep = savedSteps.find((s) => s.label === "Survey");
    assert.ok(surveyStep.metadata.questions, "Survey metadata should have questions");
    
    const checkinStep = savedSteps.find((s) => s.label === "Check-in");
    assert.ok(checkinStep.metadata.scheduledAt, "Check-in metadata should have scheduledAt");
  });

  await run("Tenant scope metadata is preserved and not lost on reload", async () => {
    const savedSteps: any[] = [];

    (prisma as any).user = {
      findUnique: async () => ({
        id: "user1",
        role: "ADMIN",
        PermissionProfile: null,
      }),
    };

    (prisma as any).onboardingTemplate = {
      create: async ({ data }: any) => ({
        id: "template3",
        companyId: "company1",
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findUnique: async () => ({
        id: "template3",
        companyId: "company1",
        name: "Multi-tenant Template",
        description: null,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "user1",
        updatedById: "user1",
        User: { id: "user1", name: "Admin", email: "admin@example.com" },
        Department: [],
        JobRole: [],
        OnboardingStep: savedSteps,
      }),
    };

    (prisma as any).onboardingStep = {
      createMany: async ({ data }: any) => {
        savedSteps.push(...data);
        return { count: data.length };
      },
    };

    const createPayload = {
      name: "Multi-tenant Template",
      description: "Template with tenant-scoped steps",
      departments: [],
      jobRoles: [],
      steps: [
        {
          type: "compliance-training",
          title: "NZ Health & Safety Training",
          description: "Complete H&S training",
          metadata: {
            presetSlug: "nz-health-safety",
            tenantScope: ["company1", "company2"],
            trainingModuleId: "hs-nz-001",
          },
        },
      ],
    };

    const createReq = new NextRequest("http://localhost/api/onboarding/templates", {
      method: "POST",
      body: JSON.stringify(createPayload),
    });

    const createRes = await callPost(createReq);
    const createData = await createRes.json();

    assert.equal(createRes.status, 200, "Should create template");

    // Verify tenant scope was saved
    const savedStep = savedSteps[0];
    assert.ok(Array.isArray(savedStep.metadata.tenantScope), "Tenant scope should be an array");
    assert.equal(savedStep.metadata.tenantScope.length, 2, "Should have 2 tenants in scope");
    assert.ok(
      savedStep.metadata.tenantScope.includes("company1"),
      "Should include company1",
    );
    assert.ok(
      savedStep.metadata.tenantScope.includes("company2"),
      "Should include company2",
    );

    // Load template and verify tenant scope is preserved
    const getReq = new NextRequest(
      `http://localhost/api/onboarding/templates?id=${createData.id}`,
    );
    const getRes = await callGet(getReq);
    const loadedTemplate = await getRes.json();

    const loadedStep = loadedTemplate.steps[0];
    assert.ok(
      Array.isArray(loadedStep.metadata.tenantScope),
      "Loaded tenant scope should be an array",
    );
    assert.equal(
      loadedStep.metadata.tenantScope.length,
      2,
      "Loaded tenant scope should have 2 tenants",
    );
    assert.ok(
      loadedStep.metadata.tenantScope.includes("company1"),
      "Loaded scope should include company1",
    );
    assert.ok(
      loadedStep.metadata.tenantScope.includes("company2"),
      "Loaded scope should include company2",
    );
  });
});
