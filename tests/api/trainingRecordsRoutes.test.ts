import "../setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

const mockGetServerSession = test.mock.fn<() => Promise<any>>();
const mockEmployeeFindFirst = test.mock.fn<(args: any) => Promise<any>>();
const mockTrainingRecordFindMany = test.mock.fn<(args: any) => Promise<any[]>>();
const mockTrainingRecordCreate = test.mock.fn<(args: any) => Promise<any>>();
const mockDocumentCreate = test.mock.fn<(args: any) => Promise<any>>();
const mockCanAccessEmployee = test.mock.fn<(
  requester: any,
  employeeId: any,
) => Promise<boolean>>();
const mockFormatDiffsForFormData = test.mock.fn<(args: any) => any>();
const mockCreateAuditLogs = test.mock.fn<(args: any) => Promise<void>>();
const mockGetTransactionalRecipients = test.mock.fn<(args: any) => Promise<any[]>>();
const mockRenderPeopleCoreEmail = test.mock.fn<
  (args: any) => { html: string; text: string }
>();
const mockGetAppBaseUrl = test.mock.fn<() => string>();
const mockSupabaseUpload = test.mock.fn<(path: any, data: any) => Promise<any>>();
const mockResendSend = test.mock.fn<(payload: any) => Promise<void>>();

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next-auth") {
    return { getServerSession: mockGetServerSession };
  }
  if (request === "@/lib/auth-options" || request === "../app/lib/auth-options") {
    return {
      authOptions: {},
      auth: async () => mockGetServerSession(),
    };
  }
  if (request === "@/lib/prisma") {
    return {
      prisma: {
        employee: {
          findFirst: mockEmployeeFindFirst,
          findUnique: mockEmployeeFindFirst, // Alias for backwards compatibility
        },
        trainingRecord: {
          findMany: mockTrainingRecordFindMany,
          create: mockTrainingRecordCreate,
        },
        document: {
          create: mockDocumentCreate,
        },
      },
    };
  }
  if (request === "@/lib/permissions") {
    return { canAccessEmployee: mockCanAccessEmployee };
  }
  if (request === "@/lib/audit-helpers") {
    return {
      createAuditLogs: mockCreateAuditLogs,
      formatDiffsForFormData: mockFormatDiffsForFormData,
    };
  }
  if (request === "@/lib/transactional-notifications") {
    return { getTransactionalRecipients: mockGetTransactionalRecipients };
  }
  if (request === "@/lib/email/template") {
    return {
      renderPeopleCoreEmail: mockRenderPeopleCoreEmail,
      getAppBaseUrl: mockGetAppBaseUrl,
    };
  }
  if (request === "@/lib/resend") {
    return {
      resend: {
        emails: { send: mockResendSend },
      },
    };
  }
  if (request === "@/lib/supabase-admin") {
    return {
      storage: {
        from: () => ({ upload: mockSupabaseUpload }),
      },
    };
  }
  return originalLoad(request, parent, isMain);
};

test.after(() => {
  (Module as any)._load = originalLoad;
});

const routesPromise = (async () => {
  const [listModule, createModule] = await Promise.all([
    import("../../app/api/training-records/list/route"),
    import("../../app/api/training-records/create/route"),
  ]);

  return {
    list: listModule.GET,
    create: createModule.POST,
  };
})();

function resetMocks() {
  mockGetServerSession.mock.resetCalls();
  mockEmployeeFindFirst.mock.resetCalls();
  mockTrainingRecordFindMany.mock.resetCalls();
  mockTrainingRecordCreate.mock.resetCalls();
  mockDocumentCreate.mock.resetCalls();
  mockCanAccessEmployee.mock.resetCalls();
  mockFormatDiffsForFormData.mock.resetCalls();
  mockCreateAuditLogs.mock.resetCalls();
  mockGetTransactionalRecipients.mock.resetCalls();
  mockRenderPeopleCoreEmail.mock.resetCalls();
  mockGetAppBaseUrl.mock.resetCalls();
  mockSupabaseUpload.mock.resetCalls();
  mockResendSend.mock.resetCalls();
}

test("GET /api/training-records/list returns 404 when employee missing", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1", role: "MANAGER" } }),
  );
  mockEmployeeFindFirst.mock.mockImplementationOnce(() => Promise.resolve(null));

  const { list } = await routesPromise;
  const res = await list(
    new Request("http://localhost/api/training-records/list?employeeId=emp-1"),
  );

  assert.equal(res.status, 404);
  assert.equal(mockCanAccessEmployee.mock.calls.length, 0);
  assert.equal(mockTrainingRecordFindMany.mock.calls.length, 0);
});

test("GET /api/training-records/list blocks cross-tenant access", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1", role: "MANAGER" } }),
  );
  mockEmployeeFindFirst.mock.mockImplementationOnce(() =>
    Promise.resolve(null), // findFirst with companyId filter returns null for cross-tenant
  );

  const { list } = await routesPromise;
  const res = await list(
    new Request("http://localhost/api/training-records/list?employeeId=emp-1"),
  );

  assert.equal(res.status, 404); // Now returns 404 since findFirst filters by tenant
  assert.equal(mockCanAccessEmployee.mock.calls.length, 0);
  assert.equal(mockTrainingRecordFindMany.mock.calls.length, 0);
});

test("GET /api/training-records/list forbids when requester lacks access", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1", role: "MANAGER" } }),
  );
  mockEmployeeFindFirst.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "emp-1", companyId: "tenant-1" }),
  );
  mockCanAccessEmployee.mock.mockImplementationOnce(() => Promise.resolve(false));

  const { list } = await routesPromise;
  const res = await list(
    new Request("http://localhost/api/training-records/list?employeeId=emp-1"),
  );

  assert.equal(res.status, 403);
  assert.equal(mockTrainingRecordFindMany.mock.calls.length, 0);
});

test("GET /api/training-records/list returns data when authorized", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1", role: "MANAGER" } }),
  );
  mockEmployeeFindFirst.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "emp-1", companyId: "tenant-1" }),
  );
  mockCanAccessEmployee.mock.mockImplementationOnce(() => Promise.resolve(true));
  const records = [{ id: "rec-1", dateCompleted: new Date().toISOString() }];
  mockTrainingRecordFindMany.mock.mockImplementationOnce(() => Promise.resolve(records));

  const { list } = await routesPromise;
  const res = await list(
    new Request("http://localhost/api/training-records/list?employeeId=emp-1"),
  );

  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.deepEqual(payload.map((r: any) => r.id), ["rec-1"]);
});

test("POST /api/training-records/create returns 404 when employee missing", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1", role: "ADMIN" } }),
  );
  mockEmployeeFindFirst.mock.mockImplementationOnce(() => Promise.resolve(null));

  const formData = new FormData();
  formData.set("employeeId", "emp-1");
  formData.set("courseId", "course-1");
  formData.set("providerId", "provider-1");
  formData.set("dateCompleted", new Date("2024-01-01").toISOString());
  formData.set("reasons", JSON.stringify({ note: "test" }));

  const { create } = await routesPromise;
  const res = await create(
    new Request("http://localhost/api/training-records/create", {
      method: "POST",
      body: formData,
    }),
  );

  assert.equal(res.status, 404);
  assert.equal(mockCanAccessEmployee.mock.calls.length, 0);
  assert.equal(mockTrainingRecordCreate.mock.calls.length, 0);
});

test("POST /api/training-records/create blocks cross-tenant writes", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1", role: "ADMIN" } }),
  );
  mockEmployeeFindFirst.mock.mockImplementationOnce(() =>
    Promise.resolve(null), // findFirst with companyId filter returns null for cross-tenant
  );

  const formData = new FormData();
  formData.set("employeeId", "emp-1");
  formData.set("courseId", "course-1");
  formData.set("providerId", "provider-1");
  formData.set("dateCompleted", new Date("2024-01-01").toISOString());
  formData.set("reasons", JSON.stringify({ note: "test" }));

  const { create } = await routesPromise;
  const res = await create(
    new Request("http://localhost/api/training-records/create", {
      method: "POST",
      body: formData,
    }),
  );

  assert.equal(res.status, 404); // Now returns 404 since findFirst filters by tenant
  assert.equal(mockCanAccessEmployee.mock.calls.length, 0);
  assert.equal(mockTrainingRecordCreate.mock.calls.length, 0);
});

test("POST /api/training-records/create forbids when requester lacks access", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1", role: "MANAGER" } }),
  );
  mockEmployeeFindFirst.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "emp-1", companyId: "tenant-1" }),
  );
  mockCanAccessEmployee.mock.mockImplementationOnce(() => Promise.resolve(false));

  const formData = new FormData();
  formData.set("employeeId", "emp-1");
  formData.set("courseId", "course-1");
  formData.set("providerId", "provider-1");
  formData.set("dateCompleted", new Date("2024-01-01").toISOString());
  formData.set("reasons", JSON.stringify({ note: "test" }));

  const { create } = await routesPromise;
  const res = await create(
    new Request("http://localhost/api/training-records/create", {
      method: "POST",
      body: formData,
    }),
  );

  assert.equal(res.status, 403);
  assert.equal(mockTrainingRecordCreate.mock.calls.length, 0);
});

test("POST /api/training-records/create persists when admin authorized", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1", role: "ADMIN" } }),
  );
  mockEmployeeFindFirst.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "emp-1", companyId: "tenant-1" }),
  );
  mockCanAccessEmployee.mock.mockImplementationOnce(() => Promise.resolve(true));
  mockFormatDiffsForFormData.mock.mockImplementationOnce(() => ({ diff: true }));
  mockCreateAuditLogs.mock.mockImplementationOnce(() => Promise.resolve());
  mockTrainingRecordCreate.mock.mockImplementationOnce(({ data }) =>
    Promise.resolve({ id: "rec-1", ...data }),
  );

  const formData = new FormData();
  formData.set("employeeId", "emp-1");
  formData.set("courseId", "course-1");
  formData.set("providerId", "provider-1");
  formData.set("dateCompleted", new Date("2024-01-01").toISOString());
  formData.set("reasons", JSON.stringify({ note: "test" }));

  const { create } = await routesPromise;
  const res = await create(
    new Request("http://localhost/api/training-records/create", {
      method: "POST",
      body: formData,
    }),
  );

  assert.equal(res.status, 200);
  const payload = await res.json();
  // API now auto-generates IDs - check it exists and is a valid string
  assert.ok(payload.id, "Expected payload.id to exist");
  assert.equal(typeof payload.id, "string", "Expected payload.id to be a string");
  assert.ok(payload.id.length > 0, "Expected payload.id to be non-empty");
  assert.equal(mockTrainingRecordCreate.mock.calls.length, 1);
  assert.equal(mockCreateAuditLogs.mock.calls.length, 1);
});
