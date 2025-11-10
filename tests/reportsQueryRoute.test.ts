import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { NextRequest } from "next/server";

// Skip tests in CI if there's no database
// Uses Module._load mocking to avoid database requirements

test("POST /api/reports/query requires auth", async () => {
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === "next-auth") {
      return { getServerSession: async () => null };
    }
    if (request === "../app/lib/auth-options") {
      return { authOptions: {} };
    }
    if (request === "../app/lib/reportingTimeConfig") {
      return {
        resolveReportingTimeConfig: async () => ({
          timeZone: "UTC",
          locale: "en-GB",
          tenant: { timeZone: "UTC", locale: "en-GB", template: null },
          source: { timeZone: "default", locale: "default" },
        }),
      };
    }
    return originalLoad(request, parent, isMain);
  };
  const { POST } = await import("../app/api/reports/query/route");
  const res = await POST(new Request("http://localhost/api/reports/query", { method: "POST", body: JSON.stringify({ selectedFields: ["User.id"], filters: [], pagination: {}, sort: {} }) } as any));
  assert.equal(res.status, 401);
  (Module as any)._load = originalLoad;
});

test("POST /api/reports/query restricts selectedFields to allowed reportFields", async () => {
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === "../app/lib/prisma") {
      return {
        prisma: {
          User: {
            findMany: async (_args: any) => [{ id: "u1", email: "a@b.com" }],
            count: async () => 1,
          },
        },
      };
    }
    if (request === "next-auth") {
      return { getServerSession: async () => ({ user: { id: "u1", companyId: "c1" } }) };
    }
    if (request === "../app/lib/auth-options") {
      return { authOptions: {} };
    }
    if (request === "../app/lib/reportFields") {
      return {
        reportFields: [
          { model: "User", field: "User.id", label: "id", type: "string", filterable: true },
          { model: "User", field: "User.email", label: "email", type: "string", filterable: true },
        ],
      };
    }
    if (request === "../app/lib/reportingTimeConfig") {
      return {
        resolveReportingTimeConfig: async () => ({
          timeZone: "UTC",
          locale: "en-GB",
          tenant: { timeZone: "UTC", locale: "en-GB", template: null },
          source: { timeZone: "default", locale: "default" },
        }),
      };
    }
    return originalLoad(request, parent, isMain);
  };

  const { POST } = await import("../app/api/reports/query/route");
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
  (Module as any)._load = originalLoad;
});

test("POST /api/reports/query injects tenant filter for User.companyId", async () => {
  const originalLoad = (Module as any)._load;
  let capturedWhere: any = null;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === "../app/lib/prisma") {
      return {
        prisma: {
          User: {
            findMany: async (args: any) => {
              capturedWhere = args?.where;
              return [{ id: "u1", email: "a@b.com" }];
            },
            count: async (_args: any) => 1,
          },
        },
      };
    }
    if (request === "next-auth") {
      return { getServerSession: async () => ({ user: { id: "u1", companyId: "tenant-123" } }) };
    }
    if (request === "../app/lib/auth-options") {
      return { authOptions: {} };
    }
    if (request === "../app/lib/reportFields") {
      return {
        reportFields: [
          { model: "User", field: "User.id", label: "id", type: "string", filterable: true },
        ],
      };
    }
    if (request === "../app/lib/reportingTimeConfig") {
      return {
        resolveReportingTimeConfig: async () => ({
          timeZone: "UTC",
          locale: "en-GB",
          tenant: { timeZone: "UTC", locale: "en-GB", template: null },
          source: { timeZone: "default", locale: "default" },
        }),
      };
    }
    return originalLoad(request, parent, isMain);
  };

  const { POST } = await import("../app/api/reports/query/route");
  const res = await POST(
    new Request("http://localhost/api/reports/query", {
      method: "POST",
      body: JSON.stringify({ selectedFields: ["User.id"], filters: [], pagination: {}, sort: {} }),
    } as any),
  );
  assert.equal(res.status, 200);
  assert.ok(capturedWhere);
  assert.equal(capturedWhere.companyId, "tenant-123");
  (Module as any)._load = originalLoad;
});



