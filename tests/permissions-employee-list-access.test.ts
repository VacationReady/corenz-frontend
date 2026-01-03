/**
 * Property-based tests for Permission Profile Employee List Access
 * Feature: permission-profile-ux-clarity
 * Property 1: Permission Profile Grants Employee List Access
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */
import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import * as fc from "fast-check";
import { 
  hasPermission, 
  canAccessEmployeeList,
  EMPLOYEE_PROFILE_SCREENS,
  UserWithProfile,
  ScreenPermissions,
  PermissionAction
} from "../app/lib/permissions";

/**
 * Helper to create a mock user with a permission profile
 */
function createMockUserWithProfile(
  role: "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN",
  permissions: ScreenPermissions
): UserWithProfile {
  return {
    id: "test-user-id",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    role,
    companyId: "test-company-id",
    password: "",
    phone: null,
    dateOfBirth: null,
    profileImageUrl: null,
    managerId: null,
    isActivated: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    permissionProfileId: "test-profile-id",
    permissionProfile: {
      id: "test-profile-id",
      companyId: "test-company-id",
      name: "Test Profile",
      description: "Test permission profile",
      permissions: permissions as any,
      builtIn: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      constraints: null,
      scope: null,
    },
  };
}

/**
 * Helper to create a mock user without a permission profile
 */
function createMockUserWithoutProfile(
  role: "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN"
): UserWithProfile {
  return {
    id: "test-user-id",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    role,
    companyId: "test-company-id",
    password: "",
    phone: null,
    dateOfBirth: null,
    profileImageUrl: null,
    managerId: null,
    isActivated: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    permissionProfileId: null,
    permissionProfile: null,
  };
}

/**
 * Property 1: Permission Profile Grants Employee List Access
 * For any user with "employees" read permission OR any "employee-*" screen read permission
 * via their permission profile, the canAccessEmployeeList function should return true.
 * 
 * Feature: permission-profile-ux-clarity, Property 1: Permission Profile Grants Employee List Access
 */
test("Property 1: Permission Profile Grants Employee List Access", async (t) => {
  await t.test("User with 'employees' read permission can access employee list", () => {
    // Property: For any EMPLOYEE role user with "employees" read permission, canAccessEmployeeList returns true
    fc.assert(
      fc.property(
        fc.constantFrom("EMPLOYEE" as const),
        (role) => {
          const user = createMockUserWithProfile(role, {
            employees: ["read"],
          });
          
          return canAccessEmployeeList(user) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("User with any employee-* screen read permission can access employee list", () => {
    // Property: For any EMPLOYEE role user with any employee-* screen read permission, canAccessEmployeeList returns true
    fc.assert(
      fc.property(
        fc.constantFrom(...EMPLOYEE_PROFILE_SCREENS),
        (screen) => {
          const user = createMockUserWithProfile("EMPLOYEE", {
            [screen]: ["read"],
          });
          
          return canAccessEmployeeList(user) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("ADMIN/SUPER_ADMIN always have access regardless of profile", () => {
    // Property: For any ADMIN or SUPER_ADMIN user, canAccessEmployeeList returns true
    fc.assert(
      fc.property(
        fc.constantFrom("ADMIN" as const, "SUPER_ADMIN" as const),
        fc.record({
          hasProfile: fc.boolean(),
          permissions: fc.constant({} as ScreenPermissions),
        }),
        (role, { hasProfile }) => {
          const user = hasProfile 
            ? createMockUserWithProfile(role, {})
            : createMockUserWithoutProfile(role);
          
          return canAccessEmployeeList(user) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("MANAGER always has access (to their team)", () => {
    // Property: For any MANAGER user, canAccessEmployeeList returns true
    fc.assert(
      fc.property(
        fc.record({
          hasProfile: fc.boolean(),
        }),
        ({ hasProfile }) => {
          const user = hasProfile 
            ? createMockUserWithProfile("MANAGER", {})
            : createMockUserWithoutProfile("MANAGER");
          
          return canAccessEmployeeList(user) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("EMPLOYEE without relevant permissions cannot access employee list", () => {
    // Property: For any EMPLOYEE user without employees or employee-* permissions, canAccessEmployeeList returns false
    const irrelevantScreens = ["dashboard", "calendar", "documents", "reports", "news"];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...irrelevantScreens),
        (screen) => {
          const user = createMockUserWithProfile("EMPLOYEE", {
            [screen]: ["read"],
          });
          
          return canAccessEmployeeList(user) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("hasPermission correctly checks profile permissions for employees screen", () => {
    // Property: For any user with "employees" read permission in profile, hasPermission returns true
    fc.assert(
      fc.property(
        fc.constantFrom("EMPLOYEE" as const),
        fc.constantFrom("read" as PermissionAction, "edit" as PermissionAction),
        (role, action) => {
          const user = createMockUserWithProfile(role, {
            employees: [action],
          });
          
          // hasPermission should return true for the action that was granted
          return hasPermission(user, "employees", action) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("hasPermission correctly checks profile permissions for employee-* screens", () => {
    // Property: For any user with an employee-* screen permission in profile, hasPermission returns true
    fc.assert(
      fc.property(
        fc.constantFrom(...EMPLOYEE_PROFILE_SCREENS),
        fc.constantFrom("read" as PermissionAction, "edit" as PermissionAction),
        (screen, action) => {
          const user = createMockUserWithProfile("EMPLOYEE", {
            [screen]: [action],
          });
          
          // hasPermission should return true for the action that was granted
          return hasPermission(user, screen, action) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Multiple employee-* permissions all grant access", () => {
    // Property: For any combination of employee-* screen permissions, canAccessEmployeeList returns true
    fc.assert(
      fc.property(
        fc.subarray(EMPLOYEE_PROFILE_SCREENS as unknown as string[], { minLength: 1, maxLength: 5 }),
        (screens) => {
          const permissions: ScreenPermissions = {};
          screens.forEach(screen => {
            permissions[screen] = ["read"];
          });
          
          const user = createMockUserWithProfile("EMPLOYEE", permissions);
          
          return canAccessEmployeeList(user) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Combined employees and employee-* permissions grant access", () => {
    // Property: For any user with both "employees" and employee-* permissions, canAccessEmployeeList returns true
    fc.assert(
      fc.property(
        fc.constantFrom(...EMPLOYEE_PROFILE_SCREENS),
        (screen) => {
          const user = createMockUserWithProfile("EMPLOYEE", {
            employees: ["read"],
            [screen]: ["read", "edit"],
          });
          
          return canAccessEmployeeList(user) === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
