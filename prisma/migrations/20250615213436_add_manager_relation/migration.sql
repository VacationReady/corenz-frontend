-- Add managerId column to Employee table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Employee' AND column_name = 'managerId'
  ) THEN
    ALTER TABLE "Employee"
    ADD COLUMN "managerId" TEXT;
  END IF;
END$$;

-- Create index on managerId if not exists
CREATE INDEX IF NOT EXISTS "Employee_managerId_idx" ON "Employee"("managerId");

-- Add FK for managerId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'Employee' AND constraint_name = 'Employee_managerId_fkey'
  ) THEN
    ALTER TABLE "Employee"
    ADD CONSTRAINT "Employee_managerId_fkey"
    FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL;
  END IF;
END$$;

-- Add reviewedAt to LeaveRequest if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'LeaveRequest' AND column_name = 'reviewedAt'
  ) THEN
    ALTER TABLE "LeaveRequest"
    ADD COLUMN "reviewedAt" TIMESTAMP(3);
  END IF;
END$$;

-- Add reviewerId to LeaveRequest if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'LeaveRequest' AND column_name = 'reviewerId'
  ) THEN
    ALTER TABLE "LeaveRequest"
    ADD COLUMN "reviewerId" TEXT;
  END IF;
END$$;

-- Create index for reviewerId
CREATE INDEX IF NOT EXISTS "LeaveRequest_reviewerId_idx" ON "LeaveRequest"("reviewerId");

-- Add FK for reviewerId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'LeaveRequest' AND constraint_name = 'LeaveRequest_reviewerId_fkey'
  ) THEN
    ALTER TABLE "LeaveRequest"
    ADD CONSTRAINT "LeaveRequest_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "Employee"("id") ON DELETE SET NULL;
  END IF;
END$$;

-- Add userId to ActivationToken if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ActivationToken' AND column_name = 'userId'
  ) THEN
    ALTER TABLE "ActivationToken"
    ADD COLUMN "userId" TEXT NOT NULL;
  END IF;
END$$;

-- Create index for ActivationToken.userId
CREATE INDEX IF NOT EXISTS "ActivationToken_userId_idx" ON "ActivationToken"("userId");

-- Add FK for ActivationToken.userId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'ActivationToken' AND constraint_name = 'ActivationToken_userId_fkey'
  ) THEN
    ALTER TABLE "ActivationToken"
    ADD CONSTRAINT "ActivationToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END$$;
