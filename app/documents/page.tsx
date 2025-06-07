import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DocumentsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Documents</h1>
      {/* Content here */}
    </main>
  );
}
