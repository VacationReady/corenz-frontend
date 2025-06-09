"use client";

import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isProfilePage =
    pathname.startsWith("/employees/") &&
    pathname.split("/").length > 2;

  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-gray-100">
        {!isProfilePage && <Sidebar />}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </SessionProvider>
  );
}