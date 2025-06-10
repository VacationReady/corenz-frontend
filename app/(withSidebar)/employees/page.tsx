"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import ClientLayout from "@/components/ClientLayout";
import Link from "next/link";


export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    jobRole: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(data))
      .catch(() => setError("Failed to load employees"));
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create employee");
        return;
      }
      const newEmployee = await res.json();
      setEmployees((prev) => [...prev, newEmployee]);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        department: "",
        jobRole: "",
      });
      setError("");
      setModalOpen(false);
    } catch {
      setError("Network error");
    }
  };

  return (
      <div className="w-full px-6 pt-6 bg-gray-100 min-h-screen">
        <div className="bg-white w-full max-w-7xl mx-auto p-8 rounded-xl shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Employees</h1>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Add Employee
            </button>
          </div>

          {error && <p className="text-red-600 mb-4">{error}</p>}

          <table className="min-w-full bg-white border border-gray-300 rounded shadow-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Phone</th>
                <th className="p-2 border">Department</th>
                <th className="p-2 border">Job Role</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="text-center">
                  <td className="p-2 border">
                    <Link
                      href={`/employees/${emp.id}/overview`}
                      className="text-blue-600 hover:underline"
                    >
                      {emp.firstName} {emp.lastName}
                    </Link>
                  </td>
                  <td className="p-2 border">{emp.phone || "-"}</td>
                  <td className="p-2 border">{emp.department || "-"}</td>
                  <td className="p-2 border">{emp.jobRole || "-"}</td>
                  <td className="p-2 border">{emp.email}</td>
                  <td className="p-2 border">
                    <button
                      onClick={async () => {
                        if (!confirm("Are you sure you want to delete this employee?")) return;
                        try {
                          const res = await fetch(`/api/employees/${emp.id}`, { method: "DELETE" });
                          if (!res.ok) throw new Error("Delete failed");
                          setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
                        } catch (err) {
                          alert("Error deleting employee.");
                          console.error(err);
                        }
                      }}
                      className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Add Employee</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {["firstName", "lastName", "email", "phone", "department", "jobRole"].map((field) => (
                  <input
                    key={field}
                    type="text"
                    name={field}
                    placeholder={field[0].toUpperCase() + field.slice(1)}
                    value={formData[field as keyof typeof formData]}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required={["firstName", "lastName", "email"].includes(field)}
                  />
                ))}
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
