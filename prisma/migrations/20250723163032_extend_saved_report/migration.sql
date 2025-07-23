-- AlterTable
ALTER TABLE "SavedReport" ADD COLUMN     "description" TEXT,
ADD COLUMN     "filters" JSONB,
ADD COLUMN     "pagination" JSONB,
ADD COLUMN     "sort" JSONB;
