// app/employees/[id]/layout.tsx
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Employee } from "@prisma/client"; // or your Employee type

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (id && typeof id === "string") {
      fetch(`/api/employees/${id}`)
        .then(res => res.json())
        .then(data => setEmployee(data))
        .catch(() => setEmployee(null));
    }
  }, [id]);

  if (!employee) {
    return <div className="p-6 text-red-600">Employee not found</div>;
  }

  const menu = [
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

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Profile sidebar */}
      <aside className="w-64 bg-white p-4 border-r">
        <h2 className="text-lg font-bold mb-4">{employee.firstName} {employee.lastName}</h2>
        <nav className="space-y-2">
          {menu.map((item) => (
            <Link
              key={item}
              href={`/employees/${id}/${item}`}
              className="block px-3 py-2 rounded hover:bg-gray-100 capitalize"
            >
              {item.replace(/-/g, " ")}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
