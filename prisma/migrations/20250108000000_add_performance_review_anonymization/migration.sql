-- Add anonymization support to performance reviews

-- Create enum for review types
CREATE TYPE "PerformanceReviewType" AS ENUM ('MANAGER_REVIEW', 'PEER_REVIEW', 'SELF_REVIEW', 'UPWARD_REVIEW', 'REVIEW_360');

-- Add new columns to EmployeePerformanceReview
ALTER TABLE "EmployeePerformanceReview" 
  ADD COLUMN "reviewType" "PerformanceReviewType" NOT NULL DEFAULT 'MANAGER_REVIEW',
  ADD COLUMN "isAnonymous" BOOLEAN NOT NULL DEFAULT false;

-- Create index for performance
CREATE INDEX "EmployeePerformanceReview_reviewType_isAnonymous_idx" ON "EmployeePerformanceReview"("reviewType", "isAnonymous");

-- Set existing reviews as manager reviews (non-anonymous)
UPDATE "EmployeePerformanceReview" 
SET "reviewType" = 'MANAGER_REVIEW', "isAnonymous" = false 
WHERE "reviewType" IS NULL;
