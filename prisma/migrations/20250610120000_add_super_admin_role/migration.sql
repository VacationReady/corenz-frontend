-- AlterEnum
DO $$
BEGIN
  ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
