// app/layout.tsx
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";

export const metadata = {
  title: "CoreNZ",
  description: "HR system for NZ businesses",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  // Hide the global sidebar for employee profile views
  const isProfilePage = pathname.startsWith("/employees/") && pathname.split("/").length > 2;

  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <div className="flex min-h-screen bg-gray-100">
            {!isProfilePage && <Sidebar />}
            <main className="flex-1">{children}</main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
