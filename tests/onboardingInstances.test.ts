import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/db";

import { prisma } from "../app/lib/prisma";
import { GET } from "../app/api/onboarding/instances/[employeeId]/route";

// Ensure NextRequest is available for instantiation
import { NextRequest } from "next/server";

test("GET onboarding instance maps FORM_FILL steps", async () => {
  (prisma as any).onboardingInstance = {
    findFirst: async () => ({
      id: "inst1",
      steps: [],
      template: {
        name: "Template",
        steps: [
          {
            id: "step1",
            type: "FORM_FILL",
            label: "Fill Form",
            instruction: null,
            uploadType: null,
            documentId: null,
            document: null,
            formId: "form123",
            order: 1,
          },
        ],
      },
    }),
  };

  const req = new NextRequest("http://localhost");
  const res = await GET(req, { params: { employeeId: "e1" } });
  const data = await res.json();
  assert.equal(data.steps[0].type, "fill-form");
  assert.equal(data.steps[0].formId, "form123");
});
