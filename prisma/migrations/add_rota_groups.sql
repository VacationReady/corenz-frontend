-- Migration: Add Rota Groups / Scheduling Pools
-- Description: Introduces workforce management concepts for better shift worker segmentation

-- Create RotaGroup model
CREATE TABLE "RotaGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "locationId" TEXT,
    "departmentId" TEXT,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "optionalTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "RotaGroup_companyId_name_key" UNIQUE ("companyId", "name")
);

-- Create RotaGroupMember model (many-to-many: employees <-> groups)
CREATE TABLE "RotaGroupMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rotaGroupId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT,
    
    CONSTRAINT "RotaGroupMember_rotaGroupId_employeeId_key" UNIQUE ("rotaGroupId", "employeeId")
);

-- Create ShiftRequirement model (staffing needs per group)
CREATE TABLE "ShiftRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "rotaGroupId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
    "startTime" TEXT NOT NULL, -- HH:MM format
    "endTime" TEXT NOT NULL, -- HH:MM format
    "role" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL', -- CRITICAL, HIGH, NORMAL, LOW
    "breakDuration" INTEGER DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Add rotaGroupId to Shift model
ALTER TABLE "Shift" ADD COLUMN "rotaGroupId" TEXT;

-- Add rotaGroupId to ShiftTemplate model
ALTER TABLE "ShiftTemplate" ADD COLUMN "rotaGroupId" TEXT;

-- Create indexes for performance
CREATE INDEX "RotaGroup_companyId_isActive_idx" ON "RotaGroup"("companyId", "isActive");
CREATE INDEX "RotaGroup_locationId_idx" ON "RotaGroup"("locationId");
CREATE INDEX "RotaGroup_departmentId_idx" ON "RotaGroup"("departmentId");

CREATE INDEX "RotaGroupMember_rotaGroupId_idx" ON "RotaGroupMember"("rotaGroupId");
CREATE INDEX "RotaGroupMember_employeeId_idx" ON "RotaGroupMember"("employeeId");
CREATE INDEX "RotaGroupMember_isActive_idx" ON "RotaGroupMember"("isActive");

CREATE INDEX "ShiftRequirement_rotaGroupId_idx" ON "ShiftRequirement"("rotaGroupId");
CREATE INDEX "ShiftRequirement_companyId_isActive_idx" ON "ShiftRequirement"("companyId", "isActive");
CREATE INDEX "ShiftRequirement_dayOfWeek_idx" ON "ShiftRequirement"("dayOfWeek");

CREATE INDEX "Shift_rotaGroupId_idx" ON "Shift"("rotaGroupId");
CREATE INDEX "ShiftTemplate_rotaGroupId_idx" ON "ShiftTemplate"("rotaGroupId");

-- Add foreign key constraints
ALTER TABLE "RotaGroupMember" ADD CONSTRAINT "RotaGroupMember_rotaGroupId_fkey" 
    FOREIGN KEY ("rotaGroupId") REFERENCES "RotaGroup"("id") ON DELETE CASCADE;

ALTER TABLE "ShiftRequirement" ADD CONSTRAINT "ShiftRequirement_rotaGroupId_fkey" 
    FOREIGN KEY ("rotaGroupId") REFERENCES "RotaGroup"("id") ON DELETE CASCADE;

ALTER TABLE "Shift" ADD CONSTRAINT "Shift_rotaGroupId_fkey" 
    FOREIGN KEY ("rotaGroupId") REFERENCES "RotaGroup"("id") ON DELETE SET NULL;

ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_rotaGroupId_fkey" 
    FOREIGN KEY ("rotaGroupId") REFERENCES "RotaGroup"("id") ON DELETE SET NULL;

-- Seed example data (optional - comment out if not needed)
-- INSERT INTO "RotaGroup" ("id", "companyId", "name", "description", "roles", "color", "icon", "displayOrder")
-- VALUES 
--     ('example-1', 'YOUR_COMPANY_ID', 'Store #21 – Front of House', 'Customer-facing retail staff', ARRAY['Cashier', 'Supervisor', 'Barista'], '#3B82F6', '🏪', 1),
--     ('example-2', 'YOUR_COMPANY_ID', 'Warehouse – Night Shift', 'Night warehouse operations', ARRAY['Picker', 'Packer', 'Forklift Operator'], '#8B5CF6', '🏭', 2),
--     ('example-3', 'YOUR_COMPANY_ID', 'ICU – Registered Nurses Band 5', 'Critical care nursing staff', ARRAY['RN', 'Charge Nurse'], '#10B981', '🏥', 3);

-- Comments
COMMENT ON TABLE "RotaGroup" IS 'Scheduling pools that group employees by location, department, role, and skills for efficient shift management';
COMMENT ON TABLE "RotaGroupMember" IS 'Assignment of employees to rota groups with specific roles they can fulfill';
COMMENT ON TABLE "ShiftRequirement" IS 'Staffing demand per role per day for capacity planning and coverage gaps detection';
COMMENT ON COLUMN "RotaGroup"."roles" IS 'List of job roles within this group (e.g., Cashier, Supervisor)';
COMMENT ON COLUMN "RotaGroup"."requiredSkills" IS 'Skills required for all members (e.g., POS System, Cash Handling)';
COMMENT ON COLUMN "RotaGroup"."optionalTags" IS 'Additional qualifications or certifications (e.g., Forklift, Key Holder, ACLS)';
COMMENT ON COLUMN "ShiftRequirement"."priority" IS 'Urgency of filling this requirement: CRITICAL, HIGH, NORMAL, LOW';
COMMENT ON COLUMN "ShiftRequirement"."quantity" IS 'Number of employees needed for this role in this time slot';
