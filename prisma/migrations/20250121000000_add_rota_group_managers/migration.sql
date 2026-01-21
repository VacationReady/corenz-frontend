-- CreateTable
CREATE TABLE "RotaGroupManager" (
    "id" TEXT NOT NULL,
    "rotaGroupId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT,

    CONSTRAINT "RotaGroupManager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RotaGroupManager_rotaGroupId_idx" ON "RotaGroupManager"("rotaGroupId");

-- CreateIndex
CREATE INDEX "RotaGroupManager_employeeId_idx" ON "RotaGroupManager"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "RotaGroupManager_rotaGroupId_employeeId_key" ON "RotaGroupManager"("rotaGroupId", "employeeId");

-- AddForeignKey
ALTER TABLE "RotaGroupManager" ADD CONSTRAINT "RotaGroupManager_rotaGroupId_fkey" FOREIGN KEY ("rotaGroupId") REFERENCES "RotaGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotaGroupManager" ADD CONSTRAINT "RotaGroupManager_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
