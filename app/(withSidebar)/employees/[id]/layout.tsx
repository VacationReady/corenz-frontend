import { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import UnauthorizedAccess from "@/components/ui/UnauthorizedAccess";
import { canAccessEmployee, getAccessibleEmployeeScreens, UserWithProfile } from "@/lib/permissions";
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

  // Fetch the current user with their permission profile to filter menu
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { PermissionProfile: true },
  });

  // Get accessible screens for the current user
  const userWithProfile: UserWithProfile = currentUser ? {
    ...currentUser,
    permissionProfile: currentUser.PermissionProfile,
  } : { role: session.user.role } as UserWithProfile;
  
  const accessibleScreens = getAccessibleEmployeeScreens(userWithProfile);
  const hasFullEmployeesAccess = accessibleScreens.includes("employees");
  
  // Check if user is viewing their own profile
  const isOwnProfile = employee.userId === session.user.id;

  // Build the full menu
  const fullMenu = [
    { href: `/employees/${id}/overview`, label: "Overview", screenKey: "employee-overview" },
    {
      href: `/employees/${id}/personal-information`,
      label: "Personal information",
      screenKey: "employee-personal-information",
    },
    { href: `/employees/${id}/leave`, label: "Leave", screenKey: "employee-leave" },
    { href: `/employees/${id}/documents`, label: "Documents", screenKey: "employee-documents" },
    ...forms.map((form: any) => ({
      href: `/employees/${id}/${form.slug}`,
      label: form.name,
      screenKey: "employee-forms", // Forms use the general forms permission
    })),
    { href: `/employees/${id}/employment-details`, label: "Employment Details", screenKey: "employee-employment-details" },
    { href: `/employees/${id}/emergency-contacts`, label: "Emergency Contacts", screenKey: "employee-emergency-contacts" },
    { href: `/employees/${id}/bank-payroll`, label: "Bank & Payroll", screenKey: "employee-bank-payroll" },
    { href: `/employees/${id}/performance`, label: "Performance", screenKey: "employee-performance" },
    { href: `/employees/${id}/onboarding`, label: "Onboarding History", screenKey: "employee-onboarding" },
    // Show offboarding tab for archived employees or if they have an offboarding record
    ...(employee.EmployeeOffboarding || !employee.isActive
      ? [{ href: `/employees/${id}/offboarding`, label: "Offboarding", screenKey: "employee-offboarding" }]
      : []),
    {
      href: `/employees/${id}/driver-licenses`,
      label: "Driver Licenses",
      screenKey: "employee-driver-licenses",
    },
    { href: `/employees/${id}/training`, label: "Training", screenKey: "employee-training" },
    {
      href: `/employees/${id}/employment-checks`,
      label: "Employment Checks",
      screenKey: "employee-employment-checks",
    },
    { href: `/employees/${id}/settings`, label: "Settings", screenKey: "employee-settings" },
  ];

  // Filter menu based on permissions
  // - If viewing own profile, show all screens (employees can see their own data)
  // - If user has full "employees" access, show all screens
  // - Otherwise, only show screens they have specific permission for
  const menu = fullMenu.filter((item) => {
    if (isOwnProfile) return true;
    if (hasFullEmployeesAccess) return true;
    return accessibleScreens.includes(item.screenKey);
  }).map(({ href, label }) => ({ href, label }));

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-primary-50/30 to-background">
      {/* Aurora background effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" />
      </div>
      
      {/* Profile sidebar */}
      <aside className="relative z-10 glass-premium p-4 border-r border-white/30 dark:border-white/10 rounded-tr-3xl shadow-depth-2">
        <EmployeeNavClient
          menu={menu}
          employeeName={employee.User?.name ?? ""}
          employeeId={id}
          showNotificationsQuickView={session?.user?.role === "ADMIN"}
        />
      </aside>

      {/* Profile content */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
