// app/dashboard/employee/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { useSession } from "next-auth/react";

interface HolidayEntitlement {
  id: string;
  totalDays: number;
  usedDays: number;
  carryoverDays: number;
  eventCategory: {
    id: string;
    name: string;
    color: string;
  };
}

export default function EmployeeDashboard() {
  const { data: session } = useSession();
  const [holidayBalance, setHolidayBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHolidayBalance = async () => {
      if (!session?.user?.id) return;

      try {
        // First get the employee ID from the user
        const employeeRes = await fetch(`/api/employees?userId=${session.user.id}`);
        if (!employeeRes.ok) return;

        const employees = await employeeRes.json();
        if (employees.length === 0) return;

        const employeeId = employees[0].id;

        // Then get the holiday entitlements
        const entitlementRes = await fetch(`/api/employees/${employeeId}/entitlement`);
        if (entitlementRes.ok) {
          const entitlements: HolidayEntitlement[] = await entitlementRes.json();

          // Find holiday entitlement
          const holidayEntitlement = entitlements.find(
            ent => ent.eventCategory.name.toLowerCase() === 'holiday'
          );

          if (holidayEntitlement) {
            const remainingDays = holidayEntitlement.totalDays - holidayEntitlement.usedDays;
            setHolidayBalance(remainingDays);
          }
        }
      } catch (error) {
        console.error("Error fetching holiday balance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHolidayBalance();
  }, [session]);

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
            {loading ? (
              <p className="text-sm text-neutral-400">Loading...</p>
            ) : holidayBalance !== null ? (
              <>
                <p className="text-3xl font-bold text-green-400">{holidayBalance} Days</p>
                <p className="text-xs text-neutral-400">Remaining in this year</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-400">0 Days</p>
                <p className="text-xs text-neutral-400">No holiday entitlement set</p>
              </>
            )}
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
            <p className="text-3xl font-bold text-yellow-400">0</p>
            <p className="text-xs text-neutral-400">No pending requests</p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
