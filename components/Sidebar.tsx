"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Home,
  Users,
  Calendar,
  FileText,
  BarChart2,
  Settings,
  Menu,
  ChevronLeft,
  User,
} from "lucide-react";

function SidebarLink({
  href,
  label,
  icon: Icon,
  isCollapsed,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isCollapsed: boolean;
}) {
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
    }
  }, []);

  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center px-3 py-2 rounded hover:bg-blue-100 ${
        isActive ? "bg-blue-200 text-blue-800 font-semibold" : "text-gray-700"
      }`}
    >
      <Icon className="w-5 h-5 mr-2" />
      {!isCollapsed && label}
    </Link>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: session } = useSession();
  const user = session?.user;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <aside
      className={`transition-all duration-200 bg-white shadow-md p-4 flex flex-col justify-between ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-6">
          {!collapsed && <h1 className="text-2xl font-bold text-blue-600">CoreNZ</h1>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-500 hover:text-gray-700"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <Menu /> : <ChevronLeft />}
          </button>
        </div>

        {/* Profile Dropdown */}
        <div className="relative mb-4" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between text-sm text-gray-700 hover:bg-gray-100 px-3 py-2 rounded"
          >
            <span className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              {!collapsed && (user?.name || user?.email || "My Profile")}
            </span>
            {!collapsed && (
              <ChevronLeft className={`w-4 h-4 transform ${dropdownOpen ? "rotate-90" : ""}`} />
            )}
          </button>
          {dropdownOpen && !collapsed && (
            <div className="absolute right-0 mt-2 w-full bg-white border rounded shadow z-10">
              <Link
                href="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                My Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        <nav className="flex flex-col space-y-2">
          <SidebarLink href="/dashboard" label="Dashboard" icon={Home} isCollapsed={collapsed} />
          <SidebarLink href="/employees" label="Employees" icon={Users} isCollapsed={collapsed} />
          <SidebarLink href="/calendar" label="Calendar" icon={Calendar} isCollapsed={collapsed} />
          <SidebarLink href="/documents" label="Documents" icon={FileText} isCollapsed={collapsed} />
          <SidebarLink href="/reports" label="Reports" icon={BarChart2} isCollapsed={collapsed} />
        </nav>
      </div>

      <div className="border-t pt-4">
        <SidebarLink href="/settings" label="Settings" icon={Settings} isCollapsed={collapsed} />
      </div>
    </aside>
  );
}
