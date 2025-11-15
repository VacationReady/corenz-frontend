import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { OnboardingStepType } from "@prisma/client";
import { prisma } from "../app/lib/prisma";

test("mapSteps includes FORM_FILL steps", async () => {
  const { mapSteps } = await import(
    "../app/api/onboarding/templates/stepMapper"
  );
  const result = mapSteps([
    {
      type: "fill-form",
      label: "Form step",
      formId: "form123",
      metadata: { guidance: " Custom guidance " },
    },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].type, OnboardingStepType.FORM_FILL);
  assert.equal(result[0].formId, "form123");
  assert.deepEqual(result[0].metadata, { guidance: "Custom guidance" });
});

test("mapSteps includes ACKNOWLEDGE_DOCUMENT steps", async () => {
  const { mapSteps } = await import(
    "../app/api/onboarding/templates/stepMapper"
  );
  const result = mapSteps([
    { type: "acknowledge-document", label: "Read Doc", documentId: "doc1" },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].type, OnboardingStepType.ACKNOWLEDGE_DOCUMENT);
  assert.equal(result[0].documentId, "doc1");
});

test("createTemplate persists FORM_FILL step and returns it", async () => {
  const prismaMock = {
    department: {
      count: async () => 0,
    },
    jobRole: {
      count: async () => 0,
    },
    document: {
      findMany: async () => [],
    },
    form: {
      findMany: async () => [{ id: "form123" }],
    },
    journeyTemplate: {
      findMany: async () => [],
    },
    onboardingTemplate: {
      create: async (args: any) => ({
        id: args.data.id,
        companyId: session.user.companyId,
        name: args.data.name,
        description: args.data.description,
        isActive: args.data.isActive,
        updatedAt: new Date(),
        Department: [],
        JobRole: [],
        User: null,
        OnboardingStep: (args.data.OnboardingStep?.create || []).map((step: any) => ({
          ...step,
          Document: null,
          Form: null,
        })),
      }),
    },
  };

  const { createTemplate } = await import(
    "../app/api/onboarding/templates/actions"
  );

  const session = { user: { companyId: "c1", id: "u1" } };
  const body = {
    name: "Template",
    description: "",
    steps: [
      {
        type: "fill-form",
        label: "Fill Form",
        formId: "form123",
        metadata: { guidance: "" },
      },
    ],
  };

  const result = await createTemplate(session, body, prismaMock as any);
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].type, OnboardingStepType.FORM_FILL);
  assert.equal(result.steps[0].uiType, "fill-form");
  assert.equal(result.steps[0].formId, "form123");
  assert.deepEqual(result.steps[0].metadata, { guidance: "" });
});

test("updateTemplate cascades deletions before recreating steps", async () => {
  const callOrder: string[] = [];
  const prismaMock = {
    department: {
      count: async () => 0,
    },
    jobRole: {
      count: async () => 0,
    },
    document: {
      findMany: async () => [{ id: "doc1" }],
    },
    form: {
      findMany: async () => [],
    },
    journeyTemplate: {
      findMany: async () => [],
    },
    onboardingStepResponse: {
      deleteMany: mock.fn(async () => {
        callOrder.push("responses");
      }),
    },
    onboardingStepInstance: {
      deleteMany: mock.fn(async () => {
        callOrder.push("instances");
      }),
    },
    onboardingStep: {
      deleteMany: mock.fn(async () => {
        callOrder.push("steps");
      }),
    },
    onboardingTemplate: {
      findUnique: async () => ({
        id: "t1",
        companyId: session.user.companyId,
        name: "Template",
        description: "",
        isActive: true,
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        Department: [],
        JobRole: [],
        User: null,
        OnboardingStep: [],
      }),
      update: async (args: any) => ({
        id: args.where.id,
        companyId: session.user.companyId,
        name: args.data.name,
        description: args.data.description,
        isActive: args.data.isActive,
        updatedAt: new Date(),
        Department: [],
        JobRole: [],
        User: null,
        OnboardingStep: (args.data.OnboardingStep?.create || []).map((step: any) => ({
          ...step,
          Document: null,
          Form: null,
        })),
      }),
    },
  };

  const { updateTemplate } = await import(
    "../app/api/onboarding/templates/actions"
  );
  const session = { user: { companyId: "c1", id: "u1" } };
  const body = {
    id: "t1",
    name: "Template",
    steps: [
      {
        type: "acknowledge-document",
        label: "Read Doc",
        documentId: "doc1",
        metadata: { acknowledgementText: "" },
      },
    ],
  };

  const result = await updateTemplate(session, body, prismaMock as any);
  assert.deepEqual(callOrder, ["responses", "instances", "steps"]);
  assert.equal(result.steps[0].type, OnboardingStepType.ACKNOWLEDGE_DOCUMENT);
  assert.equal(result.steps[0].uiType, "acknowledge-document");
  assert.equal(result.steps[0].documentId, "doc1");
});

test("updateTemplate throws on stale version", async () => {
  const prismaMock = {
    department: { count: async () => 0 },
    jobRole: { count: async () => 0 },
    document: { findMany: async () => [] },
    form: { findMany: async () => [] },
    journeyTemplate: { findMany: async () => [] },
    onboardingStepResponse: { deleteMany: mock.fn(async () => {}) },
    onboardingStepInstance: { deleteMany: mock.fn(async () => {}) },
    onboardingStep: { deleteMany: mock.fn(async () => {}) },
    onboardingTemplate: {
      findUnique: async () => ({
        id: "t1",
        companyId: "c1",
        name: "Template",
        description: "",
        isActive: true,
        updatedAt: new Date("2024-01-02T00:00:00Z"),
        Department: [],
        JobRole: [],
        User: null,
        OnboardingStep: [],
      }),
      update: async () => {
        throw new Error("should not update when conflict detected");
      },
    },
  };

  const { updateTemplate, TemplateConflictError } = await import(
    "../app/api/onboarding/templates/actions"
  );

  const session = { user: { companyId: "c1", id: "u1" } };
  const body = {
    id: "t1",
    name: "Template",
    steps: [],
    lastKnownUpdatedAt: new Date("2024-01-01T00:00:00Z").toISOString(),
  };

  await assert.rejects(
    async () => updateTemplate(session, body, prismaMock as any),
    (err) => {
      assert.ok(err instanceof TemplateConflictError);
      assert.equal(err.latest.id, "t1");
      return true;
    },
  );

  assert.equal(prismaMock.onboardingStepResponse.deleteMany.mock.callCount(), 0);
  assert.equal(prismaMock.onboardingStepInstance.deleteMany.mock.callCount(), 0);
  assert.equal(prismaMock.onboardingStep.deleteMany.mock.callCount(), 0);
});

test("createTemplate throws when referencing out-of-scope form", async () => {
  const prismaMock = {
    department: {
      count: async () => 0,
    },
    jobRole: {
      count: async () => 0,
    },
    document: {
      findMany: async () => [],
    },
    form: {
      findMany: async () => [],
    },
    journeyTemplate: {
      findMany: async () => [],
    },
    onboardingTemplate: {
      create: async () => {
        throw new Error("should not be called");
      },
    },
  };

  const { createTemplate } = await import(
    "../app/api/onboarding/templates/actions"
  );

  const session = { user: { companyId: "c1", id: "u1" } };
  const body = {
    name: "Template",
    description: "",
    steps: [
      {
        type: "fill-form",
        label: "Fill Form",
        formId: "form123",
        metadata: { guidance: "" },
      },
    ],
  };

  await assert.rejects(
    () => createTemplate(session, body, prismaMock as any),
    /Forms must belong to the current company/,
  );
});

test("fetchTenantTemplates enforces tenant isolation and normalises metadata", async () => {
  const now = new Date();
  const mockPrisma = {
    onboardingTemplate: {
      findMany: async () => [
        {
          id: "tpl-tenant-a",
          companyId: "tenant-a",
          name: "Tenant A Template",
          description: "",
          isActive: true,
          updatedAt: now,
          User: null,
          Department: [],
          JobRole: [],
          OnboardingStep: [
            {
              id: "step-a",
              type: "INSTRUCTION",
              label: "Welcome",
              order: 1,
              templateId: "tpl-tenant-a",
              documentId: null,
              uploadType: null,
              instruction: "",
              formId: null,
              dependencies: [],
              metadata: { buttonLabel: "  Continue " },
              slaDays: null,
              taskOwnerId: null,
              trainingId: null,
              Document: null,
              Form: null,
            },
          ],
        },
        {
          id: "tpl-tenant-b",
          companyId: "tenant-b",
          name: "Tenant B Template",
          description: "",
          isActive: true,
          updatedAt: now,
          User: null,
          Department: [],
          JobRole: [],
          OnboardingStep: [
            {
              id: "step-b",
              type: "INSTRUCTION",
              label: "Do not leak",
              order: 1,
              templateId: "tpl-tenant-b",
              documentId: null,
              uploadType: null,
              instruction: "",
              formId: null,
              dependencies: [],
              metadata: { buttonLabel: "Private" },
              slaDays: null,
              taskOwnerId: null,
              trainingId: null,
              Document: null,
              Form: null,
            },
          ],
        },
      ],
    },
  };

  const { fetchTenantTemplates } = await import(
    "../app/api/onboarding/templates/tenantScopedFetch"
  );

  const templates = await fetchTenantTemplates("tenant-a", mockPrisma as any);
  assert.equal(templates.length, 1);
  assert.equal(templates[0].id, "tpl-tenant-a");
  assert.equal(templates[0].steps[0].uiType, "instructions");
  assert.deepEqual(templates[0].steps[0].metadata, { buttonLabel: "Continue" });
});

test("serializeTemplate rejects templates from other tenants", async () => {
  const { serializeTemplate } = await import(
    "../app/api/onboarding/templates/tenantScopedFetch"
  );

  const rawTemplate: any = {
    id: "tpl-foreign",
    companyId: "tenant-b",
    name: "Foreign",
    description: null,
    isActive: false,
    updatedAt: new Date(),
    User: null,
    Department: [],
    JobRole: [],
    OnboardingStep: [],
  };

  assert.throws(() => serializeTemplate(rawTemplate, "tenant-a"));
});

test("serializeTemplate normalises payroll metadata and exposes uiType", async () => {
  const { serializeTemplate } = await import(
    "../app/api/onboarding/templates/tenantScopedFetch"
  );

  const rawTemplate: any = {
    id: "tpl-payroll",
    companyId: "tenant-a",
    name: "Payroll heavy",
    description: "",
    isActive: true,
    updatedAt: new Date(),
    User: { id: "user-1", name: "Admin", email: "admin@example.com" },
    Department: [],
    JobRole: [],
    OnboardingStep: [
      {
        id: "step-payroll",
        type: "PAYROLL_SETUP",
        label: "Payroll",
        order: 1,
        templateId: "tpl-payroll",
        documentId: null,
        uploadType: null,
        instruction: "",
        formId: null,
        dependencies: [],
        metadata: {
          instructions: "Collect payroll info",
          fields: [
            {
              id: " ",
              label: "KiwiSaver employee rate ",
              fieldType: "kiwiSaverEmployeeRate",
              defaultValue: "0.04",
              required: true,
              options: ["0.04"],
            },
            {
              label: "Employment Type",
              fieldType: "select",
              options: [" Full-time ", "Part-time", ""],
              required: false,
              placeholder: "Select type",
            },
            {
              id: "irdNumber",
              label: "IRD",
              fieldType: "irdNumber",
              required: true,
              defaultValue: "",
            },
          ],
        },
        slaDays: null,
        taskOwnerId: null,
        trainingId: null,
        Document: null,
        Form: null,
      },
    ],
  };

  const serialized = serializeTemplate(rawTemplate, "tenant-a");
  assert.equal(serialized.steps.length, 1);
  const step = serialized.steps[0];
  assert.equal(step.type, "PAYROLL_SETUP");
  assert.equal(step.uiType, "payroll-setup");
  assert.equal(step.metadata.instructions, "Collect payroll info");
  assert.equal(step.metadata.fields.length, 3);
  assert.deepEqual(step.metadata.fields[0], {
    id: "payroll-1",
    label: "KiwiSaver employee rate",
    defaultValue: "0.04",
    placeholder: "",
    required: true,
    fieldType: "kiwiSaverEmployeeRate",
    options: ["0.03", "0.04", "0.06", "0.08", "0.10"],
  });
  assert.deepEqual(step.metadata.fields[1], {
    id: "payroll-2",
    label: "Employment Type",
    defaultValue: "Full-time",
    placeholder: "Select type",
    required: false,
    fieldType: "select",
    options: ["Full-time", "Part-time"],
  });
  assert.deepEqual(step.metadata.fields[2], {
    id: "irdNumber",
    label: "IRD",
    defaultValue: "",
    placeholder: "",
    required: true,
    fieldType: "irdNumber",
    options: [],
  });
});
