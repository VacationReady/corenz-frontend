import { getServerSession } from "next-auth";

export default async function ProfilePage() {
  const session = await getServerSession();

  if (!session) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Not Logged In</h1>
        <p className="mt-2 text-gray-600">You need to be logged in to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <div className="mt-4 space-y-2">
        <p><strong>Name:</strong> {session.user?.name}</p>
        <p><strong>Email:</strong> {session.user?.email}</p>
      </div>
    </div>
  );
}
