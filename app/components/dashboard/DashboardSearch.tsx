"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  Calendar,
  FileText,
  Network,
  Megaphone,
  Settings,
  BarChart3,
  LineChart,
  ListChecks,
  Zap,
  Target,
  ClipboardList,
  CalendarClock,
  GitCompare,
  Search,
  Clock,
  Bell,
  Shield,
  AlertTriangle,
  Share2,
  FolderKanban,
  Repeat,
  Sailboat,
  UserMinus,
  Cog,
  MapPin,
  Library,
  Plus,
  type LucideIcon,
} from "lucide-react";

interface ScreenItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface EmployeeResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  jobRoleName: string | null;
}

const SCREENS: ScreenItem[] = [
  // Core navigation
  { href: "/dashboard/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/action-items", icon: ClipboardCheck, label: "Action Items" },
  { href: "/employees", icon: Users, label: "Employees" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/documents", icon: FileText, label: "Documents" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/reports/library", icon: Library, label: "Report Library" },
  { href: "/reports/create", icon: Plus, label: "Create Report" },
  { href: "/performance", icon: Target, label: "Performance" },
  { href: "/analytics", icon: LineChart, label: "Analytics" },
  { href: "/admin/timesheets/hub", icon: ClipboardList, label: "Timesheets" },
  { href: "/rota", icon: CalendarClock, label: "Rota/Shifts" },
  { href: "/admin/reconciliation", icon: GitCompare, label: "Reconciliation" },
  { href: "/org-chart", icon: Network, label: "Org Chart" },
  { href: "/news", icon: Megaphone, label: "News" },
  { href: "/surveys", icon: BarChart3, label: "Surveys" },
  { href: "/bulk-actions", icon: ListChecks, label: "Bulk Actions" },
  { href: "/settings/automation-rules", icon: Zap, label: "App Library" },
  { href: "/settings", icon: Settings, label: "Settings" },
  // Settings - Holiday & Leave
  { href: "/settings/working-patterns", icon: Clock, label: "Working Patterns" },
  { href: "/settings/public-holidays", icon: Calendar, label: "Public Holiday Templates" },
  { href: "/settings/expiry-alerts", icon: AlertTriangle, label: "Expiry Alerts" },
  { href: "/settings/event-rules", icon: Shield, label: "Event Rules" },
  { href: "/settings/event-manager", icon: Bell, label: "Event Manager" },
  { href: "/settings/leave-policies", icon: FileText, label: "Leave Policies" },
  { href: "/settings/multi-stage-approvals", icon: Share2, label: "Multi-stage Approvals" },
  { href: "/admin/settings/time-tracking", icon: Clock, label: "Time Tracking" },
  { href: "/admin/locations", icon: MapPin, label: "Locations" },
  // Settings - Forms & Surveys
  { href: "/settings/forms", icon: ClipboardList, label: "Forms" },
  { href: "/settings/forms/exit-interview", icon: UserMinus, label: "Exit Interviews" },
  { href: "/settings/surveys", icon: FileText, label: "Survey Settings" },
  // Settings - Documents
  { href: "/settings/document-types", icon: FolderKanban, label: "Document Types" },
  // Settings - Workflows
  { href: "/settings/automation-rules", icon: Repeat, label: "Automation Rules" },
  { href: "/settings/journeys", icon: Sailboat, label: "Journeys & Onboarding" },
  { href: "/settings/workflows/notifications", icon: Bell, label: "Transactional Notifications" },
  // Settings - System
  { href: "/settings/system", icon: Cog, label: "Platform Settings" },
];

export default function DashboardSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [employees, setEmployees] = useState<EmployeeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Filter screens based on query
  const filteredScreens = query.trim()
    ? SCREENS.filter((s) =>
        s.label.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  // Combined results for keyboard navigation
  const allResults = [
    ...filteredScreens.map((s) => ({ type: "screen" as const, data: s })),
    ...employees.map((e) => ({ type: "employee" as const, data: e })),
  ];

  // Fetch employees when query changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setEmployees([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Fetch more employees to enable better client-side filtering
        const res = await fetch(`/api/employees?limit=100`);
        if (res.ok) {
          const json = await res.json();
          const data: EmployeeResult[] = json.data || [];
          // Client-side filter by name
          const q = query.toLowerCase();
          const filtered = data.filter((emp) => {
            const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
            return fullName.includes(q);
          });
          setEmployees(filtered.slice(0, 5));
        }
      } catch (err) {
        console.error("Employee search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query]);

  const handleSelect = useCallback(
    (result: (typeof allResults)[number]) => {
      setIsOpen(false);
      setQuery("");
      if (result.type === "screen") {
        router.push(result.data.href);
      } else {
        router.push(`/employees/${result.data.id}/overview`);
      }
    },
    [router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || allResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < allResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : allResults.length - 1
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(allResults[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const showDropdown = isOpen && query.trim() && (filteredScreens.length > 0 || employees.length > 0 || isLoading);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          aria-label="Search dashboard"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query.trim() && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full sm:w-64 glass-subtle rounded-2xl border-white/20 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30 transition-premium"
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full mt-2 w-full sm:w-80 right-0 z-50 bg-popover rounded-xl shadow-lg border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Screens Section */}
          {filteredScreens.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 bg-muted/30">
                Screens
              </div>
              {filteredScreens.map((screen, idx) => {
                const Icon = screen.icon;
                const resultIndex = idx;
                return (
                  <button
                    key={screen.href}
                    onClick={() => handleSelect({ type: "screen", data: screen })}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-primary/10 transition-colors",
                      highlightedIndex === resultIndex && "bg-primary/10"
                    )}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{screen.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Employees Section */}
          {employees.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 bg-muted/30">
                Employees
              </div>
              {employees.map((emp, idx) => {
                const resultIndex = filteredScreens.length + idx;
                const fullName = [emp.firstName, emp.lastName].filter(Boolean).join(" ") || "Unknown";
                return (
                  <button
                    key={emp.id}
                    onClick={() => handleSelect({ type: "employee", data: emp })}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-primary/10 transition-colors",
                      highlightedIndex === resultIndex && "bg-primary/10"
                    )}
                  >
                    <Avatar
                      src={emp.profileImageUrl}
                      name={fullName}
                      size={32}
                      className="shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{fullName}</span>
                      {emp.jobRoleName && (
                        <span className="text-xs text-muted-foreground truncate">
                          {emp.jobRoleName}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Loading state */}
          {isLoading && employees.length === 0 && filteredScreens.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              Searching...
            </div>
          )}

          {/* No results */}
          {!isLoading && query.trim() && filteredScreens.length === 0 && employees.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
