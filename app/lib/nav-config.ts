export type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN";

export interface NavItem {
  label: string;
  href: string;
}

const ADMIN_CORE: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/admin" },
  { label: "Approvals", href: "/dashboard/approvals" },
  { label: "Employees", href: "/employees" },
  { label: "Calendar", href: "/calendar" },
];

const ADMIN_TOOLS: NavItem[] = [
  { label: "Documents", href: "/documents" },
  { label: "Reports", href: "/reports" },
  { label: "Org Chart", href: "/org-chart" },
  { label: "News", href: "/news" },
  { label: "Settings", href: "/settings" },
];

const MANAGER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Employees", href: "/employees" },
  { label: "Calendar", href: "/calendar" },
  { label: "Tasks", href: "/tasks" },
  { label: "Org Chart", href: "/org-chart" },
];

const EMPLOYEE_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Calendar", href: "/calendar" },
  { label: "My Leave", href: "/leave" },
  { label: "My Profile", href: "/profile" },
];

const SUPER_ADMIN_EXTRA: NavItem[] = [
  { label: "Tenants", href: "/tenants" },
];

export function getNavItemsForRole(role: UserRole | undefined): NavItem[] {
  if (role === "ADMIN") return [...ADMIN_CORE, ...ADMIN_TOOLS];
  if (role === "SUPER_ADMIN") return [...SUPER_ADMIN_EXTRA, ...ADMIN_CORE, ...ADMIN_TOOLS];
  if (role === "MANAGER") return MANAGER_NAV;
  return EMPLOYEE_NAV;
}

export function navItemsToMap(items: NavItem[]): Record<string, string> {
  return items.reduce<Record<string, string>>((acc, item) => {
    acc[item.href] = item.label;
    return acc;
  }, {});
}


