-- AlterEnum
ALTER TYPE "TemplateType" ADD VALUE 'REVIEW_CYCLE';
ALTER TYPE "TemplateType" ADD VALUE 'THREE_SIXTY';

-- AlterTable
ALTER TABLE "PerformanceTemplate" ADD COLUMN "audienceFilters" JSONB;
ALTER TABLE "PerformanceTemplate" ADD COLUMN "reviewerAssignments" JSONB;
ALTER TABLE "PerformanceTemplate" ADD COLUMN "bestPracticePackIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
