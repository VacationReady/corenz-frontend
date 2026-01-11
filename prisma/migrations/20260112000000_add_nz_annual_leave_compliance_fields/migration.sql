-- NZ Annual Leave Compliance Fields (Holidays Act 2003 - 12-month entitlement rule)
-- This migration adds fields to support the NZ Holidays Act 2003 requirement that
-- employees are not entitled to annual leave until 12 months after employment start.

-- Add futureAnnualLeaveEntitlement: Future annual leave entitlement (days) - granted at 12-month anniversary
ALTER TABLE "Employee" ADD COLUMN "futureAnnualLeaveEntitlement" DECIMAL(8,2);

-- Add annualLeaveEntitlementDate: Date when annual leave entitlement crystallises (12 months from start)
ALTER TABLE "Employee" ADD COLUMN "annualLeaveEntitlementDate" TIMESTAMP(3);

-- Add leaveInAdvanceUsed: Leave in advance taken before 12-month anniversary (days)
ALTER TABLE "Employee" ADD COLUMN "leaveInAdvanceUsed" DECIMAL(8,2) NOT NULL DEFAULT 0;

-- Add isCasualEmployee: Whether employee is casual (receives 8% holiday pay instead)
ALTER TABLE "Employee" ADD COLUMN "isCasualEmployee" BOOLEAN NOT NULL DEFAULT false;

-- Add casualToPermanentDate: Date casual status changed to permanent (for anniversary recalculation)
ALTER TABLE "Employee" ADD COLUMN "casualToPermanentDate" TIMESTAMP(3);
