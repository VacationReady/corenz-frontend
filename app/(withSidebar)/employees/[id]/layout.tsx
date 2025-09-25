import Link from "next/link";
import { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import NotificationsSectionBadge from "@/components/ui/NotificationsSectionBadge";

export default async function EmployeeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const employee = await prisma.employee.findFirst({
    where: { id, companyId: session?.user?.companyId || "" },
    include: {
      User: {
        include: {
          JobRole: true,
          Department_User_departmentIdToDepartment: true,
        },
      },
      EmployeeOffboarding: true,
    },
  });

  if (!employee) {
    return <div>Employee not found.</div>;
  }

  const userRole = employee.User?.role || "EMPLOYEE";
  const userDepartmentId = employee.User?.Department_User_departmentIdToDepartment?.id?.trim();
  const userJobRole = employee.User?.JobRole?.name;

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

  allForms.forEach((form: any) => {
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
  let forms = await prisma.form.findMany({
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

  // Hide deprecated/duplicate screens (consolidated into Personal information)
  const hiddenSlugs = new Set([
    "bank-details", // replaced by Bank & Payroll data screen
    "contact-information",
    "contact-info",
    "demographic",
    "demographics",
  ]);
  forms = forms.filter((f: any) => !hiddenSlugs.has(f.slug));

  console.log("Final forms to show:", forms.length);
  console.log("=== END DEBUG INFO ===");

  const menu = [
    { href: `/employees/${id}/overview`, label: "Overview" },
    {
      href: `/employees/${id}/personal-information`,
      label: "Personal information",
    },
    // Merged into Personal information
    { href: `/employees/${id}/leave`, label: "Leave" },
    { href: `/employees/${id}/documents`, label: "Documents" },
    ...forms.map((form: any) => ({
      href: `/employees/${id}/${form.slug}`,
      label: form.name,
    })),
    { href: `/employees/${id}/employment-details`, label: "Employment Details" },
    { href: `/employees/${id}/emergency-contacts`, label: "Emergency Contacts" },
    { href: `/employees/${id}/bank-payroll`, label: "Bank & Payroll" },
    { href: `/employees/${id}/performance`, label: "Performance" },
    { href: `/employees/${id}/onboarding`, label: "Onboarding History" },
    // Show offboarding tab for archived employees or if they have an offboarding record
    ...(employee.EmployeeOffboarding || !employee.isActive
      ? [{ href: `/employees/${id}/offboarding`, label: "Offboarding" }]
      : []),
    {
      href: `/employees/${id}/driver-licenses`,
      label: "Driver Licenses",
    },
    { href: `/employees/${id}/training`, label: "Training" },
    {
      href: `/employees/${id}/employment-checks`,
      label: "Employment Checks",
    },
    { href: `/employees/${id}/settings`, label: "Settings" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Profile sidebar */}
      <aside className="w-64 bg-white p-4 border-r">
        <h2 className="text-lg font-bold mb-4">{employee.User?.name}</h2>
        {/* Transactional notifications quick-view for admins */}
        {session?.user?.role === "ADMIN" && (
          <EmployeeNotificationsQuickView employeeId={id} />
        )}
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

function EmployeeNotificationsQuickView({ employeeId }: { employeeId: string }) {
  return (
    <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3">
      <NotificationsSectionBadge employeeId={employeeId} />
    </div>
  );
}
