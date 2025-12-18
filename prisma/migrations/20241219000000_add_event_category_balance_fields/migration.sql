-- AlterTable
ALTER TABLE "EventCategory" ADD COLUMN "balanceRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EventCategory" ADD COLUMN "defaultBalance" DOUBLE PRECISION;
ALTER TABLE "EventCategory" ADD COLUMN "balanceRefreshMonths" INTEGER;
