import { Suspense } from "react";
import { Card } from "@/components/ui/Card";

async function fetchDashboard() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/onboarding/dashboard`, {
    cache: "no-store",
  });
  if (!res.ok) {
    return { error: true } as any;
  }
  return res.json();
}

export default async function OnboardingDashboardPage() {
  const data = await fetchDashboard();

  if (data?.error) {
    return <div className="p-6">Failed to load onboarding dashboard.</div>;
  }

  const { summary, items } = data;

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Pending" >
          <div className="text-3xl font-bold">{summary?.pending ?? 0}</div>
        </Card>
        <Card title="In Progress" >
          <div className="text-3xl font-bold">{summary?.in_progress ?? 0}</div>
        </Card>
        <Card title="Overdue" >
          <div className="text-3xl font-bold text-red-600">{summary?.overdue ?? 0}</div>
        </Card>
      </div>

      <Card title="Active Onboarding Items">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-3">Employee</th>
                <th className="p-3">Template</th>
                <th className="p-3">Status</th>
                <th className="p-3">Started</th>
                <th className="p-3">Completed</th>
                <th className="p-3">Steps</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item: any) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3">{item.employee?.user?.firstName} {item.employee?.user?.lastName}</td>
                  <td className="p-3">{item.template?.name}</td>
                  <td className="p-3">{item.status}</td>
                  <td className="p-3">{item.startedAt ? new Date(item.startedAt).toLocaleDateString() : "-"}</td>
                  <td className="p-3">{item.completedAt ? new Date(item.completedAt).toLocaleDateString() : "-"}</td>
                  <td className="p-3">{item.stepsCompleted}/{item.stepsTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


