-- AlterTable
ALTER TABLE "public"."Employee" ADD COLUMN     "companyId" TEXT,
ALTER COLUMN "isActive" DROP DEFAULT;
