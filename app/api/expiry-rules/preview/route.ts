import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// POST: Estimate matches for a selected date field and thresholds with optional filters
// Body: { fieldId: string, thresholds: number[], filters?: any }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { fieldId, thresholds, filters } = body || {};
    if (!fieldId || !Array.isArray(thresholds) || thresholds.length === 0) {
      return NextResponse.json({ error: "fieldId and thresholds are required" }, { status: 400 });
    }

    const companyId = session.user.companyId;
    const today = new Date();

    const maxDays = Math.max(...thresholds);
    const minDays = Math.min(...thresholds);

    // Compute lower/upper bounds (support negative thresholds for post-expiry)
    const lowerBound = new Date(today);
    lowerBound.setDate(today.getDate() + Math.min(0, minDays));
    const upperBound = new Date(today);
    upperBound.setDate(today.getDate() + Math.max(0, maxDays));

    let count = 0;

    // Simple curated router by field id
    if (fieldId === "DriverLicence.expiryDate") {
      count = await prisma.driverLicence.count({
        where: {
          Employee: { companyId },
          expiryDate: { gte: lowerBound, lte: upperBound },
        },
      });
    } else if (fieldId === "TrainingRecord.expiryDate") {
      count = await prisma.trainingRecord.count({
        where: {
          Employee: { companyId },
          expiryDate: { gte: lowerBound, lte: upperBound },
        },
      });
    } else if (fieldId === "EmploymentCheck.expiryDate") {
      const typeFilter = filters?.typeOfCheck && Array.isArray(filters.typeOfCheck) ? { in: filters.typeOfCheck } : undefined;
      count = await prisma.employmentCheck.count({
        where: {
          Employee: { companyId },
          ...(typeFilter ? { typeOfCheck: typeFilter } : {}),
          expiryDate: { gte: lowerBound, lte: upperBound },
        },
      });
    } else if (fieldId === "Document.signatureDueAt") {
      count = await prisma.documentSignatureEmployee.count({
        where: {
          Document: { Company: { id: companyId } },
          dueAt: { gte: lowerBound, lte: upperBound },
        },
      });
    } else if (fieldId === "LeaveEntitlement.carryoverExpiry") {
      count = await prisma.leaveEntitlement.count({
        where: {
          Company: { id: companyId },
          carryoverExpiry: { gte: lowerBound, lte: upperBound },
        },
      });
    } else if (fieldId === "EmployeeOffboarding.lastWorkingDate") {
      count = await prisma.employeeOffboarding.count({
        where: {
          Employee: { companyId },
          lastWorkingDate: { gte: lowerBound, lte: upperBound },
        },
      });
    } else {
      return NextResponse.json({ error: "Unsupported fieldId" }, { status: 400 });
    }

    return NextResponse.json({ count, thresholds });
  } catch (error) {
    console.error("[expiry-rules/preview] error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


