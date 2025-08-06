import Link from "next/link";
import { ReactNode } from "react";
import { prisma } from "@/lib/prisma";

interface EmployeeLayoutProps {
  children: ReactNode;
  params: { id: string };
}

export default async function EmployeeLayout({ children, params }: EmployeeLayoutProps) {
  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      user: {
        include: {
          jobRole: true,
          department: true,
        },
      },
    },
  });

  if (!employee) {
    return <div>Employee not found.</div>;
  }

  // Extract user details for filtering
  const userRole = employee.user?.role || "EMPLOYEE";
  const userDepartment = employee.user?.department?.name;
  const userJobRole = employee.user?.jobRole?.name;

  // First, get ALL forms to debug visibility
  const allForms = await prisma.form.findMany({
    where: {
      companyId: employee.companyId || "",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      formType: true,
      visibleToRoles: true,
      visibleToDepartments: true,
      visibleToJobRoles: true,
    },
  });

  console.log("=== FORM DEBUG INFO ===");
  console.log("Employee:", {
    id: employee.id,
    role: userRole,
    department: userDepartment,
    jobRole: userJobRole,
  });
  console.log("All active forms:", allForms.length);

  allForms.forEach((form) => {
    console.log(`Form: ${form.name}`, {
      type: form.formType,
      visibleToRoles: form.visibleToRoles,
      visibleToDepartments: form.visibleToDepartments,
      visibleToJobRoles: form.visibleToJobRoles,
    });
  });

  // Manual filtering with debug logs
  const filteredForms = allForms
    .filter((form) => {
      const roleMatch = form.visibleToRoles.includes(userRole);
      const deptMatch =
        form.visibleToDepartments.length === 0 ||
        (userDepartment && form.visibleToDepartments.includes(userDepartment));
      const jobRoleMatch =
        form.visibleToJobRoles.length === 0 ||
        (userJobRole && form.visibleToJobRoles.includes(userJobRole));

      const shouldShow = roleMatch && deptMatch && jobRoleMatch;

      console.log(`Form "${form.name}" visibility:`, {
        roleMatch,
        deptMatch,
        jobRoleMatch,
        shouldShow,
      });

      return shouldShow;
    })
    .map((form) => ({
      slug: form.slug,
      name: form.name,
      formType: form.formType,
    }));

  console.log("Final forms to show:", filteredForms.length);
  console.log("=== END DEBUG INFO ===");

  // Actual query to fetch forms visible to this employee (for production use)
  const forms = await prisma.form.findMany({
    where: {
      companyId: employee.companyId || "",
      isActive: true,
      AND: [
        // Role visibility check
        {
          OR: [
            { visibleToRoles: { isEmpty: true } },
            { visibleToRoles: { equals: null } },
            { visibleToRoles: { has: userRole } },
          ],
        },
        // Department visibility check
        {
          OR: [
            { visibleToDepartments: { isEmpty: true } },
            { visibleToDepartments: { equals: null } },
            ...(userDepartment ? [{ visibleToDepartments: { has: userDepartment } }] : []),
          ],
        },
        // Job role visibility check
        {
          OR: [
            { visibleToJobRoles: { isEmpty: true } },
            { visibleToJobRoles: { equals: null } },
            ...(userJobRole ? [{ visibleToJobRoles: { has: userJobRole } }] : []),
          ],
        },
      ],
    },
    select: {
      slug: true,
      name: true,
      formType: true,
    },
    orderBy: { name: "asc" },
  });

  const menu = [
    { href: `/employees/${params.id}/overview`, label: "Overview" },
    { href: `/employees/${params.id}/leave`, label: "Leave" },
    { href: `/employees/${params.id}/documents`, label: "Documents" },
    // Dynamic form links
    ...forms.map((form) => ({
      href: `/employees/${params.id}/${form.slug}`,
      label: form.name,
    })),
    { href: `/employees/${params.id}/performance`, label: "Performance" },
    { href: `/employees/${params.id}/onboarding`, label: "Onboarding History" },
    { href: `/employees/${params.id}/driver-licenses`, label: "Driver Licenses" },
    { href: `/employees/${params.id}/training`, label: "Training" },
    { href: `/employees/${params.id}/employment-checks`, label: "Employment Checks" },
    { href: `/employees/${params.id}/settings`, label: "Settings" },
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
