// Employees section layout
// 
// Note: The main sidebar is already rendered by the parent (withSidebar)/Layout.tsx.
// This layout was previously duplicating the sidebar render, causing:
// 1. Redundant auth() calls on every navigation
// 2. Double sidebar rendering (hidden by child layouts but still processed)
//
// Now simplified to a pass-through to avoid redundant work.
// Child routes like /employees/[id] have their own specialized layouts.

import React, { ReactNode } from "react";

export default function EmployeesSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Pass-through layout - sidebar is handled by parent Layout.tsx
  // Child routes (like [id]) have their own specialized layouts
  return <>{children}</>;
}
