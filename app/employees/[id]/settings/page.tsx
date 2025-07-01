// app/employees/[id]/settings/page.tsx

import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

interface EmployeeSettingsPageProps {
  params: { id: string };
}

export default async function EmployeeSettingsPage({ params }: EmployeeSettingsPageProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const assignments = await prisma.employeeWorkingPatternAssignment.findMany({
    where: { employeeId: params.id },
    include: { workingPattern: true },
    orderBy: { effectiveDate: "desc" },
  });

  const current = assignments.find(a => a.effectiveDate <= today);
  const upcoming = assignments.find(a => a.effectiveDate > today);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Employee Settings</h1>
      <p>Manage the employee's settings, such as working patterns, documents, or permissions.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border rounded p-4 bg-white shadow">
          <h2 className="text-lg font-semibold mb-2">Current Working Pattern</h2>
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
        </div>

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
    </div>
  );
}
