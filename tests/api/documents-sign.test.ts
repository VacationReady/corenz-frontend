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
      upload: async () => ({ error: null }),
      download: async () => ({ data: null, error: { message: "Not found" } }),
      createSignedUrl: async () => ({
        data: { signedUrl: "https://example.com/signed-url" },
        error: null,
      }),
    }),
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
  if (request === "@/lib/cache") {
    return {
      invalidateDocumentStatusCache: async () => {},
    };
  }
  return originalLoad(request, parent, isMain);
};

let routeModulePromise: Promise<typeof import("../../app/api/documents/sign/route")> | null = null;

async function getRouteModule() {
  if (!routeModulePromise) {
    routeModulePromise = import("../../app/api/documents/sign/route");
  }
  return routeModulePromise;
}

function createRequest(body: any): Request {
  return new Request("http://localhost/api/documents/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function resetMocks() {
  mockSupabase.storage = {
    from: () => ({
      upload: async () => ({ error: null }),
      download: async () => ({ data: null, error: { message: "Not found" } }),
      createSignedUrl: async () => ({
        data: { signedUrl: "https://example.com/signed-url" },
        error: null,
      }),
    }),
  };
}

function setupBasicMocks() {
  mockSession = {
    user: {
      id: "user-1",
      companyId: "company-1",
      role: "EMPLOYEE",
    },
  };

  mockPrisma.employee = {
    findFirst: async () => ({
      id: "emp-1",
      departmentId: "dept-1",
      jobRoleId: "role-1",
    }),
  };

  mockPrisma.documentSignatureArtifact = {
    findUnique: async () => null,
    create: async (args: any) => ({ id: "artifact-1", ...args.data }),
  };

  mockPrisma.documentAcknowledgement = {
    upsert: async () => ({}),
  };

  mockPrisma.actionItem = {
    updateMany: async () => ({ count: 0 }),
  };
}

test("Document Sign Validation Tests", async (t) => {
  await t.test("Rejects request with only fieldValues when document has signature fields", async () => {
    resetMocks();
    setupBasicMocks();

    mockPrisma.document = {
      findFirst: async () => ({
        id: "doc-1",
        companyId: "company-1",
        requiresSignature: true,
        employeeId: "emp-1",
        Employee: { id: "emp-1" },
        Department: null,
        JobRole: null,
        SignatureDepartments: [],
        SignatureJobRoles: [],
        SignatureEmployees: [],
        SignatureFields: [
          { id: "field-1", label: "Signature", pageNumber: 1, x: 0.5, y: 0.5, width: 0.2, height: 0.1 },
          { id: "field-2", label: "Name", pageNumber: 1, x: 0.5, y: 0.6, width: 0.2, height: 0.1 },
        ],
      }),
    };

    const { POST } = await getRouteModule();
    const req = createRequest({
      documentId: "doc-1",
      method: "TYPED",
      fieldValues: { "field-2": "John Doe" }, // Only name field, no signature
    });
    const res = await POST(req);

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes("Signature is required"));
  });

  await t.test("Accepts request with typed signature when document has signature fields", async () => {
    resetMocks();
    setupBasicMocks();

    mockPrisma.document = {
      findFirst: async () => ({
        id: "doc-1",
        companyId: "company-1",
        path: "company-1/documents/test.pdf",
        requiresSignature: true,
        requiresAck: false,
        employeeId: "emp-1",
        Employee: { id: "emp-1" },
        Department: null,
        JobRole: null,
        SignatureDepartments: [],
        SignatureJobRoles: [],
        SignatureEmployees: [],
        SignatureFields: [
          { id: "field-1", label: "Signature", pageNumber: 1, x: 0.5, y: 0.5, width: 0.2, height: 0.1 },
        ],
      }),
      update: async () => ({}),
    };

    const { POST } = await getRouteModule();
    const req = createRequest({
      documentId: "doc-1",
      method: "TYPED",
      typedText: "John Doe",
    });
    const res = await POST(req);

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  });

  await t.test("Accepts request with drawn signature when document has signature fields", async () => {
    resetMocks();
    setupBasicMocks();

    mockPrisma.document = {
      findFirst: async () => ({
        id: "doc-1",
        companyId: "company-1",
        path: "company-1/documents/test.pdf",
        requiresSignature: true,
        requiresAck: false,
        employeeId: "emp-1",
        Employee: { id: "emp-1" },
        Department: null,
        JobRole: null,
        SignatureDepartments: [],
        SignatureJobRoles: [],
        SignatureEmployees: [],
        SignatureFields: [
          { id: "field-1", label: "Signature", pageNumber: 1, x: 0.5, y: 0.5, width: 0.2, height: 0.1 },
        ],
      }),
      update: async () => ({}),
    };

    const { POST } = await getRouteModule();
    const req = createRequest({
      documentId: "doc-1",
      method: "DRAWN",
      drawnDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    });
    const res = await POST(req);

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  });

  await t.test("Rejects TYPED method without typedText when document has signature fields", async () => {
    resetMocks();
    setupBasicMocks();

    mockPrisma.document = {
      findFirst: async () => ({
        id: "doc-1",
        companyId: "company-1",
        requiresSignature: true,
        employeeId: "emp-1",
        Employee: { id: "emp-1" },
        Department: null,
        JobRole: null,
        SignatureDepartments: [],
        SignatureJobRoles: [],
        SignatureEmployees: [],
        SignatureFields: [
          { id: "field-1", label: "Signature", pageNumber: 1, x: 0.5, y: 0.5, width: 0.2, height: 0.1 },
        ],
      }),
    };

    const { POST } = await getRouteModule();
    const req = createRequest({
      documentId: "doc-1",
      method: "TYPED",
      typedText: "", // Empty signature
    });
    const res = await POST(req);

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes("Signature is required") || body.error.includes("typedText"));
  });

  await t.test("Rejects DRAWN method without valid drawnDataUrl when document has signature fields", async () => {
    resetMocks();
    setupBasicMocks();

    mockPrisma.document = {
      findFirst: async () => ({
        id: "doc-1",
        companyId: "company-1",
        requiresSignature: true,
        employeeId: "emp-1",
        Employee: { id: "emp-1" },
        Department: null,
        JobRole: null,
        SignatureDepartments: [],
        SignatureJobRoles: [],
        SignatureEmployees: [],
        SignatureFields: [
          { id: "field-1", label: "Signature", pageNumber: 1, x: 0.5, y: 0.5, width: 0.2, height: 0.1 },
        ],
      }),
    };

    const { POST } = await getRouteModule();
    const req = createRequest({
      documentId: "doc-1",
      method: "DRAWN",
      drawnDataUrl: "not-a-valid-data-url",
    });
    const res = await POST(req);

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes("Signature is required") || body.error.includes("drawnDataUrl"));
  });

  await t.test("Allows fieldValues only when document has NO signature fields (only name/job fields)", async () => {
    resetMocks();
    setupBasicMocks();

    mockPrisma.document = {
      findFirst: async () => ({
        id: "doc-1",
        companyId: "company-1",
        path: "company-1/documents/test.pdf",
        requiresSignature: true,
        requiresAck: false,
        employeeId: "emp-1",
        Employee: { id: "emp-1" },
        Department: null,
        JobRole: null,
        SignatureDepartments: [],
        SignatureJobRoles: [],
        SignatureEmployees: [],
        SignatureFields: [
          { id: "field-1", label: "Name", pageNumber: 1, x: 0.5, y: 0.5, width: 0.2, height: 0.1 },
          { id: "field-2", label: "Job Role", pageNumber: 1, x: 0.5, y: 0.6, width: 0.2, height: 0.1 },
        ],
      }),
      update: async () => ({}),
    };

    const { POST } = await getRouteModule();
    const req = createRequest({
      documentId: "doc-1",
      method: "TYPED",
      fieldValues: { "field-1": "John Doe", "field-2": "Engineer" },
    });
    const res = await POST(req);

    // Should succeed because there are no actual signature fields
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  });

  await t.test("Rejects request without documentId", async () => {
    resetMocks();
    setupBasicMocks();

    const { POST } = await getRouteModule();
    const req = createRequest({
      method: "TYPED",
      typedText: "John Doe",
    });
    const res = await POST(req);

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes("documentId"));
  });

  await t.test("Rejects request without method", async () => {
    resetMocks();
    setupBasicMocks();

    const { POST } = await getRouteModule();
    const req = createRequest({
      documentId: "doc-1",
      typedText: "John Doe",
    });
    const res = await POST(req);

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes("method"));
  });

  await t.test("Rejects unauthorized request", async () => {
    resetMocks();
    mockSession = null;

    const { POST } = await getRouteModule();
    const req = createRequest({
      documentId: "doc-1",
      method: "TYPED",
      typedText: "John Doe",
    });
    const res = await POST(req);

    assert.equal(res.status, 401);
  });

  await t.test("Rejects request for document that does not require signature", async () => {
    resetMocks();
    setupBasicMocks();

    mockPrisma.document = {
      findFirst: async () => ({
        id: "doc-1",
        companyId: "company-1",
        requiresSignature: false, // Document doesn't require signature
        employeeId: "emp-1",
        Employee: { id: "emp-1" },
        Department: null,
        JobRole: null,
        SignatureDepartments: [],
        SignatureJobRoles: [],
        SignatureEmployees: [],
        SignatureFields: [],
      }),
    };

    const { POST } = await getRouteModule();
    const req = createRequest({
      documentId: "doc-1",
      method: "TYPED",
      typedText: "John Doe",
    });
    const res = await POST(req);

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes("does not require a signature"));
  });
});
