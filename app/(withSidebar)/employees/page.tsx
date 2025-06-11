"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageShell from "@/components/ui/PageShell";

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
    <PageShell title="Employees" action={<Button onClick={() => setModalOpen(true)}>Add Employee</Button>}>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-100 border-b">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3">Department</th>
                <th className="text-left p-3">Job Role</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b hover:bg-neutral-50">
                  <td className="p-3">
                    <Link href={`/employees/${emp.id}/overview`} className="text-indigo-600 hover:underline">
                      {emp.firstName} {emp.lastName}
                    </Link>
                  </td>
                  <td className="p-3">{emp.phone || "-"}</td>
                  <td className="p-3">{emp.department || "-"}</td>
                  <td className="p-3">{emp.jobRole || "-"}</td>
                  <td className="p-3">{emp.email}</td>
                  <td className="p-3">
                    <Button
                      variant="destructive"
                      size="sm"
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
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Add Employee</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {["firstName", "lastName", "email", "phone", "department", "jobRole"].map((field) => (
                <Input
                  key={field}
                  type="text"
                  name={field}
                  placeholder={field[0].toUpperCase() + field.slice(1)}
                  value={formData[field as keyof typeof formData]}
                  onChange={handleChange}
                  required={["firstName", "lastName", "email"].includes(field)}
                />
              ))}
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
