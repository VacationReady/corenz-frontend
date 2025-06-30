// /app/layout.tsx

"use client";

import "./globals.css";
import { ReactNode } from "react";
import { Toaster } from "sonner"; // ✅ Import Toaster

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface min-h-screen font-sans text-gray-900 dark:text-gray-100 dark:bg-surface-dark">
        {children}
        <Toaster position="top-center" richColors /> {/* ✅ Mount Toaster globally */}
      </body>
    </html>
  );
}
