"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Briefcase,
  CreditCard,
  Phone,
  FileText,
  Calendar,
  TrendingUp,
  GraduationCap,
  Car,
  ClipboardCheck,
  PlayCircle,
  LogOut,
  Settings,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

interface MenuItem {
  href: string;
  label: string;
}

interface EmployeeNavClientProps {
  menu: MenuItem[];
  employeeName: string;
  employeeId: string;
  employeeAvatarUrl: string | null;
}

// Map menu labels to icons - all using consistent aurora blue
const menuConfig: Record<string, { icon: typeof User; color: string }> = {
  "Overview": { icon: LayoutGrid, color: "from-primary to-blue-500" },
  "Personal information": { icon: User, color: "from-primary to-blue-500" },
  "Leave": { icon: Calendar, color: "from-primary to-blue-500" },
  "Documents": { icon: FileText, color: "from-primary to-blue-500" },
  "Employment Details": { icon: Briefcase, color: "from-primary to-blue-500" },
  "Emergency Contacts": { icon: Phone, color: "from-primary to-blue-500" },
  "Bank & Payroll": { icon: CreditCard, color: "from-primary to-blue-500" },
  "Performance": { icon: TrendingUp, color: "from-primary to-blue-500" },
  "Onboarding History": { icon: PlayCircle, color: "from-primary to-blue-500" },
  "Offboarding": { icon: LogOut, color: "from-primary to-blue-500" },
  "Driver Licenses": { icon: Car, color: "from-primary to-blue-500" },
  "Training": { icon: GraduationCap, color: "from-primary to-blue-500" },
  "Employment Checks": { icon: ClipboardCheck, color: "from-primary to-blue-500" },
  "Settings": { icon: Settings, color: "from-primary to-blue-500" },
};

export default function EmployeeNavClient({
  menu,
  employeeName,
  employeeId,
  employeeAvatarUrl,
}: EmployeeNavClientProps) {
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Redirect to first allowed screen if current path is not in the menu
  useEffect(() => {
    if (!pathname || menu.length === 0) return;
    
    // Check if current path matches any menu item
    const isCurrentPathAllowed = menu.some(item => pathname === item.href);
    
    // Also check if we're on the base employee path (e.g., /employees/123)
    const isBasePath = pathname === `/employees/${employeeId}`;
    
    if (!isCurrentPathAllowed || isBasePath) {
      // Redirect to the first allowed screen
      const firstAllowedScreen = menu[0]?.href;
      if (firstAllowedScreen && firstAllowedScreen !== pathname) {
        router.replace(firstAllowedScreen);
      }
    }
  }, [pathname, menu, employeeId, router]);

  useEffect(() => {
    if (pathname?.endsWith("/performance")) {
      setCollapsed(true);
    }
  }, [pathname]);

  const getMenuItemConfig = (label: string) => {
    return menuConfig[label] || { icon: FileText, color: "from-gray-400 to-gray-500" };
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 60 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative flex flex-col h-full"
    >
      {/* Collapse Toggle */}
      <motion.button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "absolute -right-3 top-6 z-10",
          "flex items-center justify-center w-6 h-6 rounded-full",
          "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
          "shadow-depth-2 text-muted-foreground hover:text-foreground",
          "transition-colors"
        )}
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </motion.button>

      {/* Employee Profile Header */}
      <motion.div
        initial={false}
        animate={{ 
          paddingInline: collapsed ? 6 : 12,
          marginBottom: 16 
        }}
      >
        <AnimatePresence mode="wait">
          {collapsed ? (
            <motion.div
              key="collapsed-avatar"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex justify-center"
            >
              <Avatar className="w-10 h-10 border-2 border-white/50 shadow-sm">
                <AvatarImage src={employeeAvatarUrl || undefined} alt={employeeName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-blue-500 text-white text-sm font-medium">
                  {getInitials(employeeName || "?")}
                </AvatarFallback>
              </Avatar>
            </motion.div>
          ) : (
            <motion.div
              key="expanded-avatar"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3"
            >
              <Avatar className="w-10 h-10 border-2 border-white/50 shadow-sm shrink-0">
                <AvatarImage src={employeeAvatarUrl || undefined} alt={employeeName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-blue-500 text-white text-sm font-medium">
                  {getInitials(employeeName || "?")}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-bold text-foreground truncate leading-tight">
                {employeeName || "Employee"}
              </h2>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-1">
        {menu.map((item, index) => {
          const isActive = pathname === item.href;
          const { icon: Icon, color } = getMenuItemConfig(item.label);

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02, duration: 0.3 }}
            >
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl transition-all duration-200",
                  collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                  isActive
                    ? "bg-white/80 dark:bg-white/10 shadow-depth-1"
                    : "hover:bg-white/50 dark:hover:bg-white/5"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div
                    className={cn(
                      "absolute left-0 w-1 rounded-full bg-gradient-to-b from-primary to-blue-500",
                      collapsed ? "h-6 top-1/2 -translate-y-1/2" : "h-8 top-1/2 -translate-y-1/2"
                    )}
                  />
                )}

                {/* Icon */}
                <div
                  className={cn(
                    "flex items-center justify-center flex-shrink-0 transition-all duration-200",
                    collapsed ? "w-8 h-8" : "w-8 h-8",
                    isActive
                      ? `bg-gradient-to-br ${color} text-white rounded-lg shadow-sm`
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  <Icon className={cn("transition-all", collapsed ? "w-4.5 h-4.5" : "w-4 h-4")} />
                </div>

                {/* Label */}
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className={cn(
                        "text-sm font-medium truncate whitespace-nowrap",
                        isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div
                    className={cn(
                      "absolute left-full ml-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
                      "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900",
                      "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto",
                      "transition-opacity duration-200 shadow-lg z-50"
                    )}
                  >
                    {item.label}
                  </div>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>
    </motion.div>
  );
}
