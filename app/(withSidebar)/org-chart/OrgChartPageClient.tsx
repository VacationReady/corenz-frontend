
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Button from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { Input } from "@/components/ui/Input";
import { MultiSelect } from "@/components/ui/MultiSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import {
  Download,
  Filter,
  RefreshCw,
  Users,
  GitBranch,
  Briefcase,
  Building2,
  UserCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 130;
const HORIZONTAL_SPACING = 80;
const VERTICAL_SPACING = 120;
const HORIZONTAL_MARGIN = 96;
const VERTICAL_MARGIN_TOP = 48;
const VERTICAL_MARGIN_BOTTOM = 120;

interface ApiEmployee {
  id: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  departmentId?: string | null;
  departmentName?: string | null;
  jobRoleId?: string | null;
  jobRoleName?: string | null;
  isActive: boolean;
  profileImageUrl?: string | null;
  managerUserId?: string | null;
}

interface OrgEmployee {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  jobTitle: string | null;
  jobRoleId: string | null;
  department: string | null;
  departmentId: string | null;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  profileImageUrl: string | null;
  managerUserId: string | null;
  managerName: string | null;
}

interface OrgNode extends OrgEmployee {
  children: OrgNode[];
  isMatch?: boolean;
}

const roleLabels: Record<OrgEmployee["role"], string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

const roleBadgeClasses: Record<OrgEmployee["role"], string> = {
  ADMIN: "border-primary/30 bg-primary/10 text-primary",
  MANAGER: "border-amber-400/40 bg-amber-400/15 text-amber-600",
  EMPLOYEE: "border-slate-300 bg-slate-200/40 text-slate-600",
};

function OrgChartPageClient() {
  const breadcrumbs = useBreadcrumbs();
  const [rawEmployees, setRawEmployees] = useState<ApiEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([
    "all",
  ]);
  const [selectedJobRoles, setSelectedJobRoles] = useState<string[]>(["all"]);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const fetchEmployees = useCallback(
    async (showFullLoading = true) => {
      setError(null);
      if (showFullLoading) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const res = await fetch("/api/employees?status=active", {
          credentials: "include",
        });

        if (!res.ok) {
          const details = await res.json().catch(() => ({}));
          throw new Error(details?.error || "Unable to load employees");
        }

        const data = await res.json();
        if (!Array.isArray(data)) {
          throw new Error("Unexpected response format");
        }

        setRawEmployees(
          data.map((raw) => {
            const emp = raw as Partial<ApiEmployee> & Record<string, unknown>;

            return {
              id: String(emp.id ?? ""),
              userId: String(emp.userId ?? ""),
              firstName: (emp.firstName as string | null | undefined) ?? null,
              lastName: (emp.lastName as string | null | undefined) ?? null,
              email: String(emp.email ?? ""),
              role: (emp.role ?? "EMPLOYEE") as ApiEmployee["role"],
              departmentId: (emp.departmentId as string | null | undefined) ?? null,
              departmentName:
                (emp.departmentName as string | null | undefined) ?? null,
              jobRoleId: (emp.jobRoleId as string | null | undefined) ?? null,
              jobRoleName:
                (emp.jobRoleName as string | null | undefined) ?? null,
              isActive: Boolean(emp.isActive),
              profileImageUrl:
                (emp.profileImageUrl as string | null | undefined) ?? null,
              managerUserId:
                (emp.managerUserId as string | null | undefined) ?? null,
            } satisfies ApiEmployee;
          }),
        );
      } catch (err) {
        console.error("Failed to load employees", err);
        setError(
          err instanceof Error ? err.message : "Failed to load employees",
        );
        setRawEmployees([]);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchEmployees(true);
  }, [fetchEmployees]);

  const employeesByUserId = useMemo(() => {
    const map = new Map<string, ApiEmployee>();
    rawEmployees.forEach((emp) => {
      map.set(emp.userId, emp);
    });
    return map;
  }, [rawEmployees]);

  const normalizedEmployees = useMemo<OrgEmployee[]>(() => {
    return rawEmployees.map((emp) => {
      const fullName = `${emp.firstName ?? ""} ${emp.lastName ?? ""}`
        .replace(/\s+/g, " ")
        .trim();
      const safeName = fullName.length > 0 ? fullName : emp.email;
      const manager = emp.managerUserId
        ? employeesByUserId.get(emp.managerUserId)
        : undefined;
      const managerFullName = manager
        ? `${manager.firstName ?? ""} ${manager.lastName ?? ""}`
            .replace(/\s+/g, " ")
            .trim() || manager.email
        : null;

      return {
        id: emp.id,
        userId: emp.userId,
        fullName: safeName,
        email: emp.email,
        jobTitle: emp.jobRoleName ?? null,
        jobRoleId: emp.jobRoleId ?? null,
        department: emp.departmentName ?? null,
        departmentId: emp.departmentId ?? null,
        role: emp.role,
        profileImageUrl: emp.profileImageUrl ?? null,
        managerUserId: emp.managerUserId ?? null,
        managerName: managerFullName,
      } satisfies OrgEmployee;
    });
  }, [rawEmployees, employeesByUserId]);

  const orgForest = useMemo<OrgNode[]>(() => {
    const byUserId = new Map<string, OrgNode>();
    const nodes = normalizedEmployees.map<OrgNode>((emp) => ({
      ...emp,
      children: [],
    }));

    nodes.forEach((node) => {
      byUserId.set(node.userId, node);
    });

    const roots: OrgNode[] = [];

    nodes.forEach((node) => {
      const managerId = node.managerUserId;
      if (
        managerId &&
        managerId !== node.userId &&
        byUserId.has(managerId)
      ) {
        byUserId.get(managerId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortNodes = (list: OrgNode[]) => {
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
      list.forEach((child) => sortNodes(child.children));
    };

    sortNodes(roots);
    return roots;
  }, [normalizedEmployees]);

  const departmentOptions = useMemo(
    () =>
      Array.from(
        normalizedEmployees.reduce((acc, emp) => {
          if (emp.departmentId && emp.department) {
            acc.set(emp.departmentId, emp.department);
          }
          return acc;
        }, new Map<string, string>()),
        ([value, label]) => ({ value, label }),
      ).sort((a, b) => a.label.localeCompare(b.label)),
    [normalizedEmployees],
  );

  const jobRoleOptions = useMemo(
    () =>
      Array.from(
        normalizedEmployees.reduce((acc, emp) => {
          if (emp.jobRoleId && emp.jobTitle) {
            acc.set(emp.jobRoleId, emp.jobTitle);
          }
          return acc;
        }, new Map<string, string>()),
        ([value, label]) => ({ value, label }),
      ).sort((a, b) => a.label.localeCompare(b.label)),
    [normalizedEmployees],
  );

  const filteredForest = useMemo<OrgNode[]>(() => {
    if (!orgForest.length) {
      return [];
    }

    const search = searchTerm.trim().toLowerCase();
    const departmentFilter = selectedDepartments.includes("all")
      ? null
      : new Set(selectedDepartments);
    const jobRoleFilter = selectedJobRoles.includes("all")
      ? null
      : new Set(selectedJobRoles);
    const roleValue = roleFilter === "all" ? null : roleFilter;

    const applyFilters = (node: OrgNode): OrgNode | null => {
      const matchesSearch =
        !search ||
        node.fullName.toLowerCase().includes(search) ||
        (node.jobTitle ?? "").toLowerCase().includes(search) ||
        (node.department ?? "").toLowerCase().includes(search);

      const matchesDepartment =
        !departmentFilter ||
        (node.departmentId ? departmentFilter.has(node.departmentId) : false);

      const matchesJobRole =
        !jobRoleFilter ||
        (node.jobRoleId ? jobRoleFilter.has(node.jobRoleId) : false);

      const matchesRole = !roleValue || node.role === roleValue;

      const isMatch =
        matchesSearch && matchesDepartment && matchesJobRole && matchesRole;

      const children = node.children
        .map(applyFilters)
        .filter((child): child is OrgNode => child !== null);

      if (isMatch || children.length > 0) {
        return {
          ...node,
          children,
          isMatch,
        };
      }

      return null;
    };

    return orgForest
      .map(applyFilters)
      .filter((node): node is OrgNode => node !== null);
  }, [
    orgForest,
    searchTerm,
    selectedDepartments,
    selectedJobRoles,
    roleFilter,
  ]);

  const layout = useMemo(() => {
    if (!filteredForest.length) {
      return {
        width: 720,
        height: 360,
        positions: new Map<string, { x: number; y: number }>(),
      };
    }

    const levels = collectLevels(filteredForest);
    const rowWidths = levels.map(
      (level) =>
        level.length * NODE_WIDTH +
        Math.max(0, level.length - 1) * HORIZONTAL_SPACING,
    );
    const maxRowWidth = rowWidths.length
      ? Math.max(...rowWidths)
      : NODE_WIDTH;
    const width = Math.max(
      maxRowWidth + HORIZONTAL_MARGIN * 2,
      720,
    );
    const height =
      VERTICAL_MARGIN_TOP +
      levels.length * NODE_HEIGHT +
      Math.max(0, levels.length - 1) * VERTICAL_SPACING +
      VERTICAL_MARGIN_BOTTOM;

    const positions = new Map<string, { x: number; y: number }>();

    levels.forEach((level, levelIndex) => {
      const rowWidth = rowWidths[levelIndex];
      const startX = (width - rowWidth) / 2;
      const y = VERTICAL_MARGIN_TOP + levelIndex * (NODE_HEIGHT + VERTICAL_SPACING);

      level.forEach((node, nodeIndex) => {
        const x = startX + nodeIndex * (NODE_WIDTH + HORIZONTAL_SPACING);
        positions.set(node.id, { x, y });
      });
    });

    return { width, height, positions };
  }, [filteredForest]);

  const flattenedNodes = useMemo(() => flattenTree(filteredForest), [
    filteredForest,
  ]);

  const connections = useMemo(() => {
    const segments: { d: string }[] = [];
    const { positions } = layout;

    const walk = (node: OrgNode) => {
      const parentPos = positions.get(node.id);
      if (!parentPos) return;

      node.children.forEach((child) => {
        const childPos = positions.get(child.id);
        if (!childPos) return;

        const parentCenterX = parentPos.x + NODE_WIDTH / 2;
        const parentBottomY = parentPos.y + NODE_HEIGHT;
        const childCenterX = childPos.x + NODE_WIDTH / 2;
        const childTopY = childPos.y;
        const midY = parentBottomY + (childTopY - parentBottomY) / 2;

        const d = [
          `M ${parentCenterX} ${parentBottomY}`,
          `L ${parentCenterX} ${midY}`,
          `L ${childCenterX} ${midY}`,
          `L ${childCenterX} ${childTopY}`,
        ].join(" ");

        segments.push({ d });
        walk(child);
      });
    };

    filteredForest.forEach(walk);
    return segments;
  }, [filteredForest, layout]);

  const totalEmployees = normalizedEmployees.length;
  const visibleEmployees = useMemo(
    () => countNodes(filteredForest),
    [filteredForest],
  );
  const managerCount = useMemo(
    () => normalizedEmployees.filter((emp) => emp.role === "MANAGER").length,
    [normalizedEmployees],
  );
  const departmentCount = departmentOptions.length;

  const isFiltered = useMemo(() => {
    const hasSearch = searchTerm.trim().length > 0;
    const hasDept =
      selectedDepartments.length > 0 &&
      !selectedDepartments.includes("all");
    const hasRole =
      selectedJobRoles.length > 0 && !selectedJobRoles.includes("all");
    const hasType = roleFilter !== "all";
    return hasSearch || hasDept || hasRole || hasType;
  }, [searchTerm, selectedDepartments, selectedJobRoles, roleFilter]);

  const handleRefresh = () => fetchEmployees(false);

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedDepartments(["all"]);
    setSelectedJobRoles(["all"]);
    setRoleFilter("all");
  };

  const handleExport = useCallback(async () => {
    if (!filteredForest.length) {
      toast.error("There is nothing to export yet.");
      return;
    }

    setIsExporting(true);
    try {
      const pdfLib = await import("pdf-lib");
      const { PDFDocument, rgb, StandardFonts } = pdfLib;

      const levels = collectLevels(filteredForest);
      const rowWidths = levels.map(
        (level) =>
          level.length * NODE_WIDTH +
          Math.max(0, level.length - 1) * HORIZONTAL_SPACING,
      );
      const maxRowWidth = rowWidths.length
        ? Math.max(...rowWidths)
        : NODE_WIDTH;
      const pageWidth = Math.max(
        842,
        maxRowWidth + HORIZONTAL_MARGIN * 2,
      );

      const pdfTopMargin = 140;
      const pdfBottomMargin = 80;
      const totalTreeHeight =
        levels.length * NODE_HEIGHT +
        Math.max(0, levels.length - 1) * VERTICAL_SPACING;
      const pageHeight = Math.max(
        595,
        pdfTopMargin + totalTreeHeight + pdfBottomMargin,
      );

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const headerY = pageHeight - 56;
      page.drawText("Organization Chart", {
        x: 48,
        y: headerY,
        size: 20,
        font: titleFont,
        color: rgb(0.09, 0.12, 0.2),
      });
      page.drawText(
        `Visible: ${visibleEmployees} of ${totalEmployees} • Managers: ${managerCount} • Departments: ${departmentCount}`,
        {
          x: 48,
          y: headerY - 24,
          size: 11,
          font: bodyFont,
          color: rgb(0.45, 0.49, 0.56),
        },
      );
      if (isFiltered) {
        page.drawText("Filters applied", {
          x: 48,
          y: headerY - 40,
          size: 10,
          font: bodyFont,
          color: rgb(0.55, 0.22, 0.22),
        });
      }

      const positions = new Map<string, { x: number; y: number }>();
      const firstRowY = pageHeight - pdfTopMargin - NODE_HEIGHT;

      levels.forEach((level, levelIndex) => {
        const rowWidth = rowWidths[levelIndex];
        const startX = (pageWidth - rowWidth) / 2;
        const y = firstRowY - levelIndex * (NODE_HEIGHT + VERTICAL_SPACING);

        level.forEach((node, idx) => {
          const x = startX + idx * (NODE_WIDTH + HORIZONTAL_SPACING);
          positions.set(node.id, { x, y });
        });
      });

      const lineColor = rgb(0.73, 0.78, 0.86);

      const drawConnections = (node: OrgNode) => {
        const parentPos = positions.get(node.id);
        if (!parentPos) return;

        node.children.forEach((child) => {
          const childPos = positions.get(child.id);
          if (!childPos) return;

          const parentCenterX = parentPos.x + NODE_WIDTH / 2;
          const parentBottomY = parentPos.y;
          const childCenterX = childPos.x + NODE_WIDTH / 2;
          const childTopY = childPos.y + NODE_HEIGHT;
          const midY = parentBottomY + (childTopY - parentBottomY) / 2;

          page.drawLine({
            start: { x: parentCenterX, y: parentBottomY },
            end: { x: parentCenterX, y: midY },
            thickness: 1.2,
            color: lineColor,
          });
          page.drawLine({
            start: {
              x: Math.min(parentCenterX, childCenterX),
              y: midY,
            },
            end: {
              x: Math.max(parentCenterX, childCenterX),
              y: midY,
            },
            thickness: 1.2,
            color: lineColor,
          });
          page.drawLine({
            start: { x: childCenterX, y: midY },
            end: { x: childCenterX, y: childTopY },
            thickness: 1.2,
            color: lineColor,
          });

          drawConnections(child);
        });
      };

      filteredForest.forEach(drawConnections);

      const highlightBorder = rgb(0.32, 0.55, 0.93);
      const baseBorder = rgb(0.75, 0.8, 0.86);
      const cardFill = rgb(0.97, 0.98, 1);

      const truncate = (value: string, length: number) =>
        value.length > length ? `${value.slice(0, length - 1)}…` : value;

      const drawNode = (node: OrgNode) => {
        const pos = positions.get(node.id);
        if (!pos) return;

        page.drawRectangle({
          x: pos.x,
          y: pos.y,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          borderWidth: 1.5,
          borderColor: node.isMatch ? highlightBorder : baseBorder,
          color: cardFill,
          opacity: node.isMatch ? 1 : 0.98,
        });

        const nameY = pos.y + NODE_HEIGHT - 24;
        page.drawText(truncate(node.fullName, 32), {
          x: pos.x + 18,
          y: nameY,
          size: 12,
          font: titleFont,
          color: rgb(0.12, 0.16, 0.24),
        });

        const title = node.jobTitle ?? "Role not assigned";
        page.drawText(truncate(title, 36), {
          x: pos.x + 18,
          y: nameY - 16,
          size: 10,
          font: bodyFont,
          color: rgb(0.36, 0.4, 0.5),
        });

        const department = node.department ?? "No department";
        page.drawText(truncate(`Dept: ${department}`, 40), {
          x: pos.x + 18,
          y: nameY - 34,
          size: 9,
          font: bodyFont,
          color: rgb(0.44, 0.48, 0.56),
        });

        const manager = node.managerName ?? "Reports to leadership";
        page.drawText(truncate(`Reports to: ${manager}`, 46), {
          x: pos.x + 18,
          y: nameY - 50,
          size: 9,
          font: bodyFont,
          color: rgb(0.5, 0.32, 0.32),
        });

        page.drawText(
          `${roleLabels[node.role]} • ${node.children.length} direct ${
            node.children.length === 1 ? "report" : "reports"
          }`,
          {
            x: pos.x + 18,
            y: pos.y + 18,
            size: 9,
            font: bodyFont,
            color: rgb(0.35, 0.39, 0.48),
          },
        );

        node.children.forEach(drawNode);
      };

      filteredForest.forEach(drawNode);

      const pdfBytes = await pdfDoc.save();
      const arrayBuffer =
        pdfBytes.buffer instanceof ArrayBuffer
          ? pdfBytes.buffer.slice(
              pdfBytes.byteOffset,
              pdfBytes.byteOffset + pdfBytes.byteLength,
            )
          : Uint8Array.from(pdfBytes).buffer;
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `org-chart-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Org chart exported successfully");
    } catch (err) {
      console.error("Failed to export org chart", err);
      toast.error(
        err instanceof Error ? err.message : "Unable to export org chart",
      );
    } finally {
      setIsExporting(false);
    }
  }, [
    filteredForest,
    departmentCount,
    managerCount,
    totalEmployees,
    visibleEmployees,
    isFiltered,
  ]);

  const stats = [
    {
      label: "People in chart",
      value: totalEmployees,
      icon: Users,
      tone: "text-primary",
    },
    {
      label: "Managers",
      value: managerCount,
      icon: GitBranch,
      tone: "text-emerald-600",
    },
    {
      label: "Departments",
      value: departmentCount,
      icon: Building2,
      tone: "text-amber-600",
    },
  ];

  return (
    <PageShell
      title="Org Chart"
      description="Navigate your organisation with an interactive, filterable hierarchy and export ready-to-share visuals."
      breadcrumbs={breadcrumbs}
      icon={<Sparkles className="h-6 w-6 text-primary" />}
      action={
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={handleRefresh}
            loading={isRefreshing}
            loadingText="Refreshing"
          >
            Refresh data
          </Button>
          <Button
            icon={<Download className="h-4 w-4" />}
            onClick={handleExport}
            loading={isExporting}
            loadingText="Creating PDF"
            disabled={!filteredForest.length}
          >
            Export PDF
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <div
              key={label}
              className="glass-subtle rounded-3xl border border-glass px-6 py-5 shadow-depth-1"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {value}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/60",
                    tone,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-subtle rounded-3xl border border-glass p-6 shadow-depth-1">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Refine your org chart
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/80">
                Search team members
              </label>
              <Input
                placeholder="Search by name, role or department"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/80">
                Departments
              </label>
              <MultiSelect
                options={departmentOptions.map((dept) => ({
                  label: dept.label,
                  value: dept.value,
                }))}
                value={selectedDepartments}
                onValueChange={setSelectedDepartments}
                placeholder="Filter by department(s)"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/80">
                Job roles
              </label>
              <MultiSelect
                options={jobRoleOptions.map((role) => ({
                  label: role.label,
                  value: role.value,
                }))}
                value={selectedJobRoles}
                onValueChange={setSelectedJobRoles}
                placeholder="Filter by job role(s)"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/80">
                Role type
              </label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="ADMIN">Admins</SelectItem>
                  <SelectItem value="MANAGER">Managers</SelectItem>
                  <SelectItem value="EMPLOYEE">Individual contributors</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
                Showing {visibleEmployees} of {totalEmployees} people
              </Badge>
              {isFiltered ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  Filters active
                </span>
              ) : (
                <span className="text-xs">No filters applied</span>
              )}
            </div>
            {isFiltered && (
              <Button variant="ghost" onClick={handleClearFilters}>
                Reset filters
              </Button>
            )}
          </div>
        </div>

        <div className="glass-strong rounded-3xl border border-glass/60 p-4 shadow-depth-1">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <LoadingSpinner size="lg" showText text="Loading org chart" />
            </div>
          ) : error ? (
            <EmptyState
              title="We couldn't load the org chart"
              description={error}
              tone="warning"
              action={{ label: "Try again", onClick: () => fetchEmployees(true) }}
            />
          ) : filteredForest.length === 0 ? (
            <EmptyState
              title={isFiltered ? "No people match your filters" : "Your org chart is empty"}
              description={
                isFiltered
                  ? "Adjust or clear your filters to rediscover people within your organisation."
                  : "Once employees are added, you'll see the full reporting structure here."
              }
              guidance={
                isFiltered
                  ? [
                      "Try widening your role or department filters",
                      "Search for part of a name or job title",
                      "Clear filters to return to the complete view",
                    ]
                  : [
                      "Invite team members from the Employees area",
                      "Assign managers to build reporting lines",
                      "Use departments and job roles to enrich the chart",
                    ]
              }
              tone={isFiltered ? "warning" : "brand"}
              action={
                isFiltered
                  ? { label: "Clear filters", onClick: handleClearFilters }
                  : undefined
              }
            />
          ) : (
            <div className="relative overflow-auto">
              <div
                className="relative mx-auto"
                style={{ width: `${layout.width}px`, height: `${layout.height}px` }}
              >
                <svg
                  className="pointer-events-none absolute inset-0"
                  width={layout.width}
                  height={layout.height}
                >
                  {connections.map((segment, index) => (
                    <path
                      key={index}
                      d={segment.d}
                      fill="none"
                      stroke="rgba(148, 163, 184, 0.6)"
                      strokeWidth={1.4}
                      strokeLinecap="round"
                    />
                  ))}
                </svg>

                {flattenedNodes.map((node) => {
                  const position = layout.positions.get(node.id);
                  if (!position) return null;
                  return (
                    <OrgNodeCard
                      key={node.id}
                      node={node}
                      position={position}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function OrgNodeCard({
  node,
  position,
}: {
  node: OrgNode;
  position: { x: number; y: number };
}) {
  const directReports = node.children.length;
  const managerLabel = node.managerName ?? "Reports to leadership";

  return (
    <div
      className="absolute"
      style={{
        top: position.y,
        left: position.x,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      }}
    >
      <div
        className={cn(
          "group h-full w-full rounded-[28px] border bg-white/80 p-5 shadow-depth-1 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 dark:bg-slate-950/70",
          node.isMatch
            ? "border-primary/50 shadow-[0_18px_40px_rgba(59,130,246,0.25)] ring-2 ring-primary/40"
            : "border-slate-200/70",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar
              src={node.profileImageUrl ?? undefined}
              name={node.fullName}
              size={48}
              className="shadow-depth-2"
            />
            <div>
              <p className="text-base font-semibold text-foreground">
                {node.fullName}
              </p>
              <p className="text-sm text-muted-foreground">
                {node.jobTitle ?? "Role not assigned"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
              roleBadgeClasses[node.role],
            )}
          >
            {roleLabels[node.role]}
          </Badge>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span>{node.department ?? "No department"}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserCircle2 className="h-4 w-4 text-slate-400" />
            <span>{managerLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-slate-400" />
            <span>
              {directReports === 0
                ? "No direct reports"
                : `${directReports} direct ${
                    directReports === 1 ? "report" : "reports"
                  }`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function collectLevels(nodes: OrgNode[]): OrgNode[][] {
  const levels: OrgNode[][] = [];
  const queue: Array<{ node: OrgNode; depth: number }> = nodes.map((node) => ({
    node,
    depth: 0,
  }));

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;
    if (!levels[depth]) {
      levels[depth] = [];
    }
    levels[depth].push(node);
    node.children.forEach((child) => queue.push({ node: child, depth: depth + 1 }));
  }

  return levels;
}

function flattenTree(nodes: OrgNode[]): OrgNode[] {
  const result: OrgNode[] = [];
  const walk = (node: OrgNode) => {
    result.push(node);
    node.children.forEach(walk);
  };
  nodes.forEach(walk);
  return result;
}

function countNodes(nodes: OrgNode[]): number {
  return nodes.reduce((acc, node) => acc + 1 + countNodes(node.children), 0);
}

export default OrgChartPageClient;
