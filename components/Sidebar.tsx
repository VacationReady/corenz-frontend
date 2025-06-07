'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  Home,
  Users,
  Calendar,
  FileText,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  ChevronLeft
} from 'lucide-react'

function SidebarLink({ href, label, icon: Icon, isCollapsed }: { href: string, label: string, icon: React.ElementType, isCollapsed: boolean }) {
  const [pathname, setPathname] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname)
    }
  }, [])

  const isActive = pathname.startsWith(href)

  return (
   <Link href={href} className={`flex items-center px-3 py-2 rounded hover:bg-blue-100 ${isActive ? 'bg-blue-200 text-blue-800 font-semibold' : 'text-gray-700'}`}>
      <Icon className="w-5 h-5 mr-2" />
      {!isCollapsed && label}
    </Link>
  )
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={\`transition-all duration-200 bg-white shadow-md p-4 flex flex-col justify-between \${collapsed ? 'w-20' : 'w-64'}\`}>
      <div>
        <div className="flex items-center justify-between mb-6">
          {!collapsed && <h1 className="text-2xl font-bold text-blue-600">CoreNZ</h1>}
          <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500 hover:text-gray-700">
            {collapsed ? <Menu /> : <ChevronLeft />}
          </button>
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
        <button className="flex items-center text-gray-600 mt-2 hover:text-red-600">
          <LogOut className="w-5 h-5 mr-2" />
          {!collapsed && 'Log Out'}
        </button>
      </div>
    </aside>
  )
}
