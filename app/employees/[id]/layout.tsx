"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const params = useParams() as { id: string };
  const { id } = params;
  const pathname = usePathname();

  const tabs = useMemo(
    () => [
      { label: "Overview", slug: "overview" },
      { label: "Personal information", slug: "personal-information" },
      { label: "Device information", slug: "device-information" },
      { label: "Employment information", slug: "employment-information" },
      { label: "Time and attendance", slug: "time-and-attendance" },
      { label: "Tasks", slug: "tasks" },
      { label: "Planner", slug: "planner" },
      { label: "Documents", slug: "documents" },
      { label: "Thanks", slug: "thanks" },
      { label: "Skills", slug: "skills" },
      { label: "Notes", slug: "notes" },
    ],
    []
  );

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white border-r p-4">
        <nav className="space-y-1">
          {tabs.map(({ label, slug }) => {
            const href = `/employees/${id}/${slug}`;
            const isActive = pathname === href;
            return (
              <Link
                key={slug}
                href={href}
                className={`block px-4 py-2 rounded hover:bg-blue-50 ${
                  isActive ? "bg-blue-100 font-medium text-blue-700" : "text-gray-700"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 bg-gray-50 p-8">{children}</main>
    </div>
  );
}
