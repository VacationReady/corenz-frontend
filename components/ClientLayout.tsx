"use client";

import Sidebar from "@/components/Sidebar";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function ClientLayout({ children }: Props) {
  return (
    <div className="w-full">
      <Sidebar />
      <main className="w-full px-6 pt-6 bg-gray-100">
        {children}
      </main>
    </div>
  );
}
