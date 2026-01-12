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

// ============================================
// UPCOMING ANNIVERSARIES QUERY
// ============================================

export interface UpcomingAnniversaryEmployee {
  employeeId: string;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  departmentId: string | null;
  departmentName: string | null;
  jobRoleId: string | null;
  jobRoleName: string | null;
  employmentStartDate: string | null;
  annualLeaveEntitlementDate: string;
  daysUntilAnniversary: number;
  futureAnnualLeaveEntitlement: number;
  leaveInAdvanceUsed: number;
  projectedBalance: number;
  willBeFlagged: boolean;
}

/**
 * Find employees approaching their 12-month anniversary.
 * 
 * This is a pure function for testing purposes that processes employee data
 * and returns upcoming anniversary information.
 * 
 * Property 8: Upcoming Anniversary Query
 * *For any* query for employees approaching their 12-month anniversary, the result 
 * SHALL include all employees where `annualLeaveEntitlementDate` is within the 
 * specified range and who do not yet have a LeaveEntitlement record.
 * 
 * **Validates: Requirements 7.1**
 * 
 * @param employees - Array of employee data with anniversary fields
 * @param queryDate - The date to query from (typically today)
 * @param daysAhead - Number of days to look ahead (default: 30)
 * @returns Array of employees within the anniversary range
 */
export function filterUpcomingAnniversaries(
  employees: Array<{
    id: string;
    userId: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    departmentId: string | null;
    departmentName: string | null;
    jobRoleId: string | null;
    jobRoleName: string | null;
    employmentStartDate: Date | null;
    annualLeaveEntitlementDate: Date | null;
    futureAnnualLeaveEntitlement: number | null;
    leaveInAdvanceUsed: number | null;
    isCasualEmployee: boolean;
    hasLeaveEntitlement: boolean;
  }>,
  queryDate: Date,
  daysAhead: number = 30
): UpcomingAnniversaryEmployee[] {
  const endDate = new Date(queryDate);
  endDate.setDate(endDate.getDate() + daysAhead);

  return employees
    .filter((emp) => {
      // Must have an anniversary date
      if (!emp.annualLeaveEntitlementDate) return false;
      
      // Anniversary must be within range (queryDate to queryDate + daysAhead)
      const anniversaryDate = emp.annualLeaveEntitlementDate;
      if (anniversaryDate < queryDate || anniversaryDate > endDate) return false;
      
      // Must have future entitlement stored
      if (!emp.futureAnnualLeaveEntitlement || emp.futureAnnualLeaveEntitlement <= 0) return false;
      
      // Must not be a casual employee
      if (emp.isCasualEmployee) return false;
      
      // Must not already have a LeaveEntitlement record
      if (emp.hasLeaveEntitlement) return false;
      
      return true;
    })
    .map((emp) => {
      const anniversaryDate = emp.annualLeaveEntitlementDate!;
      const daysUntilAnniversary = Math.ceil(
        (anniversaryDate.getTime() - queryDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const futureEntitlement = Number(emp.futureAnnualLeaveEntitlement || 0);
      const leaveInAdvanceUsed = Number(emp.leaveInAdvanceUsed || 0);
      const projectedBalance = Math.max(0, futureEntitlement - leaveInAdvanceUsed);
      const willBeFlagged = leaveInAdvanceUsed > futureEntitlement;

      return {
        employeeId: emp.id,
        userId: emp.userId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        departmentId: emp.departmentId,
        departmentName: emp.departmentName,
        jobRoleId: emp.jobRoleId,
        jobRoleName: emp.jobRoleName,
        employmentStartDate: emp.employmentStartDate?.toISOString() || null,
        annualLeaveEntitlementDate: anniversaryDate.toISOString(),
        daysUntilAnniversary,
        futureAnnualLeaveEntitlement: Math.round(futureEntitlement * 100) / 100,
        leaveInAdvanceUsed: Math.round(leaveInAdvanceUsed * 100) / 100,
        projectedBalance: Math.round(projectedBalance * 100) / 100,
        willBeFlagged,
      };
    })
    .sort((a, b) => a.daysUntilAnniversary - b.daysUntilAnniversary);
}


// ============================================
// REPORT DISTINCTION LOGIC
// ============================================

export interface LeaveReportRow {
  employeeId: string;
  hasEntitlement: boolean;
  entitledTotalDays: number;
  entitledUsedDays: number;
  entitledCarryoverDays: number;
  entitledRemaining: number;
  leaveInAdvanceUsed: number;
  futureEntitlement: number;
  projectedBalance: number;
  leaveStatus: "entitled" | "pre-entitlement" | "casual";
  isCasualEmployee: boolean;
}

/**
 * Transform employee leave data into a report row with entitled vs advance distinction.
 * 
 * Property 9: Report Distinction
 * *For any* leave report generation, the output SHALL distinguish between entitled leave 
 * (from LeaveEntitlement.usedDays) and leave in advance (from Employee.leaveInAdvanceUsed).
 * 
 * **Validates: Requirements 7.4**
 * 
 * @param employee - Employee data with leave fields
 * @returns Report row with entitled vs advance distinction
 */
export function transformToLeaveReportRow(employee: {
  id: string;
  isCasualEmployee: boolean;
  leaveInAdvanceUsed: number | null;
  futureAnnualLeaveEntitlement: number | null;
  leaveEntitlement: {
    totalDays: number;
    usedDays: number;
    carryoverDays: number;
  } | null;
}): LeaveReportRow {
  const hasEntitlement = !!employee.leaveEntitlement;
  
  // Round to 2 decimal places
  const round2 = (n: number) => Math.round(n * 100) / 100;
  
  // Entitled leave (from LeaveEntitlement record - post-12-month employees)
  const entitledTotalDays = hasEntitlement ? round2(employee.leaveEntitlement!.totalDays) : 0;
  const entitledUsedDays = hasEntitlement ? round2(employee.leaveEntitlement!.usedDays) : 0;
  const entitledCarryoverDays = hasEntitlement ? round2(employee.leaveEntitlement!.carryoverDays) : 0;
  const entitledRemaining = round2(entitledTotalDays + entitledCarryoverDays - entitledUsedDays);
  
  // Leave in advance (from Employee record - pre-12-month employees)
  const leaveInAdvanceUsed = round2(Number(employee.leaveInAdvanceUsed || 0));
  const futureEntitlement = round2(Number(employee.futureAnnualLeaveEntitlement || 0));
  const projectedBalance = round2(Math.max(0, futureEntitlement - leaveInAdvanceUsed));
  
  // Determine leave status
  let leaveStatus: "entitled" | "pre-entitlement" | "casual" = "entitled";
  if (employee.isCasualEmployee) {
    leaveStatus = "casual";
  } else if (!hasEntitlement && futureEntitlement > 0) {
    leaveStatus = "pre-entitlement";
  }
  
  return {
    employeeId: employee.id,
    hasEntitlement,
    entitledTotalDays,
    entitledUsedDays,
    entitledCarryoverDays,
    entitledRemaining,
    leaveInAdvanceUsed,
    futureEntitlement,
    projectedBalance,
    leaveStatus,
    isCasualEmployee: employee.isCasualEmployee,
  };
}

/**
 * Check if a report row correctly distinguishes entitled vs advance leave.
 * 
 * This is a validation function for testing purposes.
 * 
 * @param row - The report row to validate
 * @returns Whether the row correctly distinguishes entitled vs advance leave
 */
export function validateReportDistinction(row: LeaveReportRow): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Entitled leave should only be present for employees with entitlement
  if (!row.hasEntitlement && (row.entitledTotalDays > 0 || row.entitledUsedDays > 0)) {
    errors.push("Entitled leave values should be 0 for employees without entitlement");
  }
  
  // Leave in advance should only be tracked for pre-entitlement employees
  if (row.hasEntitlement && row.leaveInAdvanceUsed > 0 && row.leaveStatus !== "pre-entitlement") {
    // This is actually valid - employees can have both after anniversary grant
    // The leaveInAdvanceUsed is historical data
  }
  
  // Casual employees should not have any leave values
  if (row.isCasualEmployee && row.leaveStatus !== "casual") {
    errors.push("Casual employees should have 'casual' leave status");
  }
  
  // Projected balance should be max(0, futureEntitlement - leaveInAdvanceUsed)
  const expectedProjectedBalance = Math.max(0, row.futureEntitlement - row.leaveInAdvanceUsed);
  const roundedExpected = Math.round(expectedProjectedBalance * 100) / 100;
  if (row.projectedBalance !== roundedExpected) {
    errors.push(`Projected balance should be ${roundedExpected}, got ${row.projectedBalance}`);
  }
  
  // Entitled remaining should be totalDays + carryoverDays - usedDays
  const expectedEntitledRemaining = row.entitledTotalDays + row.entitledCarryoverDays - row.entitledUsedDays;
  const roundedEntitledRemaining = Math.round(expectedEntitledRemaining * 100) / 100;
  if (row.entitledRemaining !== roundedEntitledRemaining) {
    errors.push(`Entitled remaining should be ${roundedEntitledRemaining}, got ${row.entitledRemaining}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
