"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import NewDepartmentModal from '@/components/shared/NewDepartmentModal';
import NewJobRoleModal from '@/components/shared/NewJobRoleModal';
import { useSession } from "next-auth/react";
import AddEmployeeModal from "@/components/employees/AddEmployeeModal";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

// ⬇️ import your tab panels
import OnboardingAdminTab from './[id]/onboarding/admin-tab';
import DriverLicenses from '@/components/employee/DriverLicenses';
import Training from '@/components/employee/Training';
import EmploymentChecks from '@/components/employee/EmploymentChecks';

export default function EmployeesPageClient() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isDeptModalOpen, setDeptModalOpen] = useState(false);
  const [isRoleModalOpen, setRoleModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "onboarding" | "driverLicenses" | "training" | "employmentChecks">("overview");

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

  // 🟢 New: Handle start onboarding action
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
      // Optionally refresh data if you show onboarding status per employee
      fetchData();
    } catch {
      alert("Network error while starting onboarding");
    }
  };

  // ⬇️ Render a modal/tab panel for selected employee
  const renderEmployeeTabs = () => {
    if (!activeEmployeeId) return null;

    return (
      <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6">
          <div className="mb-6 flex gap-3 border-b pb-2">
            <button
              className={`px-4 py-2 rounded-t font-semibold ${activeTab === "overview" ? "bg-indigo-100 text-indigo-700" : "hover:bg-gray-100"}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              className={`px-4 py-2 rounded-t font-semibold ${activeTab === "onboarding" ? "bg-indigo-100 text-indigo-700" : "hover:bg-gray-100"}`}
              onClick={() => setActiveTab("onboarding")}
            >
              Onboarding History
            </button>
            <button
              className={`px-4 py-2 rounded-t font-semibold ${activeTab === "driverLicenses" ? "bg-indigo-100 text-indigo-700" : "hover:bg-gray-100"}`}
              onClick={() => setActiveTab("driverLicenses")}
            >
              Driver Licenses
            </button>
            <button
              className={`px-4 py-2 rounded-t font-semibold ${activeTab === "training" ? "bg-indigo-100 text-indigo-700" : "hover:bg-gray-100"}`}
              onClick={() => setActiveTab("training")}
            >
              Training
            </button>
            <button
              className={`px-4 py-2 rounded-t font-semibold ${activeTab === "employmentChecks" ? "bg-indigo-100 text-indigo-700" : "hover:bg-gray-100"}`}
              onClick={() => setActiveTab("employmentChecks")}
            >
              Employment Checks
            </button>
            <button
              className="ml-auto px-2 text-red-500 font-bold"
              onClick={() => setActiveEmployeeId(null)}
              title="Close"
            >
              ✕
            </button>
          </div>
          <div>
            {activeTab === "overview" && (
              <div>
                <h2 className="font-semibold text-lg mb-2">Employee Overview</h2>
                {/* You can add more fields/details here */}
                <p>Coming soon: Overview content...</p>
              </div>
            )}
            {activeTab === "onboarding" && (
              <OnboardingAdminTab employeeId={activeEmployeeId} />
            )}
            {activeTab === "driverLicenses" && (
              <DriverLicenses employeeId={activeEmployeeId} />
            )}
            {activeTab === "training" && (
              <Training employeeId={activeEmployeeId} />
            )}
            {activeTab === "employmentChecks" && (
              <EmploymentChecks employeeId={activeEmployeeId} />
            )}
          </div>
        </div>
      </div>
    );
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
                    <button
                      className="text-indigo-600 hover:underline"
                      onClick={() => {
                        setActiveEmployeeId(emp.id);
                        setActiveTab("overview");
                      }}
                    >
                      {emp.firstName} {emp.lastName}
                    </button>
                  </td>
                  <td className="p-3">{emp.phone || "-"}</td>
                  <td className="p-3">{emp.departmentName || "-"}</td>
                  <td className="p-3">{emp.jobRoleName || "-"}</td>
                  <td className="p-3">{emp.email || "-"}</td>
                  <td className="p-3">
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
                        className="text-red-600"
                      >
                        Delete
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStartOnboarding(emp.id)}
                      >
                        Start Onboarding
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AddEmployeeModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchData}
      />

      {isDeptModalOpen && <NewDepartmentModal onClose={() => { setDeptModalOpen(false); fetchData(); }} />}
      {isRoleModalOpen && <NewJobRoleModal onClose={() => { setRoleModalOpen(false); fetchData(); }} />}
      {renderEmployeeTabs()}
    </PageShell>
  );
}
