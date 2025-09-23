import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

const originalLoad = (Module as any)._load;

async function withMockedModules(
  mocks: {
    prisma: Record<string, any>;
    session?: any;
  },
  callback: () => Promise<void>,
) {
  const session =
    mocks.session ?? {
      user: { id: "user-1", role: "ADMIN", companyId: "tenant-1" },
    };

  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === "@/lib/prisma") {
      return { prisma: mocks.prisma };
    }
    if (request === "@/lib/auth-options") {
      return { authOptions: {} };
    }
    if (request === "next-auth") {
      return {
        getServerSession: async () => session,
      };
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    await callback();
  } finally {
    (Module as any)._load = originalLoad;
  }
}

test("offboarding tenant isolation guards", async (t) => {
  await t.test("POST /api/offboarding/initiate rejects cross-tenant employee", async () => {
    const prisma = {
      employee: {
        findUnique: async () => ({
          id: "emp-other",
          companyId: "other-company",
          EmployeeOffboarding: null,
          User: {},
        }),
      },
    };

    await withMockedModules({ prisma }, async () => {
      const { POST } = await import(
        `../app/api/offboarding/initiate/route?test=${Math.random()}`
      );
      const res = await POST({
        json: async () => ({ employeeId: "emp-other" }),
      } as any);
      assert.equal(res.status, 403);
    });
  });

  await t.test("GET and PATCH /api/offboarding/[employeeId] reject cross-tenant access", async () => {
    const prisma = {
      employeeOffboarding: {
        findUnique: async () => ({
          id: "off-other",
          employeeId: "emp-other",
          Employee: {
            companyId: "other-company",
          },
        }),
        update: async () => {
          throw new Error("should not update");
        },
      },
    };

    await withMockedModules({ prisma }, async () => {
      const module = await import(
        `../app/api/offboarding/[employeeId]/route?test=${Math.random()}`
      );
      const resGet = await module.GET({} as any, {
        params: { employeeId: "emp-other" },
      });
      assert.equal(resGet.status, 403);

      const resPatch = await module.PATCH(
        {
          json: async () => ({ assetsToReturn: [] }),
        } as any,
        { params: { employeeId: "emp-other" } },
      );
      assert.equal(resPatch.status, 403);
    });
  });

  await t.test("POST /api/offboarding/[employeeId]/exit-interview rejects cross-tenant offboarding", async () => {
    const prisma = {
      employeeOffboarding: {
        findUnique: async () => ({
          id: "off-other",
          Employee: { companyId: "other-company" },
        }),
      },
    };

    await withMockedModules({ prisma }, async () => {
      const { POST } = await import(
        `../app/api/offboarding/[employeeId]/exit-interview/route?test=${Math.random()}`
      );
      const res = await POST(
        {
          json: async () => ({}),
        } as any,
        { params: { employeeId: "emp-other" } },
      );
      assert.equal(res.status, 403);
    });
  });

  await t.test("POST /api/offboarding rejects cross-tenant task creation", async () => {
    const prisma = {
      employeeOffboarding: {
        findUnique: async () => ({
          id: "off-other",
          employeeId: "emp-other",
          Employee: {
            companyId: "other-company",
            User: null,
            Department: null,
            JobRole: null,
          },
        }),
      },
    };

    await withMockedModules({ prisma }, async () => {
      const { POST } = await import(
        `../app/api/offboarding/route?test=${Math.random()}`
      );
      const res = await POST({
        json: async () => ({
          offboardingId: "off-other",
          title: "Task",
          category: "OTHER",
        }),
      } as any);
      assert.equal(res.status, 403);
    });
  });

  await t.test("PATCH and DELETE /api/offboarding/tasks/[id] reject cross-tenant operations", async () => {
    const prisma = {
      offboardingTask: {
        findUnique: async () => ({
          id: "task-other",
          offboardingId: "off-other",
          EmployeeOffboarding: {
            employeeId: "emp-other",
            Employee: { companyId: "other-company" },
          },
        }),
        findMany: async () => {
          throw new Error("should not list");
        },
        delete: async () => {
          throw new Error("should not delete");
        },
        update: async () => {
          throw new Error("should not update");
        },
      },
      employeeOffboarding: {
        update: async () => {
          throw new Error("should not update");
        },
      },
      employee: {
        update: async () => {
          throw new Error("should not update");
        },
      },
    };

    await withMockedModules({ prisma }, async () => {
      const module = await import(
        `../app/api/offboarding/tasks/[id]/route?test=${Math.random()}`
      );
      const resPatch = await module.PATCH(
        {
          json: async () => ({}),
        } as any,
        { params: { id: "task-other" } },
      );
      assert.equal(resPatch.status, 403);

      const resDelete = await module.DELETE({} as any, {
        params: { id: "task-other" },
      });
      assert.equal(resDelete.status, 403);
    });
  });

  await t.test("POST /api/offboarding/send-invites rejects cross-tenant offboarding", async () => {
    const prisma = {
      employeeOffboarding: {
        findUnique: async () => ({
          id: "off-other",
          Employee: { companyId: "other-company" },
        }),
      },
    };

    await withMockedModules({ prisma }, async () => {
      const { POST } = await import(
        `../app/api/offboarding/send-invites/route?test=${Math.random()}`
      );
      const res = await POST({
        json: async () => ({ offboardingId: "off-other" }),
      } as any);
      assert.equal(res.status, 403);
    });
  });

  await t.test("POST /api/offboarding/send-form-invite rejects cross-tenant offboarding", async () => {
    const prisma = {
      employeeOffboarding: {
        findUnique: async () => ({
          id: "off-other",
          Employee: { companyId: "other-company" },
          sendForm: true,
          completionStatus: "PENDING",
          formTiming: "NOW",
        }),
      },
    };

    await withMockedModules({ prisma }, async () => {
      const { POST } = await import(
        `../app/api/offboarding/send-form-invite/route?test=${Math.random()}`
      );
      const res = await POST({
        json: async () => ({ offboardingId: "off-other" }),
      } as any);
      assert.equal(res.status, 403);
    });
  });
});
