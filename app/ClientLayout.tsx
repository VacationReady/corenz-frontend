"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import TopBar from "./components/navigation/TopBar";
import AdminSidebar from "./components/sidebars/AdminSidebar";
import ManagerSidebar from "./components/sidebars/ManagerSidebar";
import EmployeeSidebar from "./components/sidebars/EmployeeSidebar";

type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN";

interface ClientLayoutProps {
  children: React.ReactNode;
  initialRole?: UserRole;
}

export default function ClientLayout({
  children,
  initialRole,
}: ClientLayoutProps) {
  const pathname = usePathname() || "";
  const { data: session, status } = useSession();
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  const isProfilePage =
    pathname.startsWith("/employees/") && pathname.split("/").length > 2;

  const resolvedRole =
    (session?.user?.role as UserRole | undefined) ??
    initialRole ??
    "EMPLOYEE";

  const loading = status === "loading" && !initialRole;

  const isSuperAdmin = resolvedRole === "SUPER_ADMIN";
  const hasSidebar = !isProfilePage && !isSuperAdmin;

  React.useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!hasSidebar) {
      setMobileSidebarOpen(false);
    }
  }, [hasSidebar]);

  const handleOpenMobileSidebar = React.useCallback(() => {
    setMobileSidebarOpen(true);
  }, []);

  const handleCloseMobileSidebar = React.useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  const getSidebar = React.useCallback(
    (variant: "desktop" | "mobile") => {
      const sidebarProps =
        variant === "mobile"
          ? {
              variant,
              onMobileClose: handleCloseMobileSidebar,
              onMobileNavigate: handleCloseMobileSidebar,
            }
          : { variant };

      if (resolvedRole === "ADMIN" || resolvedRole === "SUPER_ADMIN") {
        return <AdminSidebar {...sidebarProps} />;
      }

      if (resolvedRole === "MANAGER") {
        return <ManagerSidebar {...sidebarProps} />;
      }

      return <EmployeeSidebar {...sidebarProps} />;
    },
    [resolvedRole, handleCloseMobileSidebar],
  );

  if (loading) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        hasSidebar={hasSidebar}
        onOpenMobileSidebar={hasSidebar ? handleOpenMobileSidebar : undefined}
      />
      <div className="flex flex-1 overflow-hidden">
        {hasSidebar && (
          <aside className="hidden lg:flex lg:shrink-0">
            {getSidebar("desktop")}
          </aside>
        )}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>

      {hasSidebar && (
        <DialogPrimitive.Root
          open={mobileSidebarOpen}
          onOpenChange={setMobileSidebarOpen}
        >
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md lg:hidden animate-fadeIn" />
            <DialogPrimitive.Content
              aria-label="Navigation"
              className="fixed inset-y-0 left-0 z-50 flex w-[min(85vw,20rem)] max-w-sm glass-ultra shadow-2xl animate-slideInLeft focus:outline-none lg:hidden"
            >
              {getSidebar("mobile")}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </div>
  );
}
