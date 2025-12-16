"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Activity,
  Sparkles,
  Eye,
  MoreHorizontal,
  ChevronRight,
  CalendarDays,
  Package,
  MessageSquare,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import Link from "next/link";
import { FilterProvider, useFilters } from "@/components/ui/FilterProvider";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilterOption } from "@/types/filter";
import {
  FilteredListEmpty,
  FilteredListLoading,
} from "@/components/ui/FilteredListState";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

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

const statusConfig = {
  IN_PROGRESS: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    icon: Clock,
    gradient: "from-blue-500 to-indigo-500",
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    icon: CheckCircle,
    gradient: "from-emerald-500 to-green-500",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-300",
    icon: AlertCircle,
    gradient: "from-slate-500 to-gray-500",
  },
};

const typeConfig: Record<string, { label: string; color: string; emoji: string }> = {
  RESIGNATION: {
    label: "Resignation",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    emoji: "👋",
  },
  TERMINATION: {
    label: "Termination",
    color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
    emoji: "⚠️",
  },
  RETIREMENT: {
    label: "Retirement",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    emoji: "🎉",
  },
  END_OF_CONTRACT: {
    label: "End of Contract",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    emoji: "📄",
  },
  REDUNDANCY: {
    label: "Redundancy",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    emoji: "📉",
  },
  OTHER: {
    label: "Other",
    color: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
    emoji: "📋",
  },
};

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.01 },
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
            }))
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
            }))
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
    []
  );

  const departmentOptions: FilterOption[] = useMemo(
    () => [
      { label: "All Departments", value: "all" },
      ...departments.map((dept) => ({
        label: dept.name,
        value: dept.id,
      })),
    ],
    [departments]
  );

  const jobRoleOptions: FilterOption[] = useMemo(
    () => [
      { label: "All Roles", value: "all" },
      ...jobRoles.map((role) => ({
        label: role.name,
        value: role.id,
      })),
    ],
    [jobRoles]
  );

  const selectedStatuses = useMemo(
    () => filters.status.filter((value) => value.toLowerCase() !== "all"),
    [filters.status]
  );

  const statusKey = useMemo(
    () => selectedStatuses.join(","),
    [selectedStatuses]
  );

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
      (value) => value !== "all"
    );
    const selectedJobRoles = filters.jobRoles.filter(
      (value) => value !== "all"
    );

    if (query) {
      results = results.filter((record) => {
        const employeeName =
          `${record.employee.user.firstName} ${record.employee.user.lastName}`.toLowerCase();
        const departmentName =
          record.employee.department?.name?.toLowerCase() ?? "";
        const jobRoleName = record.employee.jobRole?.name?.toLowerCase() ?? "";
        const initiatedBy =
          `${record.initiatedBy.firstName} ${record.initiatedBy.lastName}`.toLowerCase();
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
      IN_PROGRESS: records.filter((record) => record.status === "IN_PROGRESS")
        .length,
      COMPLETED: records.filter((record) => record.status === "COMPLETED")
        .length,
      CANCELLED: records.filter((record) => record.status === "CANCELLED")
        .length,
    }),
    [records, totalCount]
  );

  const activeTab =
    selectedStatuses.length === 1 ? selectedStatuses[0] : "ALL";

  const handleStatusTabChange = (value: string) => {
    if (value === "ALL") {
      updateFilter("status", []);
    } else {
      updateFilter("status", [value]);
    }
  };

  // Calculate stats
  const averageCompletion = useMemo(() => {
    if (records.length === 0) return 0;
    return Math.round(
      records.reduce((sum, record) => sum + record.completionPercentage, 0) /
        records.length
    );
  }, [records]);

  const upcomingDepartures = useMemo(() => {
    return records.filter((record) => {
      const lastDay = new Date(record.lastWorkingDate);
      const daysUntil = differenceInDays(lastDay, new Date());
      return daysUntil >= 0 && daysUntil <= 14 && record.status === "IN_PROGRESS";
    }).length;
  }, [records]);

  return (
    <PageShell
      title="Offboarding Management"
      description="Track and manage employee offboarding processes"
      icon={<UserX className="w-6 h-6" />}
      breadcrumbs={breadcrumbs}
    >
      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="space-y-6"
      >
        {/* Stats Cards */}
        <motion.div
          variants={fadeInUp}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Total Offboardings */}
          <motion.div
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 p-5"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-500/10 to-transparent rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Total Offboardings
                </span>
                <div className="p-2 rounded-xl bg-slate-500/10">
                  <UserX className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground">{totalCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All time records
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                  <Activity className="w-3 h-3" />
                  <span>Active tracking</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* In Progress */}
          <motion.div
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="relative overflow-hidden rounded-2xl border border-blue-200/50 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  In Progress
                </span>
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                    {statusCounts.IN_PROGRESS}
                  </p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                    Active processes
                  </p>
                </div>
                {upcomingDepartures > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 text-xs text-blue-700 dark:text-blue-300">
                    <CalendarDays className="w-3 h-3" />
                    <span>{upcomingDepartures} this week</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Completed */}
          <motion.div
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-5"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Completed
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                    {statusCounts.COMPLETED}
                  </p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                    Successfully closed
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-3 h-3" />
                  <span>On track</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Average Completion */}
          <motion.div
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="relative overflow-hidden rounded-2xl border border-violet-200/50 dark:border-violet-800/50 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-5"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                  Avg. Completion
                </span>
                <div className="p-2 rounded-xl bg-violet-500/10">
                  <Target className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">
                    {averageCompletion}%
                  </p>
                  <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-1">
                    Task completion rate
                  </p>
                </div>
                <div className="w-16">
                  <Progress value={averageCompletion} className="h-1.5" />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={fadeInUp}>
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
        </motion.div>

        {/* Status Tabs */}
        <motion.div variants={fadeInUp}>
          <Tabs
            value={activeTab}
            onValueChange={handleStatusTabChange}
            className="w-full"
          >
            <TabsList className="inline-flex h-12 items-center justify-start rounded-xl bg-muted/50 p-1 gap-1">
              <TabsTrigger
                value="ALL"
                className="relative px-4 py-2 rounded-lg font-medium text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm"
              >
                <span className="flex items-center gap-2">
                  All
                  <span className="px-2 py-0.5 rounded-md bg-muted text-xs font-semibold">
                    {statusCounts.ALL}
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="IN_PROGRESS"
                className="relative px-4 py-2 rounded-lg font-medium text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  In Progress
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-xs font-semibold">
                    {statusCounts.IN_PROGRESS}
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="COMPLETED"
                className="relative px-4 py-2 rounded-lg font-medium text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Completed
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs font-semibold">
                    {statusCounts.COMPLETED}
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="CANCELLED"
                className="relative px-4 py-2 rounded-lg font-medium text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-500" />
                  Cancelled
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300 text-xs font-semibold">
                    {statusCounts.CANCELLED}
                  </span>
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Records List */}
        <motion.div variants={fadeInUp} className="space-y-4">
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
            <AnimatePresence mode="popLayout">
              {filteredRecords.map((record, index) => {
                const status =
                  statusConfig[record.status as keyof typeof statusConfig];
                const type =
                  typeConfig[record.offboardingType] || typeConfig.OTHER;
                const daysUntilLastDay = differenceInDays(
                  new Date(record.lastWorkingDate),
                  new Date()
                );
                const StatusIcon = status?.icon || Clock;

                return (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/employees/${record.employee.id}/offboarding`}>
                      <motion.div
                        whileHover={{ scale: 1.005 }}
                        whileTap={{ scale: 0.995 }}
                        className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm hover:border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                      >
                        {/* Status indicator bar */}
                        <div
                          className={cn(
                            "absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b",
                            status?.gradient || "from-slate-500 to-gray-500"
                          )}
                        />

                        <div className="p-5 pl-6">
                          <div className="flex items-start justify-between gap-4">
                            {/* Employee Info */}
                            <div className="flex items-start gap-4 flex-1">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                  <span className="text-lg font-bold text-primary">
                                    {record.employee.user.firstName?.charAt(0)}
                                    {record.employee.user.lastName?.charAt(0)}
                                  </span>
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-border flex items-center justify-center text-xs">
                                  {type.emoji}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                    {record.employee.user.firstName}{" "}
                                    {record.employee.user.lastName}
                                  </h3>
                                  <Badge className={cn("text-xs", status?.color)}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {status?.label}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={cn("text-xs", type.color)}
                                  >
                                    {type.label}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {record.employee.jobRole?.name || "No role"} •{" "}
                                  {record.employee.department?.name ||
                                    "No department"}
                                </p>
                              </div>
                            </div>

                            {/* Progress & Actions */}
                            <div className="flex items-center gap-6">
                              {/* Last Working Date */}
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground mb-1">
                                  Last Working Day
                                </p>
                                <p className="font-semibold">
                                  {format(
                                    new Date(record.lastWorkingDate),
                                    "MMM dd, yyyy"
                                  )}
                                </p>
                                {daysUntilLastDay >= 0 &&
                                  record.status === "IN_PROGRESS" && (
                                    <p
                                      className={cn(
                                        "text-xs mt-0.5",
                                        daysUntilLastDay <= 7
                                          ? "text-amber-600 dark:text-amber-400"
                                          : "text-muted-foreground"
                                      )}
                                    >
                                      {daysUntilLastDay === 0
                                        ? "Today"
                                        : daysUntilLastDay === 1
                                        ? "Tomorrow"
                                        : `${daysUntilLastDay} days left`}
                                    </p>
                                  )}
                              </div>

                              {/* Progress */}
                              <div className="w-32">
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                                  <span>Progress</span>
                                  <span className="font-medium">
                                    {record.completedTasks}/{record.totalTasks}
                                  </span>
                                </div>
                                <Progress
                                  value={record.completionPercentage}
                                  className="h-2"
                                />
                                <p className="text-xs text-right mt-1 font-semibold text-primary">
                                  {record.completionPercentage}%
                                </p>
                              </div>

                              {/* View Button */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Footer Info */}
                          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/30">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <User className="w-3.5 h-3.5" />
                              <span>
                                Initiated by {record.initiatedBy.firstName}{" "}
                                {record.initiatedBy.lastName}
                              </span>
                            </div>

                            {record.status === "COMPLETED" &&
                              record.completedAt && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>
                                    Completed{" "}
                                    {formatDistanceToNow(
                                      new Date(record.completedAt),
                                      { addSuffix: true }
                                    )}
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </motion.div>
      </motion.div>
    </PageShell>
  );
}

export default function OffboardingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <FilterProvider>
        <OffboardingContent />
      </FilterProvider>
    </Suspense>
  );
}
