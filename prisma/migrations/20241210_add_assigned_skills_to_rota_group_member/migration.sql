-- Migration: Add assignedSkills to RotaGroupMember
-- Description: Allows tracking individual employee skills within a rota group

-- Add assignedSkills column to RotaGroupMember
ALTER TABLE "RotaGroupMember" ADD COLUMN "assignedSkills" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Comment
COMMENT ON COLUMN "RotaGroupMember"."assignedSkills" IS 'Skills this employee has for this specific rota group';
