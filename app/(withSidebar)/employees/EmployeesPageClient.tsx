"use client";

import { useState, useEffect, ChangeEvent, FormEvent, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import NewDepartmentModal from "@/components/shared/NewDepartmentModal";
import NewJobRoleModal from "@/components/shared/NewJobRoleModal";
import AddEmployeeModal from "@/components/employees/AddEmployeeModal";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OffboardingModal from "@/components/employees/OffboardingModal";
import { MoreVertical, Users, UserX, Archive } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { toast } from "sonner";

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
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("active");
  const [error, setError] = useState("");
  const [visibleEmployees, setVisibleEmployees] = useState<Employee[]>([]);
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
    setError("");
    try {
      const [empRes, deptRes, roleRes] = await Promise.all([
        fetch(`/api/employees?status=${status}`),
        fetch("/api/departments"),
        fetch("/api/job-roles"),
      ]);

      // Employees
      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(Array.isArray(data) ? data : []);
      } else {
        const msg = await empRes.json().catch(() => ({}));
        console.error("employees fetch failed", msg);
        setEmployees([]);
      }

      // Departments
      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(Array.isArray(data) ? data : data.departments || []);
      } else {
        const msg = await deptRes.json().catch(() => ({}));
        console.error("departments fetch failed", msg);
        setDepartments([]);
      }

      // Job roles
      if (roleRes.ok) {
        const data = await roleRes.json();
        setJobRoles(Array.isArray(data) ? data : data.jobRoles || []);
      } else {
        const msg = await roleRes.json().catch(() => ({}));
        console.error("job-roles fetch failed", msg);
        setJobRoles([]);
      }

      // Only show a banner if at least one failed
      if (!empRes.ok || !deptRes.ok || !roleRes.ok) {
        setError("Some data failed to load. Showing partial results.");
      }
    } catch (e) {
      console.error("fetchData error", e);
      setError("Failed to load data");
      setEmployees([]);
      setDepartments([]);
      setJobRoles([]);
    }
  };

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
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

  // 🟠 Handle offboarding
  const handleStartOffboarding = (employee: Employee) => {
    setSelectedEmployee(employee);
    setOffboardingModalOpen(true);
  };

  const handleOffboardingSuccess = () => {
    fetchData(activeTab);
    setSelectedEmployee(null);
  };

  // DataTable columns with per-column filters
  const columns: ColumnDef<Employee>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        meta: {
          filter: { type: "multi" },
        },
        cell: ({ row }) => {
          const emp = row.original as Employee;
          return (
            <div className="flex items-center gap-3">
              <Avatar
                size={28}
                name={`${emp.firstName} ${emp.lastName}`}
                src={(emp as any).profileImageUrl}
              />
              <Link
                href={`/employees/${emp.id}/overview`}
                className="text-primary hover:text-primary/80 font-medium transition-smooth"
              >
                {emp.firstName} {emp.lastName}
              </Link>
            </div>
          );
        },
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => (row.original.phone ? row.original.phone : "-"),
      },
      {
        accessorKey: "departmentName",
        header: "Department",
        meta: {
          filter: {
            type: "multi",
            options: ({ departments }: any) =>
              (departments || []).map((d: any) => ({ label: d.name, value: d.name })),
          },
        },
        cell: ({ row }) => row.original.departmentName || "-",
      },
      {
        accessorKey: "jobRoleName",
        header: "Job Role",
        meta: {
          filter: {
            type: "multi",
            options: ({ jobRoles }: any) =>
              (jobRoles || []).map((j: any) => ({ label: j.name, value: j.name })),
          },
        },
        cell: ({ row }) => row.original.jobRoleName || "-",
      },
      { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email || "-" },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => (row.isActive ? "Active" : "Archived"),
        meta: {
          filter: {
            type: "multi",
            options: [
              { label: "Active", value: "Active" },
              { label: "Archived", value: "Archived" },
            ],
          },
        },
        cell: ({ row }) => (
          row.original.isActive ? (
            <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
          ) : (
            <div className="flex flex-col gap-1">
              <Badge variant="secondary" className="bg-gray-100 text-gray-800">Archived</Badge>
              {row.original.offboardingRecord && (
                <Badge variant="outline" className="text-xs">
                  {row.original.offboardingRecord.offboardingType.replace("_", " ")}
                </Badge>
              )}
            </div>
          )
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => {
          const emp = row.original as Employee;
          return (
            <DropdownMenu
              trigger={
                <Button size="sm" variant="ghost">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              }
            >
              <DropdownMenuItem
                onClick={async () => {
                  if (
                    !confirm(
                      "This is a hard delete. All data related to this employee (documents, forms, audits, leave, onboarding, etc.) will be permanently removed. Are you sure you want to proceed?",
                    )
                  )
                    return;
                  try {
                    setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
                    const res = await fetch(`/api/employees/${emp.id}`, { method: "DELETE" });
                    if (!res.ok) {
                      const errorData = await res.json().catch(() => ({}));
                      throw new Error((errorData as any).error || "Delete failed");
                    }
                    toast.success("Employee deleted");
                    setTimeout(() => {
                      fetchData(activeTab);
                    }, 0);
                  } catch (err) {
                    setTimeout(() => fetchData(activeTab), 0);
                    toast.error(`Error deleting employee: ${(err as Error).message}`);
                    console.error(err);
                  }
                }}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/employees/${emp.id}/send-invite`, { method: "POST" });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      toast.error(data.error || "Failed to send invite");
                      return;
                    }
                    toast.success("Login invite sent");
                    fetchData(activeTab);
                  } catch (e) {
                    toast.error("Network error sending invite");
                  }
                }}
              >
                Resend invite
              </DropdownMenuItem>
              {row.original.isActive && !row.original.offboardingRecord && (
                <DropdownMenuItem onClick={() => handleStartOffboarding(row.original)} className="text-orange-600">
                  <UserX className="w-4 h-4 mr-2" />
                  Start Offboarding
                </DropdownMenuItem>
              )}
            </DropdownMenu>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, departments, jobRoles],
  );

  // Export CSV
  const handleExport = () => {
    const csvContent = [
      ["Name", "Email", "Phone", "Department", "Job Role", "Role"],
      ...(visibleEmployees.length > 0 ? visibleEmployees : employees).map((emp) => [
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
      action={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>Export</Button>
          <Button onClick={() => setModalOpen(true)} variant="primary">
            Add Employee
          </Button>
        </div>
      }
    >
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive font-medium">{error}</p>
        </div>
      )}

      {/* Column filters are rendered by DataTable at the top of the table */}

      {/* Employee Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Active ({employees.filter((emp) => emp.isActive).length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="w-4 h-4" />
            Archived ({employees.filter((emp) => !emp.isActive).length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            All ({employees.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Employee Table with column filters */}
      <div className="bg-card rounded-xl shadow-lg border border-enhanced overflow-hidden p-4">
        <DataTable<Employee, unknown>
          columns={columns}
          data={employees}
          getRowId={(row) => row.id}
          onFilteredRowsChange={(rows) => setVisibleEmployees(rows as Employee[])}
        />
      </div>

      {/* Modals */}
      <AddEmployeeModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchData(activeTab)}
      />
      {isDeptModalOpen && (
        <NewDepartmentModal
          onClose={() => {
            setDeptModalOpen(false);
            fetchData(activeTab);
          }}
        />
      )}
      {isRoleModalOpen && (
        <NewJobRoleModal
          onClose={() => {
            setRoleModalOpen(false);
            fetchData(activeTab);
          }}
        />
      )}
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
  return <EmployeesContent />;
}
