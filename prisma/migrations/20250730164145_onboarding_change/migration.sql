-- CreateTable
CREATE TABLE "OnboardingStepResponse" (
    "id" TEXT NOT NULL,
    "onboardingStepInstanceId" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingStepResponse_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OnboardingStepResponse" ADD CONSTRAINT "OnboardingStepResponse_onboardingStepInstanceId_fkey" FOREIGN KEY ("onboardingStepInstanceId") REFERENCES "OnboardingStepInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
