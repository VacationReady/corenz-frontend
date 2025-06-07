import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      <p>Welcome, {session.user?.name || "user"}!</p>
    </main>
  );
}
