import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-red-600">Not Logged In</h1>
        <p className="mt-2 text-gray-600">You need to be logged in to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-blue-700">My Profile</h1>
      <div className="mt-4 space-y-2 text-gray-800">
        <p><strong>Name:</strong> {session.user?.name || "N/A"}</p>
        <p><strong>Email:</strong> {session.user?.email || "N/A"}</p>
      </div>
    </div>
  );
}
