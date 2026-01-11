/**
 * NZ Annual Leave Anniversary Grant Logic
 * 
 * Implements NZ Holidays Act 2003 compliant annual leave entitlement:
 * - Employees are NOT entitled to annual leave until 12 months of continuous employment
 * - At 12-month anniversary: entitlement crystallises (becomes legal right)
 * - Leave taken before 12 months = "leave in advance" (deducted from future entitlement)
 * - Casual employees receive 8% holiday pay instead of annual leave accrual
 * - When casual employees convert to permanent, their 12-month anniversary starts from conversion date
 * 
 * @version 1.1
 * @date 2026
 */

import type { PrismaClient, Employee } from '@prisma/client';
import { randomUUID } from 'crypto';

// ============================================
// TYPES
// ============================================

export interface AnniversaryGrantResult {
  /** Employee ID */
  employeeId: string;
  /** Days granted from future entitlement */
  grantedDays: number;
  /** Days deducted for leave in advance */
  leaveInAdvanceDeducted: number;
  /** Final balance after deduction (max 0) */
  finalBalance: number;
  /** Whether flagged for HR review (leave in advance > entitlement) */
  flaggedForReview: boolean;
  /** Error message if grant failed */
  error?: string;
}

export interface BatchGrantSummary {
  /** Total employees processed */
  totalProcessed: number;
  /** Successful grants */
  successCount: number;
  /** Failed grants */
  failureCount: number;
  /** Employees flagged for review */
  flaggedCount: number;
  /** Individual results */
  results: AnniversaryGrantResult[];
}

export interface CasualToPermanentResult {
  /** Employee ID */
  employeeId: string;
  /** Whether conversion was successful */
  success: boolean;
  /** Date of conversion */
  conversionDate?: Date;
  /** New anniversary date (12 months from conversion) */
  newAnniversaryDate?: Date;
  /** Future entitlement stored */
  futureEntitlement?: number;
  /** Error message if conversion failed */
  error?: string;
}

type EmployeeWithLeaveFields = Pick<Employee, 
  'id' | 'companyId' | 'userId' | 'futureAnnualLeaveEntitlement' | 
  'annualLeaveEntitlementDate' | 'leaveInAdvanceUsed' | 'isCasualEmployee'
>;

// ============================================
// CONSTANTS
// ============================================

/** Annual Leave event category name (case-insensitive match) */
const ANNUAL_LEAVE_CATEGORY_NAME = 'Annual Leave';

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Process anniversary grant for a single employee.
 * 
 * Creates a LeaveEntitlement record with the stored future entitlement,
 * minus any leave in advance that was taken.
 * 
 * NZ Holidays Act 2003 Compliance:
 * - Final balance = futureAnnualLeaveEntitlement - leaveInAdvanceUsed
 * - If leaveInAdvance > futureEntitlement, set balance to 0 and flag for review
 * 
 * @param prisma - Prisma client instance
 * @param employeeId - The employee ID
 * @param grantDate - The date of the grant (typically the anniversary date)
 * @param actorId - Optional user ID performing the action (for audit)
 * @returns Result of the grant operation
 */
export async function processAnniversaryGrant(
  prisma: PrismaClient,
  employeeId: string,
  grantDate: Date,
  actorId?: string
): Promise<AnniversaryGrantResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Fetch employee with leave fields
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          companyId: true,
          userId: true,
          futureAnnualLeaveEntitlement: true,
          annualLeaveEntitlementDate: true,
          leaveInAdvanceUsed: true,
          isCasualEmployee: true,
        },
      });

      if (!employee) {
        return {
          employeeId,
          grantedDays: 0,
          leaveInAdvanceDeducted: 0,
          finalBalance: 0,
          flaggedForReview: false,
          error: `Employee ${employeeId} not found`,
        };
      }

      // Validate: not a casual employee
      if (employee.isCasualEmployee) {
        return {
          employeeId,
          grantedDays: 0,
          leaveInAdvanceDeducted: 0,
          finalBalance: 0,
          flaggedForReview: false,
          error: 'Casual employees do not receive annual leave entitlement',
        };
      }

      // Validate: has future entitlement stored
      const futureEntitlement = Number(employee.futureAnnualLeaveEntitlement || 0);
      if (futureEntitlement <= 0) {
        return {
          employeeId,
          grantedDays: 0,
          leaveInAdvanceDeducted: 0,
          finalBalance: 0,
          flaggedForReview: false,
          error: 'No future entitlement stored for this employee',
        };
      }

      // Get Annual Leave event category
      const annualLeaveCategory = await tx.eventCategory.findFirst({
        where: {
          companyId: employee.companyId,
          name: { equals: ANNUAL_LEAVE_CATEGORY_NAME, mode: 'insensitive' },
        },
      });

      if (!annualLeaveCategory) {
        return {
          employeeId,
          grantedDays: 0,
          leaveInAdvanceDeducted: 0,
          finalBalance: 0,
          flaggedForReview: false,
          error: 'Annual Leave event category not found for company',
        };
      }

      // Check if LeaveEntitlement already exists (idempotency)
      const existingEntitlement = await tx.leaveEntitlement.findFirst({
        where: {
          employeeId,
          eventCategoryId: annualLeaveCategory.id,
        },
      });

      if (existingEntitlement) {
        return {
          employeeId,
          grantedDays: 0,
          leaveInAdvanceDeducted: 0,
          finalBalance: Number(existingEntitlement.totalDays) - Number(existingEntitlement.usedDays),
          flaggedForReview: false,
          error: 'LeaveEntitlement already exists for this employee',
        };
      }

      // Calculate final balance
      const leaveInAdvanceUsed = Number(employee.leaveInAdvanceUsed || 0);
      let finalBalance = futureEntitlement - leaveInAdvanceUsed;
      let flaggedForReview = false;

      // Handle edge case: leave in advance exceeds entitlement
      if (finalBalance < 0) {
        flaggedForReview = true;
        finalBalance = 0;
      }

      // Round to 2 decimal places (NZ HRIS requirement)
      finalBalance = Math.round(finalBalance * 100) / 100;

      // Create LeaveEntitlement record
      const entitlementId = randomUUID();
      await tx.leaveEntitlement.create({
        data: {
          id: entitlementId,
          employeeId,
          companyId: employee.companyId,
          eventCategoryId: annualLeaveCategory.id,
          totalDays: futureEntitlement,
          usedDays: leaveInAdvanceUsed,
          daysAllocated: futureEntitlement,
          carryoverDays: 0,
          updatedAt: new Date(),
        },
      });

      // Create audit log entry
      await tx.globalAuditLog.create({
        data: {
          id: randomUUID(),
          companyId: employee.companyId,
          entityType: 'LEAVE_REQUEST',
          entityId: entitlementId,
          action: 'CREATED',
          actorId: actorId || 'SYSTEM',
          timestamp: new Date(),
          metadata: {
            type: 'ANNIVERSARY_GRANT',
            employeeId,
            grantDate: grantDate.toISOString(),
            futureEntitlement,
            leaveInAdvanceDeducted: leaveInAdvanceUsed,
            finalBalance,
            flaggedForReview,
          },
        },
      });

      // If flagged for review, create an ActionItem for HR
      if (flaggedForReview) {
        await tx.actionItem.create({
          data: {
            id: randomUUID(),
            companyId: employee.companyId,
            relatedEmployeeId: employeeId,
            title: 'Leave In Advance Exceeds Entitlement',
            description: `Employee's leave in advance (${leaveInAdvanceUsed} days) exceeds their annual leave entitlement (${futureEntitlement} days). Balance set to 0. Please review.`,
            type: 'TASK',
            priority: 'HIGH',
            status: 'PENDING',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            updatedAt: new Date(),
          },
        });
      }

      // Clear the future entitlement fields (entitlement has crystallised)
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          futureAnnualLeaveEntitlement: null,
          leaveInAdvanceUsed: 0,
          annualLeaveBalance: finalBalance,
        },
      });

      return {
        employeeId,
        grantedDays: futureEntitlement,
        leaveInAdvanceDeducted: leaveInAdvanceUsed,
        finalBalance,
        flaggedForReview,
      };
    });
  } catch (error: any) {
    return {
      employeeId,
      grantedDays: 0,
      leaveInAdvanceDeducted: 0,
      finalBalance: 0,
      flaggedForReview: false,
      error: error.message || 'Unknown error during anniversary grant',
    };
  }
}

/**
 * Find employees who have reached their 12-month anniversary.
 * 
 * Criteria:
 * - annualLeaveEntitlementDate <= targetDate
 * - No existing LeaveEntitlement for Annual Leave
 * - Not a casual employee
 * - Has a future entitlement stored
 * 
 * @param prisma - Prisma client instance
 * @param companyId - The company ID
 * @param targetDate - The date to check against (typically today)
 * @returns Array of employees at or past their anniversary
 */
export async function findEmployeesAtAnniversary(
  prisma: PrismaClient,
  companyId: string,
  targetDate: Date
): Promise<EmployeeWithLeaveFields[]> {
  // Get Annual Leave event category
  const annualLeaveCategory = await prisma.eventCategory.findFirst({
    where: {
      companyId,
      name: { equals: ANNUAL_LEAVE_CATEGORY_NAME, mode: 'insensitive' },
    },
  });

  if (!annualLeaveCategory) {
    return [];
  }

  // Find employees at anniversary who don't have LeaveEntitlement yet
  const employees = await prisma.employee.findMany({
    where: {
      companyId,
      isActive: true,
      isCasualEmployee: false,
      annualLeaveEntitlementDate: {
        lte: targetDate,
      },
      futureAnnualLeaveEntitlement: {
        not: null,
        gt: 0,
      },
      // Exclude employees who already have LeaveEntitlement for Annual Leave
      LeaveEntitlement: {
        none: {
          eventCategoryId: annualLeaveCategory.id,
        },
      },
    },
    select: {
      id: true,
      companyId: true,
      userId: true,
      futureAnnualLeaveEntitlement: true,
      annualLeaveEntitlementDate: true,
      leaveInAdvanceUsed: true,
      isCasualEmployee: true,
    },
  });

  return employees;
}

/**
 * Process anniversary grants for all eligible employees in a company.
 * 
 * @param prisma - Prisma client instance
 * @param companyId - The company ID
 * @param actorId - Optional user ID performing the action (for audit)
 * @returns Summary of batch processing results
 */
export async function processAllAnniversaryGrants(
  prisma: PrismaClient,
  companyId: string,
  actorId?: string
): Promise<BatchGrantSummary> {
  const targetDate = new Date();
  const employees = await findEmployeesAtAnniversary(prisma, companyId, targetDate);

  const results: AnniversaryGrantResult[] = [];
  let successCount = 0;
  let failureCount = 0;
  let flaggedCount = 0;

  for (const employee of employees) {
    const result = await processAnniversaryGrant(
      prisma,
      employee.id,
      employee.annualLeaveEntitlementDate || targetDate,
      actorId
    );

    results.push(result);

    if (result.error) {
      failureCount++;
    } else {
      successCount++;
      if (result.flaggedForReview) {
        flaggedCount++;
      }
    }
  }

  return {
    totalProcessed: employees.length,
    successCount,
    failureCount,
    flaggedCount,
    results,
  };
}

/**
 * Calculate the final balance for an anniversary grant.
 * 
 * This is a pure function for testing purposes.
 * 
 * @param futureEntitlement - The stored future entitlement
 * @param leaveInAdvanceUsed - The leave in advance taken
 * @returns Object with finalBalance and flaggedForReview
 */
export function calculateAnniversaryGrantBalance(
  futureEntitlement: number,
  leaveInAdvanceUsed: number
): { finalBalance: number; flaggedForReview: boolean } {
  let finalBalance = futureEntitlement - leaveInAdvanceUsed;
  let flaggedForReview = false;

  if (finalBalance < 0) {
    flaggedForReview = true;
    finalBalance = 0;
  }

  // Round to 2 decimal places
  finalBalance = Math.round(finalBalance * 100) / 100;

  return { finalBalance, flaggedForReview };
}


// ============================================
// CASUAL TO PERMANENT CONVERSION
// ============================================

/**
 * Convert a casual employee to permanent status.
 * 
 * NZ Holidays Act 2003 Compliance:
 * - When a casual employee's status changes to permanent, their 12-month anniversary
 *   for annual leave entitlement starts from the conversion date (not original hire date)
 * - The employee will receive their annual leave entitlement 12 months after conversion
 * 
 * @param prisma - Prisma client instance
 * @param employeeId - The employee ID
 * @param conversionDate - The date of conversion (defaults to current date)
 * @param futureEntitlementDays - The annual leave entitlement to grant at anniversary (defaults to 20 days)
 * @param actorId - Optional user ID performing the action (for audit)
 * @returns Result of the conversion operation
 */
export async function convertCasualToPermanent(
  prisma: PrismaClient,
  employeeId: string,
  conversionDate: Date = new Date(),
  futureEntitlementDays: number = 20,
  actorId?: string
): Promise<CasualToPermanentResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Fetch employee
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          companyId: true,
          userId: true,
          isCasualEmployee: true,
          futureAnnualLeaveEntitlement: true,
          annualLeaveEntitlementDate: true,
        },
      });

      if (!employee) {
        return {
          employeeId,
          success: false,
          error: `Employee ${employeeId} not found`,
        };
      }

      // Validate: must be a casual employee
      if (!employee.isCasualEmployee) {
        return {
          employeeId,
          success: false,
          error: 'Employee is not a casual employee',
        };
      }

      // Calculate the new 12-month anniversary date from conversion date
      const newAnniversaryDate = calculateAnniversaryDateFromConversion(conversionDate);

      // Round entitlement to 2 decimal places (NZ HRIS requirement)
      const roundedEntitlement = Math.round(futureEntitlementDays * 100) / 100;

      // Update employee record
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          isCasualEmployee: false,
          casualToPermanentDate: conversionDate,
          annualLeaveEntitlementDate: newAnniversaryDate,
          futureAnnualLeaveEntitlement: roundedEntitlement,
          leaveInAdvanceUsed: 0, // Reset leave in advance tracking
        },
      });

      // Create audit log entry
      await tx.globalAuditLog.create({
        data: {
          id: randomUUID(),
          companyId: employee.companyId,
          entityType: 'EMPLOYEE',
          entityId: employeeId,
          action: 'UPDATED',
          actorId: actorId || 'SYSTEM',
          timestamp: new Date(),
          metadata: {
            type: 'CASUAL_TO_PERMANENT_CONVERSION',
            employeeId,
            conversionDate: conversionDate.toISOString(),
            newAnniversaryDate: newAnniversaryDate.toISOString(),
            futureEntitlement: roundedEntitlement,
          },
        },
      });

      return {
        employeeId,
        success: true,
        conversionDate,
        newAnniversaryDate,
        futureEntitlement: roundedEntitlement,
      };
    });
  } catch (error: any) {
    return {
      employeeId,
      success: false,
      error: error.message || 'Unknown error during casual to permanent conversion',
    };
  }
}

/**
 * Calculate the 12-month anniversary date from a conversion date.
 * 
 * This is a pure function for testing purposes.
 * 
 * @param conversionDate - The date of casual to permanent conversion
 * @returns The anniversary date (12 months after conversion)
 */
export function calculateAnniversaryDateFromConversion(conversionDate: Date): Date {
  const anniversaryDate = new Date(conversionDate);
  anniversaryDate.setFullYear(anniversaryDate.getFullYear() + 1);
  return anniversaryDate;
}

/**
 * Check if an employee is eligible for casual to permanent conversion.
 * 
 * @param employee - Employee data with casual status
 * @returns Whether the employee can be converted
 */
export function canConvertToPermanent(employee: {
  isCasualEmployee?: boolean;
  futureAnnualLeaveEntitlement?: number | null;
}): boolean {
  // Must be a casual employee
  if (!employee.isCasualEmployee) {
    return false;
  }
  
  // Should not already have future entitlement (would indicate already converted)
  if (employee.futureAnnualLeaveEntitlement && employee.futureAnnualLeaveEntitlement > 0) {
    return false;
  }
  
  return true;
}
