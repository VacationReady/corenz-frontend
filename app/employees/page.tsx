'use client';

import { useEffect, useState } from 'react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    jobRole: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/employees')
      .then((res) => res.json())
      .then((data) => setEmployees(data))
      .catch(() => setError('Failed to load employees'));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          department: '',
          jobRole: '',
        });
        const newEmployee = await res.json();
        setEmployees((prev) => [...prev, newEmployee]);
        setError('');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create employee');
      }
    } catch (err) {
      setError('Server error');
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Employees</h1>

      <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-lg">
        {['firstName', 'lastName', 'email', 'phone', 'department', 'jobRole'].map((field) => (
          <input
            key={field}
            type="text"
            name={field}
            placeholder={field[0].toUpperCase() + field.slice(1)}
            value={(formData as any)[field]}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required={['firstName', 'lastName', 'email'].includes(field)}
          />
        ))}
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Add Employee
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </form>

      <ul className="mt-6 space-y-2">
        {employees.map((emp: any) => (
          <li key={emp.id} className="p-2 border rounded">
            {emp.firstName} {emp.lastName} – {emp.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
