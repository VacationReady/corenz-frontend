-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "canViewAdmin" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewEmployee" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewManager" BOOLEAN NOT NULL DEFAULT false;
