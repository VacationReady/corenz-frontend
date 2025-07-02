-- AlterTable
ALTER TABLE "EventCategory" ADD COLUMN     "systemDefined" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EventSubcategory" ALTER COLUMN "updatedAt" DROP DEFAULT;
