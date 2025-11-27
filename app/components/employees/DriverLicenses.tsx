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
  Car,
  Plus,
  Search,
  Calendar,
  Clock,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  LayoutGrid,
  List,
  X,
  CreditCard,
  Truck,
  Bike,
  Bus,
  ExternalLink,
  Shield,
  Eye,
  Pencil,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { toast } from "sonner";
import ChangeReasonModal, { ChangeInfo } from "@/components/audit/ChangeReasonModal";

interface DriverLicence {
  id: string;
  type: string;
  licenceNumber: string;
  issueDate: string;
  expiryDate: string;
  document: {
    id: string;
    name: string;
    url: string;
  } | null;
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
    transition: { type: "spring", stiffness: 300, damping: 30 }
  }
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { type: "spring", stiffness: 400, damping: 40 }
  },
  exit: { opacity: 0, x: 20 }
};

// Helper functions
function getExpiryStatus(expiryDate: string): { 
  status: "valid" | "expiring" | "expired"; 
  label: string; 
  daysLeft?: number 
} {
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
  }
}

// License type icons and info
function getLicenseTypeInfo(type: string) {
  const typeLower = type.toLowerCase();
  if (typeLower.includes("motorcycle") || typeLower.includes("bike")) {
    return { icon: Bike, emoji: "🏍️", color: "text-orange-600", bg: "bg-orange-100" };
  }
  if (typeLower.includes("truck") || typeLower.includes("hgv") || typeLower.includes("heavy")) {
    return { icon: Truck, emoji: "🚛", color: "text-blue-600", bg: "bg-blue-100" };
  }
  if (typeLower.includes("bus") || typeLower.includes("passenger") || typeLower.includes("psv")) {
    return { icon: Bus, emoji: "🚌", color: "text-purple-600", bg: "bg-purple-100" };
  }
  if (typeLower.includes("forklift") || typeLower.includes("industrial")) {
    return { icon: Truck, emoji: "🏗️", color: "text-yellow-600", bg: "bg-yellow-100" };
  }
  return { icon: Car, emoji: "🚗", color: "text-cyan-600", bg: "bg-cyan-100" };
}

// Common license types
const LICENSE_TYPES = [
  { value: "Full Car License", label: "Full Car License", emoji: "🚗" },
  { value: "Provisional License", label: "Provisional License", emoji: "🎓" },
  { value: "Motorcycle License", label: "Motorcycle License", emoji: "🏍️" },
  { value: "HGV Class 1", label: "HGV Class 1 (Articulated)", emoji: "🚛" },
  { value: "HGV Class 2", label: "HGV Class 2 (Rigid)", emoji: "🚚" },
  { value: "PSV License", label: "PSV (Bus/Coach)", emoji: "🚌" },
  { value: "Forklift License", label: "Forklift License", emoji: "🏗️" },
  { value: "ADR License", label: "ADR (Hazardous Goods)", emoji: "⚠️" },
  { value: "International Permit", label: "International Driving Permit", emoji: "🌍" },
];

export default function DriverLicenses({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [licences, setLicences] = useState<DriverLicence[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState("Employee");
  
  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  
  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedLicence, setSelectedLicence] = useState<DriverLicence | null>(null);
  
  // Form state
  const [licenceType, setLicenceType] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Audit state
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeInfo[]>([]);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [licencesRes, employeeRes] = await Promise.all([
          fetch(`/api/driver-licenses/list?employeeId=${employeeId}`),
          fetch(`/api/employees/${employeeId}`),
        ]);

        if (licencesRes.ok) {
          const licencesData = await licencesRes.json();
          setLicences(licencesData);
        }

        if (employeeRes.ok) {
          const employee = await employeeRes.json();
          const name = `${employee.user?.firstName || ""} ${employee.user?.lastName || ""}`.trim();
          setEmployeeName(name || "Employee");
        }
      } catch (error) {
        console.error("Error fetching driver licences:", error);
        toast.error("Failed to load driver licenses");
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) fetchData();
  }, [employeeId]);

  // Filtered and searched licences
  const filteredLicences = useMemo(() => {
    return licences.filter(licence => {
      // Search filter
      const matchesSearch = !searchQuery || 
        licence.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        licence.licenceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      if (filterStatus === "all") return matchesSearch;
      
      const { status } = getExpiryStatus(licence.expiryDate);
      return matchesSearch && status === filterStatus;
    });
  }, [licences, searchQuery, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const valid = licences.filter(l => getExpiryStatus(l.expiryDate).status === "valid").length;
    const expiring = licences.filter(l => getExpiryStatus(l.expiryDate).status === "expiring").length;
    const expired = licences.filter(l => getExpiryStatus(l.expiryDate).status === "expired").length;
    return { valid, expiring, expired, total: licences.length };
  }, [licences]);

  const resetForm = () => {
    setLicenceType("");
    setLicenceNumber("");
    setIssueDate("");
    setExpiryDate("");
    setFile(null);
    setEditMode(false);
    setSelectedLicence(null);
  };

  const openCreateSheet = () => {
    resetForm();
    setSheetOpen(true);
  };

  const openEditSheet = (licence: DriverLicence) => {
    setSelectedLicence(licence);
    setLicenceType(licence.type || "");
    setLicenceNumber(licence.licenceNumber || "");
    setIssueDate(licence.issueDate ? licence.issueDate.slice(0, 10) : "");
    setExpiryDate(licence.expiryDate ? licence.expiryDate.slice(0, 10) : "");
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
    if (!licenceType || !licenceNumber || !issueDate || !expiryDate) {
      toast.error("Please complete all required fields");
      return;
    }

    const formData = new FormData();
    if (file) formData.append("file", file);
    formData.append("type", licenceType);
    formData.append("licenceNumber", licenceNumber);
    formData.append("issueDate", issueDate);
    formData.append("expiryDate", expiryDate);
    formData.append("employeeId", employeeId);

    const changes: ChangeInfo[] = [
      { field: "type", oldValue: editMode ? String(selectedLicence?.type || "") : "", newValue: licenceType },
      { field: "licenceNumber", oldValue: editMode ? String(selectedLicence?.licenceNumber || "") : "", newValue: licenceNumber },
      { field: "issueDate", oldValue: editMode ? String(selectedLicence?.issueDate?.slice(0, 10) || "") : "", newValue: issueDate },
      { field: "expiryDate", oldValue: editMode ? String(selectedLicence?.expiryDate?.slice(0, 10) || "") : "", newValue: expiryDate },
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
        ? `/api/driver-licenses/${selectedLicence?.id}`
        : "/api/driver-licenses/create";
      const method = editMode ? "PATCH" : "POST";

      const res = await fetch(url, { method, body: pendingFormData });

      if (res.ok) {
        const updatedLicence = await res.json();
        toast.success(editMode ? "Licence updated successfully" : "Licence added successfully");

        if (editMode) {
          setLicences(prev => prev.map(l => l.id === updatedLicence.id ? updatedLicence : l));
        } else {
          setLicences(prev => [updatedLicence, ...prev]);
        }

        setSheetOpen(false);
        resetForm();
      } else {
        const msg = await res.json().catch(() => ({}));
        toast.error(msg?.error || "Failed to save licence");
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
        title="Driver Licences"
        description="Manage driving licenses and certifications"
        icon={<Car className="w-6 h-6" />}
        breadcrumbs={{
          items: [
            { label: "Dashboard", href: "/dashboard" },
            { label: "Employees", href: "/employees" },
            { label: employeeName, href: `/employees/${employeeId}/overview` },
            { label: "Driver Licences", isCurrentPage: true },
          ],
        }}
      >
        <PageLoader text="Loading driver licences..." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Driver Licences"
      description="Manage driving licenses and certifications"
      icon={<Car className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees", href: "/employees" },
          { label: employeeName, href: `/employees/${employeeId}/overview` },
          { label: "Driver Licences", isCurrentPage: true },
        ],
      }}
      action={
        <div className="flex items-center gap-2">
          <HistoryButton employeeId={employeeId} section="driver-licenses" />
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={openCreateSheet}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Licence
            </Button>
          </motion.div>
        </div>
      }
    >
      {/* Stats Cards */}
      {licences.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <div className="glass-premium rounded-2xl p-4 shadow-premium">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-100 to-cyan-50">
                <CreditCard className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground font-medium">Total Licences</p>
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
      {licences.length > 0 && (
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
                  placeholder="Search licences..."
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
      {licences.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <EmptyState
            icon={Car}
            title="No driver licences yet"
            description="Track employee driving licenses, certifications, and permits to ensure compliance with vehicle operation requirements."
            tone="brand"
            variant="elevated"
            action={{
              label: "Add First Licence",
              onClick: openCreateSheet,
            }}
            guidance={[
              "Record all driving qualifications",
              "Get alerts before licences expire",
              "Store digital copies of documents",
            ]}
          />
        </motion.div>
      ) : filteredLicences.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-premium rounded-2xl p-12 text-center shadow-premium"
        >
          <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No matching licences</h3>
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
          {filteredLicences.map((licence) => {
            const { status, label, daysLeft } = getExpiryStatus(licence.expiryDate);
            const styles = getStatusStyles(status);
            const typeInfo = getLicenseTypeInfo(licence.type);
            const TypeIcon = typeInfo.icon;
            
            return (
              <motion.div
                key={licence.id}
                variants={cardVariants}
                layout
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="glass-premium rounded-2xl overflow-hidden shadow-premium hover:shadow-depth-4 transition-all duration-300 cursor-pointer group"
                onClick={() => openEditSheet(licence)}
              >
                {/* Status Stripe */}
                <div className={cn("h-1.5 bg-gradient-to-r", styles.gradient)} />
                
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn("p-3 rounded-xl", typeInfo.bg, "flex-shrink-0")}>
                        <TypeIcon className={cn("h-6 w-6", typeInfo.color)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate">{licence.type}</h3>
                        <p className="text-sm text-muted-foreground font-mono mt-0.5">{licence.licenceNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4">
                    <Badge className={cn("border", styles.badge)}>
                      {styles.icon}
                      <span className="ml-1">{label}</span>
                      {status !== "expired" && daysLeft !== undefined && (
                        <span className="ml-1">({daysLeft}d)</span>
                      )}
                    </Badge>
                  </div>

                  {/* Dates */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Issued:</span>
                      <span className="font-medium">{format(new Date(licence.issueDate), "dd MMM yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Expires:</span>
                      <span className={cn(
                        "font-medium",
                        status === "expired" && "text-red-600",
                        status === "expiring" && "text-amber-600"
                      )}>
                        {format(new Date(licence.expiryDate), "dd MMM yyyy")}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/20">
                    {licence.document ? (
                      <a
                        href={licence.document.url}
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
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Licence Number</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Issue Date</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Expiry Date</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Document</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredLicences.map((licence) => {
                    const { status, label } = getExpiryStatus(licence.expiryDate);
                    const styles = getStatusStyles(status);
                    const typeInfo = getLicenseTypeInfo(licence.type);
                    const TypeIcon = typeInfo.icon;
                    
                    return (
                      <motion.tr
                        key={licence.id}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        onClick={() => openEditSheet(licence)}
                        className="border-b border-white/10 hover:bg-white/30 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", typeInfo.bg)}>
                              <TypeIcon className={cn("h-4 w-4", typeInfo.color)} />
                            </div>
                            <span className="font-medium">{licence.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm">{licence.licenceNumber}</span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {format(new Date(licence.issueDate), "dd MMM yyyy")}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {format(new Date(licence.expiryDate), "dd MMM yyyy")}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={cn("border", styles.badge)}>
                            {styles.icon}
                            <span className="ml-1">{label}</span>
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {licence.document ? (
                            <a
                              href={licence.document.url}
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
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/10">
                <Car className="h-5 w-5 text-cyan-600" />
              </div>
              {editMode ? "Edit Driver Licence" : "Add Driver Licence"}
            </SheetTitle>
            <SheetDescription>
              {editMode
                ? "Update the details of this driving licence."
                : "Add a new driving licence or certification."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Licence Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Licence Type *</Label>
              <Select value={licenceType} onValueChange={setLicenceType}>
                <SelectTrigger className="h-12 rounded-xl glass-subtle border-white/20">
                  <SelectValue placeholder="Select licence type" />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.emoji}</span>
                        <span>{type.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={licenceType}
                onChange={(e) => setLicenceType(e.target.value)}
                placeholder="Or type a custom licence type..."
                className="h-10 rounded-xl glass-subtle border-white/20 text-sm"
              />
            </div>

            {/* Licence Number */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Licence Number *</Label>
              <Input
                value={licenceNumber}
                onChange={(e) => setLicenceNumber(e.target.value)}
                placeholder="e.g., MORGA753116SM9IJ"
                className="h-12 rounded-xl glass-subtle border-white/20 font-mono"
              />
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Issue Date *</Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="h-12 rounded-xl glass-subtle border-white/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Expiry Date *</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
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
                    ? "border-cyan-500 bg-cyan-50"
                    : "border-white/30 hover:border-cyan-400 hover:bg-white/30",
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
                      <CreditCard className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium">Drop licence scan here or click to upload</p>
                    <p className="text-sm text-muted-foreground">PDF or image files up to 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Preview of existing document */}
            {editMode && selectedLicence?.document && !file && (
              <div className="glass-subtle rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-cyan-600" />
                    <span className="font-medium">Current Document</span>
                  </div>
                  <a
                    href={selectedLicence.document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-600 hover:text-cyan-700 text-sm font-medium flex items-center gap-1"
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
              disabled={submitting || !licenceType || !licenceNumber || !issueDate || !expiryDate}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
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
                  <Shield className="w-4 h-4 mr-2" />
                  {editMode ? "Update Licence" : "Add Licence"}
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
