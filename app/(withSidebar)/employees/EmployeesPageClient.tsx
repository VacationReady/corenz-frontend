"use client";

import { useState, useEffect, ChangeEvent, FormEvent, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { FilterProvider, useFilters } from "@/components/ui/FilterProvider";
import { FilterBar } from "@/components/ui/FilterBar";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import NewDepartmentModal from "@/components/shared/NewDepartmentModal";
import NewJobRoleModal from "@/components/shared/NewJobRoleModal";
import AddEmployeeModal from "@/components/employees/AddEmployeeModal";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OffboardingModal from "@/components/employees/OffboardingModal";
import { MoreVertical, Users, UserX, Archive } from "lucide-react";

// ✅ Inline type definition to avoid import error
type FilterOption = { label: string; value: string };

export const dynamic = "force-dynamic";

interface Employee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  departmentId?: string;
  departmentName?: string;
  jobRoleId?: string;
  jobRoleName?: string;
  isActive: boolean;
  offboardingStatus?: string;
  lastWorkingDate?: string;
  offboardingRecord?: {
    id: string;
    status: string;
    lastWorkingDate: string;
    offboardingType: string;
    completedAt?: string;
  };
}

function EmployeesContent() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isDeptModalOpen, setDeptModalOpen] = useState(false);
  const [isRoleModalOpen, setRoleModalOpen] = useState(false);
  const [isOffboardingModalOpen, setOffboardingModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState("active");
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

  const fetchData = async (status = "all") => {
    try {
      const [empRes, deptRes, roleRes] = await Promise.all([
        fetch(`/api/employees?status=${status}`).then((r) => r.json()),
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
    fetchData(activeTab);
  }, [activeTab]);

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

  // 🟢 Handle onboarding
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

  // 🟠 Handle offboarding
  const handleStartOffboarding = (employee: Employee) => {
    setSelectedEmployee(employee);
    setOffboardingModalOpen(true);
  };

  const handleOffboardingSuccess = () => {
    fetchData(activeTab);
    setSelectedEmployee(null);
  };

  // Filters
  const departmentOptions: FilterOption[] = useMemo(
    () => [{ label: "All Departments", value: "all" }, ...departments.map((dept) => ({ label: dept.name, value: dept.id }))],
    [departments]
  );

  const jobRoleOptions: FilterOption[] = useMemo(
    () => [{ label: "All Job Roles", value: "all" }, ...jobRoles.map((role) => ({ label: role.name, value: role.id }))],
    [jobRoles]
  );

  const statusOptions: FilterOption[] = [
    { label: "All Status", value: "all" },
    { label: "Admin", value: "ADMIN" },
    { label: "Manager", value: "MANAGER" },
    { label: "Employee", value: "EMPLOYEE" },
  ];

  const sortOptions: FilterOption[] = [
    { label: "Name", value: "name" },
    { label: "Email", value: "email" },
    { label: "Department", value: "department" },
    { label: "Job Role", value: "jobRole" },
    { label: "Role", value: "role" },
  ];

  const { filters } = useFilters();

  const filteredEmployees = useMemo(() => {
    let filtered = [...employees];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchLower) ||
          emp.email?.toLowerCase().includes(searchLower) ||
          emp.phone?.toLowerCase().includes(searchLower) ||
          emp.departmentName?.toLowerCase().includes(searchLower) ||
          emp.jobRoleName?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.departments.length > 0 && !filters.departments.includes("all")) {
      filtered = filtered.filter((emp) => emp.departmentId && filters.departments.includes(emp.departmentId));
    }

    if (filters.jobRoles.length > 0 && !filters.jobRoles.includes("all")) {
      filtered = filtered.filter((emp) => emp.jobRoleId && filters.jobRoles.includes(emp.jobRoleId));
    }

    if (filters.status.length > 0 && !filters.status.includes("all")) {
      filtered = filtered.filter((emp) => filters.status.includes(emp.role));
    }

    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let aValue = "";
        let bValue = "";

        switch (filters.sortBy) {
          case "name":
            aValue = `${a.firstName} ${a.lastName}`;
            bValue = `${b.firstName} ${b.lastName}`;
            break;
          case "email":
            aValue = a.email || "";
            bValue = b.email || "";
            break;
          case "department":
            aValue = a.departmentName || "";
            bValue = b.departmentName || "";
            break;
          case "jobRole":
            aValue = a.jobRoleName || "";
            bValue = b.jobRoleName || "";
            break;
          case "role":
            aValue = a.role || "";
            bValue = b.role || "";
            break;
        }

        const comparison = aValue.localeCompare(bValue);
        return filters.sortOrder === "desc" ? -comparison : comparison;
      });
    }

    return filtered;
  }, [employees, filters]);

  // Export CSV
  const handleExport = () => {
    const csvContent = [
      ["Name", "Email", "Phone", "Department", "Job Role", "Role"],
      ...filteredEmployees.map((emp) => [
        `${emp.firstName} ${emp.lastName}`,
        emp.email || "",
        emp.phone || "",
        emp.departmentName || "",
        emp.jobRoleName || "",
        emp.role || "",
      ]),
    ]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const breadcrumbs = useBreadcrumbs();

  return (
    <PageShell
      title="Employees"
      description="Manage your team members and their information"
      icon={<Users className="w-6 h-6" />}
      breadcrumbs={breadcrumbs || undefined}
      action={<Button onClick={() => setModalOpen(true)} variant="primary">Add Employee</Button>}
    >
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive font-medium">{error}</p>
        </div>
      )}

      {/* Filter Bar */}
      <div className="mb-6">
        <FilterBar
          config={{
            searchPlaceholder: "Search employees by name, email, phone...",
            showDepartmentFilter: true,
            showJobRoleFilter: true,
            showStatusFilter: true,
          }}
          departmentOptions={departmentOptions}
          jobRoleOptions={jobRoleOptions}
          statusOptions={statusOptions}
          sortOptions={sortOptions}
          onExport={handleExport}
        />
      </div>

      {/* Employee Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Active ({employees.filter(emp => emp.isActive).length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="w-4 h-4" />
            Archived ({employees.filter(emp => !emp.isActive).length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            All ({employees.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Employee Table */}
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
                <th className="text-left p-4 font-semibold text-foreground">Status</th>
                <th className="text-left p-4 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-enhanced">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    {filters.search || filters.departments.length > 0 || filters.jobRoles.length > 0 || filters.status.length > 0
                      ? "No employees match your current filters."
                      : "No employees found."}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-section-background transition-smooth">
                    <td className="p-4">
                      <Link href={`/employees/${emp.id}/overview`} className="text-primary hover:text-primary/80 font-medium transition-smooth">
                        {emp.firstName} {emp.lastName}
                      </Link>
                    </td>
                    <td className="p-4 text-foreground">{emp.phone || "-"}</td>
                    <td className="p-4 text-foreground">{emp.departmentName || "-"}</td>
                    <td className="p-4 text-foreground">{emp.jobRoleName || "-"}</td>
                    <td className="p-4 text-foreground">{emp.email || "-"}</td>
                    <td className="p-4">
                      {emp.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                            Archived
                          </Badge>
                          {emp.offboardingRecord && (
                            <Badge variant="outline" className="text-xs">
                              {emp.offboardingRecord.offboardingType.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                      )}
                    </td>
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
                        {emp.isActive && !emp.offboardingRecord && (
                          <DropdownMenuItem 
                            onClick={() => handleStartOffboarding(emp)}
                            className="text-orange-600"
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Start Offboarding
                          </DropdownMenuItem>
                        )}
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddEmployeeModal open={isModalOpen} onClose={() => setModalOpen(false)} onSuccess={() => fetchData(activeTab)} />
      {isDeptModalOpen && <NewDepartmentModal onClose={() => { setDeptModalOpen(false); fetchData(activeTab); }} />}
      {isRoleModalOpen && <NewJobRoleModal onClose={() => { setRoleModalOpen(false); fetchData(activeTab); }} />}
      <OffboardingModal 
        open={isOffboardingModalOpen} 
        onClose={() => {
          setOffboardingModalOpen(false);
          setSelectedEmployee(null);
        }} 
        employee={selectedEmployee}
        onSuccess={handleOffboardingSuccess}
      />
    </PageShell>
  );
}

export default function EmployeesPageClient() {
  return (
    <FilterProvider>
      <EmployeesContent />
    </FilterProvider>
  );
}
