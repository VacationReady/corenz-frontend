// app/dashboard/page.tsx
'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: '🏠' },
  { label: 'Employees', icon: '👥' },
  { label: 'Calendar', icon: '🗓' },
  { label: 'Documents', icon: '📄' },
  { label: 'Reports', icon: '📊' },
  { label: 'Settings', icon: '⚙️' },
]

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`bg-white shadow-md h-full transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-xl font-bold whitespace-nowrap">{sidebarOpen ? 'CoreNZ' : 'CNZ'}</span>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500">
            {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
          </button>
        </div>
        <nav className="mt-4 space-y-2 px-2">
          {navItems.map((item) => (
            <a
              key={item.label}
              href="#"
              className="flex items-center space-x-3 py-2 px-3 rounded hover:bg-gray-200 text-gray-700"
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {/* Tasks */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">📝 Tasks</h2>
            <ul className="list-disc list-inside text-sm text-gray-700">
              <li>Complete onboarding documents</li>
              <li>Approve pending leave requests</li>
              <li>Upload ID verification</li>
            </ul>
          </div>

          {/* Holiday Balance */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">🏖 Holiday Balance</h2>
            <p className="text-sm text-gray-700">Days Taken: <strong>8</strong></p>
            <p className="text-sm text-gray-700">Days Remaining: <strong>12</strong></p>
          </div>

          {/* Company News */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">📰 Company News</h2>
            <ul className="list-disc list-inside text-sm text-gray-700">
              <li>All-hands meeting this Friday</li>
              <li>New benefits policy launched</li>
              <li>Welcome to our new joiners!</li>
            </ul>
          </div>

          {/* Documents */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">📄 Documents</h2>
            <ul className="list-disc list-inside text-sm text-gray-700">
              <li><a href="#" className="text-blue-600 hover:underline">Employee Handbook.pdf</a></li>
              <li><a href="#" className="text-blue-600 hover:underline">Leave Policy 2025.docx</a></li>
              <li><a href="#" className="text-blue-600 hover:underline">Tax Form.pdf</a></li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
