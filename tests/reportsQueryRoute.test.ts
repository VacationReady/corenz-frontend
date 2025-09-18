import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { POST as ReportsQueryPOST } from "@/app/api/reports/query/route";

// Mocks
const mockGetServerSession = mock.fn();
const mockPrismaFindMany = mock.fn();
const mockPrisma = new Proxy(
  {},
  {
    get: (_target, prop) => {
      return { findMany: mockPrismaFindMany };
    },
  },
);

mock.module("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

mock.module("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("/api/reports/query route", () => {
  beforeEach(() => {
    mockGetServerSession.mock.resetCalls();
    mockPrismaFindMany.mock.resetCalls();
  });

  it("rejects unauthenticated users", async () => {
    mockGetServerSession.mock.mockImplementationOnce(() => Promise.resolve(null));
    const req = new NextRequest("http://localhost:3000/api/reports/query", {
      method: "POST",
      body: JSON.stringify({ selectedFields: ["User.email"] }),
    });
    const res = await ReportsQueryPOST(req);
    assert.strictEqual(res.status, 401);
  });

  it("maps string contains filter and enforces tenant scoping", async () => {
    mockGetServerSession.mock.mockImplementationOnce(() =>
      Promise.resolve({ user: { id: "u1", companyId: "c1" } }),
    );
    mockPrismaFindMany.mock.mockImplementationOnce(() => Promise.resolve([]));

    const req = new NextRequest("http://localhost:3000/api/reports/query", {
      method: "POST",
      body: JSON.stringify({
        selectedFields: ["User.email"],
        filters: [
          { field: "User.email", operator: "contains", value: "@corp" },
        ],
        pagination: { page: 1, limit: 10 },
        sort: { field: "User.email", direction: "asc" },
      }),
    });

    const res = await ReportsQueryPOST(req);
    assert.strictEqual(res.status, 200);
    // Ensure Prisma called with expected where
    const args = mockPrismaFindMany.mock.calls[0].arguments[0];
    assert(args);
    assert.deepStrictEqual(args.where.email, { contains: "@corp", mode: "insensitive" });
  });

  it("maps number and boolean operators and nested orderBy", async () => {
    mockGetServerSession.mock.mockImplementationOnce(() =>
      Promise.resolve({ user: { id: "u1", companyId: "c1" } }),
    );
    mockPrismaFindMany.mock.mockImplementationOnce(() => Promise.resolve([]));

    const req = new NextRequest("http://localhost:3000/api/reports/query", {
      method: "POST",
      body: JSON.stringify({
        selectedFields: ["Employee.salaryAmount", "User.department.name"],
        filters: [
          { field: "Employee.salaryAmount", operator: "greater_than", value: 50000 },
          { field: "Employee.isActive", operator: "equals", value: true },
        ],
        sort: { field: "Employee.salaryAmount", direction: "desc" },
      }),
    });

    const res = await ReportsQueryPOST(req);
    assert.strictEqual(res.status, 200);
    const args = mockPrismaFindMany.mock.calls[0].arguments[0];
    assert(args);
    assert.deepStrictEqual(args.where.salaryAmount, { gt: 50000 });
    assert.deepStrictEqual(args.where.isActive, { equals: true });
    assert.deepStrictEqual(args.orderBy, { salaryAmount: "desc" });
  });

  it("maps date_between operator correctly", async () => {
    mockGetServerSession.mock.mockImplementationOnce(() =>
      Promise.resolve({ user: { id: "u1", companyId: "c1" } }),
    );
    mockPrismaFindMany.mock.mockImplementationOnce(() => Promise.resolve([]));

    const req = new NextRequest("http://localhost:3000/api/reports/query", {
      method: "POST",
      body: JSON.stringify({
        selectedFields: ["LeaveRequest.startDate"],
        filters: [
          { field: "LeaveRequest.startDate", operator: "date_between", value: "2025-01-01", value2: "2025-12-31" },
        ],
      }),
    });

    const res = await ReportsQueryPOST(req);
    assert.strictEqual(res.status, 200);
    const args = mockPrismaFindMany.mock.calls[0].arguments[0];
    assert(args);
    assert(args.where.startDate.gte instanceof Date);
    assert(args.where.startDate.lte instanceof Date);
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

test("POST /api/reports/query requires auth", async () => {
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === "next-auth") {
      return { getServerSession: async () => null };
    }
    if (request === "@/lib/auth-options") {
      return { authOptions: {} };
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
    if (request === "@/lib/prisma") {
      return {
        prisma: {
          User: {
            findMany: async (_args: any) => [{ id: "u1", email: "a@b.com" }],
          },
        },
      };
    }
    if (request === "next-auth") {
      return { getServerSession: async () => ({ user: { id: "u1", companyId: "c1" } }) };
    }
    if (request === "@/lib/auth-options") {
      return { authOptions: {} };
    }
    if (request === "@/lib/reportFields") {
      return {
        reportFields: [
          { model: "User", field: "User.id", label: "id", type: "string", filterable: true },
          { model: "User", field: "User.email", label: "email", type: "string", filterable: true },
        ],
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
  assert.ok(data.data.User);
  assert.equal(data.data.User.length, 1);
  assert.equal(Object.keys(data.data.User[0]).includes("password"), false);
  (Module as any)._load = originalLoad;
});

test("POST /api/reports/query injects tenant filter for User.companyId", async () => {
  const originalLoad = (Module as any)._load;
  let capturedWhere: any = null;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === "@/lib/prisma") {
      return {
        prisma: {
          User: {
            findMany: async (args: any) => {
              capturedWhere = args?.where;
              return [{ id: "u1", email: "a@b.com" }];
            },
          },
        },
      };
    }
    if (request === "next-auth") {
      return { getServerSession: async () => ({ user: { id: "u1", companyId: "tenant-123" } }) };
    }
    if (request === "@/lib/auth-options") {
      return { authOptions: {} };
    }
    if (request === "@/lib/reportFields") {
      return {
        reportFields: [
          { model: "User", field: "User.id", label: "id", type: "string", filterable: true },
        ],
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



