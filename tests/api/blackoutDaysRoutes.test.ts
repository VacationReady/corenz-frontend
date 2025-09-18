import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

const mockGetServerSession = test.mock.fn();
const mockFindMany = test.mock.fn();
const mockCreate = test.mock.fn();
const mockDeleteMany = test.mock.fn();

const originalLoad = (Module as any)._load;
(Module as any)._load = function (
  request: string,
  parent: any,
  isMain: boolean,
) {
  if (request === "next-auth") {
    return { getServerSession: mockGetServerSession };
  }
  if (request === "@/lib/prisma") {
    return {
      prisma: {
        blackoutDay: {
          findMany: mockFindMany,
          create: mockCreate,
          deleteMany: mockDeleteMany,
        },
      },
    };
  }
  if (request === "@/lib/auth-options") {
    return { authOptions: {} };
  }
  return originalLoad.call(this, request, parent, isMain);
};

test.after(() => {
  (Module as any)._load = originalLoad;
});

const routesPromise = (async () => {
  const [getModule, createModule, deleteModule] = await Promise.all([
    import("../../app/api/blackout-days/get/route"),
    import("../../app/api/blackout-days/create/route"),
    import("../../app/api/blackout-days/delete/route"),
  ]);

  return {
    get: getModule.GET,
    create: createModule.POST,
    remove: deleteModule.POST,
  };
})();

test("GET /api/blackout-days/get rejects unauthenticated requests", async () => {
  mockGetServerSession.mock.resetCalls();
  mockFindMany.mock.resetCalls();
  mockGetServerSession.mock.mockImplementationOnce(() => Promise.resolve(null));

  const { get } = await routesPromise;
  const res = await get(new Request("http://localhost/api/blackout-days/get"));

  assert.equal(res.status, 401);
  assert.equal(mockFindMany.mock.calls.length, 0);
});

test(
  "GET /api/blackout-days/get ignores x-company-id header overrides",
  async () => {
    mockGetServerSession.mock.resetCalls();
    mockFindMany.mock.resetCalls();
    mockGetServerSession.mock.mockImplementationOnce(() =>
      Promise.resolve({ user: { id: "user-1", companyId: "session-company" } }),
    );
    mockFindMany.mock.mockImplementationOnce(() => Promise.resolve([]));

    const { get } = await routesPromise;
    const res = await get(
      new Request("http://localhost/api/blackout-days/get", {
        headers: { "x-company-id": "header-company" },
      }),
    );

    assert.equal(res.status, 200);
    assert.equal(mockFindMany.mock.calls.length, 1);
    const args = mockFindMany.mock.calls[0].arguments[0];
    assert.ok(args);
    assert.equal(args.where.companyId, "session-company");
  },
);

test("POST /api/blackout-days/create rejects unauthenticated users", async () => {
  mockGetServerSession.mock.resetCalls();
  mockCreate.mock.resetCalls();
  mockGetServerSession.mock.mockImplementationOnce(() => Promise.resolve(null));

  const { create } = await routesPromise;
  const res = await create(
    new Request("http://localhost/api/blackout-days/create", {
      method: "POST",
      body: JSON.stringify({ date: new Date().toISOString() }),
    }),
  );

  assert.equal(res.status, 401);
  assert.equal(mockCreate.mock.calls.length, 0);
});

test("POST /api/blackout-days/create requires admin role", async () => {
  mockGetServerSession.mock.resetCalls();
  mockCreate.mock.resetCalls();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({
      user: { id: "user-1", companyId: "tenant-1", role: "MEMBER" },
    }),
  );

  const { create } = await routesPromise;
  const res = await create(
    new Request("http://localhost/api/blackout-days/create", {
      method: "POST",
      body: JSON.stringify({ date: new Date().toISOString() }),
    }),
  );

  assert.equal(res.status, 403);
  assert.equal(mockCreate.mock.calls.length, 0);
});

test(
  "POST /api/blackout-days/create uses the authenticated tenant despite headers",
  async () => {
    mockGetServerSession.mock.resetCalls();
    mockCreate.mock.resetCalls();
    mockGetServerSession.mock.mockImplementationOnce(() =>
      Promise.resolve({
        user: { id: "user-1", companyId: "tenant-session", role: "ADMIN" },
      }),
    );
    mockCreate.mock.mockImplementationOnce((args: any) =>
      Promise.resolve({ id: "blackout", ...args.data }),
    );

    const { create } = await routesPromise;
    const res = await create(
      new Request("http://localhost/api/blackout-days/create", {
        method: "POST",
        headers: { "x-company-id": "tenant-header" },
        body: JSON.stringify({ date: new Date().toISOString() }),
      }),
    );

    assert.equal(res.status, 200);
    assert.equal(mockCreate.mock.calls.length, 1);
    const args = mockCreate.mock.calls[0].arguments[0];
    assert.ok(args);
    assert.equal(args.data.companyId, "tenant-session");
  },
);

test("POST /api/blackout-days/delete requires admin role", async () => {
  mockGetServerSession.mock.resetCalls();
  mockDeleteMany.mock.resetCalls();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({
      user: { id: "user-1", companyId: "tenant-1", role: "MEMBER" },
    }),
  );

  const { remove } = await routesPromise;
  const res = await remove(
    new Request("http://localhost/api/blackout-days/delete", {
      method: "POST",
      body: JSON.stringify({ blackoutDayId: "blackout" }),
    }),
  );

  assert.equal(res.status, 403);
  assert.equal(mockDeleteMany.mock.calls.length, 0);
});
