-- CreateEnum
CREATE TYPE "WorkingPatternType" AS ENUM ('STANDARD', 'SHIFT_BASED', 'FLEXIBLE', 'COMPRESSED');

-- AlterTable
ALTER TABLE "WorkingPattern" ADD COLUMN "patternType" "WorkingPatternType" NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "WorkingPattern" ADD COLUMN "contractedHoursPerWeek" DECIMAL(5,2);

-- CreateIndex
CREATE INDEX "WorkingPattern_companyId_patternType_idx" ON "WorkingPattern"("companyId", "patternType");

-- Comment on new fields
COMMENT ON COLUMN "WorkingPattern"."patternType" IS 'Pattern type: STANDARD (fixed schedule), SHIFT_BASED (no fixed days, gig workers/zero-hour), FLEXIBLE (hybrid), COMPRESSED (full-time in fewer days)';
COMMENT ON COLUMN "WorkingPattern"."contractedHoursPerWeek" IS 'Contracted hours per week for shift-based and flexible patterns (e.g., 20 for part-time, 40 for full-time)';

