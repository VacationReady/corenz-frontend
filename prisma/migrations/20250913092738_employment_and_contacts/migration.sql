-- AlterTable
ALTER TABLE "public"."Employee" ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "contractType" TEXT,
ADD COLUMN     "employmentType" TEXT,
ADD COLUMN     "hourlyRate" DECIMAL(10,2),
ADD COLUMN     "kiwiSaverContribution" INTEGER,
ADD COLUMN     "kiwiSaverEnrolled" BOOLEAN,
ADD COLUMN     "salaryAmount" DECIMAL(10,2),
ADD COLUMN     "siteLocation" TEXT,
ADD COLUMN     "taxCode" TEXT;

-- CreateTable
CREATE TABLE "public"."EmergencyContact" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "phone" TEXT,
    "email" TEXT,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmergencyContact_employeeId_idx" ON "public"."EmergencyContact"("employeeId");

-- AddForeignKey
ALTER TABLE "public"."EmergencyContact" ADD CONSTRAINT "EmergencyContact_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
