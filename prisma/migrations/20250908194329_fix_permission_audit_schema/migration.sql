-- DropForeignKey
ALTER TABLE "public"."PermissionAudit" DROP CONSTRAINT "PermissionAudit_newProfileId_fkey";

-- AlterTable
ALTER TABLE "public"."PermissionAudit" ALTER COLUMN "newProfileId" DROP NOT NULL,
ALTER COLUMN "newPermissions" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."PermissionAudit" ADD CONSTRAINT "PermissionAudit_newProfileId_fkey" FOREIGN KEY ("newProfileId") REFERENCES "public"."PermissionProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
