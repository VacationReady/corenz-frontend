"use client";

import ClientDashboard from "./ClientDashboard"; // ✅ local file import

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return <ClientDashboard />;
}
