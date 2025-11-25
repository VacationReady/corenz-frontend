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

import { useState, useEffect, ChangeEvent, FormEvent, useMemo, useTransition, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
import { MoreVertical, Users, UserX, Archive, UserCheck, UserPlus, Download, Filter, Sparkles, TrendingUp, Building2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { toast } from "sonner";
import { deleteEmployeeAction, sendActivationEmailAction, refreshEmployeesAction } from "./actions";
import { cn } from "@/lib/utils";

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
  initialCounts?: {
    active: number;
    archived: number;
    all: number;
  };
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
  const [counts, setCounts] = useState(() =>
    props.initialCounts || {
      active: props.initialEmployees.filter((emp) => emp.isActive).length,
      archived: props.initialEmployees.filter((emp) => !emp.isActive).length,
      all: props.initialEmployees.length,
    },
  );
  
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

  const hasMountedRef = useRef(false);

  // Fetch data when tab changes (resets to first page)
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
    } else {
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
            <Link
              href={`/employees/${emp.id}/overview`}
              className="group flex items-center gap-3 py-1"
            >
              <div className="relative">
                <Avatar
                  size={36}
                  name={`${emp.firstName} ${emp.lastName}`}
                  src={(emp as any).profileImageUrl}
                  className="ring-2 ring-white dark:ring-card shadow-sm group-hover:ring-primary/30 transition-all duration-200"
                />
                {emp.isActive && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-card" />
                )}
              </div>
              <div>
                <span className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                  {emp.firstName} {emp.lastName}
                </span>
                <p className="text-xs text-muted-foreground truncate max-w-[180px]">{emp.email}</p>
              </div>
            </Link>
          );
        },
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.phone || "—"}
          </span>
        ),
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
        cell: ({ row }) => (
          row.original.departmentName ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-medium">{row.original.departmentName}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )
        ),
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
        cell: ({ row }) => (
          <span className={cn(
            "text-sm",
            row.original.jobRoleName ? "font-medium text-foreground" : "text-muted-foreground"
          )}>
            {row.original.jobRoleName || "—"}
          </span>
        ),
      },
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
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                {emp.isActive ? (
                  <Badge 
                    variant="default" 
                    className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 font-medium"
                  >
                    Active
                  </Badge>
                ) : (
                  <Badge 
                    variant="secondary" 
                    className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-0 font-medium"
                  >
                    Archived
                  </Badge>
                )}
                {emp.isActivated ? (
                  <Badge 
                    variant="outline" 
                    className="text-xs border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20"
                  >
                    Activated
                  </Badge>
                ) : (
                  <Badge 
                    variant="outline"
                    className="text-xs border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/20"
                  >
                    Pending
                  </Badge>
                )}
              </div>
              {!emp.isActive && emp.offboardingRecord && (
                <Badge 
                  variant="outline" 
                  className="text-xs w-fit border-slate-200 dark:border-slate-700"
                >
                  {emp.offboardingRecord.offboardingType.replace("_", " ")}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => {
          const emp = row.original as Employee;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-muted/80 transition-colors duration-200 rounded-lg"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-depth-3 border-border/50">
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
                className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg"
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
                className="rounded-lg"
              >
                {emp.isActivated ? "Resend activation email" : "Send activation email"}
              </DropdownMenuItem>
              {row.original.isActive && !row.original.offboardingRecord && (
                <DropdownMenuItem 
                  onClick={() => handleStartOffboarding(row.original)} 
                  className="text-amber-600 focus:text-amber-600 focus:bg-amber-50 dark:focus:bg-amber-900/20 rounded-lg"
                >
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

  // Calculate additional stats
  const activatedCount = employees.filter(e => e.isActivated).length;
  const pendingActivationCount = employees.filter(e => !e.isActivated && e.isActive).length;

  return (
    <PageShell
      title="Employees"
      description="Manage your team members and their information"
      icon={<Users className="w-6 h-6" />}
      breadcrumbs={breadcrumbs || undefined}
      action={
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Button 
              variant="outline" 
              onClick={handleExport}
              className="border-border/50 hover:bg-muted/50 transition-all duration-200"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Button 
              onClick={() => setModalOpen(true)} 
              variant="primary"
              className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/25 transition-all duration-300"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </motion.div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl backdrop-blur-sm"
            >
              <p className="text-destructive font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {/* Active Employees */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border border-emerald-200/50 dark:border-emerald-700/30 p-5 shadow-depth-2"
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{counts.active}</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Active Employees</p>
              </div>
            </div>
          </motion.div>

          {/* Activated */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200/50 dark:border-blue-700/30 p-5 shadow-depth-2"
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{activatedCount}</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Activated</p>
              </div>
            </div>
          </motion.div>

          {/* Pending Activation */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200/50 dark:border-amber-700/30 p-5 shadow-depth-2"
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-amber-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <Users className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{pendingActivationCount}</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Pending Activation</p>
              </div>
            </div>
          </motion.div>

          {/* Archived */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-700/40 border border-slate-200/50 dark:border-slate-600/30 p-5 shadow-depth-2"
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-slate-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-lg shadow-slate-500/25">
                  <Archive className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{counts.archived}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Archived</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Employee Status Tabs with Reset filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center justify-between gap-3"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/50 backdrop-blur-sm p-1 rounded-xl">
              <TabsTrigger 
                value="active" 
                className={cn(
                  "flex items-center gap-2 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-card"
                )}
              >
                <UserCheck className="w-4 h-4" />
                Active ({counts.active})
              </TabsTrigger>
              <TabsTrigger 
                value="archived" 
                className={cn(
                  "flex items-center gap-2 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-card"
                )}
              >
                <Archive className="w-4 h-4" />
                Archived ({counts.archived})
              </TabsTrigger>
              <TabsTrigger 
                value="all" 
                className={cn(
                  "flex items-center gap-2 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-card"
                )}
              >
                All ({counts.all})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="ghost"
            onClick={() => setResetFiltersTick((t) => t + 1)}
            className="text-sm hover:bg-muted/50 transition-all duration-200"
          >
            <Filter className="w-4 h-4 mr-2" />
            Reset filters
          </Button>
        </motion.div>

        {/* Employee Table with column filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="glass-card rounded-2xl shadow-depth-2 overflow-hidden"
        >
          <div className="p-5">
            <DataTable<Employee, unknown>
              columns={columns}
              data={employees}
              getRowId={(row) => row.id}
              onFilteredRowsChange={(rows) => setVisibleEmployees(rows as Employee[])}
              resetFiltersAt={resetFiltersTick}
            />
            
            {/* Load More Button */}
            <AnimatePresence>
              {pagination.hasMore && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-6 flex justify-center"
                >
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={pagination.loading}
                    className="border-border/50 hover:bg-muted/50 transition-all duration-200 rounded-xl px-6"
                  >
                    {pagination.loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 mr-2 border-2 border-primary border-t-transparent rounded-full"
                        />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Load More Employees
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Loading indicator for initial load */}
            <AnimatePresence>
              {pagination.loading && employees.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-8 text-center"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 mx-auto border-3 border-primary border-t-transparent rounded-full"
                  />
                  <p className="mt-4 text-sm text-muted-foreground font-medium">Loading employees...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
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
