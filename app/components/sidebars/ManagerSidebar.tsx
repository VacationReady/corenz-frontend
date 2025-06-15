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
    <aside className="w-64 min-h-screen bg-neutral-900 text-white flex flex-col p-6 shadow-lg justify-between">
      <div>
        <div className="mb-10">
          <h2 className="text-2xl font-bold tracking-wide">CoreNZ</h2>
          <p className="text-sm text-neutral-400 mt-1">Manager Panel</p>
        </div>

        <nav className="flex flex-col gap-3">
          {navItems.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-2 rounded-md hover:bg-neutral-800 transition',
                pathname === href ? 'bg-neutral-800 font-semibold' : 'text-neutral-300'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="pt-3 border-t border-neutral-700">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-200"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
