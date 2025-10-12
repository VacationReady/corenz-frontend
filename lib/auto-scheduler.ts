import { differenceInHours, areIntervalsOverlapping, addDays } from 'date-fns';

export interface ShiftRequirement {
  startTime: Date;
  endTime: Date;
  role?: string;
  requiredSkills: string[];
  locationId?: string;
  departmentId?: string;
  breakDuration: number;
  minStaffing: number;
}

export interface EmployeeProfile {
  id: string;
  name: string;
  skills: string[];
  hourlyRate: number;
  maxHoursPerWeek: number;
  preferredShifts: string[]; // ['morning', 'afternoon', 'night']
  availabilityPatterns: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>;
  currentWeekHours: number;
  recentShifts: Array<{
    startTime: Date;
    endTime: Date;
    role?: string;
  }>;
}

export interface ScheduleConstraints {
  minimumRestHours: number;
  maxHoursPerWeek: number;
  laborBudget?: number;
  fairDistribution: boolean;
}

export interface ShiftAssignment {
  shiftRequirement: ShiftRequirement;
  employeeId: string;
  employeeName: string;
  cost: number;
  confidence: number; // 0-100
  score: number;
}

export interface ScheduleResult {
  assignments: ShiftAssignment[];
  unassignedShifts: ShiftRequirement[];
  conflicts: string[];
  totalCost: number;
  utilizationByEmployee: Map<string, number>;
}

/**
 * Auto-schedule shifts using intelligent assignment algorithm
 */
export function autoScheduleShifts(
  requirements: ShiftRequirement[],
  employees: EmployeeProfile[],
  constraints: ScheduleConstraints
): ScheduleResult {
  const assignments: ShiftAssignment[] = [];
  const unassignedShifts: ShiftRequirement[] = [];
  const conflicts: string[] = [];
  let totalCost = 0;
  const employeeHours = new Map<string, number>();

  // Initialize employee hours
  employees.forEach((emp) => {
    employeeHours.set(emp.id, emp.currentWeekHours);
  });

  // Sort requirements by priority (earlier shifts first)
  const sortedRequirements = [...requirements].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  // Assign each shift
  for (const requirement of sortedRequirements) {
    const candidates = findSuitableCandidates(
      requirement,
      employees,
      assignments,
      employeeHours,
      constraints
    );

    if (candidates.length === 0) {
      unassignedShifts.push(requirement);
      conflicts.push(
        `No suitable employee found for shift at ${requirement.startTime.toLocaleString()}`
      );
      continue;
    }

    // Check if we need multiple staff
    const assignmentsNeeded = Math.min(
      requirement.minStaffing || 1,
      candidates.length
    );

    for (let i = 0; i < assignmentsNeeded; i++) {
      const candidate = candidates[i];
      const employee = employees.find((e) => e.id === candidate.employeeId)!;

      const shiftHours = differenceInHours(requirement.endTime, requirement.startTime);
      const cost = calculateShiftCost(shiftHours, requirement.breakDuration, employee.hourlyRate);

      assignments.push({
        shiftRequirement: requirement,
        employeeId: candidate.employeeId,
        employeeName: candidate.employeeName,
        cost,
        confidence: candidate.confidence,
        score: candidate.score,
      });

      // Update employee hours
      const currentHours = employeeHours.get(candidate.employeeId) || 0;
      employeeHours.set(candidate.employeeId, currentHours + shiftHours);

      totalCost += cost;
    }
  }

  return {
    assignments,
    unassignedShifts,
    conflicts,
    totalCost,
    utilizationByEmployee: employeeHours,
  };
}

/**
 * Find suitable candidates for a shift
 */
function findSuitableCandidates(
  requirement: ShiftRequirement,
  employees: EmployeeProfile[],
  existingAssignments: ShiftAssignment[],
  employeeHours: Map<string, number>,
  constraints: ScheduleConstraints
): Array<{
  employeeId: string;
  employeeName: string;
  score: number;
  confidence: number;
}> {
  const candidates = [];

  for (const employee of employees) {
    const score = scoreEmployeeForShift(
      employee,
      requirement,
      existingAssignments,
      employeeHours,
      constraints
    );

    if (score.isEligible) {
      candidates.push({
        employeeId: employee.id,
        employeeName: employee.name,
        score: score.totalScore,
        confidence: score.confidence,
      });
    }
  }

  // Sort by score (highest first)
  candidates.sort((a, b) => b.score - a.score);

  return candidates;
}

/**
 * Score an employee for a shift assignment
 */
function scoreEmployeeForShift(
  employee: EmployeeProfile,
  requirement: ShiftRequirement,
  existingAssignments: ShiftAssignment[],
  employeeHours: Map<string, number>,
  constraints: ScheduleConstraints
): {
  isEligible: boolean;
  totalScore: number;
  confidence: number;
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {};
  let totalScore = 0;
  let confidence = 100;

  // Check hard constraints (eligibility)
  
  // 1. Skills match
  const hasRequiredSkills = requirement.requiredSkills.every((skill) =>
    employee.skills.includes(skill)
  );
  
  if (!hasRequiredSkills) {
    return { isEligible: false, totalScore: 0, confidence: 0, breakdown };
  }

  // 2. Check for double booking
  const employeeAssignments = existingAssignments.filter(
    (a) => a.employeeId === employee.id
  );

  const hasConflict = employeeAssignments.some((assignment) =>
    areIntervalsOverlapping(
      { start: requirement.startTime, end: requirement.endTime },
      { start: assignment.shiftRequirement.startTime, end: assignment.shiftRequirement.endTime }
    )
  );

  if (hasConflict) {
    return { isEligible: false, totalScore: 0, confidence: 0, breakdown };
  }

  // 3. Check rest periods
  const lastShift = employeeAssignments
    .sort((a, b) => b.shiftRequirement.endTime.getTime() - a.shiftRequirement.endTime.getTime())[0];

  if (lastShift) {
    const restHours = differenceInHours(
      requirement.startTime,
      lastShift.shiftRequirement.endTime
    );

    if (restHours < constraints.minimumRestHours) {
      return { isEligible: false, totalScore: 0, confidence: 0, breakdown };
    }
  }

  // 4. Check max hours
  const shiftHours = differenceInHours(requirement.endTime, requirement.startTime);
  const currentHours = employeeHours.get(employee.id) || 0;
  const projectedHours = currentHours + shiftHours;

  if (projectedHours > employee.maxHoursPerWeek) {
    return { isEligible: false, totalScore: 0, confidence: 0, breakdown };
  }

  // Soft constraints (scoring)

  // Availability match (+10)
  const dayOfWeek = requirement.startTime.getDay();
  const pattern = employee.availabilityPatterns.find((p) => p.dayOfWeek === dayOfWeek);
  
  if (pattern && pattern.isAvailable) {
    breakdown.availability = 10;
    totalScore += 10;
  } else {
    confidence -= 20;
  }

  // Skills exact match (+8)
  if (hasRequiredSkills) {
    breakdown.skills = 8;
    totalScore += 8;
  }

  // Preferred shift time (+5)
  const shiftHour = requirement.startTime.getHours();
  const shiftType = getShiftType(shiftHour);
  
  if (employee.preferredShifts.includes(shiftType)) {
    breakdown.preferred = 5;
    totalScore += 5;
  }

  // Under max hours (+3)
  const hoursUtilization = projectedHours / employee.maxHoursPerWeek;
  if (hoursUtilization < 0.8) {
    breakdown.capacity = 3;
    totalScore += 3;
  }

  // Recent similar shift experience (+2)
  const hasSimilarRecent = employee.recentShifts.some((shift) => {
    const recentHour = shift.startTime.getHours();
    const recentType = getShiftType(recentHour);
    return recentType === shiftType && shift.role === requirement.role;
  });

  if (hasSimilarRecent) {
    breakdown.experience = 2;
    totalScore += 2;
  }

  // Fair distribution bonus (+4)
  // Prefer employees with fewer hours
  if (constraints.fairDistribution) {
    const avgHours = Array.from(employeeHours.values()).reduce((a, b) => a + b, 0) / employeeHours.size;
    if (currentHours < avgHours) {
      breakdown.fairDistribution = 4;
      totalScore += 4;
    }
  }

  return {
    isEligible: true,
    totalScore,
    confidence,
    breakdown,
  };
}

/**
 * Get shift type based on hour
 */
function getShiftType(hour: number): string {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Calculate shift cost
 */
function calculateShiftCost(
  shiftHours: number,
  breakMinutes: number,
  hourlyRate: number
): number {
  const workHours = shiftHours - breakMinutes / 60;
  return workHours * hourlyRate;
}

/**
 * Optimize schedule for cost
 */
export function optimizeScheduleForCost(
  result: ScheduleResult,
  employees: EmployeeProfile[],
  laborBudget?: number
): {
  optimized: boolean;
  savings: number;
  adjustments: string[];
} {
  const adjustments: string[] = [];
  let savings = 0;

  if (!laborBudget || result.totalCost <= laborBudget) {
    return { optimized: false, savings: 0, adjustments };
  }

  // Sort assignments by cost (highest first)
  const sortedAssignments = [...result.assignments].sort((a, b) => b.cost - a.cost);

  for (const assignment of sortedAssignments) {
    // Try to find cheaper alternative
    const currentEmployee = employees.find((e) => e.id === assignment.employeeId);
    const cheaperEmployees = employees.filter(
      (e) => e.hourlyRate < (currentEmployee?.hourlyRate || 0)
    );

    // Check if any cheaper employee can take this shift
    // This is simplified - in practice, would need full constraint checking
    if (cheaperEmployees.length > 0) {
      const savings_per_shift = assignment.cost - (cheaperEmployees[0].hourlyRate * differenceInHours(assignment.shiftRequirement.endTime, assignment.shiftRequirement.startTime));
      savings += savings_per_shift;
      adjustments.push(
        `Replace ${assignment.employeeName} with ${cheaperEmployees[0].name} (save $${savings_per_shift.toFixed(2)})`
      );
    }

    if (result.totalCost - savings <= laborBudget) {
      break;
    }
  }

  return {
    optimized: savings > 0,
    savings,
    adjustments,
  };
}
