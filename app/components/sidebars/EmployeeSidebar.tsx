'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, Calendar, Clock, User } from "lucide-react";
import { signOut } from "next-auth/react";
import clsx from "clsx";

export default function EmployeeSidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Calendar', href: '/calendar', icon: <Calendar size={18} /> },
    { label: 'My Leave', href: '/leave', icon: <Clock size={18} /> },
    { label: 'My Profile', href: '/profile', icon: <User size={18} /> },
  ];

  return (
    <aside className="w-72 min-h-screen bg-content-panel shadow-enterprise border-r border-enhanced flex flex-col">
      {/* Logo Section */}
      <div className="bg-card-header border-b border-enhanced px-6 py-6">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
            <span className="text-primary-foreground font-bold text-sm">C</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">CoreNZ</h2>
            <p className="text-sm text-muted-foreground">Employee Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4">
        <div className="space-y-2">
          {navItems.map(({ label, href, icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-md transition-smooth font-medium text-sm',
                'hover:bg-accent hover:text-accent-foreground',
                pathname === href
                  ? 'bg-primary text-primary-foreground shadow-sm border-l-4 border-primary-foreground/20'
                  : 'text-foreground'
              )}
            >
              {icon}
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Settings & Logout */}
      <div className="border-t border-enhanced bg-card-header px-4 py-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-smooth"
        >
          <LogOut size={18} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
