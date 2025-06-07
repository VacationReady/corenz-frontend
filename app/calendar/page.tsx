import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <p className="p-6 text-red-500">Access Denied</p>;
  }

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>
      <p className="text-gray-700">This is the calendar page. Coming soon!</p>
    </main>
  );
}
