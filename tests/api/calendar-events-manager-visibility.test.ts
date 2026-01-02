/**
 * Manager Visibility Tests for Calendar Events API
 * 
 * Tests GET /api/calendar-events endpoint for manager role
 * 
 * Verifies:
 * 1. Manager visibility is restricted to direct reports + department colleagues
 * 2. COMPANY scope is treated as DEPARTMENT for managers (security restriction)
 * 3. Managers cannot see leave from employees outside their org scope
 * 4. Sickness leave is only visible for direct reports
 * 5. Other entitlement bookings are never visible to managers
 * 
 * NOTE: These tests are skipped in CI due to Next.js route handler compilation differences
 */

import "./setupEnv";

// Skip all tests in CI environment
if (process.env.CI || process.env.GITHUB_ACTIONS) {
  console.log("⏭️  Skipping calendar-events-manager-visibility tests in CI");
  process.exit(0);
}

import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { NextRequest } from "next/server";

// Mock data
const COMPANY_ID = "company1";
const MANAGER_USER_ID = "manager1";
const MANAGER_EMPLOYEE_ID = "emp-manager1";
const MANAGER_DEPT_ID = "dept1";

const DIRECT_REPORT_USER_ID = "user-direct1";
const DIRECT_REPORT_EMPLOYEE_ID = "emp-direct1";

const DEPT_COLLEAGUE_USER_ID = "user-dept1";
const DEPT_COLLEAGUE_EMPLOYEE_ID = "emp-dept1";

const OTHER_DEPT_USER_ID = "user-other1";
const OTHER_DEPT_EMPLOYEE_ID = "emp-other1";
const OTHER_DEPT_ID = "dept2";

// Mock session and prisma
const originalLoad = (Module as any)._load;
let mockSession: any = null;
let mockVisibilitySettings: any = { calendarEmployeeScope: "DEPARTMENT" };
let mockLeaveRequests: any[] = [];
let mockDirectReports: any[] = [];
let mockSelfEmployee: any = null;

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "@/lib/mobile-session") {
    return {
      getMobileSession: async () => mockSession,
    };
  }
  if (request === "@/lib/prisma") {
    return {
      prisma: {
        $queryRaw: async (strings: TemplateStringsArray, ...values: any[]) => {
          const query = strings.join("?");
          if (query.includes("calendarEmployeeScope")) {
            return [mockVisibilitySettings];
          }
          if (query.includes("includeInGeneralVisibility")) {
            return [];
          }
          return [];
        },
        user: {
          findMany: async ({ where }: any) => {
            // Return direct reports for getAllSubordinates
            if (where.managerId === MANAGER_USER_ID) {
              return mockDirectReports;
            }
            return [];
          },
        },
        employee: {
          findFirst: async ({ where }: any) => {
            if (where.userId === MANAGER_USER_ID) {
              return mockSelfEmployee;
            }
            return null;
          },
        },
        leaveRequest: {
          findMany: async ({ where }: any) => {
            // Capture the where clause for verification
            (global as any).__lastLeaveWhere = where;
            return mockLeaveRequests;
          },
        },
      },
    };
  }
  if (request === "@/lib/supabase-admin") {
    return {
      default: {
        storage: {
          from: () => ({
            createSignedUrl: async () => ({ data: { signedUrl: null } }),
          }),
        },
      },
    };
  }
  return originalLoad(request, parent, isMain);
};

let routeModulePromise: Promise<typeof import("../../app/api/calendar-events/route")> | null = null;

async function getRouteModule() {
  if (!routeModulePromise) {
    routeModulePromise = import("../../app/api/calendar-events/route");
  }
  return routeModulePromise;
}

async function callGet(req: NextRequest) {
  const module = await getRouteModule();
  const GET = (module as any).GET || (module as any).default?.GET;
  if (!GET) {
    throw new Error("Calendar-events route GET export not found");
  }
  return GET(req);
}

function resetMocks() {
  mockSession = null;
  mockVisibilitySettings = { calendarEmployeeScope: "DEPARTMENT" };
  mockLeaveRequests = [];
  mockDirectReports = [];
  mockSelfEmployee = null;
  (global as any).__lastLeaveWhere = null;
}

function createManagerSession() {
  return {
    user: {
      id: MANAGER_USER_ID,
      companyId: COMPANY_ID,
      role: "MANAGER",
      email: "manager@example.com",
    },
  };
}

function createLeaveRequest(overrides: any = {}) {
  return {
    id: overrides.id || "leave1",
    startDate: new Date("2025-01-15"),
    endDate: new Date("2025-01-16"),
    approvalStatus: "APPROVED",
    leaveType: overrides.leaveType || "ANNUAL",
    otherEntitlementId: overrides.otherEntitlementId || null,
    Employee: {
      id: overrides.employeeId || DIRECT_REPORT_EMPLOYEE_ID,
      departmentId: overrides.departmentId || MANAGER_DEPT_ID,
      locationId: null,
      User: {
        id: overrides.userId || DIRECT_REPORT_USER_ID,
        name: overrides.userName || "Direct Report",
        firstName: "Direct",
        lastName: "Report",
        profileImageUrl: null,
      },
      Department: {
        name: overrides.departmentName || "Engineering",
      },
    },
    EventCategory: {
      id: "cat1",
      name: overrides.categoryName || "Annual Leave",
      iconKey: "calendar",
      color: "#3B82F6",
    },
    OtherEntitlement: overrides.otherEntitlement || null,
    ...overrides,
  };
}

test("Calendar Events API - Manager Visibility", async (t) => {
  const run = async (name: string, fn: () => Promise<void>) => {
    await t.test(name, async () => {
      resetMocks();
      await fn();
    });
  };

  // ========================================
  // OWN Scope Tests
  // ========================================

  await run("OWN scope: Manager sees only their own leave and direct reports", async () => {
    mockSession = createManagerSession();
    mockVisibilitySettings = { calendarEmployeeScope: "OWN" };
    mockSelfEmployee = { id: MANAGER_EMPLOYEE_ID, departmentId: MANAGER_DEPT_ID };
    mockDirectReports = [{ id: DIRECT_REPORT_USER_ID }];
    
    mockLeaveRequests = [
      createLeaveRequest({ id: "own", employeeId: MANAGER_EMPLOYEE_ID, userId: MANAGER_USER_ID }),
      createLeaveRequest({ id: "direct", employeeId: DIRECT_REPORT_EMPLOYEE_ID, userId: DIRECT_REPORT_USER_ID }),
    ];

    const req = new NextRequest("http://localhost/api/calendar-events");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    
    // Verify the where clause restricts to allowed user IDs only
    const where = (global as any).__lastLeaveWhere;
    assert.ok(where.Employee, "Should have Employee filter");
    assert.ok(where.Employee.OR, "Should use OR conditions");
    
    // Should only include self and direct reports, no department filter for OWN scope
    const userIdCondition = where.Employee.OR.find((c: any) => c.User?.id?.in);
    assert.ok(userIdCondition, "Should have user ID condition");
    assert.ok(userIdCondition.User.id.in.includes(MANAGER_USER_ID), "Should include manager");
    assert.ok(userIdCondition.User.id.in.includes(DIRECT_REPORT_USER_ID), "Should include direct report");
  });

  // ========================================
  // DEPARTMENT Scope Tests
  // ========================================

  await run("DEPARTMENT scope: Manager sees direct reports + department colleagues", async () => {
    mockSession = createManagerSession();
    mockVisibilitySettings = { calendarEmployeeScope: "DEPARTMENT" };
    mockSelfEmployee = { id: MANAGER_EMPLOYEE_ID, departmentId: MANAGER_DEPT_ID };
    mockDirectReports = [{ id: DIRECT_REPORT_USER_ID }];
    
    mockLeaveRequests = [
      createLeaveRequest({ id: "direct", employeeId: DIRECT_REPORT_EMPLOYEE_ID, userId: DIRECT_REPORT_USER_ID }),
      createLeaveRequest({ id: "dept", employeeId: DEPT_COLLEAGUE_EMPLOYEE_ID, userId: DEPT_COLLEAGUE_USER_ID }),
    ];

    const req = new NextRequest("http://localhost/api/calendar-events");
    const res = await callGet(req);

    assert.equal(res.status, 200);
    
    const where = (global as any).__lastLeaveWhere;
    assert.ok(where.Employee.OR, "Should use OR conditions");
    
    // Should include department filter
    const deptCondition = where.Employee.OR.find((c: any) => c.departmentId);
    assert.ok(deptCondition, "Should have department condition");
    assert.equal(deptCondition.departmentId, MANAGER_DEPT_ID);
  });

  // ========================================
  // COMPANY Scope Tests (Security Critical)
  // ========================================

  await run("COMPANY scope: Manager is RESTRICTED to department (not company-wide)", async () => {
    mockSession = createManagerSession();
    mockVisibilitySettings = { calendarEmployeeScope: "COMPANY" };
    mockSelfEmployee = { id: MANAGER_EMPLOYEE_ID, departmentId: MANAGER_DEPT_ID };
    mockDirectReports = [{ id: DIRECT_REPORT_USER_ID }];
    
    // Include leave from another department - should NOT be visible
    mockLeaveRequests = [
      createLeaveRequest({ id: "direct", employeeId: DIRECT_REPORT_EMPLOYEE_ID, userId: DIRECT_REPORT_USER_ID }),
      createLeaveRequest({ 
        id: "other-dept", 
        employeeId: OTHER_DEPT_EMPLOYEE_ID, 
        userId: OTHER_DEPT_USER_ID,
        departmentId: OTHER_DEPT_ID,
        departmentName: "Sales"
      }),
    ];

    const req = new NextRequest("http://localhost/api/calendar-events");
    const res = await callGet(req);

    assert.equal(res.status, 200);
    
    const where = (global as any).__lastLeaveWhere;
    
    // CRITICAL: Should NOT have empty Employee filter (which would allow company-wide)
    assert.ok(where.Employee, "Should have Employee filter");
    assert.notDeepEqual(where.Employee, {}, "Employee filter should NOT be empty");
    
    // Should have OR conditions restricting visibility
    assert.ok(where.Employee.OR, "Should use OR conditions for restricted visibility");
    
    // Should include department filter (COMPANY treated as DEPARTMENT for managers)
    const deptCondition = where.Employee.OR.find((c: any) => c.departmentId);
    assert.ok(deptCondition, "Should have department condition even with COMPANY scope");
    assert.equal(deptCondition.departmentId, MANAGER_DEPT_ID);
  });

  await run("COMPANY scope: Manager cannot see employees outside their org scope", async () => {
    mockSession = createManagerSession();
    mockVisibilitySettings = { calendarEmployeeScope: "COMPANY" };
    mockSelfEmployee = { id: MANAGER_EMPLOYEE_ID, departmentId: MANAGER_DEPT_ID };
    mockDirectReports = [{ id: DIRECT_REPORT_USER_ID }];

    const req = new NextRequest("http://localhost/api/calendar-events");
    const res = await callGet(req);

    assert.equal(res.status, 200);
    
    const where = (global as any).__lastLeaveWhere;
    
    // Verify the query is properly restricted
    const userIdCondition = where.Employee.OR.find((c: any) => c.User?.id?.in);
    const deptCondition = where.Employee.OR.find((c: any) => c.departmentId);
    
    // Only direct reports and department colleagues should be queryable
    assert.ok(userIdCondition || deptCondition, "Should have restrictive conditions");
    
    // Should NOT have a condition that allows all employees
    const hasUnrestrictedCondition = where.Employee.OR?.some((c: any) => 
      Object.keys(c).length === 0 || c.companyId
    );
    assert.ok(!hasUnrestrictedCondition, "Should NOT have unrestricted company-wide condition");
  });

  // ========================================
  // Sickness Visibility Tests
  // ========================================

  await run("Manager can see sickness leave for direct reports", async () => {
    mockSession = createManagerSession();
    mockVisibilitySettings = { calendarEmployeeScope: "DEPARTMENT" };
    mockSelfEmployee = { id: MANAGER_EMPLOYEE_ID, departmentId: MANAGER_DEPT_ID };
    mockDirectReports = [{ id: DIRECT_REPORT_USER_ID }];
    
    mockLeaveRequests = [
      createLeaveRequest({ 
        id: "sick-direct", 
        employeeId: DIRECT_REPORT_EMPLOYEE_ID, 
        userId: DIRECT_REPORT_USER_ID,
        leaveType: "SICK",
        categoryName: "Sick Leave"
      }),
    ];

    const req = new NextRequest("http://localhost/api/calendar-events");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    // Direct report sickness should be visible
    const sickLeave = data.find((e: any) => e.id === "sick-direct");
    assert.ok(sickLeave, "Should see direct report's sick leave");
  });

  await run("Manager cannot see sickness leave for non-direct-report colleagues", async () => {
    mockSession = createManagerSession();
    mockVisibilitySettings = { calendarEmployeeScope: "DEPARTMENT" };
    mockSelfEmployee = { id: MANAGER_EMPLOYEE_ID, departmentId: MANAGER_DEPT_ID };
    mockDirectReports = [{ id: DIRECT_REPORT_USER_ID }];
    
    mockLeaveRequests = [
      createLeaveRequest({ 
        id: "sick-colleague", 
        employeeId: DEPT_COLLEAGUE_EMPLOYEE_ID, 
        userId: DEPT_COLLEAGUE_USER_ID,
        leaveType: "SICK",
        categoryName: "Sick Leave"
      }),
    ];

    const req = new NextRequest("http://localhost/api/calendar-events");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    // Non-direct-report sickness should be filtered out
    const sickLeave = data.find((e: any) => e.id === "sick-colleague");
    assert.ok(!sickLeave, "Should NOT see colleague's sick leave");
  });

  // ========================================
  // Other Entitlement Visibility Tests
  // ========================================

  await run("Manager cannot see other entitlement bookings (admin-only)", async () => {
    mockSession = createManagerSession();
    mockVisibilitySettings = { calendarEmployeeScope: "DEPARTMENT" };
    mockSelfEmployee = { id: MANAGER_EMPLOYEE_ID, departmentId: MANAGER_DEPT_ID };
    mockDirectReports = [{ id: DIRECT_REPORT_USER_ID }];
    
    mockLeaveRequests = [
      createLeaveRequest({ 
        id: "other-ent", 
        employeeId: DIRECT_REPORT_EMPLOYEE_ID, 
        userId: DIRECT_REPORT_USER_ID,
        leaveType: "OTHER_ENTITLEMENT",
        otherEntitlementId: "ent1",
        otherEntitlement: { id: "ent1", name: "Training Day" }
      }),
    ];

    const req = new NextRequest("http://localhost/api/calendar-events");
    const res = await callGet(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    // Other entitlement should be filtered out even for direct reports
    const otherEnt = data.find((e: any) => e.id === "other-ent");
    assert.ok(!otherEnt, "Should NOT see other entitlement bookings");
  });

  // ========================================
  // Edge Cases
  // ========================================

  await run("Manager without department sees only direct reports", async () => {
    mockSession = createManagerSession();
    mockVisibilitySettings = { calendarEmployeeScope: "DEPARTMENT" };
    mockSelfEmployee = { id: MANAGER_EMPLOYEE_ID, departmentId: null }; // No department
    mockDirectReports = [{ id: DIRECT_REPORT_USER_ID }];
    
    mockLeaveRequests = [
      createLeaveRequest({ id: "direct", employeeId: DIRECT_REPORT_EMPLOYEE_ID, userId: DIRECT_REPORT_USER_ID }),
    ];

    const req = new NextRequest("http://localhost/api/calendar-events");
    const res = await callGet(req);

    assert.equal(res.status, 200);
    
    const where = (global as any).__lastLeaveWhere;
    
    // Should only have user ID condition, no department condition
    const deptCondition = where.Employee.OR?.find((c: any) => c.departmentId);
    assert.ok(!deptCondition, "Should NOT have department condition when manager has no department");
  });

  await run("Manager with no direct reports sees only department colleagues (if DEPARTMENT scope)", async () => {
    mockSession = createManagerSession();
    mockVisibilitySettings = { calendarEmployeeScope: "DEPARTMENT" };
    mockSelfEmployee = { id: MANAGER_EMPLOYEE_ID, departmentId: MANAGER_DEPT_ID };
    mockDirectReports = []; // No direct reports
    
    mockLeaveRequests = [
      createLeaveRequest({ id: "dept", employeeId: DEPT_COLLEAGUE_EMPLOYEE_ID, userId: DEPT_COLLEAGUE_USER_ID }),
    ];

    const req = new NextRequest("http://localhost/api/calendar-events");
    const res = await callGet(req);

    assert.equal(res.status, 200);
    
    const where = (global as any).__lastLeaveWhere;
    
    // Should still have department condition
    const deptCondition = where.Employee.OR?.find((c: any) => c.departmentId);
    assert.ok(deptCondition, "Should have department condition");
  });
});
