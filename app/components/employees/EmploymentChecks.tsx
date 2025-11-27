"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import { format, differenceInDays, isPast, isFuture } from "date-fns";
import ChangeReasonModal, { ChangeInfo } from "@/components/audit/ChangeReasonModal";
import { PageShell } from "@/components/ui/PageShell";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  Plus,
  Search,
  FileText,
  Calendar,
  Clock,
  Download,
  X,
  Upload,
  Eye,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  SlidersHorizontal,
  Sparkles,
  FileWarning,
  LayoutGrid,
  List,
} from "lucide-react";
import HistoryButton from "@/components/audit/HistoryButton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

// Types
interface EmploymentCheck {
  id: string;
  typeOfCheck: string;
  documentNumber: string;
  dateOfIssue: string;
  expiryDate: string;
  documentUrl?: string;
  documentName?: string;
}

type ViewMode = "grid" | "table";
type FilterStatus = "all" | "valid" | "expiring" | "expired";

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
function getExpiryStatus(expiryDate: string): { status: "valid" | "expiring" | "expired"; label: string; daysLeft?: number } {
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

function getStatusStyles(status: "valid" | "expiring" | "expired") {
  switch (status) {
    case "valid":
      return {
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        glow: "shadow-emerald-500/20",
        gradient: "from-emerald-500/10 to-emerald-500/5",
      };
    case "expiring":
      return {
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        glow: "shadow-amber-500/20",
        gradient: "from-amber-500/10 to-amber-500/5",
      };
    case "expired":
      return {
        badge: "bg-red-100 text-red-700 border-red-200",
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        glow: "shadow-red-500/20",
        gradient: "from-red-500/10 to-red-500/5",
      };
  }
}

function getCheckTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case "passport":
      return "🛂";
    case "visa":
      return "✈️";
    case "right to work":
      return "✅";
    case "dbs check":
    case "criminal record check":
      return "🔒";
    default:
      return "📋";
  }
}

// Check types options
const CHECK_TYPES = [
  { value: "Passport", label: "Passport", icon: "🛂" },
  { value: "Visa", label: "Visa", icon: "✈️" },
  { value: "Right to Work", label: "Right to Work", icon: "✅" },
  { value: "DBS Check", label: "DBS / Criminal Record Check", icon: "🔒" },
  { value: "Reference Check", label: "Reference Check", icon: "📝" },
  { value: "Qualification Verification", label: "Qualification Verification", icon: "🎓" },
];

export default function EmploymentChecks({ employeeId }: { employeeId: string }) {
  const [checks, setChecks] = useState<EmploymentCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState("Employee");
  
  // Form state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<EmploymentCheck | null>(null);
  const [typeOfCheck, setTypeOfCheck] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [dateOfIssue, setDateOfIssue] = useState("");
  const [dateOfExpiry, setDateOfExpiry] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  
  // Audit state
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeInfo[]>([]);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [checksRes, employeeRes] = await Promise.all([
          fetch(`/api/employment-checks/list?employeeId=${employeeId}`),
          fetch(`/api/employees/${employeeId}`),
        ]);

        if (checksRes.ok) {
          const checksData = await checksRes.json();
          setChecks(checksData);
        }

        if (employeeRes.ok) {
          const employee = await employeeRes.json();
          const name = `${employee.user?.firstName || ""} ${employee.user?.lastName || ""}`.trim();
          setEmployeeName(name || "Employee");
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load employment checks");
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchData();
    }
  }, [employeeId]);

  // Filtered and searched checks
  const filteredChecks = useMemo(() => {
    return checks.filter(check => {
      // Search filter
      const matchesSearch = !searchQuery || 
        check.typeOfCheck.toLowerCase().includes(searchQuery.toLowerCase()) ||
        check.documentNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      if (filterStatus === "all") return matchesSearch;
      
      const { status } = getExpiryStatus(check.expiryDate);
      return matchesSearch && status === filterStatus;
    });
  }, [checks, searchQuery, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const valid = checks.filter(c => getExpiryStatus(c.expiryDate).status === "valid").length;
    const expiring = checks.filter(c => getExpiryStatus(c.expiryDate).status === "expiring").length;
    const expired = checks.filter(c => getExpiryStatus(c.expiryDate).status === "expired").length;
    return { valid, expiring, expired, total: checks.length };
  }, [checks]);

  const resetForm = () => {
    setTypeOfCheck("");
    setDocumentNumber("");
    setDateOfIssue("");
    setDateOfExpiry("");
    setFile(null);
    setEditMode(false);
    setSelectedCheck(null);
  };

  const openCreateSheet = () => {
    resetForm();
    setSheetOpen(true);
  };

  const openEditSheet = (check: EmploymentCheck) => {
    setSelectedCheck(check);
    setTypeOfCheck(check.typeOfCheck || "");
    setDocumentNumber(check.documentNumber || "");
    setDateOfIssue(check.dateOfIssue ? check.dateOfIssue.slice(0, 10) : "");
    setDateOfExpiry(check.expiryDate ? check.expiryDate.slice(0, 10) : "");
    setEditMode(true);
    setSheetOpen(true);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!typeOfCheck || !documentNumber || !dateOfIssue || !dateOfExpiry) {
      toast.error("Please complete all required fields");
      return;
    }

    const formData = new FormData();
    if (file) formData.append("file", file);
    formData.append("typeOfCheck", typeOfCheck);
    formData.append("documentNumber", documentNumber);
    formData.append("dateOfIssue", dateOfIssue);
    formData.append("expiryDate", dateOfExpiry);
    formData.append("employeeId", employeeId);

    const changes: ChangeInfo[] = [
      { field: "typeOfCheck", oldValue: editMode ? String(selectedCheck?.typeOfCheck || "") : "", newValue: typeOfCheck },
      { field: "documentNumber", oldValue: editMode ? String(selectedCheck?.documentNumber || "") : "", newValue: documentNumber },
      { field: "dateOfIssue", oldValue: editMode ? String(selectedCheck?.dateOfIssue?.slice(0, 10) || "") : "", newValue: dateOfIssue },
      { field: "expiryDate", oldValue: editMode ? String(selectedCheck?.expiryDate?.slice(0, 10) || "") : "", newValue: dateOfExpiry },
    ];

    setPendingFormData(formData);
    setPendingChanges(changes);
    setIsReasonOpen(true);
  };

  const handleReasonSubmit = async (reasons: Record<string, string>) => {
    if (!pendingFormData) return;
    try {
      setSubmitting(true);
      pendingFormData.append("reasons", JSON.stringify(reasons));
      
      const url = editMode
        ? `/api/employment-checks/${selectedCheck?.id}`
        : "/api/employment-checks/create";
      const method = editMode ? "PATCH" : "POST";

      const res = await fetch(url, { method, body: pendingFormData });

      if (res.ok) {
        const updatedCheck = await res.json();
        toast.success(editMode ? "Employment check updated" : "Employment check created");

        if (editMode) {
          setChecks(prev => prev.map(c => c.id === updatedCheck.id ? updatedCheck : c));
        } else {
          setChecks(prev => [updatedCheck, ...prev]);
        }

        setSheetOpen(false);
        resetForm();
      } else {
        const msg = await res.json().catch(() => ({}));
        toast.error(msg?.error || "Failed to save employment check");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
      setIsReasonOpen(false);
      setPendingChanges([]);
      setPendingFormData(null);
    }
  };

  if (loading) {
    return (
      <PageShell
        title="Employment Checks"
        description="Verification documents and compliance records"
        icon={<ShieldCheck className="w-6 h-6" />}
        breadcrumbs={{
          items: [
            { label: "Dashboard", href: "/dashboard" },
            { label: "Employees", href: "/employees" },
            { label: employeeName, href: `/employees/${employeeId}/overview` },
            { label: "Employment Checks", isCurrentPage: true },
          ],
        }}
      >
        <PageLoader text="Loading employment checks..." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Employment Checks"
      description="Verification documents and compliance records"
      icon={<ShieldCheck className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees", href: "/employees" },
          { label: employeeName, href: `/employees/${employeeId}/overview` },
          { label: "Employment Checks", isCurrentPage: true },
        ],
      }}
      action={
        <div className="flex items-center gap-2">
          <HistoryButton employeeId={employeeId} section="employment-checks" />
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={openCreateSheet}
              className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Check
            </Button>
          </motion.div>
        </div>
      }
    >
      {/* Stats Cards */}
      {checks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <div className="glass-premium rounded-2xl p-4 shadow-premium">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground font-medium">Total Checks</p>
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
        </motion.div>
      )}

      {/* Toolbar */}
      {checks.length > 0 && (
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
                  placeholder="Search checks..."
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
      {checks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <EmptyState
            icon={ShieldCheck}
            title="No employment checks yet"
            description="Add verification documents like passports, visas, and right-to-work checks to ensure compliance."
            tone="brand"
            variant="elevated"
            action={{
              label: "Add First Check",
              onClick: openCreateSheet,
            }}
            guidance={[
              "Store passport and visa information",
              "Track expiry dates automatically",
              "Get alerts before documents expire",
            ]}
          />
        </motion.div>
      ) : filteredChecks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-premium rounded-2xl p-12 text-center shadow-premium"
        >
          <FileWarning className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No matching checks</h3>
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
          {filteredChecks.map((check) => {
            const { status, label, daysLeft } = getExpiryStatus(check.expiryDate);
            const styles = getStatusStyles(status);
            
            return (
              <motion.div
                key={check.id}
                variants={cardVariants}
                layout
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={cn(
                  "glass-premium rounded-2xl overflow-hidden shadow-premium hover:shadow-depth-4 transition-all duration-300 cursor-pointer group",
                  `hover:${styles.glow}`
                )}
                onClick={() => openEditSheet(check)}
              >
                {/* Status Stripe */}
                <div className={cn("h-1 bg-gradient-to-r", styles.gradient)} />
                
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getCheckTypeIcon(check.typeOfCheck)}</div>
                      <div>
                        <h3 className="font-semibold text-foreground">{check.typeOfCheck}</h3>
                        <p className="text-sm text-muted-foreground font-mono">{check.documentNumber}</p>
                      </div>
                    </div>
                    <Badge className={cn("border", styles.badge)}>
                      {styles.icon}
                      <span className="ml-1">{label}</span>
                    </Badge>
                  </div>

                  {/* Dates */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Issued:</span>
                      <span className="font-medium">{format(new Date(check.dateOfIssue), "dd MMM yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Expires:</span>
                      <span className={cn("font-medium", status === "expired" && "text-red-600", status === "expiring" && "text-amber-600")}>
                        {format(new Date(check.expiryDate), "dd MMM yyyy")}
                        {status !== "expired" && daysLeft !== undefined && (
                          <span className="ml-1 text-xs">({daysLeft} days)</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/20">
                    {check.documentUrl ? (
                      <a
                        href={check.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">No document</span>
                    )}
                    <button className="p-2 rounded-lg hover:bg-white/50 transition-colors opacity-0 group-hover:opacity-100">
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </button>
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
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Document Number</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Issue Date</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Expiry Date</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Document</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredChecks.map((check) => {
                    const { status, label } = getExpiryStatus(check.expiryDate);
                    const styles = getStatusStyles(status);
                    
                    return (
                      <motion.tr
                        key={check.id}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        onClick={() => openEditSheet(check)}
                        className="border-b border-white/10 hover:bg-white/30 cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{getCheckTypeIcon(check.typeOfCheck)}</span>
                            <span className="font-medium">{check.typeOfCheck}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm">{check.documentNumber}</span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {format(new Date(check.dateOfIssue), "dd MMM yyyy")}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {format(new Date(check.expiryDate), "dd MMM yyyy")}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={cn("border", styles.badge)}>
                            {styles.icon}
                            <span className="ml-1">{label}</span>
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {check.documentUrl ? (
                            <a
                              href={check.documentUrl}
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

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) resetForm(); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              {editMode ? "Edit Employment Check" : "Add Employment Check"}
            </SheetTitle>
            <SheetDescription>
              {editMode
                ? "Update the details of this employment verification document."
                : "Add a new verification document for compliance tracking."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Type Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Check Type *</Label>
              <Select value={typeOfCheck} onValueChange={setTypeOfCheck}>
                <SelectTrigger className="h-12 rounded-xl glass-subtle border-white/20">
                  <SelectValue placeholder="Select check type" />
                </SelectTrigger>
                <SelectContent>
                  {CHECK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document Number */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Document Number *</Label>
              <Input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="e.g., AB123456"
                className="h-12 rounded-xl glass-subtle border-white/20"
              />
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date of Issue *</Label>
                <Input
                  type="date"
                  value={dateOfIssue}
                  onChange={(e) => setDateOfIssue(e.target.value)}
                  className="h-12 rounded-xl glass-subtle border-white/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date of Expiry *</Label>
                <Input
                  type="date"
                  value={dateOfExpiry}
                  onChange={(e) => setDateOfExpiry(e.target.value)}
                  className="h-12 rounded-xl glass-subtle border-white/20"
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {editMode ? "Replace Document (optional)" : "Upload Document (optional)"}
              </Label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-white/30 hover:border-primary/50 hover:bg-white/30",
                  file && "border-emerald-500 bg-emerald-50"
                )}
              >
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept="application/pdf,image/*"
                />
                {file ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto">
                      <FileText className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="font-medium text-emerald-700">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-white/50 flex items-center justify-center mx-auto">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium">Drop file here or click to upload</p>
                    <p className="text-sm text-muted-foreground">PDF or image files up to 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Preview of existing document */}
            {editMode && selectedCheck?.documentUrl && !file && (
              <div className="glass-subtle rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium">Current Document</span>
                  </div>
                  <a
                    href={selectedCheck.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </a>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="gap-3">
            <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !typeOfCheck || !documentNumber || !dateOfIssue || !dateOfExpiry}
              className="flex-1 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
            >
              {submitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                  />
                  {editMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {editMode ? "Update Check" : "Add Check"}
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Change Reason Modal */}
      <ChangeReasonModal
        isOpen={isReasonOpen}
        onClose={() => {
          setIsReasonOpen(false);
          setPendingChanges([]);
          setPendingFormData(null);
          setSubmitting(false);
        }}
        changes={pendingChanges}
        onSubmit={handleReasonSubmit}
      />
    </PageShell>
  );
}
