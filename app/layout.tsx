// app/(withSidebar)/layout.tsx
"use client";

import ClientLayout from "./ClientLayout";

export default function WithSidebarLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}

