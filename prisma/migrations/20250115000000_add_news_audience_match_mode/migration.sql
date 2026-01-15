-- Add audienceMatchMode field to NewsPost
-- Default is "ALL" (AND logic) - user must match ALL selected filters
-- "ANY" enables OR logic - user must match at least one filter

ALTER TABLE "NewsPost" ADD COLUMN "audienceMatchMode" TEXT NOT NULL DEFAULT 'ALL';
