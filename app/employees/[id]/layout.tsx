// File: /app/employees/[id]/layout.tsx
"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import React from "react";

const sections = [
  "overview",
  "personal-information",
  "device-information",
  "employment-information",
  "time-and-attendance",
  "tasks",
  "planner",
  "documents",
  "thanks",
  "skills",
  "notes",
];

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white shadow-md p-4">
        <h2 className="text-lg font-semibold mb-4">Overview</h2>
        <ul className="space-y-2">
          {sections.map((section) => (
            <li key={section}>
              <Link
                href={`/employees/${id}/${section}`}
                className={`block px-3 py-2 rounded hover:bg-blue-100 capitalize ${
                  pathname.includes(section) ? "bg-blue-200 font-medium" : "text-gray-700"
                }`}
              >
                {section.replace(/-/g, " ")}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
