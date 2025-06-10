"use client"; // 👈 REQUIRED so we can use React Context like SessionProvider

import { SessionProvider } from "next-auth/react";
import ClientLayout from "@/components/ClientLayout";
import { ReactNode } from "react";

export default function WithSidebarLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ClientLayout>
        {children}
      </ClientLayout>
    </SessionProvider>
  );
}
