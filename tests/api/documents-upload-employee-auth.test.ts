import "../setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

const originalLoad = (Module as any)._load;
let mockPrisma: any = {};
let mockSession: any = null;

// Initialize mockSupabase with the full structure before module loading
let mockSupabase: any = {
  storage: {
    from: () => ({
      upload: async () => ({
        data: { path: "test-path" },
        error: null,
      }),
      createSignedUrl: async () => ({
        data: { signedUrl: "https://example.com/signed-url" },
        error: null,
      }),
    }),
  },
};

// Mock resend
let mockResend: any = {
  emails: {
    send: async () => ({ id: "mock-email-id" }),
  },
};

(Module as any)._load = function (
  request: string,
  parent: any,
  isMain: boolean,
) {
  if (request === "@/lib/prisma") {
    return { prisma: mockPrisma, ensurePrismaConnected: async () => {} };
  }
  if (request === "@/lib/supabase-admin") {
    return { __esModule: true, default: mockSupabase, ...mockSupabase };
  }
  if (request === "@/lib/auth-options") {
    return {
      auth: async () => mockSession,
      authOptions: {},
    };
  }
  if (request === "next-auth") {
    return { getServerSession: async () => mockSession };
  }
  if (request === "@/lib/resend") {
    return { resend: mockResend };
  }
  if (request === "@/lib/email/template") {
    return { getAppBaseUrl: () => "http://localhost:3000" };
  }
  if (request === "@/lib/email/documentNotifications") {
    return {
      buildDocumentNotificationEmail: () => ({
        subject: "Test Subject",
        html: "<p>Test</p>",
        text: "Test",
      }),
    };
  }
  return originalLoad(request, parent, isMain);
};

let routeModulePromise: Promise<typeof import("../../app/api/documents/upload-employee/route")> | null = null;

async function getRouteModule() {
  if (!routeModulePromise) {
    routeModulePromise = import("../../app/api/documents/upload-employee/route");
  }
  return routeModulePromise;
}

function createFormData(data: Record<string, string | Blob>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value);
  }
  return formData;
}

function createRequest(formData: FormData): Request {
  return new Request("http://localhost/api/documents/upload-employee", {
    method: "POST",
    body: formData,
  });
}

function createMockFile(): Blob {
  return new Blob(["test content"], { type: "application/pdf" });
}

function resetMocks() {
  mockSupabase.storage = {
    from: () => ({
      upload: async () => ({
        data: { path: "test-path" },
        error: null,
      }),
      createSignedUrl: async () => ({
        data: { signedUrl: "https://example.com/signed-url" },
        error: null,
      }),
    }),
  };
}

test("Employee Document Upload Security Tests", async (t) => {
  await t.test("Returns 401 when not authenticated", async () => {
    resetMocks();
    mockSession = null;

    const { POST } = await getRouteModule();
    const formData = createFormData({
      file: createMockFile(),
      name: "test.pdf",
      category: "General",
      employeeId: "emp-1",
    });
    const req = createRequest(formData);
    const res = await POST(req);

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "Unauthorized");
  });

  await t.test("Returns 403 for cross-tenant upload attempt", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "user-1",
        companyId: "company-1",
        role: "ADMIN",
      },
    };

    // Employee belongs to a different company
    mockPrisma.employee = {
      findUnique: async () => ({
        id: "emp-1",
        userId: "other-user",
        companyId: "company-2", // Different company!
        User: { companyId: "company-2", managerId: null },
      }),
      findFirst: async () => null,
    };

    const { POST } = await getRouteModule();
    const formData = createFormData({
      file: createMockFile(),
      name: "test.pdf",
      category: "General",
      employeeId: "emp-1",
    });
    const req = createRequest(formData);
    const res = await POST(req);

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error, "Forbidden");
  });

  await t.test("EMPLOYEE cannot upload to another employee's record", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "user-1",
        companyId: "company-1",
        role: "EMPLOYEE",
      },
    };

    // Target employee is different from the session user
    mockPrisma.employee = {
      findUnique: async () => ({
        id: "emp-2",
        userId: "user-2", // Different user!
        companyId: "company-1",
        User: { companyId: "company-1", managerId: "manager-1" },
      }),
      findFirst: async ({ where }: any) => {
        // Return the session user's employee record
        if (where?.userId === "user-1") {
          return { id: "emp-1" }; // Different from emp-2
        }
        return null;
      },
    };

    const { POST } = await getRouteModule();
    const formData = createFormData({
      file: createMockFile(),
      name: "test.pdf",
      category: "General",
      employeeId: "emp-2",
    });
    const req = createRequest(formData);
    const res = await POST(req);

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error, "Forbidden");
  });

  await t.test("EMPLOYEE can upload to their own record", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "user-1",
        companyId: "company-1",
        role: "EMPLOYEE",
      },
    };

    mockPrisma.employee = {
      findUnique: async (args: any) => {
        if (args?.where?.id === "emp-1") {
          return {
            id: "emp-1",
            userId: "user-1", // Same as session user
            companyId: "company-1",
            User: { companyId: "company-1", managerId: "manager-1" },
          };
        }
        return null;
      },
      findFirst: async () => null,
    };
    mockPrisma.user = {
      findUnique: async () => ({
        id: "user-1",
        companyId: "company-1",
      }),
    };
    mockPrisma.company = {
      findUnique: async () => ({ id: "company-1" }),
    };
    mockPrisma.document = {
      create: async ({ data }: any) => ({
        id: "doc-1",
        ...data,
        createdAt: new Date(),
      }),
    };

    const { POST } = await getRouteModule();
    const formData = createFormData({
      file: createMockFile(),
      name: "test.pdf",
      category: "General",
      employeeId: "emp-1",
    });
    const req = createRequest(formData);
    const res = await POST(req);

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.Document);
    assert.equal(body.Document.name, "test.pdf");
  });

  await t.test("MANAGER can upload to direct report's record", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "manager-user-1",
        companyId: "company-1",
        role: "MANAGER",
      },
    };

    mockPrisma.employee = {
      findUnique: async () => ({
        id: "emp-1",
        userId: "user-1",
        companyId: "company-1",
        User: { companyId: "company-1", managerId: "manager-user-1" }, // Reports to session user
      }),
      findFirst: async () => null,
    };
    mockPrisma.user = {
      findUnique: async () => ({
        id: "manager-user-1",
        companyId: "company-1",
      }),
    };
    mockPrisma.company = {
      findUnique: async () => ({ id: "company-1" }),
    };
    mockPrisma.document = {
      create: async ({ data }: any) => ({
        id: "doc-1",
        ...data,
        createdAt: new Date(),
      }),
    };

    const { POST } = await getRouteModule();
    const formData = createFormData({
      file: createMockFile(),
      name: "test.pdf",
      category: "General",
      employeeId: "emp-1",
    });
    const req = createRequest(formData);
    const res = await POST(req);

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.Document);
  });

  await t.test("MANAGER cannot upload to non-direct-report's record", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "manager-user-1",
        companyId: "company-1",
        role: "MANAGER",
      },
    };

    mockPrisma.employee = {
      findUnique: async () => ({
        id: "emp-1",
        userId: "user-1",
        companyId: "company-1",
        User: { companyId: "company-1", managerId: "other-manager" }, // Reports to different manager
      }),
      findFirst: async () => null,
    };

    const { POST } = await getRouteModule();
    const formData = createFormData({
      file: createMockFile(),
      name: "test.pdf",
      category: "General",
      employeeId: "emp-1",
    });
    const req = createRequest(formData);
    const res = await POST(req);

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error, "Forbidden");
  });

  await t.test("ADMIN can upload to any employee in same company", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "admin-user-1",
        companyId: "company-1",
        role: "ADMIN",
      },
    };

    mockPrisma.employee = {
      findUnique: async () => ({
        id: "emp-99",
        userId: "user-99",
        companyId: "company-1",
        User: { companyId: "company-1", managerId: "some-manager" },
      }),
      findFirst: async () => null,
    };
    mockPrisma.user = {
      findUnique: async () => ({
        id: "admin-user-1",
        companyId: "company-1",
      }),
    };
    mockPrisma.company = {
      findUnique: async () => ({ id: "company-1" }),
    };
    mockPrisma.document = {
      create: async ({ data }: any) => ({
        id: "doc-1",
        ...data,
        createdAt: new Date(),
      }),
    };

    const { POST } = await getRouteModule();
    const formData = createFormData({
      file: createMockFile(),
      name: "test.pdf",
      category: "General",
      employeeId: "emp-99",
    });
    const req = createRequest(formData);
    const res = await POST(req);

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.Document);
  });

  await t.test("SUPER_ADMIN can upload to any employee in same company", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "super-admin-1",
        companyId: "company-1",
        role: "SUPER_ADMIN",
      },
    };

    mockPrisma.employee = {
      findUnique: async () => ({
        id: "emp-99",
        userId: "user-99",
        companyId: "company-1",
        User: { companyId: "company-1", managerId: "some-manager" },
      }),
      findFirst: async () => null,
    };
    mockPrisma.user = {
      findUnique: async () => ({
        id: "super-admin-1",
        companyId: "company-1",
      }),
    };
    mockPrisma.company = {
      findUnique: async () => ({ id: "company-1" }),
    };
    mockPrisma.document = {
      create: async ({ data }: any) => ({
        id: "doc-1",
        ...data,
        createdAt: new Date(),
      }),
    };

    const { POST } = await getRouteModule();
    const formData = createFormData({
      file: createMockFile(),
      name: "test.pdf",
      category: "General",
      employeeId: "emp-99",
    });
    const req = createRequest(formData);
    const res = await POST(req);

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.Document);
  });

  await t.test("Returns 404 when employee not found", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "user-1",
        companyId: "company-1",
        role: "ADMIN",
      },
    };

    mockPrisma.employee = {
      findUnique: async () => null,
      findFirst: async () => null,
    };

    const { POST } = await getRouteModule();
    const formData = createFormData({
      file: createMockFile(),
      name: "test.pdf",
      category: "General",
      employeeId: "non-existent",
    });
    const req = createRequest(formData);
    const res = await POST(req);

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, "Employee not found");
  });

  await t.test("Returns 400 when missing required fields", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "user-1",
        companyId: "company-1",
        role: "ADMIN",
      },
    };

    const { POST } = await getRouteModule();
    const formData = createFormData({
      name: "test.pdf",
      category: "General",
      // Missing file and employeeId
    });
    const req = createRequest(formData);
    const res = await POST(req);

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "Missing fields");
  });

  await t.test("Returns 400 when session has no companyId", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "user-1",
        companyId: null, // No company
        role: "ADMIN",
      },
    };

    const { POST } = await getRouteModule();
    const formData = createFormData({
      file: createMockFile(),
      name: "test.pdf",
      category: "General",
      employeeId: "emp-1",
    });
    const req = createRequest(formData);
    const res = await POST(req);

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "Missing company context");
  });
});
