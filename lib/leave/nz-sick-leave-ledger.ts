/**
 * NZ Sick Leave Ledger - Entitlement Engine
 * 
 * Implements NZ Holidays Act 2003 compliant sick leave management:
 * - 6-month eligibility period
 * - 10 days granted on eligibility date
 * - 10 days granted every 12 months thereafter
 * - Balance capped at 20 days (enforced only at grant time)
 * - Ledger-based tracking as single source of truth
 * 
 * INTERNAL UNIT: Hours (8 hours = 1 day)
 * DISPLAY UNIT: Days (rounded to 0.5 day increments)
 * 
 * @version 1.0
 * @date 2024
 */

import type { PrismaClient, Employee, LeaveBalanceLedger } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================
// CONSTANTS (Holidays Act 2003)
// ============================================

/** Hours per standard NZ working day */
export const HOURS_PER_DAY = 8;

/** Sick leave grant per entitlement period (days) */
export const SICK_LEAVE_GRANT_DAYS = 10;

/** Sick leave grant per entitlement period (hours) */
export const SICK_LEAVE_GRANT_HOURS = SICK_LEAVE_GRANT_DAYS * HOURS_PER_DAY; // 80 hours

/** Maximum sick leave balance (days) */
export const SICK_LEAVE_CAP_DAYS = 20;

/** Maximum sick leave balance (hours) */
export const SICK_LEAVE_CAP_HOURS = SICK_LEAVE_CAP_DAYS * HOURS_PER_DAY; // 160 hours

/** Months of employment before sick leave eligibility */
export const SICK_LEAVE_ELIGIBILITY_MONTHS = 6;

/** Months between anniversary grants */
export const SICK_LEAVE_GRANT_INTERVAL_MONTHS = 12;

// ============================================
// TYPES
// ============================================

export interface SickLeaveStatus {
  /** Current balance in hours */
  balanceHours: number;
  /** Current balance in days */
  balanceDays: number;
  /** Whether employee is eligible for sick leave */
  isEligible: boolean;
  /** Date employee becomes/became eligible (null if not calculable) */
  eligibilityDate: Date | null;
  /** Date of next sick leave grant (null if not yet eligible) */
  nextGrantDate: Date | null;
  /** Days until next grant (null if not calculable) */
  daysUntilNextGrant: number | null;
}

export interface ApplyGrantsResult {
  /** Number of grants applied */
  grantsApplied: number;
  /** Whether a cap clamp was applied */
  capClampApplied: boolean;
  /** New balance in hours */
  newBalanceHours: number;
  /** Ledger entries created */
  ledgerEntries: LeaveBalanceLedger[];
}

type EmployeeWithLeaveFields = Pick<Employee, 
  'id' | 'companyId' | 'employmentStartDate' | 'startDate' | 
  'sickLeaveBalance' | 'sickLeaveEligibilityDate' | 'sickLeaveLastGrantDate'
>;

// ============================================
// CANONICAL EMPLOYMENT DATE
// ============================================

/**
 * Get the canonical employment start date for an employee.
 * 
 * Rule: If employmentStartDate exists, use it. Otherwise use startDate.
 * This is documented in docs/nz-sick-leave.md.
 */
export function getCanonicalEmploymentDate(employee: Pick<Employee, 'employmentStartDate' | 'startDate'>): Date | null {
  if (employee.employmentStartDate) {
    return new Date(employee.employmentStartDate);
  }
  if (employee.startDate) {
    return new Date(employee.startDate);
  }
  return null;
}

// ============================================
// ELIGIBILITY CALCULATIONS
// ============================================

/**
 * Compute the date when an employee becomes eligible for sick leave.
 * 
 * NZ Law: Eligible after 6 months of continuous employment.
 * 
 * @param employmentStartDate - The date employment began
 * @returns The eligibility date (6 months after start)
 */
export function computeSickEligibilityDate(employmentStartDate: Date): Date {
  const eligibilityDate = new Date(employmentStartDate);
  eligibilityDate.setMonth(eligibilityDate.getMonth() + SICK_LEAVE_ELIGIBILITY_MONTHS);
  return eligibilityDate;
}

/**
 * Compute the next sick leave grant date.
 * 
 * @param eligibilityDate - The date the employee became eligible
 * @param lastGrantDate - The date of the last grant (null if never granted)
 * @returns The next grant date
 */
export function computeNextSickGrantDate(
  eligibilityDate: Date,
  lastGrantDate: Date | null
): Date {
  if (!lastGrantDate) {
    // First grant is on eligibility date
    return new Date(eligibilityDate);
  }
  
  // Subsequent grants are 12 months after last grant
  const nextGrant = new Date(lastGrantDate);
  nextGrant.setMonth(nextGrant.getMonth() + SICK_LEAVE_GRANT_INTERVAL_MONTHS);
  return nextGrant;
}

/**
 * Check if an employee is eligible for sick leave as of a given date.
 * 
 * @param employee - Employee record with employment dates
 * @param asOfDate - The date to check eligibility for
 * @returns Whether the employee is eligible
 */
export function isEligibleForSickLeave(
  employee: Pick<Employee, 'employmentStartDate' | 'startDate' | 'sickLeaveEligibilityDate'>,
  asOfDate: Date = new Date()
): boolean {
  // If we have a pre-computed eligibility date, use it
  if (employee.sickLeaveEligibilityDate) {
    return asOfDate >= new Date(employee.sickLeaveEligibilityDate);
  }
  
  // Otherwise compute from employment start
  const startDate = getCanonicalEmploymentDate(employee);
  if (!startDate) {
    return false;
  }
  
  const eligibilityDate = computeSickEligibilityDate(startDate);
  return asOfDate >= eligibilityDate;
}

/**
 * Get complete sick leave status for an employee.
 */
export function getSickLeaveStatus(
  employee: EmployeeWithLeaveFields,
  asOfDate: Date = new Date()
): SickLeaveStatus {
  const balanceHours = Number(employee.sickLeaveBalance || 0);
  const balanceDays = hoursToDisplayDays(balanceHours);
  
  const startDate = getCanonicalEmploymentDate(employee);
  if (!startDate) {
    return {
      balanceHours,
      balanceDays,
      isEligible: false,
      eligibilityDate: null,
      nextGrantDate: null,
      daysUntilNextGrant: null,
    };
  }
  
  const eligibilityDate = employee.sickLeaveEligibilityDate 
    ? new Date(employee.sickLeaveEligibilityDate)
    : computeSickEligibilityDate(startDate);
  
  const isEligible = asOfDate >= eligibilityDate;
  
  let nextGrantDate: Date | null = null;
  let daysUntilNextGrant: number | null = null;
  
  if (isEligible) {
    const lastGrantDate = employee.sickLeaveLastGrantDate 
      ? new Date(employee.sickLeaveLastGrantDate)
      : null;
    nextGrantDate = computeNextSickGrantDate(eligibilityDate, lastGrantDate);
    
    // If next grant is in the past, we have pending grants
    if (nextGrantDate <= asOfDate) {
      daysUntilNextGrant = 0;
    } else {
      daysUntilNextGrant = Math.ceil(
        (nextGrantDate.getTime() - asOfDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  } else {
    nextGrantDate = eligibilityDate;
    daysUntilNextGrant = Math.ceil(
      (eligibilityDate.getTime() - asOfDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }
  
  return {
    balanceHours,
    balanceDays,
    isEligible,
    eligibilityDate,
    nextGrantDate,
    daysUntilNextGrant,
  };
}

// ============================================
// GRANT APPLICATION (LAZY ON-READ)
// ============================================

/**
 * Apply any pending sick leave grants for an employee.
 * 
 * This function is IDEMPOTENT - safe to call multiple times.
 * Uses database-level unique constraint on idempotencyKey to prevent duplicates.
 * Uses row-level locking (SELECT FOR UPDATE) for concurrency safety.
 * 
 * Grant timing strategy: LAZY ON-READ
 * This function must be called from:
 * - Sick leave balance API
 * - Leave booking cost/submit path
 * - Manager approval endpoint/view
 * - Payroll calculation/export read path
 * 
 * @param prisma - Prisma client instance
 * @param employeeId - The employee ID
 * @param asOfDate - The date to apply grants up to (default: now)
 * @param actorId - The user performing the action (for audit)
 * @returns Result of grant application
 */
export async function applySickLeaveGrants(
  prisma: PrismaClient,
  employeeId: string,
  asOfDate: Date = new Date(),
  actorId?: string
): Promise<ApplyGrantsResult> {
  return prisma.$transaction(async (tx) => {
    // Row-level lock to prevent concurrent grant application
    const employees = await tx.$queryRaw<EmployeeWithLeaveFields[]>`
      SELECT id, "companyId", "employmentStartDate", "startDate", 
             "sickLeaveBalance", "sickLeaveEligibilityDate", "sickLeaveLastGrantDate"
      FROM "Employee"
      WHERE id = ${employeeId}
      FOR UPDATE
    `;
    
    if (employees.length === 0) {
      throw new Error(`Employee ${employeeId} not found`);
    }
    
    const employee = employees[0];
    const startDate = getCanonicalEmploymentDate(employee);
    
    if (!startDate) {
      return {
        grantsApplied: 0,
        capClampApplied: false,
        newBalanceHours: Number(employee.sickLeaveBalance || 0),
        ledgerEntries: [],
      };
    }
    
    // Compute or use existing eligibility date
    let eligibilityDate = employee.sickLeaveEligibilityDate
      ? new Date(employee.sickLeaveEligibilityDate)
      : computeSickEligibilityDate(startDate);
    
    // Update eligibility date if not set
    if (!employee.sickLeaveEligibilityDate) {
      await tx.employee.update({
        where: { id: employeeId },
        data: { sickLeaveEligibilityDate: eligibilityDate },
      });
    }
    
    // Not yet eligible
    if (asOfDate < eligibilityDate) {
      return {
        grantsApplied: 0,
        capClampApplied: false,
        newBalanceHours: Number(employee.sickLeaveBalance || 0),
        ledgerEntries: [],
      };
    }
    
    let currentBalance = Number(employee.sickLeaveBalance || 0);
    let lastGrantDate = employee.sickLeaveLastGrantDate
      ? new Date(employee.sickLeaveLastGrantDate)
      : null;
    
    const ledgerEntries: LeaveBalanceLedger[] = [];
    let grantsApplied = 0;
    let capClampApplied = false;
    
    // Calculate all pending grant dates
    const pendingGrantDates: Date[] = [];
    let nextGrant = computeNextSickGrantDate(eligibilityDate, lastGrantDate);
    
    while (nextGrant <= asOfDate) {
      pendingGrantDates.push(new Date(nextGrant));
      nextGrant = new Date(nextGrant);
      nextGrant.setMonth(nextGrant.getMonth() + SICK_LEAVE_GRANT_INTERVAL_MONTHS);
    }
    
    // Apply each pending grant
    for (const grantDate of pendingGrantDates) {
      const idempotencyKey = `SICK_GRANT:${employeeId}:${grantDate.toISOString().split('T')[0]}`;
      
      // Check if grant already exists (idempotency check)
      const existing = await tx.leaveBalanceLedger.findUnique({
        where: { idempotencyKey },
      });
      
      if (existing) {
        // Grant already applied, skip
        continue;
      }
      
      // Apply grant
      const newBalance = currentBalance + SICK_LEAVE_GRANT_HOURS;
      
      try {
        const entry = await tx.leaveBalanceLedger.create({
          data: {
            employeeId,
            companyId: employee.companyId,
            leaveType: 'SICK_LEAVE',
            eventType: 'GRANT',
            deltaHours: SICK_LEAVE_GRANT_HOURS,
            balanceAfter: newBalance,
            grantDate,
            idempotencyKey,
            description: `NZ Sick Leave Grant: 10 days (${lastGrantDate ? 'anniversary' : 'initial eligibility'})`,
            createdBy: actorId,
          },
        });
        
        ledgerEntries.push(entry);
        currentBalance = newBalance;
        lastGrantDate = grantDate;
        grantsApplied++;
      } catch (error: any) {
        // Unique constraint violation means another process created this grant
        if (error.code === 'P2002') {
          continue;
        }
        throw error;
      }
    }
    
    // Apply cap if balance exceeds 20 days (160 hours)
    if (currentBalance > SICK_LEAVE_CAP_HOURS) {
      const excessHours = currentBalance - SICK_LEAVE_CAP_HOURS;
      const clampIdempotencyKey = `SICK_CAP_CLAMP:${employeeId}:${asOfDate.toISOString().split('T')[0]}`;
      
      // Check if clamp already exists
      const existingClamp = await tx.leaveBalanceLedger.findUnique({
        where: { idempotencyKey: clampIdempotencyKey },
      });
      
      if (!existingClamp) {
        try {
          const clampEntry = await tx.leaveBalanceLedger.create({
            data: {
              employeeId,
              companyId: employee.companyId,
              leaveType: 'SICK_LEAVE',
              eventType: 'CAP_CLAMP',
              deltaHours: -excessHours,
              balanceAfter: SICK_LEAVE_CAP_HOURS,
              idempotencyKey: clampIdempotencyKey,
              description: `Balance capped at ${SICK_LEAVE_CAP_DAYS} days per NZ Holidays Act 2003`,
              createdBy: actorId,
            },
          });
          
          ledgerEntries.push(clampEntry);
          currentBalance = SICK_LEAVE_CAP_HOURS;
          capClampApplied = true;
        } catch (error: any) {
          if (error.code !== 'P2002') {
            throw error;
          }
        }
      }
    }
    
    // Update employee balance cache and last grant date
    if (grantsApplied > 0 || capClampApplied) {
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          sickLeaveBalance: currentBalance,
          sickLeaveLastGrantDate: lastGrantDate,
          leaveBalanceLastUpdated: new Date(),
        },
      });
    }
    
    return {
      grantsApplied,
      capClampApplied,
      newBalanceHours: currentBalance,
      ledgerEntries,
    };
  }, {
    // Serializable isolation for maximum safety
    isolationLevel: 'Serializable',
    timeout: 10000,
  });
}

// ============================================
// LEAVE USAGE
// ============================================

/**
 * Record sick leave usage in the ledger.
 * 
 * @param prisma - Prisma client instance
 * @param employeeId - The employee ID
 * @param hoursUsed - Hours of sick leave used
 * @param leaveRequestId - The leave request ID (for idempotency)
 * @param actorId - The user performing the action
 * @returns The updated balance in hours
 */
export async function recordSickLeaveUsage(
  prisma: PrismaClient,
  employeeId: string,
  hoursUsed: number,
  leaveRequestId: string,
  actorId?: string
): Promise<number> {
  if (hoursUsed <= 0) {
    throw new Error('Hours used must be positive');
  }
  
  return prisma.$transaction(async (tx) => {
    // NOTE: applySickLeaveGrants should be called BEFORE this function, not inside
    // because it starts its own transaction and can't be nested.
    // The caller is responsible for ensuring grants are applied first.
    
    // Row-level lock
    const employees = await tx.$queryRaw<EmployeeWithLeaveFields[]>`
      SELECT id, "companyId", "sickLeaveBalance"
      FROM "Employee"
      WHERE id = ${employeeId}
      FOR UPDATE
    `;
    
    if (employees.length === 0) {
      throw new Error(`Employee ${employeeId} not found`);
    }
    
    const employee = employees[0];
    const currentBalance = Number(employee.sickLeaveBalance || 0);
    const idempotencyKey = `SICK_USAGE:${leaveRequestId}`;
    
    // Check if usage already recorded
    const existing = await tx.leaveBalanceLedger.findUnique({
      where: { idempotencyKey },
    });
    
    if (existing) {
      // Usage already recorded, return current balance
      return currentBalance;
    }
    
    // Check sufficient balance
    if (currentBalance < hoursUsed) {
      throw new Error(
        `Insufficient sick leave balance. Available: ${hoursToDisplayDays(currentBalance)} days, ` +
        `Requested: ${hoursToDisplayDays(hoursUsed)} days`
      );
    }
    
    const newBalance = currentBalance - hoursUsed;
    
    await tx.leaveBalanceLedger.create({
      data: {
        employeeId,
        companyId: employee.companyId,
        leaveType: 'SICK_LEAVE',
        eventType: 'USAGE',
        deltaHours: -hoursUsed,
        balanceAfter: newBalance,
        idempotencyKey,
        sourceRef: leaveRequestId,
        description: `Sick leave taken: ${hoursToDisplayDays(hoursUsed)} days`,
        createdBy: actorId,
      },
    });
    
    await tx.employee.update({
      where: { id: employeeId },
      data: {
        sickLeaveBalance: newBalance,
        leaveBalanceLastUpdated: new Date(),
      },
    });
    
    return newBalance;
  });
}

/**
 * Reverse sick leave usage (e.g., when leave request is cancelled).
 * 
 * @param prisma - Prisma client instance
 * @param employeeId - The employee ID
 * @param leaveRequestId - The leave request ID
 * @param actorId - The user performing the action
 * @returns The updated balance in hours, or null if no usage to reverse
 */
export async function reverseSickLeaveUsage(
  prisma: PrismaClient,
  employeeId: string,
  leaveRequestId: string,
  actorId?: string
): Promise<number | null> {
  return prisma.$transaction(async (tx) => {
    const usageIdempotencyKey = `SICK_USAGE:${leaveRequestId}`;
    
    // Find the original usage entry
    const usageEntry = await tx.leaveBalanceLedger.findUnique({
      where: { idempotencyKey: usageIdempotencyKey },
    });
    
    if (!usageEntry) {
      // No usage recorded for this leave request
      return null;
    }
    
    const reversalIdempotencyKey = `SICK_USAGE_REVERSAL:${leaveRequestId}`;
    
    // Check if reversal already exists
    const existingReversal = await tx.leaveBalanceLedger.findUnique({
      where: { idempotencyKey: reversalIdempotencyKey },
    });
    
    if (existingReversal) {
      // Reversal already applied
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { sickLeaveBalance: true },
      });
      return Number(employee?.sickLeaveBalance || 0);
    }
    
    // Row-level lock
    const employees = await tx.$queryRaw<EmployeeWithLeaveFields[]>`
      SELECT id, "companyId", "sickLeaveBalance"
      FROM "Employee"
      WHERE id = ${employeeId}
      FOR UPDATE
    `;
    
    if (employees.length === 0) {
      throw new Error(`Employee ${employeeId} not found`);
    }
    
    const employee = employees[0];
    const hoursToRestore = Math.abs(Number(usageEntry.deltaHours));
    const currentBalance = Number(employee.sickLeaveBalance || 0);
    const newBalance = currentBalance + hoursToRestore;
    
    await tx.leaveBalanceLedger.create({
      data: {
        employeeId,
        companyId: employee.companyId,
        leaveType: 'SICK_LEAVE',
        eventType: 'ADJUSTMENT',
        deltaHours: hoursToRestore,
        balanceAfter: newBalance,
        idempotencyKey: reversalIdempotencyKey,
        sourceRef: leaveRequestId,
        description: `Sick leave restored (leave request cancelled): ${hoursToDisplayDays(hoursToRestore)} days`,
        createdBy: actorId,
      },
    });
    
    await tx.employee.update({
      where: { id: employeeId },
      data: {
        sickLeaveBalance: newBalance,
        leaveBalanceLastUpdated: new Date(),
      },
    });
    
    return newBalance;
  });
}

// ============================================
// UNIT CONVERSION & DISPLAY
// ============================================

/**
 * Convert hours to display days (rounded to 0.5 increments).
 */
export function hoursToDisplayDays(hours: number): number {
  const days = hours / HOURS_PER_DAY;
  return Math.round(days * 2) / 2; // Round to nearest 0.5
}

/**
 * Convert days to hours.
 */
export function daysToHours(days: number): number {
  return days * HOURS_PER_DAY;
}

/**
 * Format sick leave balance for display.
 */
export function formatSickLeaveBalance(hours: number): string {
  const days = hoursToDisplayDays(hours);
  if (days === 1) {
    return '1 day';
  }
  return `${days} days`;
}

// ============================================
// MIGRATION HELPERS
// ============================================

/**
 * Create an opening balance ledger entry for migration.
 * 
 * @param prisma - Prisma client instance
 * @param employeeId - The employee ID
 * @param balanceHours - Current balance in hours
 * @param actorId - The user performing the migration
 */
export async function createOpeningBalance(
  prisma: PrismaClient,
  employeeId: string,
  balanceHours: number,
  actorId?: string
): Promise<LeaveBalanceLedger> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { companyId: true, employmentStartDate: true, startDate: true },
  });
  
  if (!employee) {
    throw new Error(`Employee ${employeeId} not found`);
  }
  
  const idempotencyKey = `SICK_OPENING_BALANCE:${employeeId}`;
  
  // Check if opening balance already exists
  const existing = await prisma.leaveBalanceLedger.findUnique({
    where: { idempotencyKey },
  });
  
  if (existing) {
    return existing;
  }
  
  return prisma.leaveBalanceLedger.create({
    data: {
      employeeId,
      companyId: employee.companyId,
      leaveType: 'SICK_LEAVE',
      eventType: 'OPENING_BALANCE',
      deltaHours: balanceHours,
      balanceAfter: balanceHours,
      idempotencyKey,
      description: 'Opening balance from legacy system migration',
      createdBy: actorId,
    },
  });
}

/**
 * Get ledger history for an employee.
 */
export async function getSickLeaveLedgerHistory(
  prisma: PrismaClient,
  employeeId: string,
  limit: number = 50
): Promise<LeaveBalanceLedger[]> {
  return prisma.leaveBalanceLedger.findMany({
    where: {
      employeeId,
      leaveType: 'SICK_LEAVE',
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
