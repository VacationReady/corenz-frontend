-- AlterTable
ALTER TABLE "public"."Form" ADD COLUMN     "visibleToDepartments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "visibleToJobRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "visibleToRoles" "public"."Role"[] DEFAULT ARRAY['ADMIN', 'MANAGER', 'EMPLOYEE']::"public"."Role"[];
