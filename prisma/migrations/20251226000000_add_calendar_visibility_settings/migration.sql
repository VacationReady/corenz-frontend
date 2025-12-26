-- CreateEnum
CREATE TYPE "CalendarEmployeeScope" AS ENUM ('OWN', 'DEPARTMENT', 'COMPANY');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "calendarEmployeeScope" "CalendarEmployeeScope" NOT NULL DEFAULT 'DEPARTMENT';
