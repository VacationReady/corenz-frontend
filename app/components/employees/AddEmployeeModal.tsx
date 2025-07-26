"use client"
import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import NewDepartmentModal from "@/components/shared/NewDepartmentModal";
import NewJobRoleModal from "@/components/shared/NewJobRoleModal";
import { useSession } from "next-auth/react";

interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddEmployeeModal({ open, onClose, onSuccess }: AddEmployeeModalProps) {
  const { data: session } = useSession();
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [isDeptModalOpen, setDeptModalOpen] = useState(false);
  const [isRoleModalOpen, setRoleModalOpen] = useState(false);

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
      setEmployees(empRes.filter((emp: any) => emp.user));
      setDepartments(Array.isArray(deptRes) ? deptRes : deptRes.departments || []);
      setJobRoles(Array.isArray(roleRes) ? roleRes : roleRes.jobRoles || []);
    } catch {
      setError("Failed to load data");
    }
  };

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        companyId: session?.user?.companyId,
      };

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create employee");
        return;
      }

      setError("");
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

      onClose();
      if (onSuccess) onSuccess();
    } catch {
      setError("Network error");
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <Card className="w-full max-w-md p-6 space-y-4">
          <h2 className="text-lg font-semibold">Add Employee</h2>
          {error && <p className="text-red-600">{error}</p>}
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
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Card>
      </div>

      {isDeptModalOpen && <NewDepartmentModal onClose={() => { setDeptModalOpen(false); fetchData(); }} />}
      {isRoleModalOpen && <NewJobRoleModal onClose={() => { setRoleModalOpen(false); fetchData(); }} />}
    </>
  );
}
