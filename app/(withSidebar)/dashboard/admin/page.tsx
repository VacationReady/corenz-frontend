'use client';

import { PageShell } from "@/components/ui/PageShell";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import Link from "next/link";

import {
  ClipboardList,
  Users,
  CalendarCheck2,
  Megaphone,
} from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <PageShell title="Admin Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* 1. Outstanding Requests */}
        <DashboardWidget title="Outstanding Requests" icon={ClipboardList}>
          <p className="text-2xl font-semibold">7</p>
          <p className="text-sm text-muted-foreground">Awaiting approval</p>
        </DashboardWidget>

        {/* 2. People Metrics */}
        <DashboardWidget title="People Metrics" icon={Users}>
          <ul className="space-y-1 text-sm">
            <li>Active Employees: <strong>42</strong></li>
            <li>Managers: <strong>5</strong></li>
            <li>New Starters This Month: <strong>3</strong></li>
          </ul>
        </DashboardWidget>

        {/* 3. Holiday Balance */}
        <DashboardWidget title="Holiday Balance" icon={CalendarCheck2}>
          <ul className="space-y-1 text-sm">
            <li>Total Entitlement: <strong>1200 days</strong></li>
            <li>Used: <strong>730 days</strong></li>
            <li>Remaining: <strong>470 days</strong></li>
          </ul>
        </DashboardWidget>

        {/* 4. Quick Actions */}
        <DashboardWidget title="Quick Actions" icon={Megaphone}>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="#" className="text-blue-600 hover:underline">Post News</Link>
            </li>
            <li>
              <Link href="#" className="text-blue-600 hover:underline">Start Survey</Link>
            </li>
            <li>
              <Link href="#" className="text-blue-600 hover:underline">Add Company Document</Link>
            </li>
            <li>
              <Link href="#" className="text-blue-600 hover:underline">Email Employee</Link>
            </li>
          </ul>
        </DashboardWidget>

      </div>
    </PageShell>
  );
}
