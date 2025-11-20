-- AlterTable
ALTER TABLE "Form" ADD COLUMN "autoSave" BOOLEAN NOT NULL DEFAULT false;

-- Update existing DATA_SCREEN forms to have autoSave = true
UPDATE "Form" SET "autoSave" = true WHERE "formType" = 'DATA_SCREEN';

-- Comment: This migration adds the autoSave field to support consolidation of FORM and DATA_SCREEN types
-- DATA_SCREEN type is kept in the enum for backward compatibility but new forms should use FORM with autoSave flag
