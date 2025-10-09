-- AlterTable
ALTER TABLE "TemplateQuestion" ADD COLUMN     "visibleToRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "requiredFromRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "hideFromEmployee" BOOLEAN NOT NULL DEFAULT false;

