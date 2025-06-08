'use client'

import { useEffect, useState } from 'react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    jobRole: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/employees`)
      .then(res => res.json())
      .then(data => setEmployees(data))
      .catch(() => setError('Failed to load employees'));
  }, []);

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!res.ok) throw new Error('Error creating employee');

      const newEmp = await res.json();
      setEmployees([newEmp, ...employees]);
      setForm({ name: '', email: '', phone: '', department: '', jobRole: '' });
      setShowForm(false);
      setSuccess(true);
    } catch (err) {
      setError('Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

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
              <th className="px-4 py-2 text-left">Phone</th>
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

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Employee</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Full Name" className="w-full border rounded px-3 py-2" />
              <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="Email Address" className="w-full border rounded px-3 py-2" />
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} required placeholder="Phone Number" className="w-full border rounded px-3 py-2" />
              <input type="text" name="department" value={form.department} onChange={handleChange} placeholder="Department" className="w-full border rounded px-3 py-2" />
              <input type="text" name="jobRole" value={form.jobRole} onChange={handleChange} placeholder="Job Role" className="w-full border rounded px-3 py-2" />
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" disabled={loading}>
                  {loading ? 'Saving...' : 'Create'}
                </button>
              </div>
            </form>
            {error && <p className="text-red-600 mt-2">{error}</p>}
            {success && <p className="text-green-600 mt-2">Employee added successfully!</p>}
          </div>
        </div>
      )}
    </div>
  );
}
