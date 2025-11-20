/**
 * Tenant Validation Helpers
 * 
 * Security utilities to ensure proper tenant isolation across all API endpoints.
 * These helpers should be used in ALL endpoints that access tenant-scoped resources.
 * 
 * CRITICAL: Always validate tenant ownership before returning or modifying data.
 */

import { prisma } from '@/lib/prisma';
import { AuditAction, AuditEntityType } from '@prisma/client';

/**
 * Validate that a timesheet belongs to the requesting company
 * 
 * @param timesheetId - The timesheet ID to validate
 * @param requestingCompanyId - The company ID of the requesting user
 * @returns The timesheet if valid, throws error if not found or wrong company
 * 
 * @example
 * ```typescript
 * const timesheet = await validateTimesheetTenant(id, requestingEmployee.companyId);
 * // Safe to use timesheet - guaranteed to belong to requesting company
 * ```
 */
export async function validateTimesheetTenant(
  timesheetId: string,
  requestingCompanyId: string
) {
  const timesheet = await prisma.timesheet.findFirst({
    where: {
      id: timesheetId,
      companyId: requestingCompanyId, // ✅ Tenant filter
    },
  });

  if (!timesheet) {
    throw new TenantValidationError('Timesheet not found or access denied');
  }

  return timesheet;
}

/**
 * Validate that a timesheet entry belongs to the requesting company
 * 
 * @param entryId - The entry ID to validate
 * @param requestingCompanyId - The company ID of the requesting user
 * @returns The entry with timesheet data if valid, throws error if not
 * 
 * @example
 * ```typescript
 * const entry = await validateTimesheetEntryTenant(entryId, requestingEmployee.companyId);
 * // Safe to use entry - guaranteed to belong to requesting company
 * ```
 */
export async function validateTimesheetEntryTenant(
  entryId: string,
  requestingCompanyId: string
) {
  const entry = await prisma.timesheetEntry.findFirst({
    where: {
      id: entryId,
      Timesheet: {
        companyId: requestingCompanyId, // ✅ Tenant filter via relation
      },
    },
    include: {
      Timesheet: {
        include: {
          Employee: {
            select: {
              id: true,
              companyId: true,
              departmentId: true,
              User: {
                select: {
                  managerId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!entry) {
    throw new TenantValidationError('Timesheet entry not found or access denied');
  }

  // Double-check company match (defense in depth)
  if (entry.Timesheet.Employee.companyId !== requestingCompanyId) {
    throw new TenantValidationError('Entry belongs to different company');
  }

  return entry;
}

/**
 * Validate that multiple timesheets belong to the requesting company
 * Used for bulk operations
 * 
 * @param timesheetIds - Array of timesheet IDs to validate
 * @param requestingCompanyId - The company ID of the requesting user
 * @returns Array of valid timesheets, throws if any are invalid
 */
export async function validateTimesheetsTenant(
  timesheetIds: string[],
  requestingCompanyId: string
) {
  const timesheets = await prisma.timesheet.findMany({
    where: {
      id: { in: timesheetIds },
      companyId: requestingCompanyId, // ✅ Tenant filter
    },
  });

  // Check if all requested IDs were found
  if (timesheets.length !== timesheetIds.length) {
    const foundIds = new Set(timesheets.map(t => t.id));
    const missingIds = timesheetIds.filter(id => !foundIds.has(id));
    throw new TenantValidationError(
      `Some timesheets not found or access denied: ${missingIds.join(', ')}`
    );
  }

  return timesheets;
}

/**
 * Validate that an employee belongs to the requesting company
 * 
 * @param employeeId - The employee ID to validate
 * @param requestingCompanyId - The company ID of the requesting user
 * @returns The employee if valid, throws error if not
 */
export async function validateEmployeeTenant(
  employeeId: string,
  requestingCompanyId: string
) {
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId: requestingCompanyId, // ✅ Tenant filter
    },
  });

  if (!employee) {
    throw new TenantValidationError('Employee not found or access denied');
  }

  return employee;
}

/**
 * Get requesting employee with company validation
 * Common pattern used in most endpoints
 * 
 * @param userId - The authenticated user's ID
 * @returns Employee record with company and role information
 */
export async function getRequestingEmployee(userId: string) {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: {
      id: true,
      companyId: true,
      departmentId: true,
      User: {
        select: {
          role: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!employee) {
    throw new TenantValidationError('Employee record not found');
  }

  return employee;
}

/**
 * Custom error class for tenant validation failures
 * Allows specific handling of tenant isolation errors
 */
export class TenantValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantValidationError';
  }
}

/**
 * Check if a user has permission to access a resource in a specific company
 * Used for additional authorization checks beyond tenant validation
 * 
 * @param userId - The user's ID
 * @param resourceCompanyId - The company ID of the resource
 * @returns true if user belongs to the same company
 */
export async function canAccessCompanyResource(
  userId: string,
  resourceCompanyId: string
): Promise<boolean> {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { companyId: true },
  });

  return employee?.companyId === resourceCompanyId;
}

/**
 * Audit log helper for tenant validation failures
 * Logs suspicious cross-tenant access attempts
 * 
 * @param userId - The user who attempted access
 * @param resourceType - Type of resource (timesheet, entry, etc.)
 * @param resourceId - ID of the resource
 * @param requestedCompanyId - The company ID that was requested
 */
export async function logTenantViolationAttempt(
  userId: string,
  resourceType: string,
  resourceId: string,
  requestedCompanyId?: string
) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: { companyId: true },
    });

    await prisma.globalAuditLog.create({
      data: {
        id: `audit-tenant-violation-${Date.now()}-${Math.random()}`,
        actorId: userId,
        companyId: employee?.companyId || requestedCompanyId || 'UNKNOWN',
        action: AuditAction.UPDATED,
        entityType: AuditEntityType.EMPLOYEE,
        entityId: resourceId,
        metadata: {
          type: 'TENANT_VIOLATION',
          resourceType,
          resourceId,
          attemptedCompanyId: requestedCompanyId,
          userCompanyId: employee?.companyId,
          timestamp: new Date().toISOString(),
        },
      },
    });

    console.warn(
      `TENANT_VIOLATION: userId=${userId} resourceType=${resourceType} resourceId=${resourceId} requestedCompanyId=${requestedCompanyId ?? 'UNKNOWN'} userCompanyId=${employee?.companyId ?? 'UNKNOWN'}`
    );
  } catch (error) {
    console.error('Failed to log tenant violation:', error);
  }
}
