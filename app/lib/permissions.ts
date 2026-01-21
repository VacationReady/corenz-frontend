import { User, PermissionProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PermissionAction = "read" | "edit" | "delete" | "approve";

export type ScreenPermissions = Record<string, PermissionAction[]>;

export type UserWithProfile = User & {
  permissionProfile?: PermissionProfile | null;
};

/**
 * Screen metadata interface for UI display and tooltips
 * Used to provide clarity about what each permission controls
 */
export interface ScreenMetadata {
  key: string;
  label: string;
  displayLabel: string; // For UI (e.g., "Other Employees' Documents")
  description: string;  // Tooltip text
  category: 'system' | 'employee-profile';
  affectsOthers: boolean; // true for employee-* screens
}

/**
 * Comprehensive screen metadata for all permission screens
 * This is the single source of truth for screen definitions
 */
export const SCREEN_METADATA: ScreenMetadata[] = [
  // System-wide screens
  {
    key: 'dashboard',
    label: 'Dashboard',
    displayLabel: 'Dashboard',
    description: 'Access to the main dashboard and overview',
    category: 'system',
    affectsOthers: false,
  },
  {
    key: 'approvals',
    label: 'Approvals',
    displayLabel: 'Approvals',
    description: 'Access to view and manage approval requests',
    category: 'system',
    affectsOthers: false,
  },
  {
    key: 'employees',
    label: 'Employees',
    displayLabel: 'Employee Directory',
    description: 'Access to view and manage the employee directory',
    category: 'system',
    affectsOthers: true,
  },
  {
    key: 'calendar',
    label: 'Calendar',
    displayLabel: 'Calendar',
    description: 'Access to the company calendar and events',
    category: 'system',
    affectsOthers: false,
  },
  {
    key: 'documents',
    label: 'Documents',
    displayLabel: 'Company Documents',
    description: 'Access to company-wide documents and files',
    category: 'system',
    affectsOthers: false,
  },
  {
    key: 'reports',
    label: 'Reports',
    displayLabel: 'Reports',
    description: 'Access to generate and view reports',
    category: 'system',
    affectsOthers: false,
  },
  {
    key: 'org-chart',
    label: 'Organisation Chart',
    displayLabel: 'Organisation Chart',
    description: 'Access to view the organisation structure',
    category: 'system',
    affectsOthers: false,
  },
  {
    key: 'news',
    label: 'News',
    displayLabel: 'News',
    description: 'Access to company news and announcements',
    category: 'system',
    affectsOthers: false,
  },
  {
    key: 'bulk-actions',
    label: 'Bulk Actions',
    displayLabel: 'Bulk Actions',
    description: 'Access to perform bulk operations on employee data',
    category: 'system',
    affectsOthers: true,
  },
  {
    key: 'settings',
    label: 'Settings',
    displayLabel: 'Settings',
    description: 'Access to system settings and configuration',
    category: 'system',
    affectsOthers: false,
  },
  {
    key: 'onboarding',
    label: 'Onboarding',
    displayLabel: 'Onboarding Management',
    description: 'Access to manage onboarding workflows and templates',
    category: 'system',
    affectsOthers: true,
  },
  {
    key: 'offboarding',
    label: 'Offboarding',
    displayLabel: 'Offboarding Management',
    description: 'Access to manage offboarding workflows and templates',
    category: 'system',
    affectsOthers: true,
  },
  {
    key: 'forms',
    label: 'Forms',
    displayLabel: 'Forms',
    description: 'Access to company forms and templates',
    category: 'system',
    affectsOthers: false,
  },
  {
    key: 'leave-requests',
    label: 'Leave Requests',
    displayLabel: 'Leave Requests',
    description: 'Access to view and manage leave requests',
    category: 'system',
    affectsOthers: true,
  },
  {
    key: 'working-patterns',
    label: 'Working Patterns',
    displayLabel: 'Working Patterns',
    description: 'Access to view and manage working patterns',
    category: 'system',
    affectsOthers: false,
  },
  {
    key: 'departments',
    label: 'Departments',
    displayLabel: 'Departments',
    description: 'Access to view and manage departments',
    category: 'system',
    affectsOthers: false,
  },
  {
    key: 'job-roles',
    label: 'Job Roles',
    displayLabel: 'Job Roles',
    description: 'Access to view and manage job roles',
    category: 'system',
    affectsOthers: false,
  },
  {
    key: 'permissions',
    label: 'Permissions',
    displayLabel: 'Permissions',
    description: 'Access to view and manage permission profiles',
    category: 'system',
    affectsOthers: false,
  },
  {
    key: 'rota',
    label: 'Rota',
    displayLabel: 'Rota & Shift Management',
    description: 'Full access to view and manage rotas, shifts, and scheduling for all teams',
    category: 'system',
    affectsOthers: true,
  },
  // Employee profile screens - these control access to OTHER employees' data
  {
    key: 'employee-overview',
    label: 'Employee Overview',
    displayLabel: "Other Employees' Overview",
    description: 'View and manage overview information for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
  {
    key: 'employee-personal-information',
    label: 'Employee Personal Information',
    displayLabel: "Other Employees' Personal Information",
    description: 'View and manage personal information for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
  {
    key: 'employee-documents',
    label: 'Employee Documents',
    displayLabel: "Other Employees' Documents",
    description: 'View and manage documents for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
  {
    key: 'employee-driver-licenses',
    label: 'Employee Driver Licenses',
    displayLabel: "Other Employees' Driver Licenses",
    description: 'View and manage driver license information for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
  {
    key: 'employee-employment-checks',
    label: 'Employee Employment Checks',
    displayLabel: "Other Employees' Employment Checks",
    description: 'View and manage employment checks for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
  {
    key: 'employee-employment-details',
    label: 'Employee Employment Details',
    displayLabel: "Other Employees' Employment Details",
    description: 'View and manage employment details for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
  {
    key: 'employee-emergency-contacts',
    label: 'Employee Emergency Contacts',
    displayLabel: "Other Employees' Emergency Contacts",
    description: 'View and manage emergency contacts for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
  {
    key: 'employee-bank-payroll',
    label: 'Employee Bank & Payroll',
    displayLabel: "Other Employees' Bank & Payroll",
    description: 'View and manage bank and payroll information for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
  {
    key: 'employee-forms',
    label: 'Employee Forms',
    displayLabel: "Other Employees' Forms",
    description: 'View and manage forms for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
  {
    key: 'employee-leave',
    label: 'Employee Leave',
    displayLabel: "Other Employees' Leave",
    description: 'View and manage leave requests for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
  {
    key: 'employee-offboarding',
    label: 'Employee Offboarding',
    displayLabel: "Other Employees' Offboarding",
    description: 'View and manage offboarding for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
  {
    key: 'employee-onboarding',
    label: 'Employee Onboarding',
    displayLabel: "Other Employees' Onboarding",
    description: 'View and manage onboarding for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
  {
    key: 'employee-performance',
    label: 'Employee Performance',
    displayLabel: "Other Employees' Performance",
    description: 'View and manage performance reviews for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
  {
    key: 'employee-settings',
    label: 'Employee Settings',
    displayLabel: "Other Employees' Settings",
    description: 'View and manage settings for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
  {
    key: 'employee-training',
    label: 'Employee Training',
    displayLabel: "Other Employees' Training",
    description: 'View and manage training records for other employees in the organisation',
    category: 'employee-profile',
    affectsOthers: true,
  },
];

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
  "bulk-actions": ["read", "edit", "delete"],
  settings: ["read", "edit", "delete"],
  onboarding: ["read", "edit", "delete"],
  offboarding: ["read", "edit", "delete"],
  forms: ["read", "edit", "delete"],
  "leave-requests": ["read", "edit", "delete", "approve"],
  "working-patterns": ["read", "edit", "delete"],
  departments: ["read", "edit", "delete"],
  "job-roles": ["read", "edit", "delete"],
  permissions: ["read", "edit", "delete"],
  rota: ["read", "edit", "delete"],
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
    "leave-requests": ["read", "edit", "approve"],
    "working-patterns": ["read"],
    onboarding: ["read"],
    offboarding: ["read"],
    rota: ["read", "edit"],
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
  // Check for permission profile - handle both camelCase and PascalCase (Prisma includes)
  const profile = user.permissionProfile || (user as any).PermissionProfile;
  
  // If user has a custom permission profile, use it
  if (profile) {
    try {
      const raw = profile.permissions as unknown;
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
  // Admin override: ADMIN and SUPER_ADMIN roles always have all permissions
  // This applies even if they have a custom permission profile
  if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
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
 * Checks if a user has permission for a specific screen via their CUSTOM permission profile only.
 * This does NOT fall back to default role permissions.
 * Used for access control where we need to distinguish between:
 * - Default role permissions (e.g., MANAGER can see employee list)
 * - Custom profile permissions (e.g., HR Specialist can access ALL employee profiles)
 */
export function hasPermissionViaProfile(
  user: UserWithProfile,
  screen: string,
  action: PermissionAction,
): boolean {
  // Admin override still applies
  if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return true;
  }

  // Check for custom permission profile - handle both camelCase and PascalCase
  const profile = user.permissionProfile || (user as any).PermissionProfile;
  
  if (!profile) {
    // No custom profile = no profile-based permissions
    return false;
  }

  try {
    const raw = profile.permissions as unknown;
    const profilePermissions =
      typeof raw === "string"
        ? (JSON.parse(raw) as ScreenPermissions)
        : (raw as ScreenPermissions);
    
    if (!profilePermissions) {
      return false;
    }

    const screenPermissions = profilePermissions[screen];
    if (!screenPermissions) {
      return false;
    }

    return screenPermissions.includes(action);
  } catch (error) {
    console.error("Error parsing permission profile:", error);
    return false;
  }
}

/**
 * Gets all available screens in the system (returns just the keys for backward compatibility)
 */
export function getAvailableScreens(): string[] {
  return SCREEN_METADATA.map(screen => screen.key);
}

/**
 * Gets all available screens with full metadata
 */
export function getAvailableScreensWithMetadata(): ScreenMetadata[] {
  return SCREEN_METADATA;
}

/**
 * Gets metadata for a specific screen by key
 * Returns undefined if screen key is not found
 */
export function getScreenMetadata(key: string): ScreenMetadata | undefined {
  return SCREEN_METADATA.find(screen => screen.key === key);
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
  const availableActions: PermissionAction[] = ["read", "edit", "delete", "approve"];

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
    "org-chart": "Organisation Chart",
    news: "News",
    "bulk-actions": "Bulk actions",
    settings: "Settings",
    onboarding: "Onboarding",
    offboarding: "Offboarding",
    forms: "Forms",
    "leave-requests": "Leave Requests",
    "working-patterns": "Working Patterns",
    departments: "Departments",
    "job-roles": "Job Roles",
    permissions: "Permissions",
    rota: "Rota & Shifts",
    // Employee detail screens
    "employee-overview": "Employee Overview",
    "employee-personal-information": "Employee Personal Information",
    "employee-documents": "Employee Documents",
    "employee-driver-licenses": "Employee Driver Licenses",
    "employee-employment-checks": "Employee Employment Checks",
    "employee-employment-details": "Employee Employment Details",
    "employee-emergency-contacts": "Employee Emergency Contacts",
    "employee-bank-payroll": "Employee Bank & Payroll",
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
    approve: "Approve",
  };

  return actionNames[action];
}

/**
 * List of employee profile sub-screens that grant access to employee profiles
 */
export const EMPLOYEE_PROFILE_SCREENS = [
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
  "employee-personal-information",
  "employee-employment-details",
  "employee-emergency-contacts",
  "employee-bank-payroll",
] as const;

export type EmployeeProfileScreen = typeof EMPLOYEE_PROFILE_SCREENS[number];

/**
 * Determines if the requesting user can access a target employee record.
 * 
 * Access rules:
 * - ADMIN and SUPER_ADMIN can access any employee in their company
 * - A user can access their own employee record
 * - A user with "employees" read permission via CUSTOM profile can access ALL employees
 * - A user with ANY "employee-*" screen permission via CUSTOM profile can access ALL employees
 *   (but only sees the screens they have permission for - controlled by layout menu filtering)
 * - A MANAGER without custom profile can only access their subordinates
 * - An EMPLOYEE without custom profile cannot access other employees
 * 
 * The layout.tsx handles filtering which screens/tabs are shown based on permissions.
 * This function only controls whether the user can access the profile at all.
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

  const target = await prisma.employee.findFirst({
    where: { 
      id: targetEmployeeId, 
      companyId: requestor.companyId 
    },
    select: {
      id: true,
      userId: true,
      departmentId: true,
      User: { select: { managerId: true } },
    },
  });

  if (!target) {
    console.error("[canAccessEmployee] Employee not found:", {
      targetEmployeeId,
      requestorId: requestor.id,
      requestorRole: requestor.role,
      companyId: requestor.companyId,
    });
    return false;
  }

  // Self-access - always allowed
  if (target.userId === requestor.id) return true;

  // Check if user has a CUSTOM permission profile
  const requestorUser = await prisma.user.findUnique({
    where: { id: requestor.id },
    include: {
      PermissionProfile: true,
    },
  });

  const hasCustomProfile = requestorUser?.PermissionProfile != null;
  
  if (hasCustomProfile && requestorUser) {
    const userWithProfile: UserWithProfile = {
      ...requestorUser,
      permissionProfile: requestorUser.PermissionProfile,
    };
    
    // The main "employees" permission grants access to ALL employees
    if (hasPermissionViaProfile(userWithProfile, "employees", "read")) {
      return true;
    }
    
    // Any employee-* screen permission grants access to ALL employees
    // The layout will filter which screens/tabs they can actually see
    for (const screen of EMPLOYEE_PROFILE_SCREENS) {
      if (hasPermissionViaProfile(userWithProfile, screen, "read")) {
        return true;
      }
    }
  }

  // EMPLOYEE without relevant profile permissions cannot access other employees
  if (requestor.role === "EMPLOYEE") {
    return false;
  }

  // MANAGER without profile permissions: can only access subordinates
  if (requestor.role === "MANAGER") {
    const isSubordinate = await isUserSubordinateOf(
      target.userId,
      requestor.id,
      requestor.companyId
    );
    return isSubordinate;
  }

  return false;
}

/**
 * Checks if a target user is a subordinate (direct or indirect) of a manager.
 * Uses iterative approach to traverse the reporting chain upward from the target.
 */
export async function isUserSubordinateOf(
  targetUserId: string | null,
  managerUserId: string,
  companyId: string
): Promise<boolean> {
  if (!targetUserId) return false;
  
  // Walk up the management chain from the target to see if we reach the manager
  let currentUserId: string | null = targetUserId;
  const visited = new Set<string>();
  
  while (currentUserId) {
    // Prevent infinite loops
    if (visited.has(currentUserId)) break;
    visited.add(currentUserId);
    
    const subordinateUser: { managerId: string | null } | null = await prisma.user.findUnique({
      where: { id: currentUserId, companyId },
      select: { managerId: true },
    });
    
    if (!subordinateUser) break;
    
    // Found the manager in the chain
    if (subordinateUser.managerId === managerUserId) {
      return true;
    }
    
    currentUserId = subordinateUser.managerId;
  }
  
  return false;
}

/**
 * Gets the list of employee profile screens the user has access to.
 * This uses the full permission resolution (including default role permissions).
 * 
 * For filtering menus when viewing OTHER employees' profiles, use
 * getAccessibleEmployeeScreensViaProfile() instead to only check custom profiles.
 */
export function getAccessibleEmployeeScreens(user: UserWithProfile): string[] {
  // ADMIN and SUPER_ADMIN have access to all screens
  if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return ["employees", ...EMPLOYEE_PROFILE_SCREENS];
  }
  
  const accessibleScreens: string[] = [];
  
  // Check main "employees" permission
  if (hasPermission(user, "employees", "read")) {
    accessibleScreens.push("employees");
  }
  
  // Check individual employee-* screens
  for (const screen of EMPLOYEE_PROFILE_SCREENS) {
    if (hasPermission(user, screen, "read")) {
      accessibleScreens.push(screen);
    }
  }
  
  return accessibleScreens;
}

/**
 * Gets the list of employee profile screens the user has access to via their CUSTOM permission profile only.
 * This does NOT include default role permissions.
 * 
 * Use this when filtering menus for viewing OTHER employees' profiles where you need to
 * distinguish between role-based access (manager seeing subordinates) and profile-based access
 * (HR specialist seeing specific screens for all employees).
 */
export function getAccessibleEmployeeScreensViaProfile(user: UserWithProfile): string[] {
  // ADMIN and SUPER_ADMIN have access to all screens
  if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return ["employees", ...EMPLOYEE_PROFILE_SCREENS];
  }
  
  const accessibleScreens: string[] = [];
  
  // Check main "employees" permission via profile only
  if (hasPermissionViaProfile(user, "employees", "read")) {
    accessibleScreens.push("employees");
  }
  
  // Check individual employee-* screens via profile only
  for (const screen of EMPLOYEE_PROFILE_SCREENS) {
    if (hasPermissionViaProfile(user, screen, "read")) {
      accessibleScreens.push(screen);
    }
  }
  
  return accessibleScreens;
}

/**
 * Checks if a user can access the employee list page.
 * 
 * Access rules:
 * - ADMIN/SUPER_ADMIN always have access
 * - MANAGER always has access (to their team)
 * - User with "employees" read permission via profile has access
 * - User with ANY employee-* screen read permission via profile has access
 * 
 * NOTE: Users with employee-* permissions get FULL access to all employees
 * for their specific domain (e.g., payroll admin sees all bank details).
 * This is intentional for specialized roles like HR, Payroll, etc.
 */
export function canAccessEmployeeList(user: UserWithProfile): boolean {
  // ADMIN/SUPER_ADMIN always have access
  if (['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return true;
  }
  
  // MANAGER has access to their team
  if (user.role === 'MANAGER') {
    return true;
  }
  
  // Check if user has "employees" permission via profile
  if (hasPermission(user, 'employees', 'read')) {
    return true;
  }
  
  // Check if user has ANY employee-* screen permission
  // This grants FULL access for specialized roles (payroll admin, HR specialist, etc.)
  for (const screen of EMPLOYEE_PROFILE_SCREENS) {
    if (hasPermission(user, screen, 'read')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Checks if a user has any employee profile screen permission.
 * Used to determine if a user can navigate to employee profiles.
 */
export function hasAnyEmployeeProfilePermission(user: UserWithProfile): boolean {
  // ADMIN/SUPER_ADMIN always have access
  if (['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return true;
  }
  
  // Check if user has ANY employee-* screen permission
  for (const screen of EMPLOYEE_PROFILE_SCREENS) {
    if (hasPermission(user, screen, 'read')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Checks if a user has permission for a specific employee profile screen.
 * Used by employee profile pages to validate screen-specific access.
 * 
 * @param user - The user to check permissions for
 * @param screen - The employee profile screen key (e.g., "employee-documents")
 * @param action - The action to check (default: "read")
 * @returns true if the user has permission for the specific screen
 */
export function hasEmployeeScreenPermission(
  user: UserWithProfile,
  screen: EmployeeProfileScreen,
  action: PermissionAction = 'read'
): boolean {
  // ADMIN/SUPER_ADMIN always have access to all screens
  if (['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return true;
  }
  
  // Check the specific screen permission
  return hasPermission(user, screen, action);
}
