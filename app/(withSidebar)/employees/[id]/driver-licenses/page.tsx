"use client";

import { useParams } from "next/navigation";
import DriverLicenses from "@/components/employees/DriverLicenses"; // Path as appropriate

export default function DriverLicensesPage() {
  const params = useParams();
  const employeeIdRaw = params?.id ?? "";
  const employeeId = Array.isArray(employeeIdRaw)
    ? employeeIdRaw[0]
    : employeeIdRaw;

  return <DriverLicenses employeeId={employeeId} />;
}
