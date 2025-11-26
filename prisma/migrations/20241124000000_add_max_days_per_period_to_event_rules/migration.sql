-- Add rolling maximum days limit fields to EventRule
-- These fields allow setting a max number of days over a rolling period
-- e.g., max 5 days of compassionate leave over 12 months

ALTER TABLE "EventRule" ADD COLUMN "maxDaysPerPeriod" INTEGER;
ALTER TABLE "EventRule" ADD COLUMN "periodMonths" INTEGER;








