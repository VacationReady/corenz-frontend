import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { POST } from "../app/api/onboarding/step/[stepId]/complete/route";
import { prisma } from "../app/lib/prisma";

const originalLoad = (Module as any)._load;
(Module as any)._load = function (
  request: string,
  parent: any,
  isMain: boolean,
) {
  if (request === "next-auth") {
    return {
      getServerSession: async () => ({
        user: { id: "user1", companyId: "company1", role: "ADMIN" },
      }),
    };
  }
  return originalLoad(request, parent, isMain);
};

function setupPrismaMocks(stepType: string, responses: any[] = []) {
  const createdPayloads: any[] = [];
  let documentCreated = false;

  (prisma as any).onboardingStepInstance = {
    findUnique: async () => ({
      id: "stepInstance1",
      stepId: "step",
      status: "pending",
      OnboardingStepResponse: responses,
      OnboardingInstance: {
        Employee: {
          id: "emp1",
          User: { id: "user1", companyId: "company1" },
        },
      },
      OnboardingStep: {
        type: stepType,
      },
    }),
    update: async () => ({}),
  };

  (prisma as any).onboardingStepResponse = {
    create: async (args: any) => {
      createdPayloads.push(args.data.response);
      return args;
    },
  };

  (prisma as any).document = {
    create: async () => {
      documentCreated = true;
    },
  };

  return {
    createdPayloads,
    documentCreatedRef: () => documentCreated,
  };
}

test("POST onboarding step stores form payloads verbatim", async () => {
  const { createdPayloads, documentCreatedRef } = setupPrismaMocks("FORM_FILL");

  const req = { json: async () => ({ formResponse: { foo: "bar" } }) } as any;
  const res = await POST(req, { params: { stepId: "stepInstance1" } });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { ok: true });

  assert.equal(createdPayloads.length, 1);
  assert.deepEqual(createdPayloads[0], { formResponse: { foo: "bar" } });
  assert.equal(documentCreatedRef(), false);
});

test("POST onboarding step infers acknowledgment payload when none provided", async () => {
  const { createdPayloads, documentCreatedRef } = setupPrismaMocks("ACKNOWLEDGE_DOCUMENT");

  const req = { json: async () => ({}) } as any;
  const res = await POST(req, { params: { stepId: "stepInstance1" } });

  assert.equal(res.status, 200);
  await res.json();

  assert.equal(createdPayloads.length, 1);
  assert.deepEqual(createdPayloads[0], { acknowledged: true });
  assert.equal(documentCreatedRef(), false);
});
