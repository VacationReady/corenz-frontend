"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/ui/PageShell";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import HistoryButton from "@/components/audit/HistoryButton";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isPast } from "date-fns";
import {
  GraduationCap,
  Plus,
  Search,
  Calendar,
  Clock,
  Building2,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  LayoutGrid,
  List,
  X,
  Award,
  BookOpen,
  Users,
  TrendingUp,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface TrainingRecord {
  id: string;
  dateCompleted: string;
  expiryDate: string | null;
  document: {
    id: string;
    name: string;
    url: string;
  } | null;
  course: {
    id: string;
    name: string;
  } | null;
  provider: {
    id: string;
    name: string;
  } | null;
}

type ViewMode = "grid" | "table";
type FilterStatus = "all" | "valid" | "expiring" | "expired" | "permanent";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 }
  }
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 40 }
  },
  exit: { opacity: 0, x: 20 }
};

// Helper functions
function getExpiryStatus(expiryDate: string | null): { 
  status: "valid" | "expiring" | "expired" | "permanent"; 
  label: string; 
  daysLeft?: number 
} {
  if (!expiryDate) {
    return { status: "permanent", label: "No Expiry" };
  }
  
  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysUntilExpiry = differenceInDays(expiry, today);

  if (isPast(expiry)) {
    return { status: "expired", label: "Expired", daysLeft: Math.abs(daysUntilExpiry) };
  }
  if (daysUntilExpiry <= 30) {
    return { status: "expiring", label: "Expiring Soon", daysLeft: daysUntilExpiry };
  }
  return { status: "valid", label: "Valid", daysLeft: daysUntilExpiry };
}

function getStatusStyles(status: "valid" | "expiring" | "expired" | "permanent") {
  switch (status) {
    case "valid":
      return {
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        glow: "shadow-emerald-500/20",
        gradient: "from-emerald-500 to-emerald-600",
        bgGradient: "from-emerald-500/10 to-emerald-500/5",
      };
    case "expiring":
      return {
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        glow: "shadow-amber-500/20",
        gradient: "from-amber-500 to-amber-600",
        bgGradient: "from-amber-500/10 to-amber-500/5",
      };
    case "expired":
      return {
        badge: "bg-red-100 text-red-700 border-red-200",
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        glow: "shadow-red-500/20",
        gradient: "from-red-500 to-red-600",
        bgGradient: "from-red-500/10 to-red-500/5",
      };
    case "permanent":
      return {
        badge: "bg-blue-100 text-blue-700 border-blue-200",
        icon: <Award className="h-4 w-4 text-blue-500" />,
        glow: "shadow-blue-500/20",
        gradient: "from-blue-500 to-blue-600",
        bgGradient: "from-blue-500/10 to-blue-500/5",
      };
  }
}

// Course category icons
function getCourseIcon(courseName: string) {
  const name = courseName.toLowerCase();
  if (name.includes("safety") || name.includes("health")) return "🦺";
  if (name.includes("first aid")) return "🩹";
  if (name.includes("fire")) return "🔥";
  if (name.includes("manual handling") || name.includes("lifting")) return "📦";
  if (name.includes("food") || name.includes("hygiene")) return "🍽️";
  if (name.includes("leadership") || name.includes("management")) return "👔";
  if (name.includes("customer") || name.includes("service")) return "🤝";
  if (name.includes("computer") || name.includes("it") || name.includes("software")) return "💻";
  if (name.includes("driver") || name.includes("driving")) return "🚗";
  if (name.includes("security")) return "🔐";
  return "📚";
}

export default function Training({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState("Employee");
  
  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recordsRes, employeeRes] = await Promise.all([
          fetch(`/api/training-records/list?employeeId=${employeeId}`),
          fetch(`/api/employees/${employeeId}`),
        ]);

        if (recordsRes.ok) {
          const recordsData = await recordsRes.json();
          setRecords(recordsData);
        }

        if (employeeRes.ok) {
          const employee = await employeeRes.json();
          const name = `${employee.user?.firstName || ""} ${employee.user?.lastName || ""}`.trim();
          setEmployeeName(name || "Employee");
        }
      } catch (error) {
        console.error("Error fetching training data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) fetchData();
  }, [employeeId]);

  // Filtered and searched records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Search filter
      const matchesSearch = !searchQuery || 
        record.course?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.provider?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      if (filterStatus === "all") return matchesSearch;
      
      const { status } = getExpiryStatus(record.expiryDate);
      return matchesSearch && status === filterStatus;
    });
  }, [records, searchQuery, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const valid = records.filter(r => getExpiryStatus(r.expiryDate).status === "valid").length;
    const expiring = records.filter(r => getExpiryStatus(r.expiryDate).status === "expiring").length;
    const expired = records.filter(r => getExpiryStatus(r.expiryDate).status === "expired").length;
    const permanent = records.filter(r => getExpiryStatus(r.expiryDate).status === "permanent").length;
    const uniqueProviders = new Set(records.map(r => r.provider?.id).filter(Boolean)).size;
    return { valid, expiring, expired, permanent, total: records.length, uniqueProviders };
  }, [records]);

  if (loading) {
    return (
      <PageShell
        title="Training Records"
        description="Track certifications and professional development"
        icon={<GraduationCap className="w-6 h-6" />}
        breadcrumbs={{
          items: [
            { label: "Dashboard", href: "/dashboard" },
            { label: "Employees", href: "/employees" },
            { label: employeeName, href: `/employees/${employeeId}/overview` },
            { label: "Training", isCurrentPage: true },
          ],
        }}
      >
        <PageLoader text="Loading training records..." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Training Records"
      description="Track certifications and professional development"
      icon={<GraduationCap className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees", href: "/employees" },
          { label: employeeName, href: `/employees/${employeeId}/overview` },
          { label: "Training", isCurrentPage: true },
        ],
      }}
      action={
        <div className="flex items-center gap-2">
          <HistoryButton employeeId={employeeId} section="training" />
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => router.push(`/employees/${employeeId}/training/add`)}
              className="bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 shadow-lg shadow-primary/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Training
            </Button>
          </motion.div>
        </div>
      }
    >
      {/* Stats Cards */}
      {records.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6"
        >
          <div className="glass-premium rounded-2xl p-4 shadow-premium">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-100 to-violet-50">
                <BookOpen className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground font-medium">Total Courses</p>
              </div>
            </div>
          </div>
          <div className="glass-premium rounded-2xl p-4 shadow-premium">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.valid}</p>
                <p className="text-xs text-muted-foreground font-medium">Valid</p>
              </div>
            </div>
          </div>
          <div className="glass-premium rounded-2xl p-4 shadow-premium">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.expiring}</p>
                <p className="text-xs text-muted-foreground font-medium">Expiring</p>
              </div>
            </div>
          </div>
          <div className="glass-premium rounded-2xl p-4 shadow-premium">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-100">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
                <p className="text-xs text-muted-foreground font-medium">Expired</p>
              </div>
            </div>
          </div>
          <div className="glass-premium rounded-2xl p-4 shadow-premium hidden lg:block">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.uniqueProviders}</p>
                <p className="text-xs text-muted-foreground font-medium">Providers</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Toolbar */}
      {records.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-premium rounded-2xl p-4 mb-6 shadow-premium"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses or providers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 glass-subtle border-white/20 focus:border-primary/50 rounded-xl"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="h-10 px-4 rounded-xl glass-subtle border border-white/20 text-sm font-medium focus:border-primary/50 focus:outline-none transition-colors cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="valid">✓ Valid</option>
                <option value="expiring">⚠ Expiring Soon</option>
                <option value="expired">✕ Expired</option>
                <option value="permanent">★ No Expiry</option>
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-white/50 rounded-xl p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  viewMode === "grid"
                    ? "bg-white shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  viewMode === "table"
                    ? "bg-white shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {records.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <EmptyState
            icon={GraduationCap}
            title="No training records yet"
            description="Track employee certifications, courses, and professional development to ensure compliance and growth."
            tone="brand"
            variant="elevated"
            action={{
              label: "Add First Training",
              onClick: () => router.push(`/employees/${employeeId}/training/add`),
            }}
            guidance={[
              "Record completed training courses",
              "Track certification expiry dates",
              "Upload certificates and credentials",
            ]}
          />
        </motion.div>
      ) : filteredRecords.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-premium rounded-2xl p-12 text-center shadow-premium"
        >
          <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No matching training records</h3>
          <p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria</p>
          <Button variant="outline" onClick={() => { setSearchQuery(""); setFilterStatus("all"); }}>
            Clear Filters
          </Button>
        </motion.div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
        >
          {filteredRecords.map((record) => {
            const { status, label, daysLeft } = getExpiryStatus(record.expiryDate);
            const styles = getStatusStyles(status);
            
            return (
              <motion.div
                key={record.id}
                variants={cardVariants}
                layout
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={cn(
                  "glass-premium rounded-2xl overflow-hidden shadow-premium hover:shadow-depth-4 transition-all duration-300 cursor-pointer group"
                )}
                onClick={() => router.push(`/employees/${employeeId}/training/${record.id}`)}
              >
                {/* Status Stripe */}
                <div className={cn("h-1.5 bg-gradient-to-r", styles.gradient)} />
                
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn("p-3 rounded-xl bg-gradient-to-br", styles.bgGradient, "flex-shrink-0")}>
                        <span className="text-2xl">{getCourseIcon(record.course?.name || "")}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate">{record.course?.name ?? "Unknown Course"}</h3>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                          <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{record.provider?.name ?? "Unknown Provider"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4">
                    <Badge className={cn("border", styles.badge)}>
                      {styles.icon}
                      <span className="ml-1">{label}</span>
                      {status !== "permanent" && status !== "expired" && daysLeft !== undefined && (
                        <span className="ml-1">({daysLeft}d)</span>
                      )}
                    </Badge>
                  </div>

                  {/* Dates */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="font-medium">{format(new Date(record.dateCompleted), "dd MMM yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Expires:</span>
                      <span className={cn(
                        "font-medium",
                        status === "expired" && "text-red-600",
                        status === "expiring" && "text-amber-600"
                      )}>
                        {record.expiryDate
                          ? format(new Date(record.expiryDate), "dd MMM yyyy")
                          : "Never"}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/20">
                    {record.document ? (
                      <a
                        href={record.document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Certificate
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">No certificate</span>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>View details</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        /* Table View */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-premium rounded-2xl overflow-hidden shadow-premium"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20 bg-white/30">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Course</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Provider</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Completed</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Expires</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Certificate</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredRecords.map((record) => {
                    const { status, label } = getExpiryStatus(record.expiryDate);
                    const styles = getStatusStyles(status);
                    
                    return (
                      <motion.tr
                        key={record.id}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        onClick={() => router.push(`/employees/${employeeId}/training/${record.id}`)}
                        className="border-b border-white/10 hover:bg-white/30 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{getCourseIcon(record.course?.name || "")}</span>
                            <span className="font-medium">{record.course?.name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span>{record.provider?.name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {format(new Date(record.dateCompleted), "dd MMM yyyy")}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {record.expiryDate
                            ? format(new Date(record.expiryDate), "dd MMM yyyy")
                            : "Never"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={cn("border", styles.badge)}>
                            {styles.icon}
                            <span className="ml-1">{label}</span>
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {record.document ? (
                            <a
                              href={record.document.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium text-sm transition-colors"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </PageShell>
  );
}
