'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function ManagerSidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Employees', href: '/employees' },
    { label: 'Calendar', href: '/calendar' },
    { label: 'Tasks', href: '/tasks' },
    { label: 'Org Chart', href: '/org-chart' },
  ];

  return (
    <div className="min-h-screen transition-all duration-300 flex flex-col m-4 ml-6 w-80">
      {/* Glassmorphism Container */}
      <div className="glass rounded-3xl shadow-glass h-full flex flex-col overflow-hidden">
        {/* Logo Section */}
        <div className="px-8 py-8 border-b border-glass">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center mr-4 shadow-warm">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">CoreNZ</h2>
              <p className="text-sm text-muted-foreground">Manager Panel</p>
            </div>
          </div>
        </div>

        {/* Quick Actions Header */}
        <div className="px-8 py-6">
          <h2 className="text-lg font-bold text-foreground mb-2">Quick actions</h2>
          <p className="text-sm text-muted-foreground">Navigate your workspace</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-6 pb-6">
          <div className="space-y-2">
            {navItems.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-4 px-4 py-3 rounded-2xl transition-glass hover-glass',
                  pathname === href
                    ? 'bg-primary text-primary-foreground shadow-warm'
                    : 'text-foreground'
                )}
              >
                <span className="truncate font-medium text-base">{label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Settings & Logout */}
        <div className="border-t border-glass px-6 py-6">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-destructive hover-glass rounded-2xl transition-glass"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
