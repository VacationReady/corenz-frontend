"use client";
export const dynamic = "force-dynamic";

import ClientLayout from "@/components/ClientLayout";
import ClientDashboard from "./ClientDashboard";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <ClientLayout>
      <ClientDashboard />
    </ClientLayout>
  );
}
