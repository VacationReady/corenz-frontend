import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function DocumentsPage() {
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
      <h1 className="text-2xl font-bold">Documents</h1>
      <p className="text-gray-600 mt-2">This is the placeholder for the Documents module.</p>
    </div>
  );
}
