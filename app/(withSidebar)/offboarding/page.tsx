"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserX,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { FilterProvider, useFilters } from "@/components/ui/FilterProvider";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilterOption } from "@/types/filter";
import {
  FilteredListEmpty,
  FilteredListLoading,
} from "@/components/ui/FilteredListState";

interface OffboardingRecord {
  id: string;
  status: string;
  lastWorkingDate: string;
  offboardingType: string;
  completedAt?: string;
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
  employee: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    department?: {
      id: string;
      name: string;
    };
    jobRole?: {
      id: string;
      name: string;
    };
  };
  initiatedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface JobRoleOption {
  id: string;
  name: string;
}

const statusColors = {
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

const typeColors = {
  RESIGNATION: "bg-blue-100 text-blue-800",
  TERMINATION: "bg-red-100 text-red-800",
  RETIREMENT: "bg-purple-100 text-purple-800",
  END_OF_CONTRACT: "bg-orange-100 text-orange-800",
  REDUNDANCY: "bg-yellow-100 text-yellow-800",
  OTHER: "bg-gray-100 text-gray-800",
};

function OffboardingContent() {
  const breadcrumbs = useBreadcrumbs();
  const { filters, updateFilter, clearFilters, isFiltered } = useFilters();

  const [records, setRecords] = useState<OffboardingRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRoleOption[]>([]);

  useEffect(() => {
    let active = true;
    const loadReferenceData = async () => {
      try {
        const [deptRes, roleRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/job-roles"),
        ]);

        if (!active) return;

        if (deptRes.ok) {
          const data = await deptRes.json();
          const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.departments)
              ? data.departments
              : [];
          setDepartments(
            list.map((dept: any) => ({
              id: dept.id,
              name: dept.name,
            })),
          );
        }

        if (roleRes.ok) {
          const data = await roleRes.json();
          const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.jobRoles)
              ? data.jobRoles
              : [];
          setJobRoles(
            list.map((role: any) => ({
              id: role.id,
              name: role.name,
            })),
          );
        }
      } catch (error) {
        console.error("Error loading filter metadata", error);
      }
    };

    loadReferenceData();
    return () => {
      active = false;
    };
  }, []);

  const statusOptions: FilterOption[] = useMemo(
    () => [
      { label: "All Statuses", value: "all" },
      { label: "In Progress", value: "IN_PROGRESS" },
      { label: "Completed", value: "COMPLETED" },
      { label: "Cancelled", value: "CANCELLED" },
    ],
    [],
  );

  const departmentOptions: FilterOption[] = useMemo(
    () => [
      { label: "All Departments", value: "all" },
      ...departments.map((dept) => ({
        label: dept.name,
        value: dept.id,
      })),
    ],
    [departments],
  );

  const jobRoleOptions: FilterOption[] = useMemo(
    () => [
      { label: "All Roles", value: "all" },
      ...jobRoles.map((role) => ({
        label: role.name,
        value: role.id,
      })),
    ],
    [jobRoles],
  );

  const selectedStatuses = useMemo(
    () => filters.status.filter((value) => value.toLowerCase() !== "all"),
    [filters.status],
  );

  const statusKey = useMemo(() => selectedStatuses.join(","), [selectedStatuses]);

  const fetchOffboardingRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "50" });
      if (statusKey) {
        params.set("status", statusKey);
      }

      const response = await fetch(`/api/offboarding?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch offboarding records");
      }

      const data = await response.json();
      setRecords(Array.isArray(data.records) ? data.records : []);
      setTotalRecords(data.pagination?.total ?? data.records?.length ?? 0);
    } catch (error) {
      console.error("Error fetching offboarding records:", error);
      setRecords([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [statusKey]);

  useEffect(() => {
    fetchOffboardingRecords();
  }, [fetchOffboardingRecords]);

  const filteredRecords = useMemo(() => {
    let results = [...records];
    const query = filters.search.trim().toLowerCase();
    const selectedDepartments = filters.departments.filter(
      (value) => value !== "all",
    );
    const selectedJobRoles = filters.jobRoles.filter((value) => value !== "all");

    if (query) {
      results = results.filter((record) => {
        const employeeName = `${record.employee.user.firstName} ${record.employee.user.lastName}`.toLowerCase();
        const departmentName = record.employee.department?.name?.toLowerCase() ?? "";
        const jobRoleName = record.employee.jobRole?.name?.toLowerCase() ?? "";
        const initiatedBy = `${record.initiatedBy.firstName} ${record.initiatedBy.lastName}`.toLowerCase();
        return (
          employeeName.includes(query) ||
          record.employee.user.email.toLowerCase().includes(query) ||
          departmentName.includes(query) ||
          jobRoleName.includes(query) ||
          initiatedBy.includes(query) ||
          record.offboardingType.toLowerCase().includes(query)
        );
      });
    }

    if (selectedStatuses.length > 0) {
      const allowed = new Set(selectedStatuses);
      results = results.filter((record) => allowed.has(record.status));
    }

    if (selectedDepartments.length > 0) {
      const allowed = new Set(selectedDepartments);
      results = results.filter((record) => {
        const deptId = record.employee.department?.id;
        return deptId ? allowed.has(deptId) : false;
      });
    }

    if (selectedJobRoles.length > 0) {
      const allowed = new Set(selectedJobRoles);
      results = results.filter((record) => {
        const jobRoleId = record.employee.jobRole?.id;
        return jobRoleId ? allowed.has(jobRoleId) : false;
      });
    }

    return results;
  }, [records, filters, selectedStatuses]);

  const totalCount = totalRecords || records.length;

  const statusCounts = useMemo(
    () => ({
      ALL: totalCount,
      IN_PROGRESS: records.filter((record) => record.status === "IN_PROGRESS").length,
      COMPLETED: records.filter((record) => record.status === "COMPLETED").length,
      CANCELLED: records.filter((record) => record.status === "CANCELLED").length,
    }),
    [records, totalCount],
  );

  const activeTab = selectedStatuses.length === 1 ? selectedStatuses[0] : "ALL";

  const handleStatusTabChange = (value: string) => {
    if (value === "ALL") {
      updateFilter("status", []);
    } else {
      updateFilter("status", [value]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return <Clock className="w-4 h-4" />;
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4" />;
      case "CANCELLED":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <UserX className="w-4 h-4" />;
    }
  };

  return (
    <PageShell
      title="Offboarding Management"
      description="Track and manage employee offboarding processes"
      icon={<UserX className="w-6 h-6" />}
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        <FilterBar
          config={{
            searchPlaceholder: "Search by employee, department, or initiator...",
            showStatusFilter: true,
            showDepartmentFilter: true,
            showJobRoleFilter: true,
          }}
          statusOptions={statusOptions}
          departmentOptions={departmentOptions}
          jobRoleOptions={jobRoleOptions}
        />

        <Tabs value={activeTab} onValueChange={handleStatusTabChange} className="mb-2">
          <TabsList className="grid w-full max-w-xl grid-cols-4">
            <TabsTrigger value="ALL">All ({statusCounts.ALL})</TabsTrigger>
            <TabsTrigger value="IN_PROGRESS">
              In Progress ({statusCounts.IN_PROGRESS})
            </TabsTrigger>
            <TabsTrigger value="COMPLETED">
              Completed ({statusCounts.COMPLETED})
            </TabsTrigger>
            <TabsTrigger value="CANCELLED">
              Cancelled ({statusCounts.CANCELLED})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Offboardings</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statusCounts.IN_PROGRESS}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statusCounts.COMPLETED}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {records.length > 0
                  ? Math.round(
                      records.reduce(
                        (sum, record) => sum + record.completionPercentage,
                        0,
                      ) / records.length,
                    )
                  : 0}
                %
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {loading ? (
            <FilteredListLoading
              resourceName="Offboarding records"
              filters={filters}
              statusOptions={statusOptions}
              departmentOptions={departmentOptions}
              jobRoleOptions={jobRoleOptions}
            />
          ) : filteredRecords.length === 0 ? (
            <FilteredListEmpty
              resourceName="Offboarding records"
              filters={filters}
              isFiltered={isFiltered}
              onClearFilters={isFiltered ? clearFilters : undefined}
              statusOptions={statusOptions}
              departmentOptions={departmentOptions}
              jobRoleOptions={jobRoleOptions}
            />
          ) : (
            filteredRecords.map((record) => (
              <Card key={record.id} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(record.status)}
                        <div>
                          <CardTitle className="text-lg">
                            <Link
                              href={`/employees/${record.employee.id}/overview`}
                              className="transition-colors hover:text-primary"
                            >
                              {record.employee.user.firstName}{" "}
                              {record.employee.user.lastName}
                            </Link>
                          </CardTitle>
                          <CardDescription>
                            {record.employee.jobRole?.name || "No role"} •{" "}
                            {record.employee.department?.name || "No department"}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        className={
                          statusColors[record.status as keyof typeof statusColors]
                        }
                      >
                        {record.status.replaceAll("_", " ")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          typeColors[
                            record.offboardingType as keyof typeof typeColors
                          ]
                        }
                      >
                        {record.offboardingType.replaceAll("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Last Working Date</span>
                      </div>
                      <p className="font-medium">
                        {format(new Date(record.lastWorkingDate), "MMM dd, yyyy")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>Initiated By</span>
                      </div>
                      <p className="font-medium">
                        {record.initiatedBy.firstName}{" "}
                        {record.initiatedBy.lastName}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Progress</span>
                        <span>
                          {record.completedTasks}/{record.totalTasks} tasks
                        </span>
                      </div>
                      <Progress value={record.completionPercentage} className="w-full" />
                    </div>
                  </div>

                  {record.status === "COMPLETED" && record.completedAt && (
                    <div className="mt-4 border-t pt-4">
                      <p className="text-sm text-muted-foreground">
                        Completed on{" "}
                        {format(
                          new Date(record.completedAt),
                          "MMM dd, yyyy 'at' h:mm a",
                        )}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}

export default function OffboardingPage() {
  return (
    <FilterProvider>
      <OffboardingContent />
    </FilterProvider>
  );
}
