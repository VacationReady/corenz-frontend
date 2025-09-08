-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "permissionProfileId" TEXT,
ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';

-- AlterTable
ALTER TABLE "public"."Form" DROP COLUMN "visibleToRoles",
ADD COLUMN     "visibleToRoles" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "public"."PermissionProfile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "builtIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PermissionAudit" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "oldProfileId" TEXT,
    "newProfileId" TEXT NOT NULL,
    "oldPermissions" JSONB,
    "newPermissions" JSONB NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PermissionProfile_companyId_name_key" ON "public"."PermissionProfile"("companyId", "name");

-- CreateIndex
CREATE INDEX "PermissionAudit_employeeId_idx" ON "public"."PermissionAudit"("employeeId");

-- CreateIndex
CREATE INDEX "PermissionAudit_changedAt_idx" ON "public"."PermissionAudit"("changedAt");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_permissionProfileId_fkey" FOREIGN KEY ("permissionProfileId") REFERENCES "public"."PermissionProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PermissionProfile" ADD CONSTRAINT "PermissionProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PermissionAudit" ADD CONSTRAINT "PermissionAudit_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PermissionAudit" ADD CONSTRAINT "PermissionAudit_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PermissionAudit" ADD CONSTRAINT "PermissionAudit_oldProfileId_fkey" FOREIGN KEY ("oldProfileId") REFERENCES "public"."PermissionProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PermissionAudit" ADD CONSTRAINT "PermissionAudit_newProfileId_fkey" FOREIGN KEY ("newProfileId") REFERENCES "public"."PermissionProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

