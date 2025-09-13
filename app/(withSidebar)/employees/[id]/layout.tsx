import Link from "next/link";
import { ReactNode } from "react";
import { prisma } from "@/lib/prisma";

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
    include: {
      user: {
        include: {
          jobRole: true,
          department: true,
        },
      },
      offboardingRecord: true,
    },
  });

  if (!employee) {
    return <div>Employee not found.</div>;
  }

  const userRole = employee.user?.role || "EMPLOYEE";
  const userDepartmentId = employee.user?.department?.id?.trim();
  const userJobRole = employee.user?.jobRole?.name;

  // DEBUG: log user context
  console.log("=== FORM DEBUG INFO ===");
  console.log("Employee:", {
    id: employee.id,
    role: userRole,
    departmentId: userDepartmentId,
    jobRole: userJobRole,
  });

  // DEBUG: manually filter all forms
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

  allForms.forEach((form) => {
    const roleMatch = form.visibleToRoles.includes(userRole);
    const deptMatch =
      form.visibleToDepartments.length === 0 ||
      (userDepartmentId &&
        form.visibleToDepartments.includes(userDepartmentId));
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
  });

  // FINAL QUERY: fetch forms with proper filter
  const forms = await prisma.form.findMany({
    where: {
      companyId: employee.companyId || "",
      isActive: true,
      AND: [
        {
          OR: [
            { visibleToRoles: { isEmpty: true } },
            { visibleToRoles: { has: userRole } },
          ],
        },
        {
          OR: [
            { visibleToDepartments: { isEmpty: true } },
            ...(userDepartmentId
              ? [{ visibleToDepartments: { has: userDepartmentId } }]
              : []),
          ],
        },
        {
          OR: [
            { visibleToJobRoles: { isEmpty: true } },
            ...(userJobRole
              ? [{ visibleToJobRoles: { has: userJobRole } }]
              : []),
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

  console.log("Final forms to show:", forms.length);
  console.log("=== END DEBUG INFO ===");

  const menu = [
    { href: `/employees/${params.id}/overview`, label: "Overview" },
    {
      href: `/employees/${params.id}/personal-information`,
      label: "Personal information",
    },
    {
      href: `/employees/${params.id}/contact-info`,
      label: "Contact Info",
    },
    {
      href: `/employees/${params.id}/demographic`,
      label: "Demographic",
    },
    { href: `/employees/${params.id}/leave`, label: "Leave" },
    { href: `/employees/${params.id}/documents`, label: "Documents" },
    ...forms.map((form) => ({
      href: `/employees/${params.id}/${form.slug}`,
      label: form.name,
    })),
    { href: `/employees/${params.id}/contact-info`, label: "Contact Info" },
    { href: `/employees/${params.id}/demographic`, label: "Demographic" },
    { href: `/employees/${params.id}/employment-details`, label: "Employment Details" },
    { href: `/employees/${params.id}/emergency-contacts`, label: "Emergency Contacts" },
    { href: `/employees/${params.id}/bank-payroll`, label: "Bank & Payroll" },
    { href: `/employees/${params.id}/performance`, label: "Performance" },
    { href: `/employees/${params.id}/onboarding`, label: "Onboarding History" },
    // Show offboarding tab for archived employees or if they have an offboarding record
    ...(employee.offboardingRecord || !employee.isActive
      ? [{ href: `/employees/${params.id}/offboarding`, label: "Offboarding" }]
      : []),
    {
      href: `/employees/${params.id}/driver-licenses`,
      label: "Driver Licenses",
    },
    { href: `/employees/${params.id}/training`, label: "Training" },
    {
      href: `/employees/${params.id}/employment-checks`,
      label: "Employment Checks",
    },
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
