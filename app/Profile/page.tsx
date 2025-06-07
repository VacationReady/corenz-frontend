// app/profile/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // path to your NextAuth config

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <p>You need to be logged in to view this page.</p>;
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">My Profile</h1>
      <p className="mt-2">Name: {session.user?.name}</p>
      <p>Email: {session.user?.email}</p>
    </div>
  );
}
