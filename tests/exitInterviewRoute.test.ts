import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

// Ensure the route returns 400 when sendForm is true but formTemplateId is invalid

test("POST /api/offboarding/[employeeId]/exit-interview validates formTemplateId", async () => {
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (
    request: string,
    parent: any,
    isMain: boolean,
  ) {
    if (request === "@/lib/prisma") {
      return {
        prisma: {
          employeeOffboarding: {
            findUnique: async () => ({ id: "o1", completionTokenHash: null }),
            update: async () => ({}),
          },
          exitInterview: {
            upsert: async () => ({ interviewerId: null }),
          },
          exitInterviewFormTemplate: {
            findUnique: async () => null, // simulate missing template
          },
        },
      };
    }
    if (request === "@/lib/auth-options") {
      return { authOptions: {} };
    }
    if (request === "next-auth") {
      return { getServerSession: async () => ({ user: { id: "u1" } }) };
    }
    if (request === "@/lib/email/send") {
      return { generateCompletionToken: () => "tok" };
    }
    return originalLoad(request, parent, isMain);
  };

  const { POST } = await import(
    "../app/api/offboarding/[employeeId]/exit-interview/route"
  );
  const req = {
    json: async () => ({ sendForm: true, formTemplateId: "bad" }),
  } as any;
  const res = await POST(req, { params: { employeeId: "e1" } });
  assert.equal(res.status, 400);
  (Module as any)._load = originalLoad;
});
