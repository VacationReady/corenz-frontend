import "../setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

const originalLoad = (Module as any)._load;

// Use object references that persist across module loads
const mockPrismaRef: { current: any } = { current: {} };
const mockSessionRef: { current: any } = { current: null };

(Module as any)._load = function (
  request: string,
  parent: any,
  isMain: boolean,
) {
  if (request === "@/lib/prisma") {
    return { 
      prisma: new Proxy({}, {
        get: (_, prop) => mockPrismaRef.current[prop]
      }), 
      ensurePrismaConnected: async () => {} 
    };
  }
  if (request === "@/lib/auth-options") {
    return {
      auth: async () => mockSessionRef.current,
      authOptions: {},
    };
  }
  if (request === "next-auth") {
    return { getServerSession: async () => mockSessionRef.current };
  }
  return originalLoad(request, parent, isMain);
};

let routeModulePromise: Promise<typeof import("../../app/api/reports/share/route")> | null = null;

async function getRouteModule() {
  if (!routeModulePromise) {
    routeModulePromise = import("../../app/api/reports/share/route");
  }
  return routeModulePromise;
}

function createGetRequest(reportId: string): Request {
  return new Request(`http://localhost/api/reports/share?reportId=${reportId}`);
}

function resetMocks() {
  mockPrismaRef.current = {};
  mockSessionRef.current = null;
}

test("Report Share Access Security Tests", async (t) => {
  await t.test("Report owner can view share recipients", async () => {
    resetMocks();
    mockSessionRef.current = {
      user: {
        id: "user-owner",
        companyId: "company-1",
        role: "EMPLOYEE",
      },
    };

    mockPrismaRef.current.savedReport = {
      findFirst: async () => ({
        id: 1,
        companyId: "company-1",
        createdBy: "user-owner", // User is the owner
      }),
    };
    mockPrismaRef.current.reportShare = {
      findFirst: async () => null, // Not needed since user is owner
      findMany: async () => [
        {
          id: 1,
          reportId: 1,
          shareType: "user",
          permission: "view",
          userId: "shared-user-1",
          User: { id: "shared-user-1", email: "shared@example.com", name: "Shared User" },
          Department: null,
          CreatedBy: { id: "user-owner", email: "owner@example.com", name: "Owner" },
        },
      ],
    };

    const { GET } = await getRouteModule();
    const req = createGetRequest("1");
    const res = await GET(req);

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "success");
    assert.equal(body.data.length, 1);
  });

  await t.test("User with direct share can view share recipients", async () => {
    resetMocks();
    mockSessionRef.current = {
      user: {
        id: "shared-user",
        companyId: "company-1",
        role: "EMPLOYEE",
      },
    };

    mockPrismaRef.current.savedReport = {
      findFirst: async () => ({
        id: 1,
        companyId: "company-1",
        createdBy: "other-user", // User is NOT the owner
      }),
    };
    mockPrismaRef.current.user = {
      findUnique: async () => ({ departmentId: "dept-1" }),
    };
    mockPrismaRef.current.reportShare = {
      findFirst: async (args: any) => {
        // User has a direct share
        if (args?.where?.OR?.some((c: any) => c.userId === "shared-user")) {
          return {
            id: 2,
            reportId: 1,
            userId: "shared-user",
            permission: "view",
          };
        }
        return null;
      },
      findMany: async () => [
        {
          id: 1,
          reportId: 1,
          shareType: "user",
          permission: "view",
          userId: "shared-user",
          User: { id: "shared-user", email: "shared@example.com", name: "Shared User" },
          Department: null,
          CreatedBy: { id: "other-user", email: "owner@example.com", name: "Owner" },
        },
      ],
    };

    const { GET } = await getRouteModule();
    const req = createGetRequest("1");
    const res = await GET(req);

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "success");
  });

  await t.test("User with department share can view share recipients", async () => {
    resetMocks();
    mockSessionRef.current = {
      user: {
        id: "dept-user",
        companyId: "company-1",
        role: "EMPLOYEE",
      },
    };

    mockPrismaRef.current.savedReport = {
      findFirst: async () => ({
        id: 1,
        companyId: "company-1",
        createdBy: "other-user", // User is NOT the owner
      }),
    };
    mockPrismaRef.current.user = {
      findUnique: async () => ({ departmentId: "dept-1" }),
    };
    mockPrismaRef.current.reportShare = {
      findFirst: async (args: any) => {
        // User has access via department share
        if (args?.where?.OR?.some((c: any) => c.departmentId === "dept-1")) {
          return {
            id: 3,
            reportId: 1,
            departmentId: "dept-1",
            shareType: "department",
            permission: "view",
          };
        }
        return null;
      },
      findMany: async () => [
        {
          id: 3,
          reportId: 1,
          shareType: "department",
          permission: "view",
          departmentId: "dept-1",
          User: null,
          Department: { id: "dept-1", name: "Engineering" },
          CreatedBy: { id: "other-user", email: "owner@example.com", name: "Owner" },
        },
      ],
    };

    const { GET } = await getRouteModule();
    const req = createGetRequest("1");
    const res = await GET(req);

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "success");
  });

  await t.test("User with company-wide share can view share recipients", async () => {
    resetMocks();
    mockSessionRef.current = {
      user: {
        id: "any-user",
        companyId: "company-1",
        role: "EMPLOYEE",
      },
    };

    mockPrismaRef.current.savedReport = {
      findFirst: async () => ({
        id: 1,
        companyId: "company-1",
        createdBy: "other-user", // User is NOT the owner
      }),
    };
    mockPrismaRef.current.user = {
      findUnique: async () => ({ departmentId: null }),
    };
    mockPrismaRef.current.reportShare = {
      findFirst: async (args: any) => {
        // Company-wide share exists
        if (args?.where?.OR?.some((c: any) => c.shareType === "company")) {
          return {
            id: 4,
            reportId: 1,
            shareType: "company",
            permission: "view",
          };
        }
        return null;
      },
      findMany: async () => [
        {
          id: 4,
          reportId: 1,
          shareType: "company",
          permission: "view",
          User: null,
          Department: null,
          CreatedBy: { id: "other-user", email: "owner@example.com", name: "Owner" },
        },
      ],
    };

    const { GET } = await getRouteModule();
    const req = createGetRequest("1");
    const res = await GET(req);

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "success");
  });

  await t.test("Non-shared user CANNOT view share recipients - returns 403", async () => {
    resetMocks();
    mockSessionRef.current = {
      user: {
        id: "unauthorized-user",
        companyId: "company-1",
        role: "EMPLOYEE",
      },
    };

    mockPrismaRef.current.savedReport = {
      findFirst: async () => ({
        id: 1,
        companyId: "company-1",
        createdBy: "other-user", // User is NOT the owner
      }),
    };
    mockPrismaRef.current.user = {
      findUnique: async () => ({ departmentId: "dept-2" }), // Different department
    };
    mockPrismaRef.current.reportShare = {
      findFirst: async () => null, // No share exists for this user
      findMany: async () => [],
    };

    const { GET } = await getRouteModule();
    const req = createGetRequest("1");
    const res = await GET(req);

    // Should be forbidden - user has no access to this report
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error, "You don't have permission to view shares for this report");
  });

  await t.test("User from different company CANNOT view share recipients - returns 404", async () => {
    resetMocks();
    mockSessionRef.current = {
      user: {
        id: "cross-tenant-user",
        companyId: "company-2", // Different company
        role: "ADMIN",
      },
    };

    mockPrismaRef.current.savedReport = {
      findFirst: async () => null, // Report not found in their company
    };

    const { GET } = await getRouteModule();
    const req = createGetRequest("1");
    const res = await GET(req);

    // Should return 404 - report doesn't exist in their company
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, "Report not found");
  });

  await t.test("Unauthenticated request returns 401", async () => {
    resetMocks();
    mockSessionRef.current = null;

    const { GET } = await getRouteModule();
    const req = createGetRequest("1");
    const res = await GET(req);

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "Unauthorized");
  });

  await t.test("Request without reportId returns 400", async () => {
    resetMocks();
    mockSessionRef.current = {
      user: {
        id: "user-1",
        companyId: "company-1",
        role: "EMPLOYEE",
      },
    };

    const { GET } = await getRouteModule();
    const req = new Request("http://localhost/api/reports/share");
    const res = await GET(req);

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "Report ID required");
  });

  await t.test("User guessing report ID without share gets 403", async () => {
    resetMocks();
    mockSessionRef.current = {
      user: {
        id: "attacker-user",
        companyId: "company-1",
        role: "EMPLOYEE",
      },
    };

    // Report exists but attacker has no access
    mockPrismaRef.current.savedReport = {
      findFirst: async () => ({
        id: 999,
        companyId: "company-1",
        createdBy: "victim-user", // Different owner
      }),
    };
    mockPrismaRef.current.user = {
      findUnique: async () => ({ departmentId: null }),
    };
    mockPrismaRef.current.reportShare = {
      findFirst: async () => null, // No share for attacker
    };

    const { GET } = await getRouteModule();
    const req = createGetRequest("999");
    const res = await GET(req);

    // Should be forbidden - attacker cannot enumerate shares
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error, "You don't have permission to view shares for this report");
  });
});
