import "../setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

const mockGetServerSession = test.mock.fn<() => Promise<any>>();
const mockEmployeeFindFirst = test.mock.fn<(args: any) => Promise<any>>();
const mockDriverLicenceFindMany = test.mock.fn<(args: any) => Promise<any[]>>();
const mockDriverLicenceCreate = test.mock.fn<(args: any) => Promise<any>>();
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
  if (request === "@/lib/auth-options") {
    return { auth: mockGetServerSession, authOptions: {} };
  }
  if (request === "@/lib/prisma") {
    return {
      prisma: {
        employee: {
          findFirst: mockEmployeeFindFirst,
        },
        driverLicence: {
          findMany: mockDriverLicenceFindMany,
          create: mockDriverLicenceCreate,
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
    import("../../app/api/driver-licenses/list/route"),
    import("../../app/api/driver-licenses/create/route"),
  ]);

  return {
    list: listModule.GET,
    create: createModule.POST,
  };
})();

function resetMocks() {
  mockGetServerSession.mock.resetCalls();
  mockEmployeeFindFirst.mock.resetCalls();
  mockDriverLicenceFindMany.mock.resetCalls();
  mockDriverLicenceCreate.mock.resetCalls();
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

test("GET /api/driver-licenses/list returns 404 when employee not in tenant", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1", role: "MANAGER" } }),
  );
  mockEmployeeFindFirst.mock.mockImplementationOnce(() => Promise.resolve(null));

  const { list } = await routesPromise;
  const res = await list(
    new Request("http://localhost/api/driver-licenses/list?employeeId=emp-1"),
  );

  assert.equal(res.status, 404);
  assert.equal(mockCanAccessEmployee.mock.calls.length, 0);
  assert.equal(mockDriverLicenceFindMany.mock.calls.length, 0);
});

test("GET /api/driver-licenses/list forbids access without employee permissions", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1", role: "MANAGER" } }),
  );
  mockEmployeeFindFirst.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "emp-1" }),
  );
  mockCanAccessEmployee.mock.mockImplementationOnce(() => Promise.resolve(false));

  const { list } = await routesPromise;
  const res = await list(
    new Request("http://localhost/api/driver-licenses/list?employeeId=emp-1"),
  );

  assert.equal(res.status, 403);
  assert.equal(mockDriverLicenceFindMany.mock.calls.length, 0);
});

test("GET /api/driver-licenses/list returns licences for authorized users", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1", role: "MANAGER" } }),
  );
  mockEmployeeFindFirst.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "emp-1" }),
  );
  mockCanAccessEmployee.mock.mockImplementationOnce(() => Promise.resolve(true));
  const licences = [{ id: "lic-1", licenceNumber: "ABC" }];
  mockDriverLicenceFindMany.mock.mockImplementationOnce(() => Promise.resolve(licences));

  const { list } = await routesPromise;
  const res = await list(
    new Request("http://localhost/api/driver-licenses/list?employeeId=emp-1"),
  );

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data, licences);
});

test("POST /api/driver-licenses/create returns 404 when employee is outside tenant", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1", role: "ADMIN" } }),
  );
  mockEmployeeFindFirst.mock.mockImplementationOnce(() => Promise.resolve(null));

  const formData = new FormData();
  formData.set("employeeId", "emp-1");
  formData.set("type", "CAR");
  formData.set("licenceNumber", "12345");
  formData.set("issueDate", new Date("2024-01-01").toISOString());
  formData.set("expiryDate", new Date("2025-01-01").toISOString());
  formData.set("reasons", JSON.stringify({ note: "test" }));

  const { create } = await routesPromise;
  const res = await create(
    new Request("http://localhost/api/driver-licenses/create", {
      method: "POST",
      body: formData,
    }),
  );

  assert.equal(res.status, 404);
  assert.equal(mockCanAccessEmployee.mock.calls.length, 0);
  assert.equal(mockDriverLicenceCreate.mock.calls.length, 0);
});

test("POST /api/driver-licenses/create blocks unauthorized employee access", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1", role: "ADMIN" } }),
  );
  mockEmployeeFindFirst.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "emp-1" }),
  );
  mockCanAccessEmployee.mock.mockImplementationOnce(() => Promise.resolve(false));

  const formData = new FormData();
  formData.set("employeeId", "emp-1");
  formData.set("type", "CAR");
  formData.set("licenceNumber", "12345");
  formData.set("issueDate", new Date("2024-01-01").toISOString());
  formData.set("expiryDate", new Date("2025-01-01").toISOString());
  formData.set("reasons", JSON.stringify({ note: "test" }));

  const { create } = await routesPromise;
  const res = await create(
    new Request("http://localhost/api/driver-licenses/create", {
      method: "POST",
      body: formData,
    }),
  );

  assert.equal(res.status, 403);
  assert.equal(mockDriverLicenceCreate.mock.calls.length, 0);
});

test("POST /api/driver-licenses/create persists licence when admin is authorized", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1", role: "ADMIN" } }),
  );
  mockEmployeeFindFirst.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "emp-1" }),
  );
  mockCanAccessEmployee.mock.mockImplementationOnce(() => Promise.resolve(true));
  mockFormatDiffsForFormData.mock.mockImplementationOnce(() => ({ diff: true }));
  mockCreateAuditLogs.mock.mockImplementationOnce(() => Promise.resolve());
  mockDriverLicenceCreate.mock.mockImplementationOnce(({ data }) =>
    Promise.resolve({ id: "lic-1", ...data }),
  );

  const formData = new FormData();
  formData.set("employeeId", "emp-1");
  formData.set("type", "CAR");
  formData.set("licenceNumber", "12345");
  formData.set("issueDate", new Date("2024-01-01").toISOString());
  formData.set("expiryDate", new Date("2025-01-01").toISOString());
  formData.set("reasons", JSON.stringify({ note: "test" }));

  const { create } = await routesPromise;
  const res = await create(
    new Request("http://localhost/api/driver-licenses/create", {
      method: "POST",
      body: formData,
    }),
  );

  assert.equal(res.status, 200);
  const payload = await res.json();
  // API now auto-generates IDs - check it exists and is a valid string (UUID format)
  assert.ok(payload.id, "Expected payload.id to exist");
  assert.equal(typeof payload.id, "string", "Expected payload.id to be a string");
  assert.match(payload.id, /^[a-f0-9-]+$/, "Expected payload.id to be a UUID-like format");
  assert.equal(mockDriverLicenceCreate.mock.calls.length, 1);
});
