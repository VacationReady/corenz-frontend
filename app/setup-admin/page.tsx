import { Suspense } from "react";
import SetupAdminClient from "./SetupAdminClient";

export const metadata = {
  title: "Admin Setup | PeopleCore",
  description: "Set up your initial administrator account for PeopleCore",
};

export default function SetupAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <SetupAdminClient />
    </Suspense>
  );
}

