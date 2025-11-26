"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import {
  DepartmentBulkActionDialog,
  CompensationBulkActionDialog,
  TrainingBulkActionDialog,
  LeaveBulkActionDialog,
  MessagingBulkActionDialog,
  type Option,
  type BulkActionResult,
} from "@/components/bulk-actions/ActionDialogs";
import {
  Building2, Coins, GraduationCap, PlaneTakeoff, Megaphone, Zap, ArrowRight,
  Sparkles, Users, TrendingUp, CheckCircle2, Clock, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EmployeeRow {
  id: string; userId: string; name: string; email: string;
  departmentId: string | null; departmentName: string | null;
  jobRoleId: string | null; jobRoleName: string | null; isActive: boolean;
}

type ActionType = "department" | "compensation" | "training" | "leave" | "messaging";

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const cardVariants = { hidden: { opacity: 0, y: 30, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 25 } } };

interface ActionCardConfig { id: ActionType; title: string; description: string; icon: React.ReactNode; gradient: string; iconBg: string; features: string[]; }

export default function BulkActionsPageClient() {
  const { data: session } = useSession();
  const breadcrumbs = useBreadcrumbs();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [jobRoles, setJobRoles] = useState<Option[]>([]);
  const [courses, setCourses] = useState<Option[]>([]);
  const [providers, setProviders] = useState<Option[]>([]);
  const [eventCategories, setEventCategories] = useState<Option[]>([]);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [hoveredCard, setHoveredCard] = useState<ActionType | null>(null);

  const fetchEmployees = useCallback(async () => {
    const headers: HeadersInit = {};
    if (session?.user?.companyId) headers["x-company-id"] = session.user.companyId;
    const response = await fetch("/api/employees?status=all&limit=all", { cache: "no-store", headers });
    if (!response.ok) throw new Error("Failed to load employees");
    const payload = await response.json();
    const employeeData = Array.isArray(payload) ? payload : payload.data;
    if (!Array.isArray(employeeData)) throw new Error("Unexpected employee response");
    setEmployees(employeeData.map((item: any) => ({
      id: item.id, userId: item.userId,
      name: ((item.firstName ?? "") + " " + (item.lastName ?? "")).trim().replace(/\s+/g, " ") || item.email,
      email: item.email, departmentId: item.departmentId ?? null, departmentName: item.departmentName ?? null,
      jobRoleId: item.jobRoleId ?? null, jobRoleName: item.jobRoleName ?? null, isActive: item.isActive !== false,
    })));
  }, [session?.user?.companyId]);

  const fetchMetadata = useCallback(async () => {
    try {
      const [deptRes, jobRoleRes, courseRes, providerRes, categoryRes] = await Promise.all([
        fetch("/api/departments", { cache: "no-store" }), fetch("/api/job-roles", { cache: "no-store" }),
        fetch("/api/courses/list", { cache: "no-store" }), fetch("/api/providers/list", { cache: "no-store" }),
        fetch("/api/event-categories", { cache: "no-store" }),
      ]);
      if (deptRes.ok) { const data = await deptRes.json(); setDepartments((Array.isArray(data) ? data : []).map((d: any) => ({ value: String(d.id), label: d.name })).sort((a: Option, b: Option) => a.label.localeCompare(b.label))); }
      if (jobRoleRes.ok) { const data = await jobRoleRes.json(); const roles = Array.isArray(data) ? data : data?.jobRoles ?? []; setJobRoles(roles.map((r: any) => ({ value: String(r.id), label: r.name })).sort((a: Option, b: Option) => a.label.localeCompare(b.label))); }
      if (courseRes.ok) { const data = await courseRes.json(); setCourses((Array.isArray(data) ? data : []).map((c: any) => ({ value: String(c.id), label: c.name })).sort((a: Option, b: Option) => a.label.localeCompare(b.label))); }
      if (providerRes.ok) { const data = await providerRes.json(); setProviders((Array.isArray(data) ? data : []).map((p: any) => ({ value: String(p.id), label: p.name })).sort((a: Option, b: Option) => a.label.localeCompare(b.label))); }
      if (categoryRes.ok) { const data = await categoryRes.json(); setEventCategories((Array.isArray(data) ? data : []).filter((c: any) => c.categoryType !== "WORKING_EVENT").map((c: any) => ({ value: String(c.id), label: c.name })).sort((a: Option, b: Option) => a.label.localeCompare(b.label))); }
    } catch (error) { console.error(error); setMetadataError("Unable to load supporting data."); }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try { await Promise.all([fetchEmployees(), fetchMetadata()]); }
      catch (e) { console.error(e); if (mounted) setMetadataError("Unable to load employees."); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [fetchEmployees, fetchMetadata]);

  const handleActionCompleted = useCallback(async (_result: BulkActionResult) => {
    setActiveAction(null);
    try { await fetchEmployees(); } catch (e) { console.error(e); toast.error("Unable to refresh employee list"); }
  }, [fetchEmployees]);

  const activeEmployeeCount = useMemo(() => employees.filter(e => e.isActive).length, [employees]);

  const actionCards: ActionCardConfig[] = [
    { id: "department", title: "Realign Teams", description: "Move people between departments or job roles seamlessly.", icon: <Building2 className="h-6 w-6" />, gradient: "from-violet-500 via-purple-500 to-indigo-600", iconBg: "bg-gradient-to-br from-violet-500/20 to-purple-500/20", features: ["Batch department & role changes", "Unified audit trail", "Auto-sync reporting lines"] },
    { id: "compensation", title: "Adjust Compensation", description: "Apply salary adjustments with precise controls.", icon: <Coins className="h-6 w-6" />, gradient: "from-emerald-500 via-teal-500 to-cyan-600", iconBg: "bg-gradient-to-br from-emerald-500/20 to-teal-500/20", features: ["Percentage & fixed adjustments", "Live cost impact preview", "Complete audit history"] },
    { id: "training", title: "Assign Training", description: "Create training records across cohorts.", icon: <GraduationCap className="h-6 w-6" />, gradient: "from-orange-500 via-amber-500 to-yellow-500", iconBg: "bg-gradient-to-br from-orange-500/20 to-amber-500/20", features: ["Course & provider assignment", "Expiry date tracking", "Compliance integration"] },
    { id: "leave", title: "Book Leave", description: "Block time in bulk while honouring workflows.", icon: <PlaneTakeoff className="h-6 w-6" />, gradient: "from-sky-500 via-blue-500 to-indigo-500", iconBg: "bg-gradient-to-br from-sky-500/20 to-blue-500/20", features: ["Entitlements support", "Fast-track approvals", "Instant notifications"] },
    { id: "messaging", title: "Send Announcement", description: "Craft branded communications.", icon: <Megaphone className="h-6 w-6" />, gradient: "from-pink-500 via-rose-500 to-red-500", iconBg: "bg-gradient-to-br from-pink-500/20 to-rose-500/20", features: ["Rich message composer", "Test before sending", "Full audit archive"] },
  ];

  if (loading) {
    return (
      <PageShell title="Bulk Actions" description="Run high-impact updates across your workforce" icon={<Zap className="h-7 w-7" />} breadcrumbs={breadcrumbs || undefined}>
        <div className="flex items-center justify-center h-64">
          <motion.div className="relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary" />
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 flex items-center justify-center"><Zap className="w-6 h-6 text-primary" /></motion.div>
          </motion.div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Bulk Actions" description="Run high-impact updates across your workforce with precision" icon={<Zap className="h-7 w-7" />} breadcrumbs={breadcrumbs || undefined}>
      <div className="space-y-8">
        <AnimatePresence>{metadataError && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 shadow-lg">
            <div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-amber-100"><Activity className="h-5 w-5 text-amber-600" /></div><p className="text-sm font-medium text-amber-900">{metadataError}</p></div>
          </motion.div>
        )}</AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-premium rounded-2xl p-5 shadow-premium">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{activeEmployeeCount}</p><p className="text-xs text-muted-foreground font-medium">Active Employees</p></div></div>
              <div className="h-10 w-px bg-border/50" />
              <div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20"><Building2 className="h-5 w-5 text-violet-600" /></div><div><p className="text-2xl font-bold">{departments.length}</p><p className="text-xs text-muted-foreground font-medium">Departments</p></div></div>
              <div className="h-10 w-px bg-border/50" />
              <div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20"><TrendingUp className="h-5 w-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{jobRoles.length}</p><p className="text-xs text-muted-foreground font-medium">Job Roles</p></div></div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" /><span>Real-time sync</span><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span></div>
          </div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {actionCards.map((card) => (
            <motion.div key={card.id} variants={cardVariants} onHoverStart={() => setHoveredCard(card.id)} onHoverEnd={() => setHoveredCard(null)} className="group relative">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: hoveredCard === card.id ? 0.3 : 0 }} transition={{ duration: 0.3 }} className={cn("absolute -inset-1 rounded-3xl blur-xl bg-gradient-to-r", card.gradient)} />
              <div className={cn("relative h-full glass-premium rounded-2xl overflow-hidden border border-white/20 shadow-premium transition-all duration-500 ease-out hover:shadow-depth-4 hover:scale-[1.02] hover:border-white/40")}>
                <div className={cn("absolute top-0 inset-x-0 h-1 bg-gradient-to-r", card.gradient)} />
                <div className="p-6 space-y-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <motion.div className={cn("p-3 rounded-xl transition-transform duration-300 group-hover:scale-110", card.iconBg)} whileHover={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.5 }}><div className="text-violet-600 dark:text-violet-400">{card.icon}</div></motion.div>
                      <div><h3 className="text-lg font-bold group-hover:text-primary transition-colors">{card.title}</h3><div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5"><Sparkles className="h-3 w-3" /><span>Instant processing</span></div></div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                  <ul className="space-y-2">{card.features.map((feature, i) => (<motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" /><span className="text-foreground/80">{feature}</span></motion.li>))}</ul>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                    <Button onClick={() => setActiveAction(card.id)} className={cn("w-full h-11 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 bg-gradient-to-r hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]", card.gradient)}>
                      <span>Configure</span><motion.div animate={{ x: hoveredCard === card.id ? 4 : 0 }} transition={{ duration: 0.2 }}><ArrowRight className="h-4 w-4 ml-2" /></motion.div>
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-subtle rounded-2xl p-5 border border-primary/20">
          <div className="flex items-start gap-4"><div className="p-2 rounded-lg bg-primary/10"><Sparkles className="h-5 w-5 text-primary" /></div><div><h4 className="font-semibold mb-1">Pro tip</h4><p className="text-sm text-muted-foreground">Each bulk action includes an employee selection wizard with powerful filters. Target employees by department, job role, or employment status - then preview all changes before confirming.</p></div></div>
        </motion.div>
      </div>

      <DepartmentBulkActionDialog open={activeAction === "department"} onOpenChange={(o) => setActiveAction(o ? "department" : null)} allEmployees={employees} departments={departments} jobRoles={jobRoles} onCompleted={handleActionCompleted} />
      <CompensationBulkActionDialog open={activeAction === "compensation"} onOpenChange={(o) => setActiveAction(o ? "compensation" : null)} allEmployees={employees} departments={departments} jobRoles={jobRoles} onCompleted={handleActionCompleted} />
      <TrainingBulkActionDialog open={activeAction === "training"} onOpenChange={(o) => setActiveAction(o ? "training" : null)} allEmployees={employees} departments={departments} jobRoles={jobRoles} courses={courses} providers={providers} onCompleted={handleActionCompleted} />
      <LeaveBulkActionDialog open={activeAction === "leave"} onOpenChange={(o) => setActiveAction(o ? "leave" : null)} allEmployees={employees} departments={departments} jobRoles={jobRoles} eventCategories={eventCategories} onCompleted={handleActionCompleted} />
      <MessagingBulkActionDialog open={activeAction === "messaging"} onOpenChange={(o) => setActiveAction(o ? "messaging" : null)} allEmployees={employees} departments={departments} jobRoles={jobRoles} onCompleted={handleActionCompleted} />
    </PageShell>
  );
}