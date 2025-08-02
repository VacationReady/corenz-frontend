"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import NewDepartmentModal from "@/components/shared/NewDepartmentModal";
import NewJobRoleModal from "@/components/shared/NewJobRoleModal";
import { useSession } from "next-auth/react";
import AddEmployeeModal from "@/components/employees/AddEmployeeModal";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

export default function EmployeesPageClient() {
  const { data: session } = useSession();

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

      setEmployees(empRes);
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

  // 🟢 Handle start onboarding action
  const handleStartOnboarding = async (employeeId: string) => {
    if (!employeeId) return;
    try {
      const res = await fetch(`/api/onboarding/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to start onboarding");
        return;
      }

      alert("Onboarding started!");
      fetchData();
    } catch {
      alert("Network error while starting onboarding");
    }
  };

  return (
    <PageShell
      title="Employees"
      description="Manage your team members and their information"
      action={<Button onClick={() => setModalOpen(true)} variant="primary">Add Employee</Button>}
    >
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive font-medium">{error}</p>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-lg border border-enhanced overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-card-header sticky top-0 z-10">
              <tr className="border-b border-enhanced">
                <th className="text-left p-4 font-semibold text-foreground">Name</th>
                <th className="text-left p-4 font-semibold text-foreground">Phone</th>
                <th className="text-left p-4 font-semibold text-foreground">Department</th>
                <th className="text-left p-4 font-semibold text-foreground">Job Role</th>
                <th className="text-left p-4 font-semibold text-foreground">Email</th>
                <th className="text-left p-4 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-enhanced">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-section-background transition-smooth">
                  <td className="p-4">
                    <Link
                      href={`/employees/${emp.id}/overview`}
                      className="text-primary hover:text-primary/80 font-medium transition-smooth"
                    >
                      {emp.firstName} {emp.lastName}
                    </Link>
                  </td>
                  <td className="p-4 text-foreground">{emp.phone || "-"}</td>
                  <td className="p-4 text-foreground">{emp.departmentName || "-"}</td>
                  <td className="p-4 text-foreground">{emp.jobRoleName || "-"}</td>
                  <td className="p-4 text-foreground">{emp.email || "-"}</td>
                  <td className="p-4">
                    <DropdownMenu
                      trigger={
                        <Button size="sm" variant="ghost">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      }
                    >
                      <DropdownMenuItem
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
                        className="text-destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStartOnboarding(emp.id)}>
                        Start Onboarding
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddEmployeeModal open={isModalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchData} />
      {isDeptModalOpen && <NewDepartmentModal onClose={() => { setDeptModalOpen(false); fetchData(); }} />}
      {isRoleModalOpen && <NewJobRoleModal onClose={() => { setRoleModalOpen(false); fetchData(); }} />}
    </PageShell>
  );
}
