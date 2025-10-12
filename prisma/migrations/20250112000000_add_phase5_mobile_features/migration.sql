-- Add offline support fields to ClockEntry
ALTER TABLE "ClockEntry" ADD COLUMN "localId" TEXT;
ALTER TABLE "ClockEntry" ADD COLUMN "syncedAt" TIMESTAMP(3);
ALTER TABLE "ClockEntry" ADD COLUMN "offlineCreated" BOOLEAN NOT NULL DEFAULT false;

-- Create index on localId
CREATE INDEX "ClockEntry_localId_idx" ON "ClockEntry"("localId");

-- CreateTable PushNotificationToken
CREATE TABLE "PushNotificationToken" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushNotificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushNotificationToken_employeeId_idx" ON "PushNotificationToken"("employeeId");

-- CreateIndex
CREATE INDEX "PushNotificationToken_token_idx" ON "PushNotificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PushNotificationToken_employeeId_deviceId_key" ON "PushNotificationToken"("employeeId", "deviceId");

-- AddForeignKey
ALTER TABLE "PushNotificationToken" ADD CONSTRAINT "PushNotificationToken_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
