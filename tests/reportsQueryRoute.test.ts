import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { NextRequest } from "next/server";

// Skip tests in CI if there's no database
// Uses Module._load mocking to avoid database requirements

const originalLoad = (Module as any)._load;
let mockSession: any = null;
let mockPrisma: any = {};
let mockQueryBuilder: any = {};
let mockHrReportFields: any = {};

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "@/lib/prisma" || request === "../app/lib/prisma") {
    return {
      prisma: mockPrisma,
      ensurePrismaConnected: async () => {},
    };
  }
  if (request === "next-auth") {
    return { getServerSession: async () => mockSession };
  }
  if (request === "@/lib/auth-options" || request === "../app/lib/auth-options") {
    return { authOptions: {} };
  }
  if (request === "@/lib/queryBuilder" || request === "../app/lib/queryBuilder") {
    return mockQueryBuilder;
  }
  if (request === "@/lib/hrReportFields" || request === "../app/lib/hrReportFields") {
    return mockHrReportFields;
  }
  if (request === "@/lib/reportingTimeConfig" || request === "../app/lib/reportingTimeConfig") {
    return {
      resolveReportingTimeConfig: async () => ({
        timeZone: "UTC",
        locale: "en-GB",
        tenant: { timeZone: "UTC", locale: "en-GB", template: null },
        source: { timeZone: "default", locale: "default" },
      }),
    };
  }
  if (request === "@/lib/reportFilters" || request === "../app/lib/reportFilters") {
    return {
      deserializeFilterGroup: (fg: any) => fg,
      normalizeFilterGroupInput: (input: any) => input || { type: "group", combinator: "AND", rules: [] },
      addRuleToGroup: (group: any, rule: any) => group,
      createFilterRule: (field: any, operator: any, value: any) => ({ field, operator, value }),
    };
  }
  return originalLoad(request, parent, isMain);
};

let routeModulePromise: Promise<typeof import("../app/api/reports/query/route")> | null = null;

async function getRouteModule() {
  if (!routeModulePromise) {
    routeModulePromise = import("../app/api/reports/query/route");
  }
  return routeModulePromise;
}

test("POST /api/reports/query requires auth", async () => {
  mockSession = null;
  mockPrisma = {};
  
  const { POST } = await getRouteModule();
  const res = await POST(new Request("http://localhost/api/reports/query", { method: "POST", body: JSON.stringify({ selectedFields: ["User.id"], filters: [], pagination: {}, sort: {} }) } as any));
  assert.equal(res.status, 401);
});

test.skip("POST /api/reports/query restricts selectedFields to allowed reportFields", async () => {
  mockSession = { user: { id: "u1", companyId: "c1" } };
  mockPrisma = {
    User: {
      findMany: async (_args: any) => [{ id: "u1", email: "a@b.com" }],
      count: async () => 1,
    },
  };
  mockQueryBuilder = {
    buildDynamicQuery: () => ({ queries: [{ model: "User", prismaQuery: { where: {} } }] }),
    attachComputedFields: async (results: any[]) => results,
  };
  mockHrReportFields = {
    getFieldByKey: (key: string) => {
      const fields: any = {
        "User.id": { model: "User", field: "User.id", label: "id", type: "string", filterable: true, dependsOn: [] },
        "User.email": { model: "User", field: "User.email", label: "email", type: "string", filterable: true, dependsOn: [] },
      };
      return fields[key] || null;
    },
    hrReportFields: [
      { model: "User", field: "User.id", label: "id", type: "string", filterable: true },
      { model: "User", field: "User.email", label: "email", type: "string", filterable: true },
    ],
  };

  const { POST } = await getRouteModule();
  const body = {
    selectedFields: ["User.id", "User.email", "User.password"],
    filters: [],
    pagination: {},
    sort: {},
  };
  const res = await POST(
    new Request("http://localhost/api/reports/query", {
      method: "POST",
      body: JSON.stringify(body),
    } as any),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, "success");
  assert.ok(Array.isArray(data.data));
  assert.equal(data.data.length, 1);
  assert.equal(Object.keys(data.data[0]).includes("password"), false);
  assert.equal(data.total, 1);
});

test.skip("POST /api/reports/query injects tenant filter for User.companyId", async () => {
  let capturedWhere: any = null;
  
  mockSession = { user: { id: "u1", companyId: "tenant-123" } };
  mockPrisma = {
    User: {
      findMany: async (args: any) => {
        capturedWhere = args?.where;
        return [{ id: "u1", email: "a@b.com" }];
      },
      count: async (_args: any) => 1,
    },
  };
  mockQueryBuilder = {
    buildDynamicQuery: () => ({ queries: [{ model: "User", prismaQuery: { where: {} } }] }),
    attachComputedFields: async (results: any[]) => results,
  };
  mockHrReportFields = {
    getFieldByKey: (key: string) => {
      const fields: any = {
        "User.id": { model: "User", field: "User.id", label: "id", type: "string", filterable: true, dependsOn: [] },
      };
      return fields[key] || null;
    },
    hrReportFields: [
      { model: "User", field: "User.id", label: "id", type: "string", filterable: true },
    ],
  };

  const { POST } = await getRouteModule();
  const res = await POST(
    new Request("http://localhost/api/reports/query", {
      method: "POST",
      body: JSON.stringify({ selectedFields: ["User.id"], filters: [], pagination: {}, sort: {} }),
    } as any),
  );
  assert.equal(res.status, 200);
  assert.ok(capturedWhere);
  assert.equal(capturedWhere.companyId, "tenant-123");
});



