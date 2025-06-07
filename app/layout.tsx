// app/layout.tsx
import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideUser, LucideClipboardList, LucideLogOut, LucideUsers, LucideCalendarCheck, LucideHome } from 'lucide-react'

export const metadata = {
  title: 'CoreNZ HR',
  description: 'HR platform for NZ businesses',
}

function SidebarLink({ href, label, icon: Icon }: { href: string, label: string, icon: React.ElementType }) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const isActive = pathname.startsWith(href)

  return (
    <Link href={href} className={`flex items-center px-3 py-2 rounded hover:bg-blue-100 ${isActive ? 'bg-blue-200 text-blue-800 font-semibold' : 'text-gray-700'}`}>
      <Icon className="w-5 h-5 mr-2" />
      {label}
    </Link>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md p-4 flex flex-col justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-600 mb-6">CoreNZ</h1>
            <nav className="flex flex-col space-y-2">
              <SidebarLink href="/dashboard" label="Dashboard" icon={LucideHome} />
              <SidebarLink href="/employees" label="Employees" icon={LucideUsers} />
              <SidebarLink href="/leave" label="Leave" icon={LucideCalendarCheck} />
              <SidebarLink href="/onboarding" label="Onboarding" icon={LucideClipboardList} />
              <SidebarLink href="/offboarding" label="Offboarding" icon={LucideClipboardList} />
            </nav>
          </div>
          <div className="border-t pt-4">
            <SidebarLink href="/settings" label="Settings" icon={LucideUser} />
            <button className="flex items-center text-gray-600 mt-2 hover:text-red-600">
              <LucideLogOut className="w-5 h-5 mr-2" /> Log Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </body>
    </html>
  )
}
