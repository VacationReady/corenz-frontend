-- CreateEnum
CREATE TYPE "CalendarEmployeeScope" AS ENUM ('OWN', 'DEPARTMENT', 'COMPANY');

-- CreateEnum
CREATE TYPE "CalendarManagerScope" AS ENUM ('DIRECT_REPORTS', 'DEPARTMENT', 'COMPANY');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "calendarEmployeeScope" "CalendarEmployeeScope" NOT NULL DEFAULT 'DEPARTMENT';
ALTER TABLE "Company" ADD COLUMN "calendarManagerScope" "CalendarManagerScope" NOT NULL DEFAULT 'DEPARTMENT';
