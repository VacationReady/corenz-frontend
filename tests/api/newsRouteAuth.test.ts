import "../setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

const mockAuth = test.mock.fn<() => Promise<any>>();
const mockUserFindUnique = test.mock.fn<(args: any) => Promise<any>>();
const mockNewsPostCreate = test.mock.fn<(args: any) => Promise<any>>();
const mockNewsPostFindUnique = test.mock.fn<(args: any) => Promise<any>>();
const mockNewsPostFindFirst = test.mock.fn<(args: any) => Promise<any>>();
const mockNewsPostCount = test.mock.fn<(args: any) => Promise<any>>();
const mockNewsPostFindMany = test.mock.fn<(args: any) => Promise<any>>();
const mockHasPermission = test.mock.fn<(user: any, screen: string, action: string) => boolean>();

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "@/lib/auth-options") {
    return { auth: mockAuth, authOptions: {} };
  }
  if (request === "@/lib/permissions") {
    return { hasPermission: mockHasPermission };
  }
  if (request === "@/lib/prisma") {
    return {
      prisma: {
        user: { findUnique: mockUserFindUnique },
        newsPost: {
          create: mockNewsPostCreate,
          findUnique: mockNewsPostFindUnique,
          findFirst: mockNewsPostFindFirst,
          count: mockNewsPostCount,
          findMany: mockNewsPostFindMany,
        },
      },
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};

test.after(() => {
  (Module as any)._load = originalLoad;
});

const routePromise = import("../../app/api/news/route");

function resetMocks() {
  mockAuth.mock.resetCalls();
  mockUserFindUnique.mock.resetCalls();
  mockNewsPostCreate.mock.resetCalls();
  mockNewsPostFindUnique.mock.resetCalls();
  mockNewsPostFindFirst.mock.resetCalls();
  mockNewsPostCount.mock.resetCalls();
  mockNewsPostFindMany.mock.resetCalls();
  mockHasPermission.mock.resetCalls();
}

test("POST /api/news rejects unauthenticated", async () => {
  resetMocks();
  mockAuth.mock.mockImplementationOnce(() => Promise.resolve(null));

  const { POST } = await routePromise;
  const res = await POST(
    new Request("http://localhost/api/news", {
      method: "POST",
      body: JSON.stringify({ title: "T", content: [] }),
    }) as any,
  );

  assert.equal(res.status, 401);
  assert.equal(mockUserFindUnique.mock.calls.length, 0);
  assert.equal(mockNewsPostCreate.mock.calls.length, 0);
});

test("POST /api/news requires news:edit permission", async () => {
  resetMocks();
  mockAuth.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "comp-1" } }),
  );
  mockUserFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({ role: "EMPLOYEE", PermissionProfile: null }),
  );
  mockHasPermission.mock.mockImplementationOnce(() => false);

  const { POST } = await routePromise;
  const res = await POST(
    new Request("http://localhost/api/news", {
      method: "POST",
      body: JSON.stringify({ title: "T", content: [] }),
    }) as any,
  );

  assert.equal(res.status, 403);
  assert.equal(mockNewsPostCreate.mock.calls.length, 0);
});

test("POST /api/news forbids sendEmail for non-admin roles", async () => {
  resetMocks();
  mockAuth.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "comp-1" } }),
  );
  mockUserFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({ role: "MANAGER", PermissionProfile: null }),
  );
  mockHasPermission.mock.mockImplementationOnce(() => true);

  const { POST } = await routePromise;
  const res = await POST(
    new Request("http://localhost/api/news", {
      method: "POST",
      body: JSON.stringify({ title: "T", content: [], sendEmail: true }),
    }) as any,
  );

  assert.equal(res.status, 403);
  assert.equal(mockNewsPostCreate.mock.calls.length, 0);
});

test("POST /api/news allows admin to create", async () => {
  resetMocks();
  mockAuth.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "comp-1" } }),
  );
  mockUserFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({ role: "ADMIN", PermissionProfile: null }),
  );
  mockHasPermission.mock.mockImplementationOnce(() => true);
  mockNewsPostFindFirst.mock.mockImplementationOnce(() => Promise.resolve(null));
  mockNewsPostCreate.mock.mockImplementationOnce(({ data }: any) =>
    Promise.resolve({ ...data, coverImageUrl: data.coverImageUrl ?? null }),
  );

  const { POST } = await routePromise;
  const res = await POST(
    new Request("http://localhost/api/news", {
      method: "POST",
      body: JSON.stringify({ title: "My Title", content: [], sendEmail: false }),
    }) as any,
  );

  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.equal(payload.title, "My Title");
  assert.equal(payload.coverImage, null);

  assert.equal(mockNewsPostCreate.mock.calls.length, 1);
  const createArgs = mockNewsPostCreate.mock.calls[0].arguments[0];
  assert.equal(createArgs.data.companyId, "comp-1");
  assert.equal(createArgs.data.authorId, "user-1");
  assert.equal(createArgs.data.sendEmail, false);
});

test("GET /api/news enforces department audience", async () => {
  resetMocks();
  mockAuth.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "comp-1" } }),
  );

  // User is NOT in the targeted department
  mockUserFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({
      role: "EMPLOYEE",
      Department_User_departmentIdToDepartment: { name: "Sales" },
      JobRole: { name: "Engineer" },
      Employee: { Location: { name: "HQ" } },
    }),
  );

  mockNewsPostCount.mock.mockImplementationOnce(() => Promise.resolve(0));
  mockNewsPostFindMany.mock.mockImplementationOnce(() => Promise.resolve([]));

  const { GET } = await routePromise;
  const res = await GET(new Request("http://localhost/api/news") as any);

  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.deepEqual(payload.posts, []);

  const findManyArgs = mockNewsPostFindMany.mock.calls[0].arguments[0];
  // Ensure query includes audience filter
  assert.ok(findManyArgs.where.AND);
  assert.equal(
    findManyArgs.where.AND[1].OR[0].audience.path[0],
    "type",
  );
});

test("GET /api/news returns type=all posts", async () => {
  resetMocks();
  mockAuth.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "comp-1" } }),
  );

  mockUserFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({
      role: "EMPLOYEE",
      Department_User_departmentIdToDepartment: { name: "Sales" },
      JobRole: { name: "Engineer" },
      Employee: { Location: { name: "HQ" } },
    }),
  );

  mockNewsPostCount.mock.mockImplementationOnce(() => Promise.resolve(1));
  mockNewsPostFindMany.mock.mockImplementationOnce(() =>
    Promise.resolve([
      {
        id: "post-1",
        title: "Hello",
        slug: "hello",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        coverImageUrl: null,
        content: [],
      },
    ]),
  );

  const { GET } = await routePromise;
  const res = await GET(new Request("http://localhost/api/news") as any);

  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.equal(payload.posts.length, 1);
  assert.equal(payload.posts[0].id, "post-1");
});
