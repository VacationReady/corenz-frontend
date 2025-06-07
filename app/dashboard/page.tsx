'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: '🏠', path: '/dashboard' },
  { label: 'Employees', icon: '👥', path: '/employees' },
  { label: 'Calendar', icon: '🗓', path: '/calendar' },
  { label: 'Documents', icon: '📄', path: '/documents' },
  { label: 'Reports', icon: '📊', path: '/reports' },
  { label: 'Settings', icon: '⚙️', path: '/settings' },
]

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const pathname = usePathname()

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
              href={item.path}
              className={`flex items-center space-x-3 py-2 px-3 rounded text-gray-700 hover:bg-gray-200 ${pathname === item.path ? 'bg-blue-100 text-blue-700 font-medium' : ''}`}
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
          {/* Tasks */}
          <div className="bg-white p-6 rounded shadow h-60">
            <h2 className="text-lg font-semibold mb-2">📝 Tasks</h2>
            <ul className="list-disc list-inside text-sm text-gray-700">
              <li>Complete onboarding documents</li>
              <li>Approve pending leave requests</li>
              <li>Upload ID verification</li>
            </ul>
          </div>

          {/* Holiday Balance */}
          <div className="bg-white p-6 rounded shadow h-60 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2">🏖 Holiday Balance</h2>
              <p className="text-sm text-gray-700">Total Days: <strong>20</strong></p>
              <p className="text-sm text-gray-700">Days Taken: <strong>8</strong></p>
              <p className="text-sm text-gray-700">Days Remaining: <strong>12</strong></p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 self-start"
            >
              Book Holiday
            </button>
          </div>

          {/* Company News */}
          <div className="bg-white p-6 rounded shadow h-60">
            <h2 className="text-lg font-semibold mb-2">📰 Company News</h2>
            <ul className="list-disc list-inside text-sm text-gray-700">
              <li>All-hands meeting this Friday</li>
              <li>New benefits policy launched</li>
              <li>Welcome to our new joiners!</li>
            </ul>
          </div>

          {/* Documents */}
          <div className="bg-white p-6 rounded shadow h-60">
            <h2 className="text-lg font-semibold mb-2">📄 Documents</h2>
            <ul className="list-disc list-inside text-sm text-gray-700">
              <li><a href="#" className="text-blue-600 hover:underline">Employee Handbook.pdf</a></li>
              <li><a href="#" className="text-blue-600 hover:underline">Leave Policy 2025.docx</a></li>
              <li><a href="#" className="text-blue-600 hover:underline">Tax Form.pdf</a></li>
            </ul>
          </div>
        </div>

        {/* Book Holiday Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Book Holiday</h2>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input type="date" className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input type="date" className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reason</label>
                  <input type="text" className="w-full border rounded px-3 py-2" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Comments</label>
                  <textarea className="w-full border rounded px-3 py-2" rows={3}></textarea>
                </div>
                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
