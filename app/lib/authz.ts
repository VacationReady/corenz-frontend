/**
 * Leave Request Authorization Helpers
 * 
 * Leave-specific authorization logic that builds on top of the generic
 * permissions layer (app/lib/permissions.ts).
 * 
 * Separation of concerns:
 * - permissions.ts: Generic RBAC + employee access (source of truth)
 * - authz.ts: Leave-specific policies (can create, approve, etc.)
 * - Routes: Use both as needed
 * 
 * All functions enforce tenant boundaries and return boolean access decisions.
 */

import { prisma } from "@/lib/prisma";
import { canAccessEmployee } from "@/lib/permissions";

// Re-export the Role type from Prisma to ensure consistency
export type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN";

export interface AuthContext {
  userId: string;
  role: UserRole;
  companyId: string;
}

/**
 * Checks if a user has admin or super admin privileges
 */
export function isAdmin(role: UserRole): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/**
 * Checks if a user has manager-level or higher privileges
 */
export function isManagerOrAdmin(role: UserRole): boolean {
  return (
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "MANAGER"
  );
}

/**
 * Determines if a user can access leave requests for a specific employee.
 * 
 * Access Rules (delegates to permissions.canAccessEmployee):
 * - ADMIN/SUPER_ADMIN: Can access all leave requests in their company
 * - MANAGER: Can access leave requests for employees they manage
 * - EMPLOYEE: Can only access their own leave requests
 * 
 * @param context - The authenticated user's context
 * @param targetEmployeeId - The employee whose leave requests are being accessed
 * @returns Promise<boolean> - true if access is allowed
 */
export async function canAccessLeaveRequests(
  context: AuthContext,
  targetEmployeeId: string
): Promise<boolean> {
  // Delegate to the canonical employee access check from permissions.ts
  // Leave requests access follows the same rules as employee record access
  // Map AuthContext to the expected requestor signature
  return canAccessEmployee(
    {
      id: context.userId,
      role: context.role as "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN",
      companyId: context.companyId,
    },
    targetEmployeeId
  );
}

/**
 * Determines if a user can create leave requests on behalf of an employee.
 * 
 * Access Rules:
 * - ADMIN/SUPER_ADMIN: Can create leave requests for any employee in their company
 * - EMPLOYEE: Can only create leave requests for themselves
 * 
 * @param context - The authenticated user's context
 * @param targetEmployeeId - The employee for whom the leave request is being created
 * @returns Promise<boolean> - true if creation is allowed
 */
export async function canCreateLeaveRequest(
  context: AuthContext,
  targetEmployeeId: string
): Promise<boolean> {
  // Admin override: can create for anyone in their company
  if (isAdmin(context.role)) {
    const employee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { companyId: true },
    });

    if (!employee) return false;
    return employee.companyId === context.companyId;
  }

  // Regular users can only create for themselves
  const targetEmployee = await prisma.employee.findUnique({
    where: { id: targetEmployeeId, companyId: context.companyId },
    select: { userId: true },
  });

  if (!targetEmployee) return false;
  return targetEmployee.userId === context.userId;
}

/**
 * Determines if a user can approve/reject leave requests.
 * 
 * Access Rules:
 * - ADMIN/SUPER_ADMIN: Can approve any leave request in their company
 * - MANAGER: Can approve leave requests for their direct reports
 * - EMPLOYEE: Cannot approve leave requests
 * 
 * @param context - The authenticated user's context
 * @param leaveRequestId - The leave request being approved/rejected
 * @returns Promise<boolean> - true if approval action is allowed
 */
export async function canApproveLeaveRequest(
  context: AuthContext,
  leaveRequestId: string
): Promise<boolean> {
  // Admin override
  if (isAdmin(context.role)) {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      select: { companyId: true },
    });

    if (!leaveRequest) return false;
    return leaveRequest.companyId === context.companyId;
  }

  // Manager access: check if they manage the employee
  if (context.role === "MANAGER") {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      select: {
        companyId: true,
        Employee: {
          select: {
            User: {
              select: { managerId: true },
            },
          },
        },
      },
    });

    if (!leaveRequest) return false;
    if (leaveRequest.companyId !== context.companyId) return false;

    return leaveRequest.Employee?.User?.managerId === context.userId;
  }

  // Regular employees cannot approve
  return false;
}

/**
 * Note: For generic employee access checks, use canAccessEmployee from permissions.ts.
 * This module focuses on leave-specific authorization only.
 */

/**
 * Validates that a resource belongs to the user's company.
 * This is a fundamental multi-tenant isolation check.
 * 
 * @param resourceCompanyId - The companyId of the resource
 * @param userCompanyId - The companyId of the authenticated user
 * @returns boolean - true if the resource belongs to the user's company
 */
export function isSameTenant(
  resourceCompanyId: string,
  userCompanyId: string
): boolean {
  return resourceCompanyId === userCompanyId;
}

/**
 * Creates an AuthContext from a NextAuth session.
 * 
 * @param session - The NextAuth session object
 * @returns AuthContext | null - The auth context or null if session is invalid
 */
export function createAuthContext(session: any): AuthContext | null {
  if (!session?.user?.id || !session.user.companyId || !session.user.role) {
    return null;
  }

  return {
    userId: session.user.id,
    role: session.user.role as UserRole,
    companyId: session.user.companyId,
  };
}
