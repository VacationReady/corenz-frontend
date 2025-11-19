import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { prisma } from "../app/lib/prisma";
import { NextRequest } from "next/server";

const originalLoad = (Module as any)._load;
let mockSession: any = {
  user: { id: "user1", companyId: "company1", email: "test@example.com" },
};

// Mock next-auth and supabase before importing the route so getServerSession
// never calls headers() outside a request scope.
(Module as any)._load = function (
  request: string,
  parent: any,
  isMain: boolean,
) {
  if (request === "next-auth") {
    return {
      getServerSession: async () => mockSession,
    };
  }
  if (request === "@/lib/supabase-admin") {
    return {
      storage: {
        from: () => ({
          createSignedUrl: async () => ({
            data: { signedUrl: "https://signed" },
            error: null,
          }),
        }),
      },
    };
  }
  return originalLoad(request, parent, isMain);
};

const routePromise = import("../app/api/onboarding/instances/[employeeId]/route");

test.after(() => {
  (Module as any)._load = originalLoad;
});

test("GET onboarding instance hydrates metadata and responses", async () => {
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
        {
          id: "inst-step-1",
          stepId: "step-doc",
          status: "pending",
          OnboardingStepResponse: [],
        },
        {
          id: "inst-step-2",
          stepId: "step-form",
          status: "completed",
          OnboardingStepResponse: [
            {
              response: { formResponse: { field: "value" } },
            },
          ],
        },
        {
          id: "inst-step-3",
          stepId: "step-equipment",
          status: "pending",
          OnboardingStepResponse: [
            {
              response: {
                equipmentChecklist: [{ id: "laptop", completed: true }],
              },
            },
          ],
        },
      ],
      OnboardingTemplate: {
        name: "Template",
        OnboardingStep: [
          {
            id: "step-doc",
            type: "ACKNOWLEDGE_DOCUMENT",
            label: "Acknowledge",
            instruction: "Review",
            uploadType: null,
            documentId: "doc1",
            metadata: {},
            formId: null,
            order: 1,
            Document: {
              id: "doc1",
              name: "Policy",
              url: "documents/policy.pdf",
            },
            Form: null,
          },
          {
            id: "step-form",
            type: "FORM_FILL",
            label: "Fill form",
            instruction: null,
            uploadType: null,
            documentId: null,
            metadata: { defaults: true },
            formId: "form1",
            order: 2,
            Document: null,
            Form: {
              id: "form1",
              name: "Welcome",
              formType: "SURVEY",
            },
          },
          {
            id: "step-equipment",
            type: "EQUIPMENT_CHECKLIST",
            label: "Equipment",
            instruction: "Issue gear",
            uploadType: null,
            documentId: null,
            metadata: {
              items: [{ id: "laptop", label: "Laptop" }],
            },
            formId: null,
            order: 3,
            Document: null,
            Form: null,
          },
        ],
      },
    }),
  };

  const req = new NextRequest("http://localhost");
  const { GET } = await routePromise;
  const res = await GET(req, { params: { employeeId: "emp1" } });
  const data = await res.json();

  assert.equal(data.template.name, "Template");
  assert.equal(data.steps.length, 3);
  const docStep = data.steps[0];
  assert.equal(docStep.type, "acknowledge-document");
  assert.equal(docStep.document?.url, "https://signed");
  assert.deepEqual(docStep.metadata, {
    acknowledgementText: "I have read and acknowledge this document",
  });
  const formStep = data.steps[1];
  assert.equal(formStep.form?.id, "form1");
  assert.deepEqual(formStep.existingResponse, { formResponse: { field: "value" } });
  assert.deepEqual(formStep.metadata, { guidance: "" });
  const equipmentStep = data.steps[2];
  assert.deepEqual(equipmentStep.metadata, {
    items: [{ id: "laptop", label: "Laptop", required: true, notes: "" }],
    instructions: "",
  });
  assert.deepEqual(equipmentStep.existingResponse, {
    equipmentChecklist: [{ id: "laptop", completed: true }],
  });
});
