"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock,
  Clock3,
  CreditCard,
  DollarSign,
  DoorOpen,
  ExternalLink,
  Globe2,
  GraduationCap,
  Hourglass,
  Library,
  Palmtree,
  Play,
  Search,
  Settings,
  Settings2,
  Shield,
  Sparkles,
  Thermometer,
  Zap,
  Building2,
  X
 } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { PageShell } from "@/components/ui/PageShell";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import type { ReportLibraryEntry } from "@/lib/reportLibrary";
import { hrCategories, hrReportFields } from "@/lib/hrReportFields";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

interface LibraryResponse {
  data: ReportLibraryEntry[];
}

const engineLabels: Record<ReportLibraryEntry["engine"], string> = {
  dynamic: "Customisable",
  custom: "Specialist",
  external: "Export Tool",
};

const engineColors: Record<ReportLibraryEntry["engine"], { bg: string; text: string; border: string }> = {
  dynamic: { 
    bg: "bg-blue-100 dark:bg-blue-900/30", 
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800"
  },
  custom: { 
    bg: "bg-violet-100 dark:bg-violet-900/30", 
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-800"
  },
  external: { 
    bg: "bg-emerald-100 dark:bg-emerald-900/30", 
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800"
  },
};

const templateIconMap: Record<string, LucideIcon> = {
  "annual-leave-balances": Palmtree,
  "on-leave-today": CalendarDays,
  "upcoming-leave": CalendarClock,
  "pending-leave-approvals": Settings,
  "low-leave-balances": AlertTriangle,
  "sick-leave-usage": Thermometer,
  "new-starters": Sparkles,
  "missing-payroll-details": CreditCard,
  "kiwisaver-summary": Globe2,
  "right-to-work-expiries": Shield,
  "driver-licence-expiries": Car,
  "training-expiries": GraduationCap,
  "department-roster": Building2,
  "headcount-by-department": BarChart3,
  "offboarding-pipeline": DoorOpen,
  "approved-timesheets": CheckCircle2,
  "pending-timesheet-approvals": Hourglass,
  "overtime-hours-report": Clock,
  "time-entries-detailed": Clock3,
  "timesheet-approval-audit": ClipboardList,
  "rejected-timesheets": X,
  "payroll-export": DollarSign
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 },
  },
};

export default function ReportsLibraryPage() {
  const router = useRouter();
  const breadcrumbs = useBreadcrumbs();

  const [entries, setEntries] = useState<ReportLibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/reports/library", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load library (${res.status})`);
        const json: LibraryResponse = await res.json();
        if (!cancelled && Array.isArray(json?.data)) {
          setEntries(json.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load library");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEntries = useMemo(() => {
    let results = [...entries];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (entry) =>
          entry.name.toLowerCase().includes(query) ||
          entry.description.toLowerCase().includes(query) ||
          entry.category.toLowerCase().includes(query)
      );
    }
    
    if (selectedCategory !== "all") {
      results = results.filter((entry) => entry.category === selectedCategory);
    }
    
    return results;
  }, [entries, searchQuery, selectedCategory]);

  const grouped = useMemo(() => {
    const byCategory: Record<string, ReportLibraryEntry[]> = {};
    filteredEntries.forEach((entry) => {
      if (!byCategory[entry.category]) byCategory[entry.category] = [];
      byCategory[entry.category].push(entry);
    });
    hrCategories.forEach((category) => {
      if (byCategory[category.id]) {
        byCategory[category.id].sort((a, b) => a.name.localeCompare(b.name));
      }
    });
    return byCategory;
  }, [filteredEntries]);

  const getFieldLabel = (key: string) => {
    const meta = hrReportFields.find((f) => f.field === key);
    if (meta?.label) return meta.label;
    const last = key.split(".").slice(-1)[0] || key;
    const cleaned = last
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .trim();
    return cleaned
      .replace(/^id$/i, "ID")
      .replace(/^name$/i, "Name")
      .replace(/^email$/i, "Email")
      .replace(/^phone$/i, "Phone")
      .replace(/^createdAt$/i, "Created At")
      .replace(/^updatedAt$/i, "Updated At");
  };

  const renderCard = (entry: ReportLibraryEntry) => {
    const handlePreview = () => {
      const params = new URLSearchParams();
      if (entry.engine === "custom" && entry.reportType) {
        params.set("reportType", entry.reportType);
        params.set("engine", "custom");
      } else {
        params.set("fields", JSON.stringify(entry.defaultFields));
        params.set("engine", "dynamic");
      }
      params.set("templateId", entry.id);
      params.set("returnTo", "/reports/library");
      router.push(`/reports/preview?${params.toString()}`);
    };

    const handleOpenBuilder = () => {
      const params = new URLSearchParams();
      params.set("templateId", entry.id);
      params.set("returnTo", "/reports/library");
      router.push(`/reports/builder-new?${params.toString()}`);
    };

    const handleExternalTool = () => {
      if (entry.externalUrl) {
        router.push(entry.externalUrl);
      }
    };

    const engineStyle = engineColors[entry.engine];

    const TemplateIcon = templateIconMap[entry.id];

    return (
      <motion.div
        key={entry.id}
        variants={cardVariants}
        layout
        onMouseEnter={() => setHoveredCard(entry.id)}
        onMouseLeave={() => setHoveredCard(null)}
        className="h-full"
      >
        <div className="glass-premium rounded-2xl overflow-hidden shadow-premium hover:shadow-depth-4 transition-all duration-300 h-full flex flex-col border border-white/30">
          {/* Card Header */}
          <div className="p-5 flex-1">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-blue-500/10 flex items-center justify-center text-3xl shadow-depth-1 flex-shrink-0">
                {TemplateIcon ? (
                  <TemplateIcon className="w-7 h-7" />
                ) : (
                  entry.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground line-clamp-1">{entry.name}</h3>
                </div>
                <Badge 
                  variant="secondary"
                  className={cn(
                    "mt-1.5 text-[10px] uppercase tracking-wide font-semibold border",
                    engineStyle.bg,
                    engineStyle.text,
                    engineStyle.border
                  )}
                >
                  {engineLabels[entry.engine]}
                </Badge>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {entry.description}
            </p>

            {entry.engine === "external" ? (
              <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-xs text-muted-foreground">
                  Opens a specialized export tool with advanced formatting and delivery options.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" />
                  Included Fields
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {entry.defaultFields.slice(0, 5).map((field) => (
                    <span 
                      key={field} 
                      className="inline-flex items-center rounded-md border border-border/60 bg-white/50 dark:bg-black/20 px-2 py-0.5 text-[10px] text-muted-foreground font-medium"
                    >
                      {getFieldLabel(field)}
                    </span>
                  ))}
                  {entry.defaultFields.length > 5 && (
                    <span className="inline-flex items-center text-[10px] text-muted-foreground/70 font-medium">
                      +{entry.defaultFields.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Card Actions */}
          <div className="border-t border-white/20 p-4 bg-white/30 dark:bg-black/10">
            {entry.engine === "external" ? (
              <Button 
                onClick={handleExternalTool} 
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg rounded-xl h-10"
              >
                <ExternalLink className="h-4 w-4 mr-2" /> 
                Open Payroll Export
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={handlePreview}
                  className="flex-1 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg rounded-xl h-10"
                >
                  <Play className="h-4 w-4 mr-2 fill-current" /> 
                  Run Report
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleOpenBuilder}
                  className="glass-subtle border-white/30 hover:border-primary/30 hover:bg-primary/5 rounded-xl h-10 px-3"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <PageShell
      title="Report Templates"
      description="Pre-built reports tuned for NZ HR compliance and people analytics"
      icon={<Library className="h-6 w-6" />}
      breadcrumbs={breadcrumbs}
      action={
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            variant="outline" 
            onClick={() => router.push("/reports")}
            className="h-10 px-4 rounded-xl border-border/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
        </motion.div>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary"
          />
          <p className="text-sm text-muted-foreground font-medium">Loading report templates…</p>
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <p className="font-semibold text-destructive text-lg mb-2">Unable to load library</p>
          <p className="text-sm text-destructive/70">{error}</p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* Search & Filter Bar */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4 shadow-depth-2"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-11 h-11 glass-subtle border-white/20 focus:border-primary/50 rounded-xl"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/50 rounded-full transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
                
                {/* Category Filter */}
                <select
                  className="h-11 px-4 rounded-xl glass-subtle border border-white/20 text-sm font-medium focus:border-primary/50 focus:outline-none transition-colors cursor-pointer"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {hrCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="text-sm text-muted-foreground font-medium">
                {filteredEntries.length} template{filteredEntries.length !== 1 ? "s" : ""}
              </div>
            </div>
          </motion.div>

          {/* Category Sections */}
          <AnimatePresence mode="wait">
            {filteredEntries.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-premium rounded-3xl text-center p-12 shadow-premium"
              >
                <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">No matching templates</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Try adjusting your search or filter criteria to find the template you need.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className="rounded-xl"
                >
                  Clear Filters
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-10"
              >
                {hrCategories.map((category) => {
                  const items = grouped[category.id];
                  if (!items || items.length === 0) return null;
                  
                  return (
                    <motion.section 
                      key={category.id} 
                      variants={cardVariants}
                      className="space-y-5"
                    >
                      {/* Category Header */}
                      <div className={cn(
                        "glass-card flex items-center gap-4 rounded-2xl border px-5 py-4 shadow-depth-1",
                        category.color,
                      )}>
                        <div className="w-12 h-12 rounded-xl bg-white/50 dark:bg-black/20 flex items-center justify-center text-2xl shadow-sm">
                          {category.icon}
                        </div>
                        <div className="flex-1">
                          <h2 className="text-lg font-bold text-foreground">
                            {category.name}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {category.description}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-white/50 dark:bg-black/20 text-foreground font-semibold">
                          {items.length} template{items.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      
                      {/* Template Cards Grid */}
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {items.map(renderCard)}
                      </div>
                    </motion.section>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </PageShell>
  );
}
