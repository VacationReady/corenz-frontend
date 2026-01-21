-- Add startDayType and endDayType for multi-day leave bookings with half-day start/end
-- These fields allow booking leave like "Start afternoon Monday, end morning Friday"

ALTER TABLE "LeaveRequest" ADD COLUMN "startDayType" "DayType";
ALTER TABLE "LeaveRequest" ADD COLUMN "endDayType" "DayType";
