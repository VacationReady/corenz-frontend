// For each of your routes requiring sidebar visibility:
// /calendar, /employees, /approvals, /reports, /news, /settings
// Place this file as:
// /app/(withSidebar)/<route>/layout.tsx

import React, { ReactNode } from "react";

export default async function SectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
