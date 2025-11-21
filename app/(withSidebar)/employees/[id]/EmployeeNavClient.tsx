"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import NotificationsSectionBadge from "@/components/ui/NotificationsSectionBadge";

interface MenuItem {
  href: string;
  label: string;
}

interface EmployeeNavClientProps {
  menu: MenuItem[];
  employeeName: string;
  employeeId: string;
  showNotificationsQuickView: boolean;
}

export default function EmployeeNavClient({
  menu,
  employeeName,
  employeeId,
  showNotificationsQuickView,
}: EmployeeNavClientProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (pathname?.endsWith("/performance")) {
      setCollapsed(true);
    }
  }, [pathname]);

  return (
    <div className={`flex h-full ${collapsed ? "w-4" : "w-64"}`}>
      {/* Slim vertical handle */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex w-4 items-center justify-center rounded-full bg-glass-subtle text-xs text-foreground hover:bg-glass-strong"
        aria-label={collapsed ? "Open profile navigation" : "Hide profile navigation"}
      >
        <span className="text-lg leading-none">{collapsed ? ">" : "<"}</span>
      </button>

      {/* Expanded content */}
      {!collapsed && (
        <div className="ml-3 flex-1">
          {employeeName && (
            <h2 className="text-lg font-bold mb-4 text-foreground truncate">{employeeName}</h2>
          )}
          {showNotificationsQuickView && (
            <div className="mb-4 glass-subtle rounded-xl p-3 border-glass">
              <NotificationsSectionBadge employeeId={employeeId} />
            </div>
          )}
          <nav className="space-y-1">
            {menu.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition-glass ${
                    isActive
                      ? "glass-strong text-primary shadow-depth-1"
                      : "text-foreground hover:glass-subtle"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
