/**
 * Unit Tests for Employees API Pagination & Optimization
 * 
 * Tests the refactored employees endpoint covering:
 * - Cursor-based pagination
 * - Iterative subordinate collection (non-recursive)
 * - Batched signed URL generation
 * - Authorization with pagination
 */

import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { NextRequest } from "next/server";

// Mock next-auth + auth() from auth-options for employees API tests
const originalLoad = (Module as any)._load;
let mockSession: any = null;
let mockPrisma: any = {};
let mockSupabase: any = { storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: null }) }) } };

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next-auth") {
    return {
      getServerSession: async () => mockSession,
    };
  }
  if (request === "@/lib/auth-options" || request === "../app/lib/auth-options") {
    return {
      auth: async () => mockSession,
    };
  }
  if (request === "@/lib/prisma") {
    return {
      prisma: mockPrisma,
      ensurePrismaConnected: async () => { },
    };
  }
  if (request === "@/lib/supabase-admin") {
    // Return an ESModule-like shape so both default and namespace imports work
    return { __esModule: true, default: mockSupabase, ...mockSupabase };
  }
  return originalLoad(request, parent, isMain);
};

let routeModulePromise: Promise<typeof import("../../app/api/employees/route")> | null = null;

async function getRouteModule() {
  if (!routeModulePromise) {
    routeModulePromise = import("../../app/api/employees/route");
  }
  return routeModulePromise;
}

async function callGet(req: NextRequest) {
  const { GET } = await getRouteModule();
  return GET(req);
}

async function resetMocks() {
  mockSession = null;
  const { __clearProfileUrlCacheForTests } = await import("../../app/lib/storage/signProfiles");
  __clearProfileUrlCacheForTests();
  mockPrisma.employee = {
    findMany: async () => [],
    findFirst: async () => null,
  };
  mockPrisma.user = {
    findMany: async () => [],
  };
  // Preserve mockSupabase object reference so imported supabase sees updated methods
  if (!mockSupabase.storage) {
    mockSupabase.storage = {};
  }
  mockSupabase.storage.from = () => ({
    createSignedUrl: async (path: string) => ({
      data: { signedUrl: `https://example.com/signed/${path}` },
      error: null,
    }),
  });
}

test("Employees API - Pagination & Optimization", async (t) => {
  const run = async (name: string, fn: () => Promise<void>) => {
    await t.test(name, async () => {
      await resetMocks();
      await fn();
    });
  };

  // ========================================
  // Pagination Tests
  // ========================================

  await run("GET: returns paginated response with default limit", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    const employees = Array.from({ length: 50 }, (_, i) => ({
      id: `emp${i}`,
      companyId: "company1",
      isActive: true,
      User: {
        id: `user${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        email: `user${i}@example.com`,
        phone: null,
        role: "EMPLOYEE",
        createdAt: new Date(),
        profileImageUrl: null,
        managerId: null,
        isActivated: true,
        PermissionProfile: null,
      },
      Department: null,
      JobRole: null,
      Location: null,
      WorkingPattern: null,
      EmployeeWorkingPatternAssignment: [],
      EmployeeOffboarding: null,
      offboardingStatus: null,
      lastWorkingDate: null,
      sickLeaveDaysPerYear: 10,
      alternativeHolidayBalance: 0,
      publicHolidaysPerYear: 11,
      employmentStartDate: new Date(),
    }));

    mockPrisma.employee.findMany = async ({ take }: any) => {
      // Return limit + 1 to simulate hasMore
      return employees.slice(0, take);
    };

    const req = new NextRequest("http://localhost/api/employees");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(data.data, "Should have data property");
    assert.ok(data.pagination, "Should have pagination property");
    assert.equal(data.data.length, 50, "Should return 50 employees (default limit)");
    assert.equal(data.pagination.limit, 50);
  });

  await run("GET: respects custom limit parameter", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    let capturedTake: number | undefined;
    mockPrisma.employee.findMany = async ({ take }: any) => {
      capturedTake = take;
      return Array.from({ length: Math.min(take, 10) }, (_, i) => ({
        id: `emp${i}`,
        companyId: "company1",
        isActive: true,
        User: {
          id: `user${i}`,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          email: `user${i}@example.com`,
          phone: null,
          role: "EMPLOYEE",
          createdAt: new Date(),
          profileImageUrl: null,
          managerId: null,
          isActivated: true,
          PermissionProfile: null,
        },
        Department: null,
        JobRole: null,
        Location: null,
        WorkingPattern: null,
        EmployeeWorkingPatternAssignment: [],
        EmployeeOffboarding: null,
        offboardingStatus: null,
        lastWorkingDate: null,
        sickLeaveDaysPerYear: 10,
        alternativeHolidayBalance: 0,
        publicHolidaysPerYear: 11,
        employmentStartDate: new Date(),
      }));
    };

    const req = new NextRequest("http://localhost/api/employees?limit=10");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(capturedTake, 11, "Should fetch limit + 1 for hasMore detection");
    assert.equal(data.pagination.limit, 10);
    assert.equal(data.data.length, 10);
  });

  await run("GET: enforces maximum limit of 100", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    let capturedTake: number | undefined;
    mockPrisma.employee.findMany = async ({ take }: any) => {
      capturedTake = take;
      return [];
    };

    const req = new NextRequest("http://localhost/api/employees?limit=500");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(capturedTake, 101, "Should cap at 100 + 1");
    assert.equal(data.pagination.limit, 100);
  });

  await run("GET: enforces minimum limit of 1", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    let capturedTake: number | undefined;
    mockPrisma.employee.findMany = async ({ take }: any) => {
      capturedTake = take;
      return [];
    };

    const req = new NextRequest("http://localhost/api/employees?limit=0");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(capturedTake, 2, "Should enforce minimum of 1 + 1");
    assert.equal(data.pagination.limit, 1);
  });

  await run("GET: rejects limit=all", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    let called = false;
    mockPrisma.employee.findMany = async () => {
      called = true;
      return [];
    };

    const req = new NextRequest("http://localhost/api/employees?limit=all");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(called, false, "Should reject before hitting the database");
    assert.equal(data.error, "Invalid query parameters");
  });

  await run("GET: handles cursor-based pagination", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    let capturedCursor: any;
    let capturedSkip: number | undefined;

    mockPrisma.employee.findMany = async ({ cursor, skip }: any) => {
      capturedCursor = cursor;
      capturedSkip = skip;
      return Array.from({ length: 5 }, (_, i) => ({
        id: `emp${i + 10}`, // Simulate next page
        companyId: "company1",
        isActive: true,
        User: {
          id: `user${i + 10}`,
          firstName: `First${i + 10}`,
          lastName: `Last${i + 10}`,
          email: `user${i + 10}@example.com`,
          phone: null,
          role: "EMPLOYEE",
          createdAt: new Date(),
          profileImageUrl: null,
          managerId: null,
          isActivated: true,
          PermissionProfile: null,
        },
        Department: null,
        JobRole: null,
        Location: null,
        WorkingPattern: null,
        EmployeeWorkingPatternAssignment: [],
        EmployeeOffboarding: null,
        offboardingStatus: null,
        lastWorkingDate: null,
        sickLeaveDaysPerYear: 10,
        alternativeHolidayBalance: 0,
        publicHolidaysPerYear: 11,
        employmentStartDate: new Date(),
      }));
    };

    const req = new NextRequest("http://localhost/api/employees?cursor=emp9&limit=5");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.deepEqual(capturedCursor, { id: "emp9" });
    assert.equal(capturedSkip, 1, "Should skip the cursor record");
    assert.equal(data.data.length, 5);
  });

  await run("GET: indicates hasMore when more results exist", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    // Return limit + 1 to indicate more results
    mockPrisma.employee.findMany = async ({ take }: any) => {
      return Array.from({ length: take }, (_, i) => ({
        id: `emp${i}`,
        companyId: "company1",
        isActive: true,
        User: {
          id: `user${i}`,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          email: `user${i}@example.com`,
          phone: null,
          role: "EMPLOYEE",
          createdAt: new Date(),
          profileImageUrl: null,
          managerId: null,
          isActivated: true,
          PermissionProfile: null,
        },
        Department: null,
        JobRole: null,
        Location: null,
        WorkingPattern: null,
        EmployeeWorkingPatternAssignment: [],
        EmployeeOffboarding: null,
        offboardingStatus: null,
        lastWorkingDate: null,
        sickLeaveDaysPerYear: 10,
        alternativeHolidayBalance: 0,
        publicHolidaysPerYear: 11,
        employmentStartDate: new Date(),
      }));
    };

    const req = new NextRequest("http://localhost/api/employees?limit=10");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.pagination.hasMore, true, "Should indicate more results");
    assert.ok(data.pagination.cursor, "Should provide next cursor");
    assert.equal(data.pagination.cursor, "emp9", "Cursor should be last item ID");
  });

  await run("GET: indicates no more results when at end", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    // Return fewer than limit + 1
    mockPrisma.employee.findMany = async () => {
      return Array.from({ length: 5 }, (_, i) => ({
        id: `emp${i}`,
        companyId: "company1",
        isActive: true,
        User: {
          id: `user${i}`,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          email: `user${i}@example.com`,
          phone: null,
          role: "EMPLOYEE",
          createdAt: new Date(),
          profileImageUrl: null,
          managerId: null,
          isActivated: true,
          PermissionProfile: null,
        },
        Department: null,
        JobRole: null,
        Location: null,
        WorkingPattern: null,
        EmployeeWorkingPatternAssignment: [],
        EmployeeOffboarding: null,
        offboardingStatus: null,
        lastWorkingDate: null,
        sickLeaveDaysPerYear: 10,
        alternativeHolidayBalance: 0,
        publicHolidaysPerYear: 11,
        employmentStartDate: new Date(),
      }));
    };

    const req = new NextRequest("http://localhost/api/employees?limit=10");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.pagination.hasMore, false, "Should indicate no more results");
    assert.equal(data.pagination.cursor, null, "Cursor should be null at end");
  });

  // ========================================
  // Batched Signed URL Tests
  // ========================================

  await run("GET: batches profile image signed URL generation", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    const employees = Array.from({ length: 5 }, (_, i) => ({
      id: `emp${i}`,
      companyId: "company1",
      isActive: true,
      User: {
        id: `user${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        email: `user${i}@example.com`,
        phone: null,
        role: "EMPLOYEE",
        createdAt: new Date(),
        profileImageUrl: i < 3 ? `profiles/user${i}.jpg` : null, // Only first 3 have images
        managerId: null,
        isActivated: true,
        PermissionProfile: null,
      },
      Department: null,
      JobRole: null,
      Location: null,
      WorkingPattern: null,
      EmployeeWorkingPatternAssignment: [],
      EmployeeOffboarding: null,
      offboardingStatus: null,
      lastWorkingDate: null,
      sickLeaveDaysPerYear: 10,
      alternativeHolidayBalance: 0,
      publicHolidaysPerYear: 11,
      employmentStartDate: new Date(),
    }));

    mockPrisma.employee.findMany = async () => employees;

    let signedUrlCallCount = 0;
    mockSupabase.storage.from = () => ({
      createSignedUrl: async (path: string) => {
        signedUrlCallCount++;
        return {
          data: { signedUrl: `https://example.com/signed/${path}` },
          error: null,
        };
      },
    });

    const req = new NextRequest("http://localhost/api/employees");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.data.length, 5);

    // Verify signed URLs are present for employees with images
    assert.ok(data.data[0].profileImageUrl, "First employee should have signed URL");
    assert.ok(data.data[1].profileImageUrl, "Second employee should have signed URL");
    assert.ok(data.data[2].profileImageUrl, "Third employee should have signed URL");
    assert.equal(data.data[3].profileImageUrl, null, "Fourth employee has no image");
    assert.equal(data.data[4].profileImageUrl, null, "Fifth employee has no image");

    // Verify batching occurred (3 calls for 3 images, not 5 calls)
    assert.equal(signedUrlCallCount, 3, "Should only call Supabase for employees with images");
  });

  await run("GET: handles signed URL failures gracefully in batch", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    const employees = Array.from({ length: 3 }, (_, i) => ({
      id: `emp${i}`,
      companyId: "company1",
      isActive: true,
      User: {
        id: `user${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        email: `user${i}@example.com`,
        phone: null,
        role: "EMPLOYEE",
        createdAt: new Date(),
        profileImageUrl: `profiles/user${i}.jpg`,
        managerId: null,
        isActivated: true,
        PermissionProfile: null,
      },
      Department: null,
      JobRole: null,
      Location: null,
      WorkingPattern: null,
      EmployeeWorkingPatternAssignment: [],
      EmployeeOffboarding: null,
      offboardingStatus: null,
      lastWorkingDate: null,
      sickLeaveDaysPerYear: 10,
      alternativeHolidayBalance: 0,
      publicHolidaysPerYear: 11,
      employmentStartDate: new Date(),
    }));

    mockPrisma.employee.findMany = async () => employees;

    // Simulate one URL failing
    mockSupabase.storage.from = () => ({
      createSignedUrl: async (path: string) => {
        if (path === "profiles/user1.jpg") {
          return {
            data: null,
            error: { message: "File not found" },
          };
        }
        return {
          data: { signedUrl: `https://example.com/signed/${path}` },
          error: null,
        };
      },
    });

    const req = new NextRequest("http://localhost/api/employees");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(data.data[0].profileImageUrl, "First URL should succeed");
    assert.equal(data.data[1].profileImageUrl, null, "Second URL should fail gracefully");
    assert.ok(data.data[2].profileImageUrl, "Third URL should succeed");
  });

  // ========================================
  // Authorization with Pagination Tests
  // ========================================

  await run("GET: MANAGER pagination respects authorization", async () => {
    mockSession = {
      user: { id: "manager1", companyId: "company1", role: "MANAGER", email: "manager@example.com" },
    };

    // Mock manager's employee record (for department lookup)
    mockPrisma.employee.findFirst = async ({ where }: any) => {
      if (where.userId === "manager1") {
        return { departmentId: "dept1" };
      }
      return null;
    };

    // Mock subordinate lookup
    mockPrisma.user.findMany = async ({ where }: any) => {
      if (where.managerId === "manager1") {
        return [{ id: "user1" }, { id: "user2" }];
      }
      return [];
    };

    mockPrisma.employee.findMany = async ({ where }: any) => {
      // Verify authorization filter is applied via OR conditions
      // Manager access uses OR: [self, department, subordinates]
      assert.ok(where.OR, "Should have OR filter for manager access");
      assert.ok(Array.isArray(where.OR), "OR should be an array");

      return Array.from({ length: 2 }, (_, i) => ({
        id: `emp${i}`,
        companyId: "company1",
        isActive: true,
        User: {
          id: `user${i}`,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          email: `user${i}@example.com`,
          phone: null,
          role: "EMPLOYEE",
          createdAt: new Date(),
          profileImageUrl: null,
          managerId: "manager1",
          isActivated: true,
          PermissionProfile: null,
        },
        Department: null,
        JobRole: null,
        Location: null,
        WorkingPattern: null,
        EmployeeWorkingPatternAssignment: [],
        EmployeeOffboarding: null,
        offboardingStatus: null,
        lastWorkingDate: null,
        sickLeaveDaysPerYear: 10,
        alternativeHolidayBalance: 0,
        publicHolidaysPerYear: 11,
        employmentStartDate: new Date(),
      }));
    };

    const req = new NextRequest("http://localhost/api/employees?limit=10");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.data.length, 2, "Should only return manager's reports");
    assert.ok(data.pagination);
  });

  await run("GET: pagination works with status filters", async () => {
    mockSession = {
      user: { id: "admin1", companyId: "company1", role: "ADMIN", email: "admin@example.com" },
    };

    let capturedWhere: any;
    mockPrisma.employee.findMany = async ({ where }: any) => {
      capturedWhere = where;
      return [];
    };

    const req = new NextRequest("http://localhost/api/employees?status=archived&limit=20");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(capturedWhere.isActive, false, "Should filter for archived employees");
    assert.ok(data.pagination);
    assert.equal(data.pagination.limit, 20);
  });
});
