"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import NewDepartmentModal from "./NewDepartmentModal";
import NewJobRoleModal from "./NewJobRoleModal";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isDeptModalOpen, setDeptModalOpen] = useState(false);
  const [isRoleModalOpen, setRoleModalOpen] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    startDate: "",
    role: "EMPLOYEE",
    departmentId: "",
    jobRoleId: "",
    managerId: "",
  });

      const fetchData = async () => {
  try {
    const [empRes, deptRes, roleRes] = await Promise.all([
      fetch("/api/employees").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/job-roles").then((r) => r.json()),
    ]);
    setEmployees(empRes.filter((emp: any) => emp.user)); // Filter valid employees
    setDepartments(Array.isArray(deptRes) ? deptRes : deptRes.departments || []);
    setJobRoles(Array.isArray(roleRes) ? roleRes : roleRes.jobRoles || []);
  } catch {
    setError("Failed to load data");
  }
};

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      setError("");
      setModalOpen(false);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        startDate: "",
        role: "EMPLOYEE",
        departmentId: "",
        jobRoleId: "",
        managerId: "",
      });
      fetchData();
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
                    {emp.user ? (
                      <Link
                        href={`/employees/${emp.id}/overview`}
                        className="text-indigo-600 hover:underline"
                      >
                        {emp.user.firstName} {emp.user.lastName}
                      </Link>
                    ) : (
                      <span className="text-gray-400">User missing</span>
                    )}
                  </td>
                  <td className="p-3">{emp.user?.phone || "-"}</td>
                  <td className="p-3">{emp.user?.department?.name || "-"}</td>
                  <td className="p-3">{emp.user?.jobRole?.name || "-"}</td>
                  <td className="p-3">{emp.user?.email || "-"}</td>
                  <td className="p-3">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={async () => {
                        if (!confirm("Are you sure you want to delete this employee?")) return;
                        try {
                          const res = await fetch(`/api/employees/${emp.id}`, { method: "DELETE" });
                          if (!res.ok) throw new Error("Delete failed");
                          fetchData();
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

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Add Employee</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required />
              <Input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required />
              <Input name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
              <Input name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} />
              <Input type="date" name="startDate" placeholder="Start Date" value={formData.startDate} onChange={handleChange} required />
              <select name="role" value={formData.role} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2">
                {["EMPLOYEE", "MANAGER", "ADMIN"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <div className="flex space-x-2">
                <select name="departmentId" value={formData.departmentId} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <Button type="button" size="sm" onClick={() => setDeptModalOpen(true)}>+ New</Button>
              </div>
              <div className="flex space-x-2">
                <select name="jobRoleId" value={formData.jobRoleId} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="">Select Job Role</option>
                  {jobRoles.map((j) => (
                    <option key={j.id} value={j.id}>{j.name}</option>
                  ))}
                </select>
                <Button type="button" size="sm" onClick={() => setRoleModalOpen(true)}>+ New</Button>
              </div>
              <select name="managerId" value={formData.managerId} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="">Select Line Manager (Optional)</option>
                {employees.map((emp) => (
                  emp.user && (
                    <option key={emp.id} value={emp.id}>
                      {emp.user.firstName} {emp.user.lastName} ({emp.role})
                    </option>
                  )
                ))}
              </select>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {isDeptModalOpen && <NewDepartmentModal onClose={() => { setDeptModalOpen(false); fetchData(); }} />}
      {isRoleModalOpen && <NewJobRoleModal onClose={() => { setRoleModalOpen(false); fetchData(); }} />}
    </PageShell>
  );
}
