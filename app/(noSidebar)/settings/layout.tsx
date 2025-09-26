import React, { ReactNode } from "react";

export default function SectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex h-full w-full">
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}


