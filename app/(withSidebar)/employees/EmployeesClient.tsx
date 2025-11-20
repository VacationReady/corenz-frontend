"use client";

/**
 * Employees Directory - Client Component
 * 
 * Next.js 15 client component that handles all interactivity.
 * Receives initial data from server component for fast page loads.
 * 
 * Features:
 * - Interactive table with filters
 * - Incremental pagination (Load More)
 * - Server actions for mutations
 * - Modal management
 * 
 * Related:
 * - Prompt 6: Paginated API
 * - Prompt 7: Client pagination
 * - Prompt 8: Server-first refactor
 */

import { useState, useEffect, ChangeEvent, FormEvent, useMemo, useTransition } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import NewDepartmentModal from "@/components/shared/NewDepartmentModal";
import NewJobRoleModal from "@/components/shared/NewJobRoleModal";
import AddEmployeeModal from "@/components/employees/AddEmployeeModal";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OffboardingModal from "@/components/employees/OffboardingModal";
import { MoreVertical, Users, UserX, Archive } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { toast } from "sonner";
import { deleteEmployeeAction, sendActivationEmailAction, refreshEmployeesAction } from "./actions";

// ✅ Inline type definition to avoid import error
type FilterOption = { label: string; value: string };

// Props received from server component
interface EmployeesClientProps {
  initialEmployees: Employee[];
  initialPagination: {
    cursor: string | null;
    hasMore: boolean;
    limit: number;
  };
  departments: any[];
  jobRoles: any[];
}

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
  isActivated: boolean;
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

const sortEmployees = (list: Employee[]) =>
  [...list].sort((a, b) => {
    const firstNameCompare = (a.firstName || "").localeCompare(b.firstName || "", undefined, {
      sensitivity: "base",
    });
    if (firstNameCompare !== 0) return firstNameCompare;
    const lastNameCompare = (a.lastName || "").localeCompare(b.lastName || "", undefined, {
      sensitivity: "base",
    });
    if (lastNameCompare !== 0) return lastNameCompare;
    return (a.email || "").localeCompare(b.email || "", undefined, { sensitivity: "base" });
  });

function EmployeesContent(props: EmployeesClientProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Initialize with server-provided data
  const [employees, setEmployees] = useState<Employee[]>(sortEmployees(props.initialEmployees));
  const [departments] = useState<any[]>(props.departments);
  const [jobRoles] = useState<any[]>(props.jobRoles);
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
  const [resetFiltersTick, setResetFiltersTick] = useState(0);
  
  // Pagination state (initialized from server)
  const [pagination, setPagination] = useState<{
    cursor: string | null;
    hasMore: boolean;
    loading: boolean;
  }>({
    cursor: props.initialPagination.cursor,
    hasMore: props.initialPagination.hasMore,
    loading: false,
  });
  
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

  const fetchData = async (status = "all", reset = true) => {
    setError("");
    if (reset) {
      setPagination({ cursor: null, hasMore: false, loading: true });
    } else {
      setPagination(prev => ({ ...prev, loading: true }));
    }
    
    try {
      const cursor = reset ? "" : pagination.cursor || "";
      const limit = 50; // Load 50 employees per page
      
      // Fetch employees only (departments and jobRoles come from server props)
      const headers: HeadersInit = {};
      if (session?.user?.companyId) {
        headers["x-company-id"] = session.user.companyId;
      }
      const empRes = await fetch(`/api/employees?status=${status}&limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`, { headers });

      // Employees (new paginated format)
      if (empRes.ok) {
        const response = await empRes.json();
        
        // Handle both old array format (backward compatibility) and new paginated format
        const employeesData: Employee[] = Array.isArray(response) 
          ? response 
          : (response.data || []);
        
        const paginationData = response.pagination || { cursor: null, hasMore: false };
        
        if (reset) {
          setEmployees(sortEmployees(employeesData));
        } else {
          // Append to existing employees
          setEmployees(prev => sortEmployees([...prev, ...employeesData]));
        }
        
        setPagination({
          cursor: paginationData.cursor,
          hasMore: paginationData.hasMore,
          loading: false,
        });
      } else {
        const msg = await empRes.json().catch(() => ({}));
        console.error("employees fetch failed", msg);
        if (reset) setEmployees([]);
        setPagination(prev => ({ ...prev, loading: false }));
        setError("Failed to load employees. Please try again.");
      }
    } catch (e) {
      console.error("fetchData error", e);
      setError("Failed to load data");
      if (reset) {
        setEmployees([]);
      }
      setPagination(prev => ({ ...prev, loading: false }));
    }
  };
  
  const loadMore = () => {
    if (!pagination.loading && pagination.hasMore) {
      fetchData(activeTab, false);
    }
  };

  // Fetch data when tab changes (resets to first page)
  useEffect(() => {
    if (activeTab !== "active") {
      // Only fetch if switching away from initial "active" tab
      fetchData(activeTab, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      fetchData(activeTab, true);
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
    fetchData(activeTab, true);
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
        cell: ({ row }) => {
          const emp = row.original as Employee;
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {emp.isActive ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-800">Archived</Badge>
                )}
                <Badge variant={emp.isActivated ? "outline" : "destructive"} className="text-xs">
                  {emp.isActivated ? "Activated" : "Pending"}
                </Badge>
              </div>
              {!emp.isActive && emp.offboardingRecord && (
                <Badge variant="outline" className="text-xs">
                  {emp.offboardingRecord.offboardingType.replace("_", " ")}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => {
          const emp = row.original as Employee;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                onClick={async () => {
                  if (
                    !confirm(
                      "This is a hard delete. All data related to this employee (documents, forms, audits, leave, onboarding, etc.) will be permanently removed. Are you sure you want to proceed?",
                    )
                  )
                    return;
                  try {
                    // Optimistic update
                    setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
                    
                    // Use server action
                    startTransition(async () => {
                      const result = await deleteEmployeeAction(emp.id);
                      
                      if (result.success) {
                        toast.success("Employee deleted");
                        // Refresh from server to ensure consistency
                        router.refresh();
                      } else {
                        // Revert optimistic update
                        fetchData(activeTab, true);
                        toast.error(result.error || "Failed to delete employee");
                      }
                    });
                  } catch (err) {
                    // Revert optimistic update
                    fetchData(activeTab, true);
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
                    startTransition(async () => {
                      const result = await sendActivationEmailAction(emp.id);
                      
                      if (result.success) {
                        toast.success(`Activation email sent to ${emp.email}`);
                      } else {
                        toast.error(result.error || "Failed to send activation email");
                      }
                    });
                  } catch (e) {
                    toast.error("Network error sending activation email");
                  }
                }}
              >
                {emp.isActivated ? "Resend activation email" : "Send activation email"}
              </DropdownMenuItem>
              {row.original.isActive && !row.original.offboardingRecord && (
                <DropdownMenuItem onClick={() => handleStartOffboarding(row.original)} className="text-orange-600">
                  <UserX className="w-4 h-4 mr-2" />
                  Start Offboarding
                </DropdownMenuItem>
              )}
              </DropdownMenuContent>
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

      {/* Employee Status Tabs with Reset filters */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
        <Button
          variant="ghost"
          onClick={() => setResetFiltersTick((t) => t + 1)}
          className="text-sm"
        >
          Reset filters
        </Button>
      </div>

      {/* Employee Table with column filters */}
      <div className="bg-card rounded-xl shadow-lg border border-enhanced overflow-hidden p-4">
        <DataTable<Employee, unknown>
          columns={columns}
          data={employees}
          getRowId={(row) => row.id}
          onFilteredRowsChange={(rows) => setVisibleEmployees(rows as Employee[])}
          resetFiltersAt={resetFiltersTick}
        />
        
        {/* Load More Button */}
        {pagination.hasMore && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={pagination.loading}
            >
              {pagination.loading ? "Loading..." : "Load More Employees"}
            </Button>
          </div>
        )}
        
        {/* Loading indicator for initial load */}
        {pagination.loading && employees.length === 0 && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Loading employees...
          </div>
        )}
      </div>

      {/* Modals */}
      <AddEmployeeModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          startTransition(async () => {
            await refreshEmployeesAction();
            router.refresh();
          });
        }}
      />
      {isDeptModalOpen && (
        <NewDepartmentModal
          onClose={() => {
            setDeptModalOpen(false);
            startTransition(() => router.refresh());
          }}
        />
      )}
      {isRoleModalOpen && (
        <NewJobRoleModal
          onClose={() => {
            setRoleModalOpen(false);
            startTransition(() => router.refresh());
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

export default function EmployeesClient(props: EmployeesClientProps) {
  return <EmployeesContent {...props} />;
}
