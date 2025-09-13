-- CreateTable
CREATE TABLE "public"."EmploymentTypeOption" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EmploymentTypeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContractTypeOption" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContractTypeOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmploymentTypeOption_companyId_order_idx" ON "public"."EmploymentTypeOption"("companyId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentTypeOption_companyId_label_key" ON "public"."EmploymentTypeOption"("companyId", "label");

-- CreateIndex
CREATE INDEX "ContractTypeOption_companyId_order_idx" ON "public"."ContractTypeOption"("companyId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ContractTypeOption_companyId_label_key" ON "public"."ContractTypeOption"("companyId", "label");

-- AddForeignKey
ALTER TABLE "public"."EmploymentTypeOption" ADD CONSTRAINT "EmploymentTypeOption_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractTypeOption" ADD CONSTRAINT "ContractTypeOption_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
