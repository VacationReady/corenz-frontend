// lib/accrualEngine.ts
import { prisma } from "@/lib/prisma";
import { differenceInDays, differenceInYears, startOfYear, endOfYear, addMonths, addDays } from "date-fns";

interface ServiceLengthTier {
  minYears: number;
  maxYears?: number;
  accrualRate: number;
}

interface AccrualCalculation {
  baseEntitlement: number;
  proRatedEntitlement: number;
  serviceLengthTier?: ServiceLengthTier;
  calculationMethod: string;
  effectivePolicy?: {
    id: string;
    name: string;
    allowNegativeBalance: boolean;
  };
}

/**
 * Calculate leave entitlement for an employee using Leave Policies
 * Falls back to existing behavior if no policy applies
 */
export async function calculateLeaveEntitlement({
  employeeId,
  eventCategoryId,
  companyId,
  calculationDate = new Date()
}: {
  employeeId: string;
  eventCategoryId: string;
  companyId: string;
  calculationDate?: Date;
}): Promise<AccrualCalculation> {
  
  // Get employee details
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId },
    select: {
      startDate: true,
      departmentId: true,
      jobRoleId: true,
      locationId: true
    }
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  // Find applicable leave policies
  const applicablePolicies = await findApplicableLeavePolicies({
    employeeId,
    eventCategoryId,
    companyId,
    employee,
    calculationDate
  });

  // If no Leave Policy applies, fall back to existing behavior
  if (applicablePolicies.length === 0) {
    return {
      baseEntitlement: 0,
      proRatedEntitlement: 0,
      calculationMethod: "legacy_fallback",
    };
  }

  // Use the highest priority policy
  const policy = applicablePolicies[0];

  // Calculate service length if employee has start date
  let serviceLengthYears = 0;
  if (employee.startDate) {
    serviceLengthYears = differenceInYears(calculationDate, employee.startDate);
  }

  // Determine accrual rate based on service length tiers
  let accrualRate = policy.accrualRate;
  let applicableTier: ServiceLengthTier | undefined;

  if (policy.serviceLengthTiers && Array.isArray(policy.serviceLengthTiers)) {
    for (const tier of policy.serviceLengthTiers as ServiceLengthTier[]) {
      if (serviceLengthYears >= tier.minYears && 
          (tier.maxYears === undefined || serviceLengthYears < tier.maxYears)) {
        accrualRate = tier.accrualRate;
        applicableTier = tier;
        break;
      }
    }
  }

  // Calculate base entitlement (annual)
  let baseEntitlement = accrualRate;
  
  // Convert based on accrual period
  switch (policy.accrualPeriod) {
    case "WEEKLY":
      baseEntitlement = accrualRate * 52;
      break;
    case "MONTHLY":
      baseEntitlement = accrualRate * 12;
      break;
    case "QUARTERLY":
      baseEntitlement = accrualRate * 4;
      break;
    case "ANNUALLY":
      baseEntitlement = accrualRate;
      break;
  }

  // Calculate pro-rated entitlement if proration is enabled
  let proRatedEntitlement = baseEntitlement;
  
  if (policy.enableProration && employee.startDate) {
    proRatedEntitlement = calculateProRatedEntitlement({
      baseEntitlement,
      startDate: employee.startDate,
      calculationDate,
      prorationMethod: policy.prorationMethod
    });
  }

  return {
    baseEntitlement,
    proRatedEntitlement,
    serviceLengthTier: applicableTier,
    calculationMethod: "leave_policy",
    effectivePolicy: {
      id: policy.id,
      name: policy.name,
      allowNegativeBalance: policy.allowNegativeBalance
    }
  };
}

/**
 * Find applicable leave policies for an employee
 */
async function findApplicableLeavePolicies({
  employeeId,
  eventCategoryId,
  companyId,
  employee,
  calculationDate
}: {
  employeeId: string;
  eventCategoryId: string;
  companyId: string;
  employee: { departmentId: string | null; jobRoleId: string | null; locationId: string | null };
  calculationDate: Date;
}) {
  const assignments = await prisma.leavePolicyAssignment.findMany({
    where: {
      companyId,
      // Check if assignment applies to this employee
      OR: [
        // Specific employee assignment
        { employeeIds: { has: employeeId } },
        // Department assignment
        ...(employee.departmentId ? [{ departmentIds: { has: employee.departmentId } }] : []),
        // Job role assignment
        ...(employee.jobRoleId ? [{ jobRoleIds: { has: employee.jobRoleId } }] : []),
        // Location assignment
        ...(employee.locationId ? [{ locationIds: { has: employee.locationId } }] : []),
      ],
      // Active assignments only
      effectiveFrom: { lte: calculationDate },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: calculationDate } }
      ]
    },
    include: {
      leavePolicy: {
        where: {
          eventCategoryId,
          isActive: true,
          effectiveFrom: { lte: calculationDate },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: calculationDate } }
          ]
        }
      }
    },
    orderBy: [
      { priority: "desc" }, // Higher priority first
      { effectiveFrom: "desc" }
    ]
  });

  // Filter out assignments where the leave policy doesn't match or is inactive
  return assignments
    .filter(assignment => assignment.leavePolicy)
    .map(assignment => assignment.leavePolicy!);
}

/**
 * Calculate pro-rated entitlement based on start date and proration method
 */
function calculateProRatedEntitlement({
  baseEntitlement,
  startDate,
  calculationDate,
  prorationMethod
}: {
  baseEntitlement: number;
  startDate: Date;
  calculationDate: Date;
  prorationMethod: string;
}): number {
  
  const yearStart = startOfYear(calculationDate);
  const yearEnd = endOfYear(calculationDate);
  const totalDaysInYear = differenceInDays(yearEnd, yearStart) + 1;
  
  // If started before this year, no proration needed
  if (startDate < yearStart) {
    return baseEntitlement;
  }
  
  // If started after calculation date, return 0
  if (startDate > calculationDate) {
    return 0;
  }

  switch (prorationMethod) {
    case "DAILY":
      const remainingDays = differenceInDays(yearEnd, startDate) + 1;
      return (baseEntitlement * remainingDays) / totalDaysInYear;
      
    case "WEEKLY":
      const remainingWeeks = Math.ceil(differenceInDays(yearEnd, startDate) / 7);
      const totalWeeks = 52;
      return (baseEntitlement * remainingWeeks) / totalWeeks;
      
    case "MONTHLY":
      const startMonth = startDate.getMonth();
      const remainingMonths = 12 - startMonth;
      return (baseEntitlement * remainingMonths) / 12;
      
    case "NONE":
    default:
      return baseEntitlement;
  }
}

/**
 * Check if an employee's leave policy allows negative balance
 */
export async function checkNegativeBalanceAllowed({
  employeeId,
  eventCategoryId,
  companyId
}: {
  employeeId: string;
  eventCategoryId: string;
  companyId: string;
}): Promise<boolean> {
  
  const calculation = await calculateLeaveEntitlement({
    employeeId,
    eventCategoryId,
    companyId
  });

  // If using Leave Policy system and policy allows negative balance
  if (calculation.effectivePolicy) {
    return calculation.effectivePolicy.allowNegativeBalance;
  }

  // Default to false for legacy behavior
  return false;
}
