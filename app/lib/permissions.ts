import { User, PermissionProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PermissionAction = "read" | "edit" | "delete";

export type ScreenPermissions = Record<string, PermissionAction[]>;

export type UserWithProfile = User & {
  permissionProfile?: PermissionProfile | null;
};

// Default permission sets for built-in roles
const ADMIN_BASE_PERMISSIONS: ScreenPermissions = {
  dashboard: ["read"],
  approvals: ["read", "edit"],
  employees: ["read", "edit", "delete"],
  calendar: ["read", "edit", "delete"],
  documents: ["read", "edit", "delete"],
  reports: ["read", "edit", "delete"],
  "org-chart": ["read"],
  news: ["read", "edit", "delete"],
  settings: ["read", "edit", "delete"],
  onboarding: ["read", "edit", "delete"],
  offboarding: ["read", "edit", "delete"],
  forms: ["read", "edit", "delete"],
  "leave-requests": ["read", "edit", "delete"],
  "working-patterns": ["read", "edit", "delete"],
  departments: ["read", "edit", "delete"],
  "job-roles": ["read", "edit", "delete"],
  permissions: ["read", "edit", "delete"],
};

export const DEFAULT_PERMISSIONS: Record<string, ScreenPermissions> = {
  ADMIN: ADMIN_BASE_PERMISSIONS,
  SUPER_ADMIN: ADMIN_BASE_PERMISSIONS,
  MANAGER: {
    dashboard: ["read"],
    employees: ["read", "edit"],
    calendar: ["read", "edit"],
    documents: ["read", "edit"],
    reports: ["read"],
    "org-chart": ["read"],
    news: ["read"],
    "leave-requests": ["read", "edit"],
    "working-patterns": ["read"],
    onboarding: ["read"],
    offboarding: ["read"],
  },
  EMPLOYEE: {
    dashboard: ["read"],
    calendar: ["read"],
    documents: ["read"],
    news: ["read"],
    "leave-requests": ["read", "edit"],
    onboarding: ["read"],
  },
};

/**
 * Resolves the effective permissions for a user based on their role and permission profile
 */
export function resolvePermissions(user: UserWithProfile): ScreenPermissions {
  // If user has a custom permission profile, use it
  if (user.permissionProfile) {
    try {
      const raw = user.permissionProfile.permissions as unknown;
      const profilePermissions =
        typeof raw === "string"
          ? (JSON.parse(raw) as ScreenPermissions)
          : (raw as ScreenPermissions);
      return profilePermissions || {};
    } catch (error) {
      console.error("Error parsing permission profile:", error);
      // Fall back to role-based permissions
    }
  }

  // Fall back to default role-based permissions
  const role = user.role;
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.EMPLOYEE;
}

/**
 * Checks if a user has permission for a specific screen and action
 */
export function hasPermission(
  user: UserWithProfile,
  screen: string,
  action: PermissionAction,
): boolean {
  // Admin override: ADMIN role always has all permissions
  if (
    (user.role === "ADMIN" || user.role === "SUPER_ADMIN") &&
    !user.permissionProfile
  ) {
    return true;
  }

  const permissions = resolvePermissions(user);

  // Check if the screen exists in permissions and if the action is allowed
  const screenPermissions = permissions[screen];
  if (!screenPermissions) {
    return false;
  }

  return screenPermissions.includes(action);
}

/**
 * Gets all available screens in the system
 */
export function getAvailableScreens(): string[] {
  return [
    "dashboard",
    "approvals",
    "employees",
    "calendar",
    "documents",
    "reports",
    "org-chart",
    "news",
    "settings",
    "onboarding",
    "offboarding",
    "forms",
    "leave-requests",
    "working-patterns",
    "departments",
    "job-roles",
    "permissions",
    // Employee detail screens
    "employee-overview",
    "employee-documents",
    "employee-driver-licenses",
    "employee-employment-checks",
    "employee-forms",
    "employee-leave",
    "employee-offboarding",
    "employee-onboarding",
    "employee-performance",
    "employee-settings",
    "employee-training",
  ];
}

/**
 * Gets the default permissions for a role
 */
export function getDefaultPermissionsForRole(role: string): ScreenPermissions {
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.EMPLOYEE;
}

/**
 * Validates a permission profile structure
 */
export function validatePermissions(permissions: ScreenPermissions): boolean {
  const availableScreens = getAvailableScreens();
  const availableActions: PermissionAction[] = ["read", "edit", "delete"];

  for (const [screen, actions] of Object.entries(permissions)) {
    // Check if screen is valid
    if (!availableScreens.includes(screen)) {
      return false;
    }

    // Check if all actions are valid
    if (
      !Array.isArray(actions) ||
      !actions.every((action) => availableActions.includes(action))
    ) {
      return false;
    }

    // Check for logical consistency (read is required if edit/delete are present)
    if (
      (actions.includes("edit") || actions.includes("delete")) &&
      !actions.includes("read")
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Gets a human-readable screen name
 */
export function getScreenDisplayName(screen: string): string {
  const screenNames: Record<string, string> = {
    dashboard: "Dashboard",
    approvals: "Approvals",
    employees: "Employees",
    calendar: "Calendar",
    documents: "Documents",
    reports: "Reports",
    "org-chart": "Organization Chart",
    news: "News",
    settings: "Settings",
    onboarding: "Onboarding",
    offboarding: "Offboarding",
    forms: "Forms",
    "leave-requests": "Leave Requests",
    "working-patterns": "Working Patterns",
    departments: "Departments",
    "job-roles": "Job Roles",
    permissions: "Permissions",
    // Employee detail screens
    "employee-overview": "Employee Overview",
    "employee-documents": "Employee Documents",
    "employee-driver-licenses": "Employee Driver Licenses",
    "employee-employment-checks": "Employee Employment Checks",
    "employee-forms": "Employee Forms",
    "employee-leave": "Employee Leave",
    "employee-offboarding": "Employee Offboarding",
    "employee-onboarding": "Employee Onboarding",
    "employee-performance": "Employee Performance",
    "employee-settings": "Employee Settings",
    "employee-training": "Employee Training",
  };

  return screenNames[screen] || screen;
}

/**
 * Gets a human-readable action name
 */
export function getActionDisplayName(action: PermissionAction): string {
  const actionNames: Record<PermissionAction, string> = {
    read: "View",
    edit: "Edit",
    delete: "Delete",
  };

  return actionNames[action];
}

/**
 * Determines if the requesting user can access a target employee record.
 * Access rules:
 * - ADMIN and SUPER_ADMIN can access any employee in their company
 * - A user can access their own employee record
 * - A MANAGER can access employees whose user.managerId = requestor.id
 */
export async function canAccessEmployee(
  requestor: {
    id: string;
    role: "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN";
    companyId: string;
  },
  targetEmployeeId: string,
): Promise<boolean> {
  // Admins can access any employee within their company
  if (requestor.role === "ADMIN" || requestor.role === "SUPER_ADMIN") {
    return true;
  }

  const target = await prisma.employee.findUnique({
    where: { id: targetEmployeeId, companyId: requestor.companyId },
    select: { userId: true, User: { select: { managerId: true } } },
  });

  if (!target) return false;

  // Self-access
  if (target.userId === requestor.id) return true;

  // Manager access (only if they directly manage the target)
  return target.User?.managerId === requestor.id;
}

