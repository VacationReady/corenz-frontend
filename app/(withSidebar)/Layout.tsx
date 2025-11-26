"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import TopBar from "@/components/navigation/TopBar";
import AdminSidebar from "@/components/sidebars/AdminSidebar";
import ManagerSidebar from "@/components/sidebars/ManagerSidebar";
import EmployeeSidebar from "@/components/sidebars/EmployeeSidebar";

type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN";

export default function WithSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  const resolvedRole =
    (session?.user?.role as UserRole | undefined) ?? "EMPLOYEE";

  React.useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

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

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        hasSidebar={true}
        onOpenMobileSidebar={handleOpenMobileSidebar}
      />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:flex lg:shrink-0">
          {getSidebar("desktop")}
        </aside>
        <main className="flex-1 overflow-y-auto bg-background/80 backdrop-blur-sm">
          {children}
        </main>
      </div>

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
    </div>
  );
}