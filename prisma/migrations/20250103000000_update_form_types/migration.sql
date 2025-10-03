-- Update FormType enum: SUBMISSION → SURVEY, add FORM and TABLE types
-- This migration renames SUBMISSION to SURVEY and adds new form types

-- Step 1: Create new enum with all desired values
CREATE TYPE "FormType_new" AS ENUM ('SURVEY', 'FORM', 'TABLE', 'DATA_SCREEN');

-- Step 2: Update existing records: SUBMISSION → SURVEY
UPDATE "Form" SET "formType" = 'SURVEY'::text::"FormType" WHERE "formType" = 'SUBMISSION';

-- Step 3: Alter column to use new enum (with USING clause to handle conversion)
ALTER TABLE "Form" 
  ALTER COLUMN "formType" DROP DEFAULT,
  ALTER COLUMN "formType" TYPE "FormType_new" 
    USING (
      CASE 
        WHEN "formType"::text = 'SUBMISSION' THEN 'SURVEY'::

"FormType_new"
        WHEN "formType"::text = 'DATA_SCREEN' THEN 'DATA_SCREEN'::"FormType_new"
        ELSE 'FORM'::"FormType_new"
      END
    ),
  ALTER COLUMN "formType" SET DEFAULT 'FORM'::"FormType_new";

-- Step 4: Drop old enum and rename new one
DROP TYPE "FormType";
ALTER TYPE "FormType_new" RENAME TO "FormType";

