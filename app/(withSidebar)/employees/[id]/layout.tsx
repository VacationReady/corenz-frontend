import Link from "next/link";
import { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import UnauthorizedAccess from "@/components/ui/UnauthorizedAccess";
import { canAccessEmployee } from "@/lib/permissions";
import EmployeeNavClient from "./EmployeeNavClient";

export default async function EmployeeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return (
      <UnauthorizedAccess
        title="Unauthorised access"
        description="You can only view your own details. If you think this is a mistake, please contact your administrator."
      />
    );
  }
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

  const allowed = await canAccessEmployee(
    {
      id: session.user.id,
      role: session.user.role as any,
      companyId: session.user.companyId,
    },
    employee.id,
  );

  if (!allowed) {
    return (
      <UnauthorizedAccess
        title="Unauthorised access"
        description="You can only view your own details. If you think this is a mistake, please contact your administrator."
      />
    );
  }

  const userRole = employee.User?.role || "EMPLOYEE";
  const userDepartmentId = employee.User?.Department_User_departmentIdToDepartment?.id?.trim();
  const userJobRole = employee.User?.JobRole?.name;

  // Fetch forms with proper filter (EXCLUDE SURVEYS)
  let forms = await prisma.form.findMany({
    where: {
      companyId: employee.companyId || "",
      isActive: true,
      formType: { not: "SURVEY" }, // EXCLUDE SURVEY FORMS FROM EMPLOYEE PROFILES
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
      <aside className="glass-premium p-4 border-r border-glass rounded-tr-3xl">
        <EmployeeNavClient
          menu={menu}
          employeeName={employee.User?.name ?? ""}
          employeeId={id}
          showNotificationsQuickView={session?.user?.role === "ADMIN"}
        />
      </aside>

      {/* Profile content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
