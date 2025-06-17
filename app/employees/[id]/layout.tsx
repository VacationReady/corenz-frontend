// app/employees/[id]/layout.tsx

import Link from "next/link";
import { ReactNode } from "react";
import prisma from "@/lib/prismadb";

interface EmployeeLayoutProps {
  children: ReactNode;
  params: { id: string };
}

export default async function EmployeeLayout({
  children,
  params,
}: EmployeeLayoutProps) {
  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { user: true },
  });

  if (!employee) {
    return <div>Employee not found.</div>;
  }

  const menu = [
    { href: `/employees/${params.id}/overview`, label: "Overview" },
    { href: `/employees/${params.id}/leave`, label: "Leave" },
    { href: `/employees/${params.id}/documents`, label: "Documents" },
    { href: `/employees/${params.id}/performance`, label: "Performance" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Profile sidebar */}
      <aside className="w-64 bg-white p-4 border-r">
        <h2 className="text-lg font-bold mb-4">{employee.user?.name}</h2>
        <nav className="space-y-2">
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 hover:bg-gray-100 text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Profile content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
