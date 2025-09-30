"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { PageShell } from "@/components/ui/PageShell";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import {
  DepartmentBulkActionDialog,
  CompensationBulkActionDialog,
  TrainingBulkActionDialog,
  LeaveBulkActionDialog,
  MessagingBulkActionDialog,
  type Option,
  type SelectedEmployeeSummary,
  type BulkActionResult,
} from "@/components/bulk-actions/ActionDialogs";
import {
  Building2,
  Coins,
  GraduationCap,
  PlaneTakeoff,
  Megaphone,
  ListChecks,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface EmployeeRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  departmentId: string | null;
  departmentName: string | null;
  jobRoleId: string | null;
  jobRoleName: string | null;
  isActive: boolean;
}

type ActionType =
  | "department"
  | "compensation"
  | "training"
  | "leave"
  | "messaging";

interface FiltersState {
  query: string;
  status: "all" | "active" | "inactive";
  departments: string[];
  jobRoles: string[];
}

const defaultFilters: FiltersState = {
  query: "",
  status: "active",
  departments: ["all"],
  jobRoles: ["all"],
};

export default function BulkActionsPageClient() {
  const breadcrumbs = useBreadcrumbs();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [jobRoles, setJobRoles] = useState<Option[]>([]);
  const [courses, setCourses] = useState<Option[]>([]);
  const [providers, setProviders] = useState<Option[]>([]);
  const [eventCategories, setEventCategories] = useState<Option[]>([]);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [isEmployeeListCollapsed, setIsEmployeeListCollapsed] =
    useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEmployees = useCallback(async () => {
    const response = await fetch("/api/employees?status=all", {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Failed to load employees");
    }
    const payload = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error("Unexpected employee response");
    }

    const mapped: EmployeeRow[] = payload.map((item: any) => {
      const name = `${item.firstName ?? ""} ${item.lastName ?? ""}`
        .trim()
        .replace(/\s+/g, " ");
      return {
        id: item.id,
        userId: item.userId,
        name: name || item.email,
        email: item.email,
        departmentId: item.departmentId ?? null,
        departmentName: item.departmentName ?? null,
        jobRoleId: item.jobRoleId ?? null,
        jobRoleName: item.jobRoleName ?? null,
        isActive: item.isActive !== false,
      };
    });

    setEmployees(mapped);
  }, []);

  const fetchMetadata = useCallback(async () => {
    try {
      const [deptRes, jobRoleRes, courseRes, providerRes, categoryRes] =
        await Promise.all([
          fetch("/api/departments", { cache: "no-store" }),
          fetch("/api/job-roles", { cache: "no-store" }),
          fetch("/api/courses/list", { cache: "no-store" }),
          fetch("/api/providers/list", { cache: "no-store" }),
          fetch("/api/event-categories", { cache: "no-store" }),
        ]);

      if (deptRes.ok) {
        const data = await deptRes.json();
        const mapped: Option[] = (Array.isArray(data) ? data : []).map(
          (dept: any) => ({
            value: String(dept.id),
            label: dept.name,
          }),
        );
        setDepartments(mapped.sort((a, b) => a.label.localeCompare(b.label)));
      } else {
        setMetadataError(
          "Some supporting data failed to load. Please refresh the page.",
        );
      }

      if (jobRoleRes.ok) {
        const data = await jobRoleRes.json();
        const roles = Array.isArray(data)
          ? data
          : Array.isArray(data?.jobRoles)
          ? data.jobRoles
          : [];
        const mapped: Option[] = roles.map((role: any) => ({
          value: String(role.id),
          label: role.name,
        }));
        setJobRoles(mapped.sort((a, b) => a.label.localeCompare(b.label)));
      } else {
        setMetadataError(
          "Some supporting data failed to load. Please refresh the page.",
        );
      }

      if (courseRes.ok) {
        const data = await courseRes.json();
        const mapped: Option[] = (Array.isArray(data) ? data : []).map(
          (course: any) => ({
            value: String(course.id),
            label: course.name,
          }),
        );
        setCourses(mapped.sort((a, b) => a.label.localeCompare(b.label)));
      }

      if (providerRes.ok) {
        const data = await providerRes.json();
        const mapped: Option[] = (Array.isArray(data) ? data : []).map(
          (provider: any) => ({
            value: String(provider.id),
            label: provider.name,
          }),
        );
        setProviders(mapped.sort((a, b) => a.label.localeCompare(b.label)));
      }

      if (categoryRes.ok) {
        const data = await categoryRes.json();
        const mapped = (Array.isArray(data) ? data : []).map((category: any) => ({
          value: String(category.id),
          label: category.name,
          type: category.categoryType,
        }));
        setEventCategories(
          mapped
            .filter((item) => item.type !== "WORKING_EVENT")
            .map(({ value, label }) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
      }
    } catch (error) {
      console.error(error);
      setMetadataError("Unable to load supporting data. Please try again.");
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Promise.all([fetchEmployees(), fetchMetadata()]);
      } catch (error) {
        console.error(error);
        if (mounted) {
          setMetadataError("Unable to load employees. Please try again.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fetchEmployees, fetchMetadata]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (employees.some((emp) => emp.id === id)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return employees.filter((employee) => {
      if (filters.status === "active" && !employee.isActive) return false;
      if (filters.status === "inactive" && employee.isActive) return false;

      if (!filters.departments.includes("all")) {
        if (!employee.departmentId) return false;
        if (!filters.departments.includes(employee.departmentId)) return false;
      }

      if (!filters.jobRoles.includes("all")) {
        if (!employee.jobRoleId) return false;
        if (!filters.jobRoles.includes(employee.jobRoleId)) return false;
      }

      if (query.length > 0) {
        const haystack = `${employee.name} ${employee.email}`
          .toLowerCase()
          .trim();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [employees, filters]);

  const selectedEmployees = useMemo(
    () => employees.filter((employee) => selectedIds.has(employee.id)),
    [employees, selectedIds],
  );

  const selectedSummaries: SelectedEmployeeSummary[] = useMemo(
    () =>
      selectedEmployees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        email: employee.email,
      })),
    [selectedEmployees],
  );

  const allFilteredSelected = useMemo(
    () =>
      filteredEmployees.length > 0 &&
      filteredEmployees.every((employee) => selectedIds.has(employee.id)),
    [filteredEmployees, selectedIds],
  );

  const someFilteredSelected = useMemo(
    () =>
      filteredEmployees.some((employee) => selectedIds.has(employee.id)),
    [filteredEmployees, selectedIds],
  );

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredEmployees.forEach((employee) => next.delete(employee.id));
      } else {
        filteredEmployees.forEach((employee) => next.add(employee.id));
      }
      return next;
    });
  }, [allFilteredSelected, filteredEmployees]);

  const toggleEmployeeSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleReasonableError = (message: string) => {
    toast.error(message);
  };

  const handleActionCompleted = useCallback(
    async (_result: BulkActionResult) => {
      setActiveAction(null);
      setSelectedIds(new Set());
      try {
        setRefreshing(true);
        await fetchEmployees();
      } catch (error) {
        console.error(error);
        handleReasonableError("Unable to refresh employee list after update");
      } finally {
        setRefreshing(false);
      }
    },
    [fetchEmployees],
  );

  const departmentFilterOptions = useMemo(() => departments, [departments]);
  const jobRoleFilterOptions = useMemo(() => jobRoles, [jobRoles]);

  const statusLabel: Record<FiltersState["status"], string> = {
    all: "All employees",
    active: "Active",
    inactive: "Inactive",
  };

  const selectionState = allFilteredSelected
    ? true
    : someFilteredSelected
    ? "indeterminate"
    : false;

  const handleConfigure = useCallback((action: ActionType) => {
    setActiveAction(action);
  }, []);

  const actionCards: Array<{
    id: ActionType;
    title: string;
    description: string;
    icon: React.ReactNode;
    bullets: string[];
  }> = [
    {
      id: "department",
      title: "Realign teams",
      description:
        "Move people between departments or job roles without leaving the page.",
      icon: <Building2 className="h-5 w-5" />,
      bullets: [
        "Apply multiple department or job role changes in one submission.",
        "Capture an audit reason once and reuse it across employees.",
        "Keep user profiles and reporting lines in sync automatically.",
      ],
    },
    {
      id: "compensation",
      title: "Adjust compensation",
      description:
        "Increase or decrease salaries and hourly rates with precise controls.",
      icon: <Coins className="h-5 w-5" />,
      bullets: [
        "Support both percentage and fixed adjustments.",
        "Target salaries, hourly rates, or both at the same time.",
        "Automatically record the change in each employee's audit history.",
      ],
    },
    {
      id: "training",
      title: "Assign training",
      description:
        "Create consistent training records across a cohort with one click.",
      icon: <GraduationCap className="h-5 w-5" />,
      bullets: [
        "Pick a course and provider and assign to everyone instantly.",
        "Capture completion and expiry dates for compliance tracking.",
        "Feeds into expiry alerts and existing training dashboards.",
      ],
    },
    {
      id: "leave",
      title: "Book leave",
      description:
        "Block time in bulk while honouring approval workflows and balances.",
      icon: <PlaneTakeoff className="h-5 w-5" />,
      bullets: [
        "Reuse existing leave categories and entitlements.",
        "Optionally fast-track approvals for special cases.",
        "Instant notifications keep managers and employees aligned.",
      ],
    },
    {
      id: "messaging",
      title: "Send announcement",
      description:
        "Craft branded communications with reusable content blocks.",
      icon: <Megaphone className="h-5 w-5" />,
      bullets: [
        "Compose the subject, body, and call-to-action in one place.",
        "Send a test message before broadcasting to the full audience.",
        "Archive the rationale in audit history for future reference.",
      ],
    },
  ];

  return (
    <PageShell
      title="Bulk actions"
      description="Build precise cohorts and run high-trust updates without leaving the admin workspace."
      icon={<ListChecks className="h-7 w-7" />}
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        {metadataError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {metadataError}
          </div>
        )}

        {/* Employee targeting moved into individual action dialogs */}

        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {actionCards.map((card) => (
            <Card
              key={card.id}
              title={card.title}
              icon={card.icon}
              action={
                <Button
                  onClick={() => handleConfigure(card.id)}
                >
                  Configure
                </Button>
              }
              variant="default"
              className="border border-glass"
            >
              <div className="space-y-3">
                <CardDescription>{card.description}</CardDescription>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {card.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <DepartmentBulkActionDialog
        open={activeAction === "department"}
        onOpenChange={(open) => setActiveAction(open ? "department" : null)}
        allEmployees={employees}
        departments={departments}
        jobRoles={jobRoles}
        onCompleted={handleActionCompleted}
      />

      <CompensationBulkActionDialog
        open={activeAction === "compensation"}
        onOpenChange={(open) => setActiveAction(open ? "compensation" : null)}
        allEmployees={employees}
        onCompleted={handleActionCompleted}
      />

      <TrainingBulkActionDialog
        open={activeAction === "training"}
        onOpenChange={(open) => setActiveAction(open ? "training" : null)}
        allEmployees={employees}
        courses={courses}
        providers={providers}
        onCompleted={handleActionCompleted}
      />

      <LeaveBulkActionDialog
        open={activeAction === "leave"}
        onOpenChange={(open) => setActiveAction(open ? "leave" : null)}
        allEmployees={employees}
        eventCategories={eventCategories}
        onCompleted={handleActionCompleted}
      />

      <MessagingBulkActionDialog
        open={activeAction === "messaging"}
        onOpenChange={(open) => setActiveAction(open ? "messaging" : null)}
        allEmployees={employees}
        departments={departments}
        jobRoles={jobRoles}
        onCompleted={handleActionCompleted}
      />
    </PageShell>
  );
}
