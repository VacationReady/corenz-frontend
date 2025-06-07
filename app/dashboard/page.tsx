// app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ClientDashboard from "./ClientDashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-red-600">Not Logged In</h1>
        <p className="mt-2 text-gray-600">You need to be logged in to view this page.</p>
      </div>
    );
  }

  return <ClientDashboard />;
}
