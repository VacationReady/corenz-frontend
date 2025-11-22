import "./setupEnv";

// Skip in CI
if (process.env.CI || process.env.GITHUB_ACTIONS) {
  process.exit(0);
}

import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { NextRequest } from "next/server";

// Mock next-auth and prisma
const originalLoad = (Module as any)._load;
let mockSession: any = null;
let mockPrisma: any = {};

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next-auth") {
    return {
      getServerSession: async () => mockSession,
    };
  }
  if (request === "@/lib/auth-options" || request === "../app/lib/auth-options") {
    return { authOptions: {} };
  }
  if (request === "@/lib/prisma") {
    return { prisma: mockPrisma };
  }
  return originalLoad(request, parent, isMain);
};

let routeModulePromise: Promise<typeof import("../../app/api/event-categories/route")> | null = null;
let idRouteModulePromise: Promise<typeof import("../../app/api/event-categories/[id]/route")> | null = null;

async function getRouteModule() {
  if (!routeModulePromise) {
    routeModulePromise = import("../../app/api/event-categories/route");
  }
  return routeModulePromise;
}

async function getIdRouteModule() {
  if (!idRouteModulePromise) {
    idRouteModulePromise = import("../../app/api/event-categories/[id]/route");
  }
  return idRouteModulePromise;
}

async function callGet(req: NextRequest) {
  const module = await getRouteModule();
  return (module as any).GET(req);
}

async function callPost(req: NextRequest) {
  const module = await getRouteModule();
  return (module as any).POST(req);
}

async function callPatch(req: NextRequest, context: any) {
  const module = await getIdRouteModule();
  return (module as any).PATCH(req, context);
}

function resetMocks() {
  mockSession = null;
  mockPrisma.eventCategory = {
    findMany: async () => [],
    findFirst: async () => null,
    create: async () => {},
    updateMany: async () => ({ count: 1 }),
  };
}

test("Event Categories API - Icon Support", async (t) => {
  const run = async (name: string, fn: () => Promise<void>) => {
    await t.test(name, async () => {
      resetMocks();
      await fn();
    });
  };

  await run("GET: returns categories with iconKey", async () => {
    mockSession = {
      user: { companyId: "company1" },
    };

    mockPrisma.eventCategory.findMany = async () => [
      {
        id: "cat1",
        name: "Cat 1",
        iconKey: "sun",
        EventSubcategory: [],
      },
    ];

    const req = new NextRequest("http://localhost/api/event-categories");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.length, 1);
    assert.equal(data[0].iconKey, "sun");
  });

  await run("POST: creates category with iconKey", async () => {
    mockSession = {
      user: { companyId: "company1", role: "ADMIN" },
    };

    let capturedData: any = null;
    mockPrisma.eventCategory.create = async ({ data }: any) => {
      capturedData = data;
      return { ...data, id: "new-id" };
    };

    const req = new NextRequest("http://localhost/api/event-categories", {
      method: "POST",
      body: JSON.stringify({
        name: "New Cat",
        categoryType: "TIME_OFF",
        iconKey: "umbrella",
      }),
    });
    
    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(capturedData.iconKey, "umbrella");
  });

  await run("PATCH: updates iconKey", async () => {
    mockSession = {
      user: { companyId: "company1", role: "ADMIN" },
    };

    mockPrisma.eventCategory.findFirst = async ({ where }: any) => {
       // Mock finding the category
       if (where.id === "cat1") {
           return { id: "cat1", systemDefined: false, name: "Cat 1" };
       }
       return null; // for finding existing in update return
    };

    let capturedData: any = null;
    mockPrisma.eventCategory.updateMany = async ({ data }: any) => {
      capturedData = data;
      return { count: 1 };
    };

    const req = new NextRequest("http://localhost/api/event-categories/cat1", {
      method: "PATCH",
      body: JSON.stringify({
        iconKey: "plane",
      }),
    });

    const res = await callPatch(req, { params: Promise.resolve({ id: "cat1" }) });
    
    assert.equal(res.status, 200);
    assert.equal(capturedData.iconKey, "plane");
  });

  await run("PATCH: allows updating iconKey for systemDefined category", async () => {
    mockSession = {
        user: { companyId: "company1", role: "ADMIN" },
    };

    mockPrisma.eventCategory.findFirst = async ({ where }: any) => {
         if (where.id === "sys1") {
             return { id: "sys1", systemDefined: true, name: "System Cat" };
         }
         return null;
    };

    let capturedData: any = null;
    mockPrisma.eventCategory.updateMany = async ({ data }: any) => {
        capturedData = data;
        return { count: 1 };
    };

    const req = new NextRequest("http://localhost/api/event-categories/sys1", {
        method: "PATCH",
        body: JSON.stringify({
            iconKey: "heartPulse",
        }),
    });

    const res = await callPatch(req, { params: Promise.resolve({ id: "sys1" }) });
    assert.equal(res.status, 200);
    assert.equal(capturedData.iconKey, "heartPulse");
  });

  await run("PATCH: prevents updating other fields for systemDefined category", async () => {
      mockSession = {
          user: { companyId: "company1", role: "ADMIN" },
      };
  
      mockPrisma.eventCategory.findFirst = async ({ where }: any) => {
           if (where.id === "sys1") {
               return { id: "sys1", systemDefined: true, name: "System Cat" };
           }
           return null;
      };
  
      const req = new NextRequest("http://localhost/api/event-categories/sys1", {
          method: "PATCH",
          body: JSON.stringify({
              name: "New Name",
          }),
      });
  
      const res = await callPatch(req, { params: Promise.resolve({ id: "sys1" }) });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes("Cannot edit system-defined categories"));
  });
});

