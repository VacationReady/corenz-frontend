"use client";
export const dynamic = "force-dynamic";

import ClientLayout from "@/components/ClientLayout";

export default function ProfilePage() {
  return (
    <ClientLayout>
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <p>This is your profile page.</p>
    </ClientLayout>
  );
}
