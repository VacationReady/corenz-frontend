import { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import UnauthorizedAccess from "@/components/ui/UnauthorizedAccess";
import { canAccessEmployee, getAccessibleEmployeeScreensViaProfile, isUserSubordinateOf, UserWithProfile } from "@/lib/permissions";
import { getDownloadUrl } from "@/lib/getDownloadUrl";
import EmployeeNavClient from "./EmployeeNavClient";

export default async function EmployeeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
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
      // Include Employee's own department and job role (may differ from User's)
      Department: true,
      JobRole: true,
      EmployeeOffboarding: true,
    },
  });

  if (!employee) {
    return <div>Employee not found.</div>;
  }

  const signedProfileUrl = employee.User?.profileImageUrl
    ? await getDownloadUrl(employee.User.profileImageUrl)
    : null;

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
  // Check both Employee and User for department/job role (Employee takes precedence)
  const userDepartmentId = (employee.Department?.id || employee.User?.Department_User_departmentIdToDepartment?.id)?.trim();
  // Use job role ID for matching - forms store job role IDs, not names
  const userJobRoleId = employee.JobRole?.id || employee.User?.JobRole?.id;

  // Fetch forms with proper filter (EXCLUDE SURVEYS)
  // Visibility logic: User must match ALL selected criteria
  // - If form has no departments selected (empty array), it's visible to all departments
  // - If form has no job roles selected (empty array), it's visible to all job roles
  // - If employee has no department/job role assigned, they can only see forms with empty filters for that criteria
  let forms = await prisma.form.findMany({
    where: {
      companyId: employee.companyId || "",
      isActive: true,
      formType: { not: "SURVEY" }, // EXCLUDE SURVEY FORMS FROM EMPLOYEE PROFILES
      AND: [
        // Role filter: must match one of the selected roles, or form has no role restrictions
        {
          OR: [
            { visibleToRoles: { isEmpty: true } },
            { visibleToRoles: { has: userRole } },
          ],
        },
        // Department filter: must match if form has departments AND employee has a department
        // If form has no departments selected, visible to all
        // If employee has no department, only see forms with no department restrictions
        {
          OR: [
            { visibleToDepartments: { isEmpty: true } },
            ...(userDepartmentId
              ? [{ visibleToDepartments: { has: userDepartmentId } }]
              : []),
          ],
        },
        // Job role filter: must match if form has job roles AND employee has a job role
        // If form has no job roles selected, visible to all
        // If employee has no job role, only see forms with no job role restrictions
        {
          OR: [
            { visibleToJobRoles: { isEmpty: true } },
            ...(userJobRoleId
              ? [{ visibleToJobRoles: { has: userJobRoleId } }]
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

  // Get accessible screens via CUSTOM permission profile only (not default role permissions)
  const userWithProfile: UserWithProfile = currentUser ? {
    ...currentUser,
    permissionProfile: currentUser.PermissionProfile,
  } : { role: session.user.role } as UserWithProfile;
  
  // Use the profile-only version to check what screens the user has explicit access to
  const accessibleScreensViaProfile = getAccessibleEmployeeScreensViaProfile(userWithProfile);
  const hasFullEmployeesAccessViaProfile = accessibleScreensViaProfile.includes("employees");
  
  // Check if user is viewing their own profile
  const isOwnProfile = employee.userId === session.user.id;
  
  // Check if this is a subordinate (for managers)
  const isSubordinate = session.user.role === "MANAGER" 
    ? await isUserSubordinateOf(employee.userId, session.user.id, session.user.companyId)
    : false;

  // Debug logging for permission issues
  const profilePermissions = currentUser?.PermissionProfile?.permissions;
  console.log("[EmployeeLayout] Permission check:", {
    viewerRole: session.user.role,
    viewerId: session.user.id,
    targetEmployeeId: employee.id,
    targetUserId: employee.userId,
    isOwnProfile,
    isSubordinate,
    hasCustomProfile: !!currentUser?.PermissionProfile,
    profilePermissionsRaw: profilePermissions,
    accessibleScreensViaProfile,
    hasFullEmployeesAccessViaProfile,
  });

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
  // - If ADMIN/SUPER_ADMIN, show all screens
  // - If user has full "employees" access via their CUSTOM profile, show all screens
  // - If MANAGER viewing a subordinate, show all screens (normal manager access)
  // - Otherwise, only show screens they have specific permission for via their profile
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  
  const menu = fullMenu.filter((item) => {
    if (isOwnProfile) return true;
    if (isAdmin) return true;
    if (hasFullEmployeesAccessViaProfile) return true;
    if (isSubordinate) return true; // Managers see all screens for their subordinates
    return accessibleScreensViaProfile.includes(item.screenKey);
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
          employeeName={`${employee.User?.firstName ?? ""} ${employee.User?.lastName ?? ""}`.trim() || employee.User?.name || ""}
          employeeId={id}
          employeeAvatarUrl={signedProfileUrl}
        />
      </aside>

      {/* Profile content */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
