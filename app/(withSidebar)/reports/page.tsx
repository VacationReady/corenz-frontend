"use client";
export const dynamic = "force-dynamic";

import ClientLayout from "@/components/ClientLayout";

export default function ReportsPage() {
  return (
    <ClientLayout>
      <main className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>
        <p>This is your reports dashboard.</p>
      </main>
  );
}
