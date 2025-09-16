import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

test("DELETE /api/employees/[id] removes Supabase files for related documents", async () => {
  const originalLoad = (Module as any)._load;
  const supabaseRemoveCalls: string[][] = [];
  const deleteManyCalls: any[] = [];
  const employeeDocPaths = ["employee/doc.pdf"];
  const companyDocPaths = ["company/doc.pdf"];

  (Module as any)._load = function (
    request: string,
    parent: any,
    isMain: boolean,
  ) {
    if (request === "@/lib/prisma") {
      return {
        prisma: {
          employee: {
            findUnique: async (args: any) => ({
              id: args.where.id,
              userId: "user-1",
              companyId: "company-1",
              user: { companyId: "company-1" },
            }),
          },
          $transaction: async (callback: any) => {
            const tx: any = {
              onboardingStepResponse: { deleteMany: async () => ({}) },
              onboardingStepInstance: { deleteMany: async () => ({}) },
              onboardingInstance: { deleteMany: async () => ({}) },
              formDataRecord: { deleteMany: async () => ({}) },
              formSubmission: { deleteMany: async () => ({}) },
              formAssignment: { deleteMany: async () => ({}) },
              documentAcknowledgement: { deleteMany: async () => ({}) },
              employmentCheck: { deleteMany: async () => ({}) },
              driverLicence: { deleteMany: async () => ({}) },
              trainingRecord: { deleteMany: async () => ({}) },
              leaveEntitlement: { deleteMany: async () => ({}) },
              leaveRequest: { deleteMany: async () => ({}) },
              employeeOffboarding: { deleteMany: async () => ({}) },
              document: {
                findMany: async (args: any) => {
                  if (args?.where?.employeeId) {
                    return employeeDocPaths.map((path) => ({ path }));
                  }
                  if (args?.where?.uploaderId) {
                    return companyDocPaths.map((path) => ({ path }));
                  }
                  return [];
                },
                deleteMany: async (args: any) => {
                  deleteManyCalls.push(args);
                  return { count: 1 };
                },
                updateMany: async () => ({ count: 0 }),
              },
              user: {
                findFirst: async () => null,
                delete: async () => ({}),
              },
              onboardingAssignment: { deleteMany: async () => ({}) },
              activationToken: { deleteMany: async () => ({}) },
              savedReport: { deleteMany: async () => ({}) },
              newsPost: { deleteMany: async () => ({}) },
              employeeWorkingPatternAssignment: { deleteMany: async () => ({}) },
              employee: { delete: async () => ({}) },
            };

            return callback(tx);
          },
        },
      };
    }
    if (request === "@/lib/supabase-admin") {
      return {
        default: {
          storage: {
            from: () => ({
              remove: async (paths: string[]) => {
                supabaseRemoveCalls.push(paths);
                return { data: null, error: null };
              },
            }),
          },
        },
      };
    }
    if (request === "next-auth") {
      return {
        getServerSession: async () => ({
          user: { id: "admin-1", companyId: "company-1", role: "ADMIN" },
        }),
      };
    }
    if (request === "@/lib/auth-options") {
      return { authOptions: {} };
    }
    if (request === "@/lib/permissions") {
      return { canAccessEmployee: async () => true };
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    const { DELETE } = await import("../app/api/employees/[id]/route");
    const res = await DELETE({} as Request, { params: { id: "emp-1" } });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { success: true, deleted: true });

    assert.equal(supabaseRemoveCalls.length, 1);
    const removed = new Set(supabaseRemoveCalls[0]);
    assert.equal(removed.has("employee/doc.pdf"), true);
    assert.equal(removed.has("company/doc.pdf"), true);
    assert.equal(deleteManyCalls.length, 2);
  } finally {
    (Module as any)._load = originalLoad;
  }
});
