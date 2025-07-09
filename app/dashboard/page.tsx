// app/dashboard/page.tsx

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect everyone to /dashboard/admin for debugging
    router.replace("/dashboard/admin");
  }, [router]);

  return null;
}
