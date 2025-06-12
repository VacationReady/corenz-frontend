// app/(withSidebar)/layout.tsx
"use client";

import ClientLayout from "@/app/(withSidebar)/ClientLayout";

export default function WithSidebarLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}

