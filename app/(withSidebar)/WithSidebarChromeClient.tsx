"use client";

import React from "react";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import TopBar from "@/components/navigation/TopBar";
import AdminSidebar from "@/components/sidebars/AdminSidebar";
import ManagerSidebar from "@/components/sidebars/ManagerSidebar";
import EmployeeSidebar from "@/components/sidebars/EmployeeSidebar";
import FloatingBugButton from "@/components/bugs/FloatingBugButton";

type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN";

export default function WithSidebarChromeClient({
  resolvedRole,
}: {
  resolvedRole: UserRole;
}) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  const handleOpenMobileSidebar = React.useCallback(() => {
    setMobileSidebarOpen(true);
  }, []);

  const handleCloseMobileSidebar = React.useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  const sidebarProps = {
    variant: "mobile" as const,
    onMobileClose: handleCloseMobileSidebar,
    onMobileNavigate: handleCloseMobileSidebar,
  };

  const mobileSidebar =
    resolvedRole === "ADMIN" || resolvedRole === "SUPER_ADMIN" ? (
      <AdminSidebar {...sidebarProps} />
    ) : resolvedRole === "MANAGER" ? (
      <ManagerSidebar {...sidebarProps} />
    ) : (
      <EmployeeSidebar {...sidebarProps} />
    );

  return (
    <>
      <TopBar hasSidebar={true} onOpenMobileSidebar={handleOpenMobileSidebar} />

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
            {mobileSidebar}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Floating Bug Report Button */}
      <FloatingBugButton />
    </>
  );
}
