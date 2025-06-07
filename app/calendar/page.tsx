import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options"; // Central authOptions file that points to backend
import { redirect } from "next/navigation";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>
      <p className="text-gray-700 text-sm">Your absence and event calendar will appear here soon.</p>
    </main>
  );
}
