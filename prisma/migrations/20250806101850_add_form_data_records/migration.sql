-- CreateEnum
CREATE TYPE "public"."FormType" AS ENUM ('SUBMISSION', 'DATA_SCREEN');

-- AlterTable
ALTER TABLE "public"."Form" ADD COLUMN     "formType" "public"."FormType" NOT NULL DEFAULT 'SUBMISSION';

-- CreateTable
CREATE TABLE "public"."FormDataRecord" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormDataRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormDataRecord_formId_employeeId_key" ON "public"."FormDataRecord"("formId", "employeeId");

-- AddForeignKey
ALTER TABLE "public"."FormDataRecord" ADD CONSTRAINT "FormDataRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FormDataRecord" ADD CONSTRAINT "FormDataRecord_formId_fkey" FOREIGN KEY ("formId") REFERENCES "public"."Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
