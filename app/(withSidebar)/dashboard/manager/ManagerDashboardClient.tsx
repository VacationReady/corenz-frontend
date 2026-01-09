"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { EnhancedWidget } from "@/components/ui/EnhancedWidget";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import { UnifiedActionItems } from "@/components/dashboard/UnifiedActionItems";
import LeaveSummaryCard from "@/components/dashboard/LeaveSummaryCard";
import { WidgetLoading, WidgetError } from "@/components/ui/WidgetStates";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Users,
  BarChart3,
  Search,
  User,
  Calendar,
  X,
  Megaphone,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { getEventCategoryIcon } from "@/lib/event-category-icons";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";
import { Skeleton } from "@/components/ui/Skeleton";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Team Members Modal Component
interface TeamMembersModalProps {
  open: boolean;
  onClose: () => void;
  employees: any[];
  title: string;
}

function TeamMembersModal({ open, onClose, employees, title }: TeamMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = searchQuery.toLowerCase();
    return employees.filter((emp) => {
      const name = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
      const dept = emp.departmentName?.toLowerCase() || "";
      return name.includes(query) || dept.includes(query);
    });
  }, [employees, searchQuery]);
  
  if (!open) return null;
  
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <p className="text-xs text-muted-foreground">{employees.length} team member{employees.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              
              {/* Search */}
              {employees.length > 5 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search team members..."
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border/50 bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}
            </div>
            
            {/* Employee List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No team members match your search" : "No team members found"}
                </div>
              ) : (
                <ul className="space-y-2">
                  {filteredEmployees.map((emp) => (
                    <li key={emp.id}>
                      <Link
                        href={`/employees/${emp.id}/overview`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                        onClick={onClose}
                      >
                        <Avatar 
                          src={emp.profileImageUrl} 
                          name={`${emp.firstName || ""} ${emp.lastName || ""}`.trim()} 
                          size={40} 
                          className="ring-1 ring-border shadow-sm flex-shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm group-hover:text-primary transition-colors">
                            {`${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {[emp.jobTitle, emp.departmentName].filter(Boolean).join(" • ") || "No details"}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          View profile →
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MetricsSummary() {
  const { data: session } = useSession();
  const { data, error, isLoading } = useSWR("/api/employees?status=active", fetcher);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [newStartersModalOpen, setNewStartersModalOpen] = useState(false);

  const { metrics, teamEmployees, newStarters } = useMemo(() => {
    // API returns { data: [...], pagination: {...} }
    const employeeList = data?.data || (Array.isArray(data) ? data : []);
    if (!employeeList.length || !session?.user?.id) return { metrics: null, teamEmployees: [], newStarters: [] };
    const me = session.user.id as string;
    const employees: any[] = employeeList;
    // Build map by userId for quick lookup and compute team closure
    const byManager = new Map<string, string[]>();
    employees.forEach((e: any) => {
      const mgr = e.managerUserId || null;
      if (!mgr) return;
      if (!byManager.has(mgr)) byManager.set(mgr, []);
      byManager.get(mgr)!.push(e.userId);
    });
    const team = new Set<string>();
    let frontier: string[] = byManager.get(me) || [];
    while (frontier.length) {
      const next: string[] = [];
      for (const uid of frontier) {
        if (team.has(uid)) continue;
        team.add(uid);
        const children = byManager.get(uid) || [];
        for (const c of children) if (!team.has(c)) next.push(c);
      }
      frontier = next;
    }

    const teamEmps = employees.filter((e: any) => team.has(e.userId));
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newStartersList = teamEmps.filter((e: any) => {
      const startDate = e.startDate ? new Date(e.startDate) : null;
      return startDate && !Number.isNaN(startDate.getTime())
        ? startDate >= startOfMonth
        : false;
    });

    return { 
      metrics: { headcount: teamEmps.length, newStartersThisMonth: newStartersList.length },
      teamEmployees: teamEmps,
      newStarters: newStartersList
    };
  }, [data, session]);

  return (
    <>
      <TeamMembersModal
        open={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        employees={teamEmployees}
        title="My Team"
      />
      <TeamMembersModal
        open={newStartersModalOpen}
        onClose={() => setNewStartersModalOpen(false)}
        employees={newStarters}
        title="New Starters This Month"
      />
      <DashboardWidget title="Team Metrics" icon={BarChart3}>
        {isLoading ? (
          <WidgetLoading />
        ) : error ? (
          <WidgetError message="Failed to load metrics." />
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <button
              onClick={() => setTeamModalOpen(true)}
              className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
            >
              <div className="text-muted-foreground group-hover:text-foreground transition-colors">Headcount</div>
              <div className="text-lg font-semibold text-primary">{metrics?.headcount ?? 0}</div>
            </button>
            <button
              onClick={() => setNewStartersModalOpen(true)}
              className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
            >
              <div className="text-muted-foreground group-hover:text-foreground transition-colors">New starters</div>
              <div className="text-lg font-semibold text-primary">{metrics?.newStartersThisMonth ?? 0}</div>
            </button>
          </div>
        )}
      </DashboardWidget>
    </>
  );
}

// Removed old DocumentActionItems component - now using UnifiedActionItems

// Absence detail modal component
interface AbsenceDetailModalProps {
  absence: any;
  open: boolean;
  onClose: () => void;
}

function AbsenceDetailModal({ absence, open, onClose }: AbsenceDetailModalProps) {
  if (!open || !absence) return null;
  
  const Icon = getEventCategoryIcon(absence.categoryIconKey);
  const categoryName = absence.categoryName || absence.title?.split(" - ")[0] || "Leave";
  const startDate = absence.start ? new Date(absence.start) : null;
  const endDate = absence.end ? new Date(new Date(absence.end).getTime() - 86400000) : startDate; // Subtract 1 day for exclusive end
  const isSingleDay = startDate && endDate && startDate.toDateString() === endDate.toDateString();
  
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar 
                    src={absence.employee?.profileImageUrl} 
                    name={absence.employee?.name} 
                    size={48} 
                    className="ring-2 ring-white shadow-lg" 
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {absence.employee?.name || "Unknown"}
                    </div>
                    {absence.employee?.department && (
                      <div className="text-xs text-muted-foreground truncate">
                        {absence.employee.department}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Leave type badge */}
              <div className="flex items-center gap-2">
                <Badge className="text-xs flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {categoryName}
                </Badge>
                {absence.approvalStatus && (
                  <Badge 
                    variant={absence.approvalStatus === "APPROVED" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {absence.approvalStatus === "APPROVED" ? "Approved" : absence.approvalStatus}
                  </Badge>
                )}
              </div>
              
              {/* Date range */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                <span>
                  {startDate && (
                    isSingleDay 
                      ? format(startDate, "d MMM yyyy")
                      : `${format(startDate, "d MMM")} – ${endDate ? format(endDate, "d MMM yyyy") : ""}`
                  )}
                </span>
              </div>
              
              {/* Reason if provided */}
              {absence.reason && (
                <div className="text-sm text-muted-foreground p-2.5 bg-muted/50 rounded-lg italic">
                  "{absence.reason}"
                </div>
              )}
              
              {/* Actions */}
              {absence.employee?.id && (
                <div className="pt-2 flex gap-2 border-t border-border/50">
                  <Link href={`/employees/${absence.employee.id}/leave`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      View Leave
                    </Button>
                  </Link>
                  <Link href={`/employees/${absence.employee.id}/overview`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Profile
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TeamAbsenceOverview() {
  const [selectedAbsence, setSelectedAbsence] = useState<any>(null);
  const today = useMemo(() => new Date(), []);
  const from = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).toISOString();
  const to = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  ).toISOString();
  const { data, error, isLoading } = useSWR(
    `/api/calendar-events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    fetcher,
  );
  return (
    <>
      <AbsenceDetailModal 
        absence={selectedAbsence} 
        open={!!selectedAbsence} 
        onClose={() => setSelectedAbsence(null)} 
      />
      <DashboardWidget title="Team Absences Today" icon={Users}>
        {isLoading ? (
          <WidgetLoading />
        ) : error ? (
          <WidgetError message="Failed to load absences." />
        ) : !data || data.length === 0 ? (
          <EmptyState
            tone="success"
            title="Everyone's in"
            description="No absences are scheduled today."
            className="py-8"
          />
        ) : (
          <ul className="space-y-2">
            {data.map((ev: any) => {
              const Icon = getEventCategoryIcon(ev.categoryIconKey);
              const categoryName = ev.categoryName || ev.title?.split(" - ")[0] || "Leave";
              return (
                <li 
                  key={ev.id}
                  onClick={() => setSelectedAbsence(ev)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                >
                  <Avatar 
                    src={ev.employee?.profileImageUrl} 
                    name={ev.employee?.name} 
                    size={32} 
                    className="ring-1 ring-border shadow-sm flex-shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {ev.employee?.name || "Unknown"}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      <span className="truncate">{categoryName}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DashboardWidget>
    </>
  );
}

/**
 * News section component that checks feature toggle
 * Separated to ensure hooks are called consistently
 */
function ManagerNewsSection() {
  const { isFeatureEnabled, isLoading } = useFeatureToggles();
  
  // Show loading skeleton while checking feature status
  if (isLoading) {
    return (
      <DashboardWidget title="Latest News" icon={Megaphone}>
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </DashboardWidget>
    );
  }
  
  // If news feature is disabled, show a placeholder message
  if (!isFeatureEnabled(FEATURE_KEYS.NEWS)) {
    return (
      <DashboardWidget title="Latest News" icon={Megaphone}>
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
          News feature is not enabled for your organisation
        </div>
      </DashboardWidget>
    );
  }
  
  return <NewsWidget limit={3} />;
}


interface ManagerDashboardClientProps {
  firstName?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  employeeId?: string;
}

export default function ManagerDashboardClient({
  firstName,
  fullName,
  avatarUrl,
  employeeId,
}: ManagerDashboardClientProps) {
  const title = firstName ? `Hi, ${firstName}!` : "Manager Dashboard";

  return (
    <div className="h-full">
      <div className="relative z-10 flex flex-col w-full h-full overflow-y-auto">
        {/* Compact Hero Header */}
        <div className="p-4">
          <div className="glass-premium rounded-2xl shadow-premium p-5 hover-lift-premium transition-premium">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute -inset-1.5 bg-gradient-to-br from-primary to-[hsl(var(--sunset-2))] rounded-full opacity-60 blur-md" />
                  <Avatar
                    src={avatarUrl ?? undefined}
                    name={fullName ?? firstName ?? "User"}
                    size={56}
                    className="relative border-2 border-white shadow-premium"
                  />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-primary">{title}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dashboard &rsaquo; Manager
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
                <div className="relative">
                  <input
                    aria-label="Search team"
                    type="text"
                    placeholder="Search team"
                    className="w-full sm:w-64 glass-subtle rounded-2xl border-white/20 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30 transition-premium"
                  />
                  <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
                </div>
                {employeeId && (
                  <Link href={`/employees/${employeeId}/overview`}>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium">
                      <User className="h-4 w-4 mr-2" /> View Profile
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Bento Grid */}
        <div className="flex-1 p-4 pt-0">
          {/* Top row - 3 equal cards */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {employeeId && (
              <EnhancedWidget size="small" delay={0.1}>
                <LeaveSummaryCard employeeId={employeeId} />
              </EnhancedWidget>
            )}

            <EnhancedWidget size="small" delay={0.15}>
              <TeamAbsenceOverview />
            </EnhancedWidget>

            <EnhancedWidget size="small" delay={0.2}>
              <MetricsSummary />
            </EnhancedWidget>
          </div>
          
          {/* Bottom row - Action Items and News side by side */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 mt-4">
            <EnhancedWidget size="small" delay={0.25}>
              <UnifiedActionItems employeeId={employeeId} isManager={true} />
            </EnhancedWidget>

            <EnhancedWidget size="small" delay={0.3}>
              <ManagerNewsSection />
            </EnhancedWidget>
          </div>
        </div>
      </div>
    </div>
  );
}
