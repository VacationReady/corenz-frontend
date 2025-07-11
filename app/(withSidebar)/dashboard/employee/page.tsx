// app/dashboard/employee/page.tsx
"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";

export default function EmployeeDashboard() {
  return (
    <PageShell title="Welcome Back!">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold">Upcoming Leave</h3>
            <p className="text-sm text-neutral-400">No booked time off.</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold">Holiday Balance</h3>
            <p className="text-3xl font-bold text-green-400">12 Days</p>
            <p className="text-xs text-neutral-400">Remaining in this year</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold">Next 1:1 Meeting</h3>
            <p className="text-sm text-neutral-400">Not yet scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold">Pending Requests</h3>
            <p className="text-3xl font-bold text-yellow-400">1</p>
            <p className="text-xs text-neutral-400">Awaiting Manager Approval</p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
