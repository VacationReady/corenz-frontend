// app/employees/page.tsx
'use client'

import { useState } from 'react'

export default function EmployeesPage() {
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  const employees = [
    { id: 1, name: 'Alice Johnson', phone: '021 123 4567', department: 'HR', jobRole: 'Manager' },
    { id: 2, name: 'Bob Smith', phone: '022 234 5678', department: 'Sales', jobRole: 'Sales Rep' },
    { id: 3, name: 'Charlie Ray', phone: '023 345 6789', department: 'Tech', jobRole: 'Developer' },
  ]

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="border px-3 py-2 rounded w-1/3"
        />
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Employee
        </button>
      </div>

      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Phone Number</th>
              <th className="px-4 py-2 text-left">Department</th>
              <th className="px-4 py-2 text-left">Job Role</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp) => (
              <tr key={emp.id} className="border-t">
                <td className="px-4 py-2">{emp.name}</td>
                <td className="px-4 py-2">{emp.phone}</td>
                <td className="px-4 py-2">{emp.department}</td>
                <td className="px-4 py-2">{emp.jobRole}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Employee Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Employee</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input type="text" className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input type="tel" className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <input type="text" className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Job Role</label>
                <input type="text" className="w-full border rounded px-3 py-2" />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
