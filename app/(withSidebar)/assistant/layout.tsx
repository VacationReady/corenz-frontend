import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-options";

export default async function AssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Only ADMIN and SUPER_ADMIN can access the AI assistant
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}
