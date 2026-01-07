/**
 * Security Tests for Permission System Bug Fixes
 * 
 * Tests the critical security fixes:
 * 1. DELETE Operation Ignores Permission Profiles (Bug #2) - FIXED
 * 2. Employee Profile Pages Missing Screen-Specific Checks (Bug #3) - FIXED
 * 
 * Note: Bug #1 (Employee List Privilege Escalation) was REVERTED per user request.
 * The original behavior is maintained where employee-* permissions grant full access
 * for specialized roles like Payroll Admin, HR Specialist, etc.
 */
import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import * as fc from "fast-check";
import { 
  hasPermission, 
  canAccessEmployeeList,
  hasAnyEmployeeProfilePermission,
  hasEmployeeScreenPermission,
  getAccessibleEmployeeScreens,
  EMPLOYEE_PROFILE_SCREENS,
  UserWithProfile,
  ScreenPermissions,
  PermissionAction,
  EmployeeProfileScreen
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
  } as UserWithProfile;
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
  } as UserWithProfile;
}

/**
 * Bug #2: DELETE Operation Permission Profile Check
 * 
 * Previously, DELETE operations only checked role (ADMIN), ignoring permission profiles.
 * The fix ensures hasPermission is used for delete operations.
 */
test("Bug #2: DELETE Operation Permission Profile Check", async (t) => {
  await t.test("hasPermission correctly checks delete permission for employees screen", () => {
    // Property: For any user with "employees" delete permission, hasPermission returns true
    fc.assert(
      fc.property(
        fc.constantFrom("EMPLOYEE" as const, "MANAGER" as const),
        (role) => {
          const user = createMockUserWithProfile(role, {
            employees: ["read", "edit", "delete"],
          });
          
          return hasPermission(user, "employees", "delete") === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("hasPermission returns false for delete when not granted", () => {
    // Property: For any user WITHOUT "employees" delete permission, hasPermission returns false
    fc.assert(
      fc.property(
        fc.constantFrom("EMPLOYEE" as const, "MANAGER" as const),
        (role) => {
          const user = createMockUserWithProfile(role, {
            employees: ["read", "edit"], // No delete
          });
          
          return hasPermission(user, "employees", "delete") === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("ADMIN/SUPER_ADMIN always have delete permission (admin override)", () => {
    // Property: ADMIN/SUPER_ADMIN always have delete permission regardless of profile
    fc.assert(
      fc.property(
        fc.constantFrom("ADMIN" as const, "SUPER_ADMIN" as const),
        fc.boolean(),
        (role, hasProfile) => {
          // Even with an empty profile, admin override grants delete
          const user = hasProfile 
            ? createMockUserWithProfile(role, {})
            : createMockUserWithoutProfile(role);
          
          return hasPermission(user, "employees", "delete") === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Custom profile can restrict delete for non-admin roles", () => {
    // Property: A custom profile without delete permission restricts delete access
    const user = createMockUserWithProfile("MANAGER", {
      employees: ["read", "edit"], // Explicitly no delete
    });
    
    assert.equal(
      hasPermission(user, "employees", "delete"),
      false,
      "Manager with custom profile without delete should not have delete permission"
    );
  });
});

/**
 * Bug #3: Employee Profile Screen-Specific Permission Check
 * 
 * Previously, having ANY employee-* permission granted access to ALL employee profile sections.
 * The fix adds hasEmployeeScreenPermission to check specific screen permissions.
 */
test("Bug #3: Employee Profile Screen-Specific Permission Check", async (t) => {
  await t.test("hasEmployeeScreenPermission checks specific screen permission", () => {
    // Property: For any employee-* screen, hasEmployeeScreenPermission only returns true
    // if that SPECIFIC screen permission is granted
    fc.assert(
      fc.property(
        fc.constantFrom(...EMPLOYEE_PROFILE_SCREENS),
        fc.constantFrom(...EMPLOYEE_PROFILE_SCREENS),
        (grantedScreen, checkedScreen) => {
          const user = createMockUserWithProfile("EMPLOYEE", {
            [grantedScreen]: ["read"],
          });
          
          const hasAccess = hasEmployeeScreenPermission(user, checkedScreen as EmployeeProfileScreen, "read");
          
          // Should only have access if the granted screen matches the checked screen
          if (grantedScreen === checkedScreen) {
            return hasAccess === true;
          } else {
            return hasAccess === false;
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  await t.test("ADMIN/SUPER_ADMIN have access to all employee screens", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("ADMIN" as const, "SUPER_ADMIN" as const),
        fc.constantFrom(...EMPLOYEE_PROFILE_SCREENS),
        (role, screen) => {
          const user = createMockUserWithoutProfile(role);
          
          return hasEmployeeScreenPermission(user, screen as EmployeeProfileScreen, "read") === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("getAccessibleEmployeeScreens returns only granted screens", () => {
    // Property: getAccessibleEmployeeScreens returns exactly the screens the user has permission for
    fc.assert(
      fc.property(
        fc.subarray(EMPLOYEE_PROFILE_SCREENS as unknown as string[], { minLength: 1, maxLength: 5 }),
        (grantedScreens) => {
          const permissions: ScreenPermissions = {};
          grantedScreens.forEach(screen => {
            permissions[screen] = ["read"];
          });
          
          const user = createMockUserWithProfile("EMPLOYEE", permissions);
          const accessibleScreens = getAccessibleEmployeeScreens(user);
          
          // Should contain exactly the granted screens (no more, no less)
          const hasAllGranted = grantedScreens.every(s => accessibleScreens.includes(s));
          const noExtras = accessibleScreens.every(s => 
            grantedScreens.includes(s) || s === "employees"
          );
          
          return hasAllGranted && noExtras;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("User with employee-documents cannot access employee-bank-payroll", () => {
    // Specific test case for the most sensitive data
    const user = createMockUserWithProfile("EMPLOYEE", {
      "employee-documents": ["read", "edit"],
    });
    
    assert.equal(
      hasEmployeeScreenPermission(user, "employee-bank-payroll", "read"),
      false,
      "User with only employee-documents permission should NOT access bank-payroll"
    );
    
    assert.equal(
      hasEmployeeScreenPermission(user, "employee-personal-information", "read"),
      false,
      "User with only employee-documents permission should NOT access personal-information"
    );
    
    assert.equal(
      hasEmployeeScreenPermission(user, "employee-documents", "read"),
      true,
      "User with employee-documents permission SHOULD access documents"
    );
  });

  await t.test("Edit permission requires explicit grant", () => {
    // Property: Edit permission is not implied by read permission
    fc.assert(
      fc.property(
        fc.constantFrom(...EMPLOYEE_PROFILE_SCREENS),
        (screen) => {
          const user = createMockUserWithProfile("EMPLOYEE", {
            [screen]: ["read"], // Only read, not edit
          });
          
          const canRead = hasEmployeeScreenPermission(user, screen as EmployeeProfileScreen, "read");
          const canEdit = hasEmployeeScreenPermission(user, screen as EmployeeProfileScreen, "edit");
          
          return canRead === true && canEdit === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Integration test: Verify the complete permission flow
 */
test("Integration: Complete Permission Flow", async (t) => {
  await t.test("User journey: Payroll Admin with employee-bank-payroll permission", () => {
    // Scenario: Payroll Admin with only employee-bank-payroll permission
    // Should have FULL access to all employees' bank/payroll data (original behavior)
    const payrollAdmin = createMockUserWithProfile("EMPLOYEE", {
      "employee-bank-payroll": ["read", "edit"],
      dashboard: ["read"],
    });
    
    // Can access employee list page with FULL access (original behavior)
    assert.equal(canAccessEmployeeList(payrollAdmin), true);
    
    // Has profile permissions
    assert.equal(hasAnyEmployeeProfilePermission(payrollAdmin), true);
    
    // Can access bank/payroll section
    assert.equal(hasEmployeeScreenPermission(payrollAdmin, "employee-bank-payroll", "read"), true);
    assert.equal(hasEmployeeScreenPermission(payrollAdmin, "employee-bank-payroll", "edit"), true);
    
    // Cannot access other sections (screen-specific validation still works)
    assert.equal(hasEmployeeScreenPermission(payrollAdmin, "employee-documents", "read"), false);
    assert.equal(hasEmployeeScreenPermission(payrollAdmin, "employee-personal-information", "read"), false);
    
    // Cannot delete employees
    assert.equal(hasPermission(payrollAdmin, "employees", "delete"), false);
  });

  await t.test("User journey: Full HR Admin with employees permission", () => {
    // Scenario: Full HR Admin with "employees" permission
    const hrAdmin = createMockUserWithProfile("EMPLOYEE", {
      employees: ["read", "edit", "delete"],
      "employee-documents": ["read", "edit", "delete"],
      "employee-training": ["read", "edit"],
      "employee-bank-payroll": ["read", "edit"],
      dashboard: ["read"],
    });
    
    // Can access employee list with full access
    assert.equal(canAccessEmployeeList(hrAdmin), true);
    
    // Can delete employees
    assert.equal(hasPermission(hrAdmin, "employees", "delete"), true);
    
    // Can access all granted screens
    assert.equal(hasEmployeeScreenPermission(hrAdmin, "employee-documents", "read"), true);
    assert.equal(hasEmployeeScreenPermission(hrAdmin, "employee-bank-payroll", "read"), true);
    
    // Still cannot access screens not in profile
    assert.equal(hasEmployeeScreenPermission(hrAdmin, "employee-performance", "read"), false);
  });
});
