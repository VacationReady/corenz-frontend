-- Add optional note to blackout days
ALTER TABLE "BlackoutDay"
ADD COLUMN IF NOT EXISTS "note" TEXT;


