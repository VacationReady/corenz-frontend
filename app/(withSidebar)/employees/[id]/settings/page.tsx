// app/employees/[id]/settings/page.tsx

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Suspense } from "react";
import WorkingPatternAssignment from "@/components/WorkingPatternAssignment";
import { PermissionProfileManagement } from "@/components/employees/PermissionProfileManagement";

interface EmployeeSettingsPageProps {
  params: { id: string };
}

export default async function EmployeeSettingsPage({ params }: EmployeeSettingsPageProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get the employee with user information
  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { user: true },
  });

  if (!employee || !employee.user) {
    return <div>Employee not found</div>;
  }

  const assignments = await prisma.employeeWorkingPatternAssignment.findMany({
    where: { employeeId: params.id },
    include: { workingPattern: true },
    orderBy: { effectiveDate: "asc" },
  });

  const current = [...assignments]
    .filter(a => a.effectiveDate <= today)
    .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime())[0];

  const upcoming = [...assignments]
    .filter(a => a.effectiveDate > today)
    .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime())[0];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Employee Settings</h1>
      <p>Manage the employee's settings, such as working patterns, documents, or permissions.</p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Current Pattern */}
        <div className="border rounded p-4 bg-white shadow space-y-2">
          <h2 className="text-lg font-semibold">Current Working Pattern</h2>
          {current ? (
            <div>
              <p className="font-medium">{current.workingPattern.name}</p>
              <p className="text-sm text-gray-600">
                Effective from: {format(new Date(current.effectiveDate), "PPP")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">No current working pattern assigned.</p>
          )}

          {/* Only the Assign New Pattern button */}
          <div className="pt-2">
            <Suspense fallback={null}>
              <WorkingPatternAssignment employeeId={params.id} />
            </Suspense>
          </div>
        </div>

        {/* Upcoming Pattern */}
        <div className="border rounded p-4 bg-white shadow">
          <h2 className="text-lg font-semibold mb-2">Upcoming Working Pattern</h2>
          {upcoming ? (
            <div>
              <p className="font-medium">{upcoming.workingPattern.name}</p>
              <p className="text-sm text-gray-600">
                Effective from: {format(new Date(upcoming.effectiveDate), "PPP")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">No upcoming working pattern assigned.</p>
          )}
        </div>
      </div>

      {/* Permission Profile Management */}
      <div className="border rounded p-4 bg-white shadow">
        <h2 className="text-lg font-semibold mb-4">Permission Profile</h2>
        <Suspense fallback={<div className="text-sm text-gray-600">Loading permissions...</div>}>
          <PermissionProfileManagement employeeId={employee.user.id} />
        </Suspense>
      </div>
    </div>
  );
}
