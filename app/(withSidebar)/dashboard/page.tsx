"use client";
export const dynamic = "force-dynamic";

import ClientLayout from "@/components/ClientLayout";
import ClientDashboard from "./ClientDashboard";


export default function DashboardPage() {
  return (
    <ClientLayout>
      <ClientDashboard />
    </ClientLayout>
  );
}
