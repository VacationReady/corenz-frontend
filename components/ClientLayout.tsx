"use client";

import { SessionProvider } from "next-auth/react";
import ClientSidebarWrapper from "@/components/ClientSidebarWrapper";

export default function ClientLayout({ children, session }: { children: React.ReactNode; session?: any }) {
  return (
    <SessionProvider session={session}>
      <ClientSidebarWrapper />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </SessionProvider>
  );
}
