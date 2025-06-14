'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils'; // If you're using a className utility like clsx or cn()

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
    <aside className="w-64 min-h-screen bg-neutral-900 text-white flex flex-col p-6 shadow-lg">
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
    </aside>
  );
}
