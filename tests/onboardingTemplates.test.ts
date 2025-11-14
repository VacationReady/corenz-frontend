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
        ...args.data,
        OnboardingStep: args.data.OnboardingStep?.create || [],
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
  assert.equal(result.OnboardingStep.length, 1);
  assert.equal(result.OnboardingStep[0].type, OnboardingStepType.FORM_FILL);
  assert.equal(result.OnboardingStep[0].formId, "form123");
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
      update: async (args: any) => ({
        ...args.data,
        OnboardingStep: args.data.OnboardingStep?.create || [],
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
  assert.equal(result.OnboardingStep[0].type, OnboardingStepType.ACKNOWLEDGE_DOCUMENT);
  assert.equal(result.OnboardingStep[0].documentId, "doc1");
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
