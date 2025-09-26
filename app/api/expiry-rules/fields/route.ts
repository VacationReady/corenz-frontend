import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Curated list of supported expiry-capable date fields
// We keep this API read-only and additive to avoid breaking existing behaviour
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fields = [
    { id: "DriverLicence.expiryDate", entity: "DriverLicence", field: "expiryDate", label: "Driver Licence: Expiry Date", supportsFilters: ["departmentIds", "jobRoleIds"] },
    { id: "TrainingRecord.expiryDate", entity: "TrainingRecord", field: "expiryDate", label: "Training: Training Expiry Date", supportsFilters: ["departmentIds", "jobRoleIds", "courseId"] },
    { id: "EmploymentCheck.expiryDate", entity: "EmploymentCheck", field: "expiryDate", label: "Employment Check: Expiry Date", supportsFilters: ["departmentIds", "jobRoleIds", "typeOfCheck"] },
    { id: "Document.signatureDueAt", entity: "Document", field: "signatureDueAt", label: "Document: Signature Due At", supportsFilters: ["departmentIds", "jobRoleIds", "documentType"] },
    { id: "LeaveEntitlement.carryoverExpiry", entity: "LeaveEntitlement", field: "carryoverExpiry", label: "Leave Carryover: Expiry Date", supportsFilters: ["departmentIds", "jobRoleIds"] },
    { id: "EmployeeOffboarding.lastWorkingDate", entity: "EmployeeOffboarding", field: "lastWorkingDate", label: "Offboarding: Last Working Date", supportsFilters: ["departmentIds", "jobRoleIds"] },
  ];

  return NextResponse.json(fields);
}


