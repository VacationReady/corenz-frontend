-- CreateTable
CREATE TABLE "FieldMetadata" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "isReportable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldMetadata_pkey" PRIMARY KEY ("id")
);
