
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
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PDFFont, PDFImage, PDFPage, RGB } from "pdf-lib";

const NODE_WIDTH = 288;
const NODE_HEIGHT = 224;
const HORIZONTAL_SPACING = 80;
const ROOT_HORIZONTAL_SPACING = HORIZONTAL_SPACING * 2;
const VERTICAL_SPACING = 88;
const HORIZONTAL_MARGIN = 96;
const VERTICAL_MARGIN_TOP = 48;
const VERTICAL_MARGIN_BOTTOM = 120;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.6;
const ZOOM_STEP = 0.1;

const isArrayBufferLike = (value: unknown): value is ArrayBufferLike =>
  typeof value === "object" &&
  value !== null &&
  "byteLength" in value &&
  typeof (value as { byteLength: unknown }).byteLength === "number";

const toUint8Array = (value: unknown): Uint8Array => {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (typeof value === "object" && value !== null) {
    if (ArrayBuffer.isView(value as ArrayBufferView)) {
      const view = value as ArrayBufferView;
      return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    }

    if (isArrayBufferLike(value)) {
      return new Uint8Array(value);
    }

    if (
      "buffer" in value &&
      isArrayBufferLike((value as { buffer: unknown }).buffer)
    ) {
      const view = value as ArrayLike<number> & {
        buffer: ArrayBufferLike;
        byteOffset?: number;
        byteLength?: number;
      };
      const { buffer } = view;
      const offset =
        typeof view.byteOffset === "number" ? view.byteOffset : 0;
      const length =
        typeof view.byteLength === "number" ? view.byteLength : undefined;
      return new Uint8Array(buffer, offset, length);
    }
  }

  return Uint8Array.from(value as ArrayLike<number>);
};

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

type LayoutConfig = {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  rootSpacing: number;
  verticalSpacing: number;
};

type MeasuredOrgNode = {
  node: OrgNode;
  width: number;
  depth: number;
  children: MeasuredOrgNode[];
};

function OrgChartPageClient() {
  const breadcrumbs = useBreadcrumbs();
  const [rawEmployees, setRawEmployees] = useState<ApiEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [zoom, setZoom] = useState(1);

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

    const config: LayoutConfig = {
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
      horizontalSpacing: HORIZONTAL_SPACING,
      rootSpacing: ROOT_HORIZONTAL_SPACING,
      verticalSpacing: VERTICAL_SPACING,
    };

    const { measuredForest, maxDepth, forestWidth } = measureOrgForest(
      filteredForest,
      config,
    );

    const width = Math.max(forestWidth + HORIZONTAL_MARGIN * 2, 720);
    const height =
      VERTICAL_MARGIN_TOP +
      maxDepth * NODE_HEIGHT +
      Math.max(0, maxDepth - 1) * VERTICAL_SPACING +
      VERTICAL_MARGIN_BOTTOM;

    const positions = new Map<string, { x: number; y: number }>();
    let currentLeft = (width - forestWidth) / 2;
    const top = VERTICAL_MARGIN_TOP;

    measuredForest.forEach((tree, index) => {
      assignMeasuredPositions(tree, config, currentLeft, top, positions);
      if (index < measuredForest.length - 1) {
        currentLeft += tree.width + ROOT_HORIZONTAL_SPACING;
      }
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

  const handleZoomOut = () => {
    setZoom((current) => {
      const next = Math.max(
        MIN_ZOOM,
        parseFloat((current - ZOOM_STEP).toFixed(2)),
      );
      return next;
    });
  };

  const handleZoomIn = () => {
    setZoom((current) => {
      const next = Math.min(
        MAX_ZOOM,
        parseFloat((current + ZOOM_STEP).toFixed(2)),
      );
      return next;
    });
  };

  const handleZoomReset = () => {
    setZoom(1);
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

      const config: LayoutConfig = {
        nodeWidth: NODE_WIDTH,
        nodeHeight: NODE_HEIGHT,
        horizontalSpacing: HORIZONTAL_SPACING,
        rootSpacing: ROOT_HORIZONTAL_SPACING,
        verticalSpacing: VERTICAL_SPACING,
      };

      const { measuredForest, maxDepth, forestWidth } = measureOrgForest(
        filteredForest,
        config,
      );

      const pdfTopMargin = 140;
      const pdfBottomMargin = 80;
      const totalTreeHeight =
        maxDepth * NODE_HEIGHT +
        Math.max(0, maxDepth - 1) * VERTICAL_SPACING;
      const pageWidth = Math.max(
        842,
        forestWidth + HORIZONTAL_MARGIN * 2,
      );
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

      const flattenedForExport = flattenTree(filteredForest);
      const avatarCache = new Map<string, PDFImage | null>();
      const uniqueAvatarUrls = Array.from(
        new Set(
          flattenedForExport
            .map((node) => node.profileImageUrl)
            .filter((url): url is string => Boolean(url)),
        ),
      );

      await Promise.all(
        uniqueAvatarUrls.map(async (url) => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Unable to load avatar for export (${response.status})`);
            }

            const contentType = response.headers
              .get("content-type")
              ?.toLowerCase();
            const bytes = new Uint8Array(await response.arrayBuffer());
            let image: PDFImage | null = null;

            if (contentType?.includes("png") || url.toLowerCase().endsWith(".png")) {
              image = await pdfDoc.embedPng(bytes);
            } else if (
              contentType?.includes("jpeg") ||
              contentType?.includes("jpg") ||
              /\.jpe?g($|\?)/.test(url.toLowerCase())
            ) {
              image = await pdfDoc.embedJpg(bytes);
            }

            avatarCache.set(url, image);
          } catch (avatarError) {
            console.warn("Unable to embed avatar in org chart export", avatarError);
            avatarCache.set(url, null);
          }
        }),
      );

      const wrapText = (
        value: string,
        font: PDFFont,
        size: number,
        maxWidth: number,
      ) => {
        if (!value.trim()) return [];

        const words = value.split(/\s+/);
        const lines: string[] = [];
        let currentLine = "";

        const addLine = (line: string) => {
          if (line.trim()) {
            lines.push(line.trim());
          }
        };

        words.forEach((word) => {
          if (!word) return;
          const tentative = currentLine ? `${currentLine} ${word}` : word;
          const width = font.widthOfTextAtSize(tentative, size);

          if (width <= maxWidth) {
            currentLine = tentative;
            return;
          }

          if (currentLine) {
            addLine(currentLine);
            currentLine = "";
          }

          if (font.widthOfTextAtSize(word, size) <= maxWidth) {
            currentLine = word;
            return;
          }

          let slice = "";
          for (const char of word) {
            const test = `${slice}${char}`;
            if (font.widthOfTextAtSize(test, size) > maxWidth && slice) {
              addLine(slice);
              slice = char;
            } else {
              slice = test;
            }
          }
          if (slice) {
            currentLine = slice;
          }
        });

        if (currentLine) {
          addLine(currentLine);
        }

        return lines;
      };

      const drawTextLines = (
        lines: string[],
        {
          x,
          top,
          font,
          size,
          color,
          lineHeight,
        }: {
          x: number;
          top: number;
          font: PDFFont;
          size: number;
          color: ReturnType<typeof rgb>;
          lineHeight: number;
        },
      ) => {
        let cursor = top;
        lines.forEach((line) => {
          page.drawText(line, {
            x,
            y: cursor - size,
            size,
            font,
            color,
          });
          cursor -= lineHeight;
        });
        return cursor;
      };

      const getInitials = (fullName: string) => {
        const parts = fullName.trim().split(/\s+/).slice(0, 2);
        if (!parts.length) return "?";
        return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
      };

      const topDownPositions = new Map<string, { x: number; y: number }>();
      let currentLeft = Math.max(
        (pageWidth - forestWidth) / 2,
        HORIZONTAL_MARGIN,
      );

      measuredForest.forEach((tree, index) => {
        assignMeasuredPositions(
          tree,
          config,
          currentLeft,
          pdfTopMargin,
          topDownPositions,
        );

        if (index < measuredForest.length - 1) {
          currentLeft += tree.width + ROOT_HORIZONTAL_SPACING;
        }
      });

      const lineColor = rgb(0.73, 0.78, 0.86);

      const drawConnections = (node: OrgNode) => {
        const parentPos = topDownPositions.get(node.id);
        if (!parentPos) return;

        node.children.forEach((child) => {
          const childPos = topDownPositions.get(child.id);
          if (!childPos) return;

          const parentCenterX = parentPos.x + NODE_WIDTH / 2;
          const parentBottomY = parentPos.y + NODE_HEIGHT;
          const childCenterX = childPos.x + NODE_WIDTH / 2;
          const childTopY = childPos.y;
          const midY = parentBottomY + (childTopY - parentBottomY) / 2;

          const pdfParentBottomY = pageHeight - parentBottomY;
          const pdfMidY = pageHeight - midY;
          const pdfChildTopY = pageHeight - childTopY;

          page.drawLine({
            start: { x: parentCenterX, y: pdfParentBottomY },
            end: { x: parentCenterX, y: pdfMidY },
            thickness: 1.2,
            color: lineColor,
          });
          page.drawLine({
            start: {
              x: Math.min(parentCenterX, childCenterX),
              y: pdfMidY,
            },
            end: {
              x: Math.max(parentCenterX, childCenterX),
              y: pdfMidY,
            },
            thickness: 1.2,
            color: lineColor,
          });
          page.drawLine({
            start: { x: childCenterX, y: pdfMidY },
            end: { x: childCenterX, y: pdfChildTopY },
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
      const labelColor = rgb(0.46, 0.49, 0.58);
      const valueColor = rgb(0.34, 0.37, 0.44);
      const nameColor = rgb(0.12, 0.16, 0.24);
      const titleColor = rgb(0.36, 0.4, 0.5);

      const badgeColors: Record<OrgEmployee["role"], ReturnType<typeof rgb>> = {
        ADMIN: rgb(0.32, 0.52, 0.98),
        MANAGER: rgb(0.95, 0.67, 0.28),
        EMPLOYEE: rgb(0.6, 0.66, 0.76),
      };

      const drawRoundedRectangle = (
        options: {
          page: PDFPage;
          x: number;
          y: number;
          width: number;
          height: number;
          radius: number;
          borderColor: RGB;
          borderWidth: number;
          color: RGB;
          opacity: number;
        },
      ) => {
        const radius = Math.min(
          options.radius,
          options.width / 2,
          options.height / 2,
        );

        const path = [
          `M ${options.x + radius} ${options.y}`,
          `H ${options.x + options.width - radius}`,
          `Q ${options.x + options.width} ${options.y} ${options.x + options.width} ${options.y + radius}`,
          `V ${options.y + options.height - radius}`,
          `Q ${options.x + options.width} ${options.y + options.height} ${options.x + options.width - radius} ${options.y + options.height}`,
          `H ${options.x + radius}`,
          `Q ${options.x} ${options.y + options.height} ${options.x} ${options.y + options.height - radius}`,
          `V ${options.y + radius}`,
          `Q ${options.x} ${options.y} ${options.x + radius} ${options.y}`,
          'Z',
        ].join(' ');

        options.page.drawSvgPath(path, {
          borderColor: options.borderColor,
          borderWidth: options.borderWidth,
          color: options.color,
          opacity: options.opacity,
        });
      };

      const drawNode = (node: OrgNode) => {
        const pos = topDownPositions.get(node.id);
        if (!pos) return;

        const rectY = pageHeight - pos.y - NODE_HEIGHT;
        const cardPadding = 22;
        const avatarSize = 52;
        const avatarX = pos.x + cardPadding;
        const avatarY = rectY + NODE_HEIGHT - cardPadding - avatarSize;
        const avatarCenterX = avatarX + avatarSize / 2;
        const avatarCenterY = avatarY + avatarSize / 2;

        drawRoundedRectangle({
          page,
          x: pos.x,
          y: rectY,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          radius: 20,
          borderWidth: 1.6,
          borderColor: node.isMatch ? highlightBorder : baseBorder,
          color: cardFill,
          opacity: node.isMatch ? 1 : 0.98,
        });

        page.drawCircle({
          x: avatarCenterX,
          y: avatarCenterY,
          size: avatarSize / 2,
          borderColor: node.isMatch ? highlightBorder : rgb(0.82, 0.85, 0.92),
          borderWidth: node.isMatch ? 2 : 1.2,
          color: rgb(0.95, 0.97, 1),
        });

        const avatarImage = node.profileImageUrl
          ? avatarCache.get(node.profileImageUrl) ?? null
          : null;
        if (avatarImage) {
          const inset = avatarSize * 0.18;
          const imageSize = avatarSize - inset * 2;
          page.drawImage(avatarImage, {
            x: avatarX + inset,
            y: avatarY + inset,
            width: imageSize,
            height: imageSize,
          });
        } else {
          const initials = getInitials(node.fullName);
          const initialsSize = 16;
          const initialsWidth = titleFont.widthOfTextAtSize(
            initials,
            initialsSize,
          );
          page.drawText(initials, {
            x: avatarCenterX - initialsWidth / 2,
            y: avatarCenterY - initialsSize / 2,
            size: initialsSize,
            font: titleFont,
            color: rgb(0.44, 0.5, 0.63),
          });
        }

        const badgeLabel = roleLabels[node.role].toUpperCase();
        const badgeFontSize = 9;
        const badgePaddingX = 10;
        const badgePaddingY = 6;
        const badgeLineHeight = badgeFontSize + 2;
        const maxBadgeWidth = Math.max(1, NODE_WIDTH - cardPadding * 2);
        const badgeLines = wrapText(
          badgeLabel,
          bodyFont,
          badgeFontSize,
          Math.max(1, maxBadgeWidth - badgePaddingX * 2),
        );
        const effectiveLines = badgeLines.length ? badgeLines : [badgeLabel];
        const widestLine = effectiveLines.reduce((widest, line) => {
          const width = bodyFont.widthOfTextAtSize(line, badgeFontSize);
          return Math.max(widest, width);
        }, 0);
        const badgeWidth = Math.min(
          maxBadgeWidth,
          widestLine + badgePaddingX * 2,
        );
        const badgeHeight =
          effectiveLines.length * badgeLineHeight + badgePaddingY * 2;
        const badgeX = pos.x + NODE_WIDTH - cardPadding - badgeWidth;
        const badgeY = rectY + NODE_HEIGHT - cardPadding - badgeHeight + 6;

        drawRoundedRectangle({
          page,
          x: badgeX,
          y: badgeY,
          width: badgeWidth,
          height: badgeHeight,
          radius: Math.min(badgeHeight / 2, badgeWidth / 2),
          color: rgb(0.97, 0.98, 1),
          borderColor: badgeColors[node.role],
          borderWidth: 1,
          opacity: 1,
        });

        let badgeTextY =
          badgeY + badgeHeight - badgePaddingY - badgeFontSize - 2;
        effectiveLines.forEach((line, index) => {
          const lineWidth = bodyFont.widthOfTextAtSize(line, badgeFontSize);
          const textX =
            badgeX + badgePaddingX + Math.max(0, (badgeWidth - badgePaddingX * 2 - lineWidth) / 2);
          page.drawText(line, {
            x: textX,
            y: badgeTextY,
            size: badgeFontSize,
            font: bodyFont,
            color: badgeColors[node.role],
          });
          if (index < effectiveLines.length - 1) {
            badgeTextY -= badgeLineHeight;
          }
        });

        const textStartX = avatarX + avatarSize + 16;
        const contentWidth = NODE_WIDTH - cardPadding * 2 - avatarSize - 16;
        let headerTop = rectY + NODE_HEIGHT - cardPadding;

        const nameLines = wrapText(node.fullName, titleFont, 14, contentWidth);
        headerTop = drawTextLines(nameLines, {
          x: textStartX,
          top: headerTop,
          font: titleFont,
          size: 14,
          color: nameColor,
          lineHeight: 18,
        });

        const title = node.jobTitle ?? "Role not assigned";
        headerTop -= 4;
        const titleLines = wrapText(title, bodyFont, 11, contentWidth);
        headerTop = drawTextLines(titleLines, {
          x: textStartX,
          top: headerTop,
          font: bodyFont,
          size: 11,
          color: titleColor,
          lineHeight: 14,
        });

        const emailLines = wrapText(node.email, bodyFont, 10, contentWidth);
        headerTop -= 2;
        headerTop = drawTextLines(emailLines, {
          x: textStartX,
          top: headerTop,
          font: bodyFont,
          size: 10,
          color: valueColor,
          lineHeight: 13,
        });

        const headerHeight = Math.max(
          avatarSize,
          rectY + NODE_HEIGHT - cardPadding - headerTop,
        );
        const dividerY = rectY + NODE_HEIGHT - cardPadding - headerHeight - 12;

        page.drawLine({
          start: { x: pos.x + cardPadding, y: dividerY },
          end: { x: pos.x + NODE_WIDTH - cardPadding, y: dividerY },
          thickness: 0.7,
          color: rgb(0.87, 0.9, 0.95),
        });

        let detailsTop = dividerY - 10;
        const detailsWidth = NODE_WIDTH - cardPadding * 2;

        const detailEntries = [
          {
            label: "Department",
            valueLines: wrapText(
              node.department ?? "No department",
              bodyFont,
              10,
              detailsWidth,
            ),
          },
          {
            label: "Reports to",
            valueLines: wrapText(
              node.managerName ?? "Reports to leadership",
              bodyFont,
              10,
              detailsWidth,
            ),
          },
        ];

        const directReportLines = node.children.length
          ? node.children
              .slice(0, 5)
              .flatMap((child) =>
                wrapText(
                  `${child.fullName}${
                    child.jobTitle ? ` — ${child.jobTitle}` : ""
                  }`,
                  bodyFont,
                  10,
                  detailsWidth,
                ),
              )
          : ["No direct reports"];

        if (node.children.length > 5) {
          directReportLines.push(
            `+${node.children.length - 5} more direct ${
              node.children.length - 5 === 1 ? "report" : "reports"
            }`,
          );
        }

        detailEntries.push({ label: "Direct reports", valueLines: directReportLines });

        detailEntries.forEach(({ label, valueLines }) => {
          detailsTop = drawTextLines([label], {
            x: pos.x + cardPadding,
            top: detailsTop,
            font: bodyFont,
            size: 9,
            color: labelColor,
            lineHeight: 12,
          }) - 2;

          detailsTop = drawTextLines(valueLines, {
            x: pos.x + cardPadding,
            top: detailsTop,
            font: bodyFont,
            size: 10,
            color: valueColor,
            lineHeight: 13,
          }) - 6;
        });

        node.children.forEach(drawNode);
      };

      filteredForest.forEach(drawNode);

      const pdfBytes = await pdfDoc.save();

      const exportBuffer = toUint8Array(pdfBytes);

      let normalizedBuffer: ArrayBuffer;
      const baseBuffer = exportBuffer.buffer;

      if (typeof (baseBuffer as ArrayBuffer).slice === "function") {
        const arrayBuffer = baseBuffer as ArrayBuffer;
        const start = exportBuffer.byteOffset;
        const end = exportBuffer.byteOffset + exportBuffer.byteLength;
        normalizedBuffer = arrayBuffer.slice(start, end);
      } else {
        normalizedBuffer = exportBuffer.slice().buffer as ArrayBuffer;
      }

      const blob = new Blob([normalizedBuffer], { type: "application/pdf" });
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

        <div className="glass-subtle relative z-20 rounded-3xl border border-glass p-6 shadow-depth-1">
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
                <SelectContent className="z-50">
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

        <div className="glass-strong relative z-10 rounded-3xl border border-glass/60 p-4 shadow-depth-1">
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
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span>Zoom</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleZoomOut}
                      disabled={zoom <= MIN_ZOOM}
                      aria-label="Zoom out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="w-14 text-center text-xs font-semibold text-foreground">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleZoomIn}
                      disabled={zoom >= MAX_ZOOM}
                      aria-label="Zoom in"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomReset}
                      disabled={zoom === 1}
                      aria-label="Reset zoom"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
              <div className="relative overflow-x-auto overflow-y-visible">
                <div
                  className="relative mx-auto"
                  style={{
                    width: `${layout.width * zoom}px`,
                    height: `${layout.height * zoom}px`,
                  }}
                >
                  <div
                    className="absolute left-0 top-0"
                    style={{
                      width: `${layout.width}px`,
                      height: `${layout.height}px`,
                      transform: `scale(${zoom})`,
                      transformOrigin: "top left",
                    }}
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
          "group flex h-full w-full flex-col gap-5 overflow-hidden rounded-[28px] border bg-white/80 p-6 shadow-depth-1 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 dark:bg-slate-950/70",
          node.isMatch
            ? "border-primary/50 shadow-[0_18px_40px_rgba(59,130,246,0.25)] ring-2 ring-primary/40"
            : "border-slate-200/70",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar
              src={node.profileImageUrl ?? undefined}
              name={node.fullName}
              size={48}
              className="shadow-depth-2"
            />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground" title={node.fullName}>
                {node.fullName}
              </p>
              <p
                className="truncate text-sm text-muted-foreground"
                title={node.jobTitle ?? undefined}
              >
                {node.jobTitle ?? "Role not assigned"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "w-fit max-w-full self-start whitespace-normal px-3 py-1 text-center text-[11px] font-semibold uppercase tracking-wide",
              "flex-wrap justify-center",
              roleBadgeClasses[node.role],
            )}
          >
            {roleLabels[node.role]}
          </Badge>
        </div>

        <div className="grid flex-1 content-start gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate" title={node.department ?? undefined}>
              {node.department ?? "No department"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <UserCircle2 className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate" title={managerLabel}>
              {managerLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 shrink-0 text-slate-400" />
            {directReports === 0 ? (
              <span>No direct reports</span>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="truncate text-left font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {directReports} direct {directReports === 1 ? "report" : "reports"}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-80 max-h-80 overflow-y-auto p-4"
                >
                  <p className="text-sm font-semibold text-foreground">
                    Direct reports
                  </p>
                  <div className="mt-3 space-y-3">
                    {node.children.map((child) => (
                      <div key={child.id} className="flex items-center gap-3">
                        <Avatar
                          src={child.profileImageUrl ?? undefined}
                          name={child.fullName}
                          size={40}
                        />
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-medium text-foreground"
                            title={child.fullName}
                          >
                            {child.fullName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground" title={child.jobTitle ?? undefined}>
                            {child.jobTitle ?? "Role not assigned"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground" title={child.department ?? undefined}>
                            {child.department ?? "No department"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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

function measureOrgNode(node: OrgNode, config: LayoutConfig): MeasuredOrgNode {
  if (!node.children.length) {
    return {
      node,
      width: config.nodeWidth,
      depth: 1,
      children: [],
    };
  }

  const measuredChildren = node.children.map((child) =>
    measureOrgNode(child, config),
  );

  const childrenWidth = measuredChildren.reduce((acc, child, index) => {
    return (
      acc +
      child.width +
      (index > 0 ? config.horizontalSpacing : 0)
    );
  }, 0);

  const width = Math.max(config.nodeWidth, childrenWidth);
  const depth =
    1 + Math.max(...measuredChildren.map((child) => child.depth));

  return { node, width, depth, children: measuredChildren };
}

function measureOrgForest(
  forest: OrgNode[],
  config: LayoutConfig,
): {
  measuredForest: MeasuredOrgNode[];
  maxDepth: number;
  forestWidth: number;
} {
  if (!forest.length) {
    return { measuredForest: [], maxDepth: 0, forestWidth: 0 };
  }

  const measuredForest = forest.map((node) => measureOrgNode(node, config));
  const maxDepth = Math.max(...measuredForest.map((tree) => tree.depth));
  const forestWidth = measuredForest.reduce((acc, tree, index) => {
    return (
      acc + tree.width + (index > 0 ? config.rootSpacing : 0)
    );
  }, 0);

  return { measuredForest, maxDepth, forestWidth };
}

function assignMeasuredPositions(
  measured: MeasuredOrgNode,
  config: LayoutConfig,
  left: number,
  top: number,
  positions: Map<string, { x: number; y: number }>,
) {
  const nodeX = left + (measured.width - config.nodeWidth) / 2;
  positions.set(measured.node.id, { x: nodeX, y: top });

  if (!measured.children.length) {
    return;
  }

  const childrenWidth = measured.children.reduce((acc, child, index) => {
    return (
      acc +
      child.width +
      (index > 0 ? config.horizontalSpacing : 0)
    );
  }, 0);

  let currentLeft = left + (measured.width - childrenWidth) / 2;
  const childTop = top + config.nodeHeight + config.verticalSpacing;

  measured.children.forEach((child) => {
    assignMeasuredPositions(child, config, currentLeft, childTop, positions);
    currentLeft += child.width + config.horizontalSpacing;
  });
}

export default OrgChartPageClient;
