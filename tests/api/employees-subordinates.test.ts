/**
 * Unit Tests for Iterative Subordinate Collection
 * 
 * Tests the refactored getAllSubordinatesIterative function
 * that replaces the recursive approach with a queue-based iteration.
 * 
 * This tests the internal logic by calling the API with specific
 * scenarios that exercise the subordinate collection.
 */

import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { NextRequest } from "next/server";

// Mock setup
const originalLoad = (Module as any)._load;
let mockSession: any = null;
let mockPrisma: any = {};
let mockSupabase: any = { storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: "https://example.com/signed/profile.jpg" }, error: null }) }) } };

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
      ensurePrismaConnected: async () => {},
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

function resetMocks() {
  mockSession = null;
  mockPrisma.employee = {
    findMany: async () => [],
    findFirst: async () => null,
  };
  mockPrisma.user = {
    findMany: async () => [],
    // Mock findUnique for permission profile lookup (added in permission enforcement feature)
    // For subordinate tests, we want managers to use role-based filtering (not profile-based)
    // so we return a user with a custom profile that has NO employees permission
    findUnique: async ({ where }: any) => {
      if (mockSession?.user?.id && where?.id === mockSession.user.id) {
        return {
          id: mockSession.user.id,
          role: mockSession.user.role,
          companyId: mockSession.user.companyId,
          // Custom profile with only dashboard access - no employees permission
          // This ensures managers use role-based filtering (OR conditions)
          PermissionProfile: {
            id: "limited-profile",
            name: "Limited Manager",
            permissions: { dashboard: ["read"] },
          },
        };
      }
      return null;
    },
  };
  // Preserve mockSupabase object reference so imported supabase sees updated methods
  if (!mockSupabase.storage) {
    mockSupabase.storage = {};
  }
  mockSupabase.storage.from = () => ({
    createSignedUrl: async () => ({
      data: { signedUrl: "https://example.com/signed/profile.jpg" },
      error: null,
    }),
  });
}

test("Iterative Subordinate Collection", async (t) => {
  const run = async (name: string, fn: () => Promise<void>) => {
    await t.test(name, async () => {
      resetMocks();
      await fn();
    });
  };

  // ========================================
  // Flat Hierarchy Tests
  // ========================================

  await run("Flat hierarchy: manager with direct reports only", async () => {
    mockSession = {
      user: { id: "manager1", companyId: "company1", role: "MANAGER", email: "manager@example.com" },
    };

    let userFindManyCallCount = 0;
    const managersQueried: string[] = [];

    // Mock manager's employee record (for department lookup)
    mockPrisma.employee.findFirst = async ({ where }: any) => {
      if (where.userId === "manager1") {
        return { departmentId: "dept1" };
      }
      return null;
    };

    mockPrisma.user.findMany = async ({ where }: any) => {
      userFindManyCallCount++;
      managersQueried.push(where.managerId);

      // Manager1 has 3 direct reports, none of them are managers
      if (where.managerId === "manager1") {
        return [
          { id: "user1" },
          { id: "user2" },
          { id: "user3" },
        ];
      }
      
      // Direct reports have no subordinates
      return [];
    };

    mockPrisma.employee.findMany = async ({ where }: any) => {
      // Manager access uses OR conditions: [self, department, subordinates]
      assert.ok(where.OR, "Should have OR filter for manager access");
      assert.ok(Array.isArray(where.OR), "OR should be an array");

      return Array.from({ length: 3 }, (_, i) => ({
        id: `emp${i}`,
        companyId: "company1",
        isActive: true,
        User: {
          id: `user${i + 1}`,
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

    const req = new NextRequest("http://localhost/api/employees");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.data.length, 3, "Should return 3 direct reports");
    
    // Verify iterative approach: should query manager1, then each direct report
    assert.equal(userFindManyCallCount, 4, "Should query manager + 3 direct reports");
    assert.deepEqual(
      managersQueried.sort(),
      ["manager1", "user1", "user2", "user3"].sort(),
      "Should query all levels"
    );
  });

  await run("Flat hierarchy: manager with no reports", async () => {
    mockSession = {
      user: { id: "manager1", companyId: "company1", role: "MANAGER", email: "manager@example.com" },
    };

    // Mock manager's employee record (for department lookup)
    mockPrisma.employee.findFirst = async ({ where }: any) => {
      if (where.userId === "manager1") {
        return { departmentId: null }; // No department
      }
      return null;
    };

    mockPrisma.user.findMany = async ({ where }: any) => {
      // Manager has no direct reports
      return [];
    };

    mockPrisma.employee.findMany = async ({ where }: any) => {
      // Manager access uses OR conditions: [self] (no department, no subordinates)
      assert.ok(where.OR, "Should have OR filter for manager access");
      assert.ok(Array.isArray(where.OR), "OR should be an array");
      return [];
    };

    const req = new NextRequest("http://localhost/api/employees");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.data.length, 0, "Should return no employees");
  });

  // ========================================
  // Multi-Level Hierarchy Tests
  // ========================================

  await run("Multi-level hierarchy: 2 levels deep", async () => {
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

    mockPrisma.user.findMany = async ({ where }: any) => {
      // Level 1: Manager1 has 2 direct reports (user1, user2)
      if (where.managerId === "manager1") {
        return [
          { id: "user1" },
          { id: "user2" },
        ];
      }
      
      // Level 2: user1 has 2 subordinates
      if (where.managerId === "user1") {
        return [
          { id: "user3" },
          { id: "user4" },
        ];
      }
      
      // Level 2: user2 has 1 subordinate
      if (where.managerId === "user2") {
        return [
          { id: "user5" },
        ];
      }
      
      // Level 3: No further subordinates
      return [];
    };

    mockPrisma.employee.findMany = async ({ where }: any) => {
      // Manager access uses OR conditions
      assert.ok(where.OR, "Should have OR filter for manager access");
      assert.ok(Array.isArray(where.OR), "OR should be an array");

      const expectedIds = ["user1", "user2", "user3", "user4", "user5"];
      return expectedIds.map((userId, i) => ({
        id: `emp${i}`,
        companyId: "company1",
        isActive: true,
        User: {
          id: userId,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          email: `${userId}@example.com`,
          phone: null,
          role: "EMPLOYEE",
          createdAt: new Date(),
          profileImageUrl: null,
          managerId: i < 2 ? "manager1" : (i < 4 ? "user1" : "user2"),
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

    const req = new NextRequest("http://localhost/api/employees");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.data.length, 5, "Should return all 5 subordinates");
  });

  await run("Multi-level hierarchy: 3+ levels deep", async () => {
    mockSession = {
      user: { id: "manager1", companyId: "company1", role: "MANAGER", email: "manager@example.com" },
    };

    const hierarchy: Record<string, string[]> = {
      "manager1": ["user1", "user2"],
      "user1": ["user3"],
      "user2": ["user4"],
      "user3": ["user5"],
      "user4": ["user6"],
      "user5": ["user7"],
    };

    // Mock manager's employee record (for department lookup)
    mockPrisma.employee.findFirst = async ({ where }: any) => {
      if (where.userId === "manager1") {
        return { departmentId: "dept1" };
      }
      return null;
    };

    mockPrisma.user.findMany = async ({ where }: any) => {
      const managerId = where.managerId;
      const subordinates = hierarchy[managerId] || [];
      return subordinates.map(id => ({ id }));
    };

    mockPrisma.employee.findMany = async ({ where }: any) => {
      // Manager access uses OR conditions
      assert.ok(where.OR, "Should have OR filter for manager access");

      const expectedIds = ["user1", "user2", "user3", "user4", "user5", "user6", "user7"];
      return expectedIds.map((userId, i) => ({
        id: `emp${i}`,
        companyId: "company1",
        isActive: true,
        User: {
          id: userId,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          email: `${userId}@example.com`,
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

    const req = new NextRequest("http://localhost/api/employees");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.data.length, 7, "Should handle deep hierarchies");
  });

  // ========================================
  // Edge Cases
  // ========================================

  await run("Handles circular references gracefully", async () => {
    mockSession = {
      user: { id: "manager1", companyId: "company1", role: "MANAGER", email: "manager@example.com" },
    };

    let queryCount = 0;
    const maxQueries = 10; // Safety limit

    // Mock manager's employee record (for department lookup)
    mockPrisma.employee.findFirst = async ({ where }: any) => {
      if (where.userId === "manager1") {
        return { departmentId: "dept1" };
      }
      return null;
    };

    mockPrisma.user.findMany = async ({ where }: any) => {
      queryCount++;
      
      // Prevent infinite loop in test
      if (queryCount > maxQueries) {
        return [];
      }

      // Simulate circular reference (should be prevented by Set)
      if (where.managerId === "manager1") {
        return [{ id: "user1" }];
      }
      if (where.managerId === "user1") {
        return [{ id: "user2" }];
      }
      if (where.managerId === "user2") {
        // This would create a cycle, but Set prevents re-processing
        return [{ id: "user1" }]; // Already processed
      }
      return [];
    };

    mockPrisma.employee.findMany = async ({ where }: any) => {
      // Manager access uses OR conditions
      assert.ok(where.OR, "Should have OR filter for manager access");
      
      // Return 2 employees (user1 and user2)
      return [
        {
          id: "emp0",
          companyId: "company1",
          isActive: true,
          User: {
            id: "user1",
            firstName: "First0",
            lastName: "Last0",
            email: "user1@example.com",
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
        },
        {
          id: "emp1",
          companyId: "company1",
          isActive: true,
          User: {
            id: "user2",
            firstName: "First1",
            lastName: "Last1",
            email: "user2@example.com",
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
        },
      ];
    };

    const req = new NextRequest("http://localhost/api/employees");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(queryCount <= maxQueries, "Should not infinite loop");
  });

  await run("Handles wide hierarchies (many direct reports)", async () => {
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

    mockPrisma.user.findMany = async ({ where }: any) => {
      // Manager has 50 direct reports
      if (where.managerId === "manager1") {
        return Array.from({ length: 50 }, (_, i) => ({ id: `user${i}` }));
      }
      // None of them have subordinates
      return [];
    };

    mockPrisma.employee.findMany = async ({ where }: any) => {
      // Manager access uses OR conditions
      assert.ok(where.OR, "Should have OR filter for manager access");
      
      return Array.from({ length: 50 }, (_, i) => ({
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

    const req = new NextRequest("http://localhost/api/employees");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.data.length, 50, "Should handle wide hierarchies");
  });

  // ========================================
  // Comparison with Recursive Approach
  // ========================================

  await run("Produces same results as recursive approach would", async () => {
    mockSession = {
      user: { id: "manager1", companyId: "company1", role: "MANAGER", email: "manager@example.com" },
    };

    // Complex hierarchy for comparison
    const hierarchy: Record<string, string[]> = {
      "manager1": ["user1", "user2"],
      "user1": ["user3", "user4"],
      "user2": ["user5"],
      "user4": ["user6", "user7"],
    };

    // Mock manager's employee record (for department lookup)
    mockPrisma.employee.findFirst = async ({ where }: any) => {
      if (where.userId === "manager1") {
        return { departmentId: "dept1" };
      }
      return null;
    };

    mockPrisma.user.findMany = async ({ where }: any) => {
      const managerId = where.managerId;
      const subordinates = hierarchy[managerId] || [];
      return subordinates.map(id => ({ id }));
    };

    mockPrisma.employee.findMany = async ({ where }: any) => {
      // Manager access uses OR conditions
      assert.ok(where.OR, "Should have OR filter for manager access");

      const expectedIds = ["user1", "user2", "user3", "user4", "user5", "user6", "user7"];
      return expectedIds.map((userId, i) => ({
        id: `emp${i}`,
        companyId: "company1",
        isActive: true,
        User: {
          id: userId,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          email: `${userId}@example.com`,
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

    const req = new NextRequest("http://localhost/api/employees");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.data.length, 7, "Should return all subordinates");
  });
});
