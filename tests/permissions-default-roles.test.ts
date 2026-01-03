/**
 * Property-based tests for Default Permissions
 * Feature: permission-profile-ux-clarity
 * Property 6: Default Permissions Match Role Definitions
 * Validates: Requirements 6.3
 */
import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import * as fc from "fast-check";
import { 
  DEFAULT_PERMISSIONS,
  getDefaultPermissionsForRole,
  resolvePermissions,
  hasPermission,
  getAvailableScreens,
  ScreenPermissions,
  UserWithProfile,
  PermissionAction
} from "../app/lib/permissions";

/**
 * Documented default permissions for each role
 * These are the expected permissions based on the requirements
 */
const DOCUMENTED_ROLE_PERMISSIONS = {
  ADMIN: {
    // ADMIN should have full access to all system screens
    expectedScreens: [
      'dashboard', 'approvals', 'employees', 'calendar', 'documents', 
      'reports', 'org-chart', 'news', 'bulk-actions', 'settings',
      'onboarding', 'offboarding', 'forms', 'leave-requests',
      'working-patterns', 'departments', 'job-roles', 'permissions'
    ],
    // ADMIN should have read, edit, delete on most screens
    minActions: ['read'] as PermissionAction[],
  },
  SUPER_ADMIN: {
    // SUPER_ADMIN should have same permissions as ADMIN
    expectedScreens: [
      'dashboard', 'approvals', 'employees', 'calendar', 'documents', 
      'reports', 'org-chart', 'news', 'bulk-actions', 'settings',
      'onboarding', 'offboarding', 'forms', 'leave-requests',
      'working-patterns', 'departments', 'job-roles', 'permissions'
    ],
    minActions: ['read'] as PermissionAction[],
  },
  MANAGER: {
    // MANAGER should have access to team management screens
    expectedScreens: [
      'dashboard', 'employees', 'calendar', 'documents', 'reports',
      'org-chart', 'news', 'leave-requests', 'working-patterns',
      'onboarding', 'offboarding'
    ],
    minActions: ['read'] as PermissionAction[],
  },
  EMPLOYEE: {
    // EMPLOYEE should have basic access
    expectedScreens: [
      'dashboard', 'calendar', 'documents', 'news', 'leave-requests', 'onboarding'
    ],
    minActions: ['read'] as PermissionAction[],
  },
};

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
 * Property 6: Default Permissions Match Role Definitions
 * For all built-in roles (ADMIN, MANAGER, EMPLOYEE), the DEFAULT_PERMISSIONS[role]
 * object should match the documented permission set for that role.
 * 
 * Feature: permission-profile-ux-clarity, Property 6: Default Permissions Match Role Definitions
 * Validates: Requirements 6.3
 */
test("Property 6: Default Permissions Match Role Definitions", async (t) => {
  const roles = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'] as const;

  await t.test("All built-in roles have default permissions defined", () => {
    // Property: For all built-in roles, DEFAULT_PERMISSIONS[role] exists
    for (const role of roles) {
      assert.ok(
        DEFAULT_PERMISSIONS[role] !== undefined,
        `DEFAULT_PERMISSIONS should have entry for role "${role}"`
      );
    }
  });

  await t.test("getDefaultPermissionsForRole returns same as DEFAULT_PERMISSIONS", () => {
    // Property: For all roles, getDefaultPermissionsForRole(role) === DEFAULT_PERMISSIONS[role]
    fc.assert(
      fc.property(
        fc.constantFrom(...roles),
        (role) => {
          const fromFunction = getDefaultPermissionsForRole(role);
          const fromConstant = DEFAULT_PERMISSIONS[role];
          return JSON.stringify(fromFunction) === JSON.stringify(fromConstant);
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("ADMIN has all documented screens with at least read permission", () => {
    const adminPerms = DEFAULT_PERMISSIONS.ADMIN;
    const documented = DOCUMENTED_ROLE_PERMISSIONS.ADMIN;
    
    for (const screen of documented.expectedScreens) {
      assert.ok(
        adminPerms[screen] !== undefined,
        `ADMIN should have permission for screen "${screen}"`
      );
      assert.ok(
        adminPerms[screen].includes('read'),
        `ADMIN should have at least read permission for screen "${screen}"`
      );
    }
  });

  await t.test("SUPER_ADMIN has same permissions as ADMIN", () => {
    const adminPerms = DEFAULT_PERMISSIONS.ADMIN;
    const superAdminPerms = DEFAULT_PERMISSIONS.SUPER_ADMIN;
    
    // Property: SUPER_ADMIN permissions should equal ADMIN permissions
    assert.deepEqual(
      superAdminPerms,
      adminPerms,
      "SUPER_ADMIN should have the same default permissions as ADMIN"
    );
  });

  await t.test("MANAGER has all documented screens with at least read permission", () => {
    const managerPerms = DEFAULT_PERMISSIONS.MANAGER;
    const documented = DOCUMENTED_ROLE_PERMISSIONS.MANAGER;
    
    for (const screen of documented.expectedScreens) {
      assert.ok(
        managerPerms[screen] !== undefined,
        `MANAGER should have permission for screen "${screen}"`
      );
      assert.ok(
        managerPerms[screen].includes('read'),
        `MANAGER should have at least read permission for screen "${screen}"`
      );
    }
  });

  await t.test("EMPLOYEE has all documented screens with at least read permission", () => {
    const employeePerms = DEFAULT_PERMISSIONS.EMPLOYEE;
    const documented = DOCUMENTED_ROLE_PERMISSIONS.EMPLOYEE;
    
    for (const screen of documented.expectedScreens) {
      assert.ok(
        employeePerms[screen] !== undefined,
        `EMPLOYEE should have permission for screen "${screen}"`
      );
      assert.ok(
        employeePerms[screen].includes('read'),
        `EMPLOYEE should have at least read permission for screen "${screen}"`
      );
    }
  });

  await t.test("resolvePermissions returns default permissions for users without profile", () => {
    // Property: For any role without a permission profile, resolvePermissions returns DEFAULT_PERMISSIONS[role]
    fc.assert(
      fc.property(
        fc.constantFrom(...roles),
        (role) => {
          const user = createMockUserWithoutProfile(role);
          const resolved = resolvePermissions(user);
          const expected = DEFAULT_PERMISSIONS[role];
          return JSON.stringify(resolved) === JSON.stringify(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("ADMIN has more permissions than MANAGER", () => {
    const adminPerms = DEFAULT_PERMISSIONS.ADMIN;
    const managerPerms = DEFAULT_PERMISSIONS.MANAGER;
    
    // Property: ADMIN should have at least as many screens as MANAGER
    const adminScreenCount = Object.keys(adminPerms).length;
    const managerScreenCount = Object.keys(managerPerms).length;
    
    assert.ok(
      adminScreenCount >= managerScreenCount,
      `ADMIN should have at least as many screens (${adminScreenCount}) as MANAGER (${managerScreenCount})`
    );
  });

  await t.test("MANAGER has more permissions than EMPLOYEE", () => {
    const managerPerms = DEFAULT_PERMISSIONS.MANAGER;
    const employeePerms = DEFAULT_PERMISSIONS.EMPLOYEE;
    
    // Property: MANAGER should have at least as many screens as EMPLOYEE
    const managerScreenCount = Object.keys(managerPerms).length;
    const employeeScreenCount = Object.keys(employeePerms).length;
    
    assert.ok(
      managerScreenCount >= employeeScreenCount,
      `MANAGER should have at least as many screens (${managerScreenCount}) as EMPLOYEE (${employeeScreenCount})`
    );
  });

  await t.test("Property-based: For any role and its documented screens, hasPermission returns true for read", () => {
    // Property-based test: For any role and any of its documented screens,
    // hasPermission should return true for 'read' action
    fc.assert(
      fc.property(
        fc.constantFrom(...roles),
        (role) => {
          const user = createMockUserWithoutProfile(role);
          const documented = DOCUMENTED_ROLE_PERMISSIONS[role];
          
          // For ADMIN/SUPER_ADMIN, hasPermission always returns true due to admin override
          if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            return documented.expectedScreens.every(screen => 
              hasPermission(user, screen, 'read') === true
            );
          }
          
          // For other roles, check against default permissions
          return documented.expectedScreens.every(screen => 
            hasPermission(user, screen, 'read') === true
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("All default permission actions are valid", () => {
    const validActions: PermissionAction[] = ['read', 'edit', 'delete', 'approve'];
    
    // Property: For all roles and all screens, all actions should be valid
    for (const role of roles) {
      const perms = DEFAULT_PERMISSIONS[role];
      for (const [screen, actions] of Object.entries(perms)) {
        for (const action of actions) {
          assert.ok(
            validActions.includes(action as PermissionAction),
            `Invalid action "${action}" for role "${role}" screen "${screen}"`
          );
        }
      }
    }
  });

  await t.test("All default permission screens are valid", () => {
    const availableScreens = getAvailableScreens();
    
    // Property: For all roles and all screens in default permissions, screen should be valid
    for (const role of roles) {
      const perms = DEFAULT_PERMISSIONS[role];
      for (const screen of Object.keys(perms)) {
        assert.ok(
          availableScreens.includes(screen),
          `Invalid screen "${screen}" in DEFAULT_PERMISSIONS for role "${role}"`
        );
      }
    }
  });

  await t.test("Unknown role falls back to EMPLOYEE permissions", () => {
    // Property: For any unknown role, getDefaultPermissionsForRole returns EMPLOYEE permissions
    const unknownRolePerms = getDefaultPermissionsForRole("UNKNOWN_ROLE");
    const employeePerms = DEFAULT_PERMISSIONS.EMPLOYEE;
    
    assert.deepEqual(
      unknownRolePerms,
      employeePerms,
      "Unknown role should fall back to EMPLOYEE permissions"
    );
  });
});
