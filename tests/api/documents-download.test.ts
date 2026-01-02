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
    // Return an ESModule-like shape so both default and namespace imports work
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
  return originalLoad(request, parent, isMain);
};

let routeModulePromise: Promise<typeof import("../../app/api/documents/download/route")> | null = null;

async function getRouteModule() {
  if (!routeModulePromise) {
    routeModulePromise = import("../../app/api/documents/download/route");
  }
  return routeModulePromise;
}

function createRequest(path: string): Request {
  return new Request(`http://localhost/api/documents/download?path=${encodeURIComponent(path)}`);
}

function resetMocks() {
  // Reset supabase mock - preserve object reference
  mockSupabase.storage = {
    from: () => ({
      createSignedUrl: async () => ({
        data: { signedUrl: "https://example.com/signed-url" },
        error: null,
      }),
    }),
  };
}

test("Document Download Security Tests", async (t) => {
  await t.test("Employee can download their own employee-specific document", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "user-1",
        companyId: "company-1",
        role: "EMPLOYEE",
      },
    };

    mockPrisma.user = {
      findUnique: async () => ({
        role: "EMPLOYEE",
        departmentId: "dept-1",
        jobRoleId: "role-1",
        Employee: { id: "emp-1" },
      }),
    };
    mockPrisma.document = {
      findFirst: async (args: any) => {
        if (args?.where?.companyId === "company-1") {
          return {
            id: "doc-1",
            path: "company-1/documents/my-doc.pdf",
            companyId: "company-1",
            employeeId: "emp-1", // Document belongs to emp-1
            canViewEmployee: true,
            canViewManager: true,
            Department: [],
            JobRole: [],
            Employee: {
              id: "emp-1",
              User: { managerId: "manager-user-1" },
            },
          };
        }
        return null;
      },
    };

    const { GET } = await getRouteModule();
    const req = createRequest("company-1/documents/my-doc.pdf");
    const res = await GET(req);
    
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.url);
  });

  await t.test("Employee CANNOT download another employee's document", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "user-1",
        companyId: "company-1",
        role: "EMPLOYEE",
      },
    };

    mockPrisma.user = {
      findUnique: async () => ({
        role: "EMPLOYEE",
        departmentId: "dept-1",
        jobRoleId: "role-1",
        Employee: { id: "emp-1" }, // Viewer is emp-1
      }),
    };
    mockPrisma.document = {
      findFirst: async (args: any) => {
        if (args?.where?.companyId === "company-1") {
          return {
            id: "doc-2",
            path: "company-1/documents/other-emp-doc.pdf",
            companyId: "company-1",
            employeeId: "emp-2", // Document belongs to emp-2 (different employee!)
            canViewEmployee: true,
            canViewManager: true,
            Department: [],
            JobRole: [],
            Employee: {
              id: "emp-2",
              User: { managerId: "manager-user-1" },
            },
          };
        }
        return null;
      },
    };

    const { GET } = await getRouteModule();
    const req = createRequest("company-1/documents/other-emp-doc.pdf");
    const res = await GET(req);
    
    // Should be forbidden - employee trying to access another employee's document
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error, "Forbidden");
  });

  await t.test("Manager can download direct report's employee-specific document", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "manager-user-1",
        companyId: "company-1",
        role: "MANAGER",
      },
    };

    mockPrisma.user = {
      findUnique: async () => ({
        role: "MANAGER",
        departmentId: "dept-1",
        jobRoleId: "role-1",
        Employee: { id: "manager-emp-1" },
      }),
    };
    mockPrisma.document = {
      findFirst: async (args: any) => {
        if (args?.where?.companyId === "company-1") {
          return {
            id: "doc-1",
            path: "company-1/documents/report-doc.pdf",
            companyId: "company-1",
            employeeId: "emp-1", // Document belongs to emp-1
            canViewEmployee: true,
            canViewManager: true,
            Department: [],
            JobRole: [],
            Employee: {
              id: "emp-1",
              User: { managerId: "manager-user-1" }, // emp-1 reports to manager-user-1
            },
          };
        }
        return null;
      },
    };

    const { GET } = await getRouteModule();
    const req = createRequest("company-1/documents/report-doc.pdf");
    const res = await GET(req);
    
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.url);
  });

  await t.test("Manager CANNOT download non-direct-report's employee-specific document", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "manager-user-1",
        companyId: "company-1",
        role: "MANAGER",
      },
    };

    mockPrisma.user = {
      findUnique: async () => ({
        role: "MANAGER",
        departmentId: "dept-1",
        jobRoleId: "role-1",
        Employee: { id: "manager-emp-1" },
      }),
    };
    mockPrisma.document = {
      findFirst: async (args: any) => {
        if (args?.where?.companyId === "company-1") {
          return {
            id: "doc-1",
            path: "company-1/documents/other-team-doc.pdf",
            companyId: "company-1",
            employeeId: "emp-2", // Document belongs to emp-2
            canViewEmployee: true,
            canViewManager: true,
            Department: [],
            JobRole: [],
            Employee: {
              id: "emp-2",
              User: { managerId: "other-manager-user" }, // emp-2 reports to different manager
            },
          };
        }
        return null;
      },
    };

    const { GET } = await getRouteModule();
    const req = createRequest("company-1/documents/other-team-doc.pdf");
    const res = await GET(req);
    
    // Should be forbidden - manager trying to access non-direct-report's document
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error, "Forbidden");
  });

  await t.test("Admin can download any employee-specific document", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "admin-user-1",
        companyId: "company-1",
        role: "ADMIN",
      },
    };

    mockPrisma.user = {
      findUnique: async () => ({
        role: "ADMIN",
        departmentId: "dept-1",
        jobRoleId: "role-1",
        Employee: { id: "admin-emp-1" },
      }),
    };
    mockPrisma.document = {
      findFirst: async (args: any) => {
        if (args?.where?.companyId === "company-1") {
          return {
            id: "doc-1",
            path: "company-1/documents/any-emp-doc.pdf",
            companyId: "company-1",
            employeeId: "emp-99", // Document belongs to any employee
            canViewEmployee: true,
            canViewManager: true,
            Department: [],
            JobRole: [],
            Employee: {
              id: "emp-99",
              User: { managerId: "some-manager" },
            },
          };
        }
        return null;
      },
    };

    const { GET } = await getRouteModule();
    const req = createRequest("company-1/documents/any-emp-doc.pdf");
    const res = await GET(req);
    
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.url);
  });

  await t.test("Company-wide document (no employeeId) follows existing role-based access", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "user-1",
        companyId: "company-1",
        role: "EMPLOYEE",
      },
    };

    mockPrisma.user = {
      findUnique: async () => ({
        role: "EMPLOYEE",
        departmentId: "dept-1",
        jobRoleId: "role-1",
        Employee: { id: "emp-1" },
      }),
    };
    mockPrisma.document = {
      findFirst: async (args: any) => {
        if (args?.where?.companyId === "company-1") {
          return {
            id: "doc-company",
            path: "company-1/documents/company-policy.pdf",
            companyId: "company-1",
            employeeId: null, // Company-wide document
            canViewEmployee: true,
            canViewManager: true,
            Department: [],
            JobRole: [],
            Employee: null,
          };
        }
        return null;
      },
    };

    const { GET } = await getRouteModule();
    const req = createRequest("company-1/documents/company-policy.pdf");
    const res = await GET(req);
    
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.url);
  });

  await t.test("Employee without linked Employee record can still access company-wide docs", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "user-no-emp",
        companyId: "company-1",
        role: "EMPLOYEE",
      },
    };

    mockPrisma.user = {
      findUnique: async () => ({
        role: "EMPLOYEE",
        departmentId: "dept-1",
        jobRoleId: "role-1",
        Employee: null, // No linked employee record
      }),
    };
    mockPrisma.document = {
      findFirst: async (args: any) => {
        if (args?.where?.companyId === "company-1") {
          return {
            id: "doc-company",
            path: "company-1/documents/handbook.pdf",
            companyId: "company-1",
            employeeId: null, // Company-wide document
            canViewEmployee: true,
            canViewManager: true,
            Department: [],
            JobRole: [],
            Employee: null,
          };
        }
        return null;
      },
    };

    const { GET } = await getRouteModule();
    const req = createRequest("company-1/documents/handbook.pdf");
    const res = await GET(req);
    
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.url);
  });

  await t.test("Employee without linked Employee record CANNOT access employee-specific docs", async () => {
    resetMocks();
    mockSession = {
      user: {
        id: "user-no-emp",
        companyId: "company-1",
        role: "EMPLOYEE",
      },
    };

    mockPrisma.user = {
      findUnique: async () => ({
        role: "EMPLOYEE",
        departmentId: "dept-1",
        jobRoleId: "role-1",
        Employee: null, // No linked employee record
      }),
    };
    mockPrisma.document = {
      findFirst: async (args: any) => {
        if (args?.where?.companyId === "company-1") {
          return {
            id: "doc-emp",
            path: "company-1/documents/emp-specific.pdf",
            companyId: "company-1",
            employeeId: "emp-1", // Employee-specific document
            canViewEmployee: true,
            canViewManager: true,
            Department: [],
            JobRole: [],
            Employee: {
              id: "emp-1",
              User: { managerId: "some-manager" },
            },
          };
        }
        return null;
      },
    };

    const { GET } = await getRouteModule();
    const req = createRequest("company-1/documents/emp-specific.pdf");
    const res = await GET(req);
    
    // Should be forbidden - user has no employee record so can't be owner
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error, "Forbidden");
  });
});
