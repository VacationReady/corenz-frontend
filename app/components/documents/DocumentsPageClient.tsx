"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  UploadCloud, 
  FileText, 
  Eye, 
  Upload, 
  X, 
  Shield, 
  PenLine, 
  CheckCircle2, 
  Clock, 
  Loader2,
  FileUp, 
  Building2,
  MoreHorizontal,
  Trash2,
  Settings,
  Users,
  FileSignature,
  AlertCircle,
  FolderOpen,
  Grid3X3,
  List,
  Sparkles,
  TrendingUp,
  Calendar,
  Eye as EyeIcon,
  Info
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { usePostMutation } from "@/hooks/useMutationWithRefresh";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/Table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MultiSelect } from "@/components/ui/MultiSelect";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import EditAccessModal from "@/components/documents/EditAccessModal";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import ViewAcknowledgementsModal from "@/components/documents/ViewAcknowledgementsModal";
import ViewSignaturesModal from "@/components/documents/ViewSignaturesModal";
import FieldPlacementModal from "@/components/documents/FieldPlacementModal";
import ModernSignatureCapture, { SignatureCaptureValue } from "@/components/documents/ModernSignatureCapture";
import AcknowledgmentSuccessAnimation from "@/components/documents/AcknowledgmentSuccessAnimation";
import SignatureSuccessAnimation from "@/components/documents/SignatureSuccessAnimation";
import ModernDocumentPreview from "@/components/documents/ModernDocumentPreview";
import SignatureProgressRing from "@/components/documents/SignatureProgressRing";
import { Switch } from "@/components/ui/switch";
import { PageShell } from "@/components/ui/PageShell";
import { FilterProvider, useFilters } from "@/components/ui/FilterProvider";
import { FilterBar } from "@/components/ui/FilterBar";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { FilterOption } from "@/types/filter";
import { Badge } from "@/components/ui/Badge";

type Document = {
  id: string;
  name: string;
  category: string | null;
  path: string;
  size: number;
  type: string;
  createdAt: string;
  url: string;
  canViewAdmin: boolean;
  canViewManager: boolean;
  canViewEmployee: boolean;
  departments?: { id: string; name: string }[];
  Department?: { id: string; name: string }[];
  jobRoles?: { id: string; name: string }[];
  JobRole?: { id: string; name: string }[];
  requiresAck: boolean;
  requiresSignature?: boolean;
  signatureDueAt?: string | null;
  signatureCompletedCount?: number;
  signatureTargetCount?: number;
  signatureOutstandingCount?: number;
  ackCompletedCount?: number;
  ackTargetCount?: number;
  ackOutstandingCount?: number;
};

const normalizeCategoryLabel = (value: string | null | undefined) =>
  value === "Uncategorized" ? "Uncategorised" : value;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: { 
    scale: 1.02, 
    y: -4,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    }
  },
};

// Stats Card Component
const StatsCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  gradient, 
  delay = 0 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: React.ElementType; 
  gradient: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, type: "spring", stiffness: 300, damping: 24 }}
    whileHover={{ scale: 1.02, y: -2 }}
    className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50"
  >
    <div className={`absolute inset-0 opacity-[0.03] bg-gradient-to-br ${gradient}`} />
    <div className="relative p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  </motion.div>
);

// Document Card Component for Grid View
const DocumentCard = ({ 
  doc, 
  onOpen, 
  onEdit, 
  onDelete, 
  onViewAck, 
  onViewSig, 
  onPlaceFields,
  isAdmin,
  index
}: { 
  doc: Document; 
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewAck: () => void;
  onViewSig: () => void;
  onPlaceFields: () => void;
  isAdmin: boolean;
  index: number;
}) => {
  const formatFileSize = (size: number) =>
    size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;

  const getFileIcon = (type: string) => {
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('image')) return '🖼️';
    if (type?.includes('word') || type?.includes('doc')) return '📝';
    if (type?.includes('excel') || type?.includes('sheet')) return '📊';
    return '📁';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 24 }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={onOpen}
    >
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-2xl shadow-inner">
              {getFileIcon(doc.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {doc.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {normalizeCategoryLabel(doc.category) || "Uncategorised"}
              </p>
            </div>
          </div>
          
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all">
                  <MoreHorizontal className="w-4 h-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit()}>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Access
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewAck()}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  View Acknowledgements
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewSig()}>
                  <FileSignature className="w-4 h-4 mr-2" />
                  View Signatures
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPlaceFields()}>
                  <PenLine className="w-4 h-4 mr-2" />
                  Place Signature Fields
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete()} className="text-red-600 dark:text-red-400">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {doc.requiresAck && (
            <Badge 
              variant="secondary"
              className={`text-xs px-2.5 py-1 rounded-full ${
                doc.ackCompletedCount === doc.ackTargetCount && doc.ackTargetCount && doc.ackTargetCount > 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {doc.ackCompletedCount || 0}/{doc.ackTargetCount || 0} Acknowledged
            </Badge>
          )}
          {doc.requiresSignature && (
            <Badge 
              variant="secondary"
              className={`text-xs px-2.5 py-1 rounded-full ${
                doc.signatureCompletedCount === doc.signatureTargetCount && doc.signatureTargetCount && doc.signatureTargetCount > 0
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
              }`}
            >
              <FileSignature className="w-3 h-3 mr-1" />
              {doc.signatureCompletedCount || 0}/{doc.signatureTargetCount || 0} Signed
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(doc.createdAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span>{formatFileSize(doc.size)}</span>
          </div>
          <motion.span 
            whileHover={{ scale: 1.1 }}
            className="flex items-center gap-1 text-blue-500 dark:text-blue-400 font-medium"
          >
            <EyeIcon className="w-3.5 h-3.5" />
            View
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
};

// Empty State Component
const EmptyState = ({ 
  hasFilters, 
  onClearFilters,
  onUpload, 
  isAdmin 
}: { 
  hasFilters: boolean;
  onClearFilters?: () => void;
  onUpload: () => void;
  isAdmin: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-4"
  >
    <div className="relative">
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center shadow-xl shadow-blue-500/10"
      >
        <FolderOpen className="w-12 h-12 text-blue-500 dark:text-blue-400" />
      </motion.div>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg"
      >
        <Sparkles className="w-4 h-4 text-white" />
      </motion.div>
    </div>
    
    <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
      {hasFilters ? "No documents match your filters" : "No documents yet"}
    </h3>
    <p className="mt-2 text-slate-500 dark:text-slate-400 text-center max-w-md">
      {hasFilters 
        ? "Try adjusting your search or filter criteria to find what you're looking for."
        : "Upload your first document to get started. Documents can be shared with your entire organisation or specific teams."}
    </p>

    {hasFilters && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-6"
      >
        <Button variant="outline" onClick={onClearFilters} size="lg" className="rounded-xl">
          Clear filters
        </Button>
      </motion.div>
    )}
    
    {isAdmin && !hasFilters && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6"
      >
        <Button
          onClick={onUpload}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
        >
          <UploadCloud className="w-5 h-5 mr-2" />
          Upload Your First Document
        </Button>
      </motion.div>
    )}
  </motion.div>
);

function DocumentsContent() {
  const tenantFetch = useTenantFetch();
  const { data: documentsData, error: documentsError, isLoading: loading, mutate: refetchDocuments } = useApi<Document[]>('/api/documents/list');
  const documents = documentsData || [];

  const { data: departmentsData } = useApi<Array<{ id: string; name: string }>>('/api/departments/active');
  const { data: jobRolesData } = useApi<Array<{ id: string; name: string }>>('/api/job-roles/active');

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [requiresAck, setRequiresAck] = useState(false);
  const [requireAckFromNewStarters, setRequireAckFromNewStarters] = useState(false);
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [signatureDueAt, setSignatureDueAt] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [uploadPreviewOpen, setUploadPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadPreviewLoading, setUploadPreviewLoading] = useState(false);
  const [uploadPreviewError, setUploadPreviewError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const uploadPreviewTimeoutRef = useRef<number | null>(null);

  const clearUploadPreviewTimeout = useCallback(() => {
    if (uploadPreviewTimeoutRef.current !== null) {
      window.clearTimeout(uploadPreviewTimeoutRef.current);
      uploadPreviewTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  useEffect(() => {
    clearUploadPreviewTimeout();

    if (!uploadPreviewOpen) {
      setUploadPreviewLoading(false);
      setUploadPreviewError(null);
      return;
    }

    if (!previewUrl) {
      setUploadPreviewLoading(false);
      setUploadPreviewError("No preview available.");
      return;
    }

    setUploadPreviewLoading(true);
    setUploadPreviewError(null);

    uploadPreviewTimeoutRef.current = window.setTimeout(() => {
      uploadPreviewTimeoutRef.current = null;
      setUploadPreviewLoading(false);
      setUploadPreviewError("Preview is taking too long to load. Please try again.");
    }, 15000);

    return () => {
      clearUploadPreviewTimeout();
    };
  }, [uploadPreviewOpen, previewUrl, clearUploadPreviewTimeout]);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPlacementBeforeSendOpen, setIsPlacementBeforeSendOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isEditAccessOpen, setIsEditAccessOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [userRole, setUserRole] = useState<"ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN" | null>(null);
  const [isViewAckOpen, setIsViewAckOpen] = useState(false);
  const [ackDocId, setAckDocId] = useState<string | null>(null);
  const [ackDocName, setAckDocName] = useState<string | null>(null);
  const [isViewSignaturesOpen, setIsViewSignaturesOpen] = useState(false);
  const [sigDocId, setSigDocId] = useState<string | null>(null);
  const [sigDocName, setSigDocName] = useState<string | null>(null);
  const [isFieldPlacementOpen, setIsFieldPlacementOpen] = useState(false);
  const [uploadDepartments, setUploadDepartments] = useState<string[]>([]);
  const [uploadJobRoles, setUploadJobRoles] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [ackDate, setAckDate] = useState<Date | null>(null);
  const [signed, setSigned] = useState(false);
  const [signSubmitting, setSignSubmitting] = useState(false);
  const [signatureValue, setSignatureValue] = useState<SignatureCaptureValue | null>(null);
  const [showAckSuccess, setShowAckSuccess] = useState(false);
  const [showSignSuccess, setShowSignSuccess] = useState(false);
  const [companyName, setCompanyName] = useState<string>("");
  const [fields, setFields] = useState<any[]>([]);
  const [showCapture, setShowCapture] = useState(false);
  const [activeFieldIdx, setActiveFieldIdx] = useState<number | null>(null);
  
  const [canViewManager, setCanViewManager] = useState(true);
  const [canViewEmployee, setCanViewEmployee] = useState(true);

  const hasAnyAudience = canViewManager || canViewEmployee;
  const audienceSummary = useMemo(() => {
    const roles: string[] = ["Admins"]; // Admins always have access
    if (canViewManager) roles.push("Managers");
    if (canViewEmployee) roles.push("Employees");
    return roles.join(", ");
  }, [canViewManager, canViewEmployee]);
  
  const [placementPendingDocId, setPlacementPendingDocId] = useState<string | null>(null);
  const [placementPendingDocName, setPlacementPendingDocName] = useState<string | null>(null);
  const [sendingNotifications, setSendingNotifications] = useState(false);

  const isAdminUser = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const handleUploadPreviewOpenChange = useCallback(
    (open: boolean) => {
      if (!open && uploadPreviewLoading && !uploadPreviewError) return;
      setUploadPreviewOpen(open);
    },
    [uploadPreviewLoading, uploadPreviewError],
  );

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/document-categories");
      if (!res.ok) return;
      const data = await res.json();
      const items = Array.isArray(data) ? data : data?.categories || [];
      setCategoriesList(Array.isArray(items) ? items : []);
    } catch {
      setCategoriesList([]);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!isUploadModalOpen) return;
    // Only set default category if empty (e.g., first upload or after reset)
    // This preserves the user's category selection for bulk uploads
    if (!category) {
      setCategory("Uncategorised");
    }
  }, [isUploadModalOpen, category]);

  const departmentsList = useMemo(() => {
    if (!departmentsData) return [];
    return [
      { label: "All Departments", value: "all" },
      ...departmentsData.map((d) => ({ label: d.name, value: d.id })),
    ];
  }, [departmentsData]);

  const jobRolesList = useMemo(() => {
    if (!jobRolesData) return [];
    return [
      { label: "All Job Roles", value: "all" },
      ...jobRolesData.map((r) => ({ label: r.name, value: r.id })),
    ];
  }, [jobRolesData]);

  useEffect(() => {
    if (departmentsList.length && !uploadDepartments.length) {
      setUploadDepartments(["all"]);
    }
    if (jobRolesList.length && !uploadJobRoles.length) {
      setUploadJobRoles(["all"]);
    }
  }, [departmentsList, jobRolesList, uploadDepartments.length, uploadJobRoles.length]);

  useEffect(() => {
    if (documentsError) {
      console.error("Failed to load documents", documentsError);
      toast.error("Failed to load documents");
    }
  }, [documentsError]);

  const fetchUserRole = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      setUserRole(session?.user?.role || null);
      if (session?.user?.companyId) {
        const companyRes = await fetch(`/api/companies/${session.user.companyId}`);
        if (companyRes.ok) {
          const company = await companyRes.json();
          setCompanyName(company?.name || "");
        }
      }
    } catch (err) {
      console.error("Failed to fetch user role", err);
    }
  };

  useEffect(() => {
    if (!selectedDoc?.id) return;

    if (selectedDoc.requiresAck) {
      tenantFetch(`/api/documents/acknowledge/${selectedDoc.id}/me`)
        .then((res) => res.json())
        .then((data) => {
          setAcknowledged(!!data.acknowledged);
          setAckDate(data.acknowledged ? new Date(data.acknowledgedAt) : null);
        })
        .catch(() => {
          setAcknowledged(false);
          setAckDate(null);
        });
    } else {
      setAcknowledged(false);
      setAckDate(null);
    }

    if ((selectedDoc as any).requiresSignature) {
      tenantFetch(`/api/documents/signatures/${selectedDoc.id}/me`)
        .then((res) => res.json())
        .then((data) => setSigned(!!data.signed))
        .catch(() => setSigned(false));
      tenantFetch(`/api/documents/signature-fields/${selectedDoc.id}`)
        .then((r) => r.json())
        .then((data) => setFields(Array.isArray(data) ? data : []))
        .catch(() => setFields([]));
    } else {
      setSigned(false);
      setFields([]);
    }
  }, [selectedDoc, tenantFetch]);

  useEffect(() => {
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (loading || documents.length === 0) return;
    
    const url = new URL(window.location.href);
    const openId = url.searchParams.get("open");
    
    if (openId) {
      const doc = documents.find((d) => d.id === openId);
      if (doc) {
        setAcknowledged(false);
        setAckDate(null);
        setSigned(false);
        setFields([]);
        setSignatureValue(null);
        setShowCapture(false);
        setActiveFieldIdx(null);
        setSelectedDoc(doc);
        setIsPreviewModalOpen(true);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("open");
        window.history.replaceState({}, "", newUrl.toString());
      } else {
        console.warn(`Document with ID ${openId} not found or not accessible`);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("open");
        window.history.replaceState({}, "", newUrl.toString());
      }
    }
  }, [documents, loading]);

  const { filters, clearFilters } = useFilters();

  // Calculate statistics
  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const pendingAck = documents.reduce((sum, doc) => sum + (doc.ackOutstandingCount || 0), 0);
    const pendingSig = documents.reduce((sum, doc) => sum + (doc.signatureOutstandingCount || 0), 0);
    const thisMonth = documents.filter(doc => {
      const date = new Date(doc.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    return { totalDocs, pendingAck, pendingSig, thisMonth };
  }, [documents]);

  const documentTypeOptions: FilterOption[] = useMemo(() => {
    const types = documents
      .map((doc) => doc.type)
      .filter(Boolean)
      .filter((type, i, arr) => arr.indexOf(type) === i);
    return [
      { label: "All Types", value: "all" },
      ...types.map((type) => ({ label: type, value: type })),
    ];
  }, [documents]);

  const categoryOptions: FilterOption[] = useMemo(() => {
    const fromDocs = Array.from(
      new Set(
        documents
          .map((doc) => doc.category)
          .filter((x): x is string => Boolean(x)) as string[],
      ),
    );

    const base = Array.from(
      new Set(
        [...(categoriesList || []), ...fromDocs].map((cat) =>
          normalizeCategoryLabel(cat) as string,
        ),
      ),
    );
    return [
      { label: "All Categories", value: "all" },
      ...base.map((cat) => ({ label: cat, value: cat })),
    ];
  }, [documents, categoriesList]);

  const uploadCategoryOptions: FilterOption[] = useMemo(() => {
    const base = categoriesList.length
      ? categoriesList
      : Array.from(
          new Set(
            documents
              .map((doc) => doc.category)
              .filter((x): x is string => Boolean(x)) as string[],
          ),
        );

    const items: string[] = [];
    for (const c of base) {
      const normalized = normalizeCategoryLabel(c);
      if (normalized && !items.includes(normalized)) items.push(normalized);
    }
    if (!items.includes("Uncategorised")) items.push("Uncategorised");

    return items.map((cat) => ({ label: cat, value: cat }));
  }, [documents, categoriesList]);

  const sortOptions: FilterOption[] = [
    { label: "Name", value: "name" },
    { label: "Date", value: "date" },
    { label: "Size", value: "size" },
    { label: "Type", value: "type" },
    { label: "Category", value: "category" },
  ];

  const filterConfig = useMemo(
    () => ({
      searchPlaceholder: "Search documents...",
      showDepartmentFilter: true,
      showJobRoleFilter: true,
      showDocumentTypeFilter: true,
      showCategoryFilter: true,
      advancedFiltersLabel: "Filters",
    }),
    [],
  );

  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.name.toLowerCase().includes(search) ||
          normalizeCategoryLabel(doc.category)?.toLowerCase().includes(search) ||
          doc.type.toLowerCase().includes(search),
      );
    }
    if (filters.documentTypes.length > 0 && !filters.documentTypes.includes("all")) {
      filtered = filtered.filter((doc) => filters.documentTypes.includes(doc.type));
    }
    if (filters.categories.length > 0 && !filters.categories.includes("all")) {
      filtered = filtered.filter((doc) => {
        const docCategory = normalizeCategoryLabel(doc.category);
        return docCategory && filters.categories.includes(docCategory);
      });
    }
    if (filters.departments.length > 0 && !filters.departments.includes("all")) {
      filtered = filtered.filter((doc) => {
        const docDepartments: Array<{ id: string; name: string }> = Array.isArray(doc.departments)
          ? (doc.departments as Array<{ id: string; name: string }>)
          : Array.isArray(doc.Department)
            ? (doc.Department as Array<{ id: string; name: string }>)
            : [];
        return docDepartments.some((dept) => filters.departments.includes(dept.id));
      });
    }

    if (filters.jobRoles.length > 0 && !filters.jobRoles.includes("all")) {
      filtered = filtered.filter((doc) => {
        const docJobRoles: Array<{ id: string; name: string }> = Array.isArray(doc.jobRoles)
          ? (doc.jobRoles as Array<{ id: string; name: string }>)
          : Array.isArray(doc.JobRole)
            ? (doc.JobRole as Array<{ id: string; name: string }>)
            : [];
        return docJobRoles.some((jr) => filters.jobRoles.includes(jr.id));
      });
    }
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let aVal = "", bVal = "";
        switch (filters.sortBy) {
          case "name": aVal = a.name; bVal = b.name; break;
          case "date": aVal = a.createdAt; bVal = b.createdAt; break;
          case "size": return filters.sortOrder === "desc" ? b.size - a.size : a.size - b.size;
          case "type": aVal = a.type; bVal = b.type; break;
          case "category": aVal = normalizeCategoryLabel(a.category) || ""; bVal = normalizeCategoryLabel(b.category) || ""; break;
        }
        const comp = aVal.localeCompare(bVal);
        return filters.sortOrder === "desc" ? -comp : comp;
      });
    }
    return filtered;
  }, [documents, filters]);

  const hasActiveFilters = filters.search || 
    (filters.documentTypes.length > 0 && !filters.documentTypes.includes("all")) ||
    (filters.categories.length > 0 && !filters.categories.includes("all")) ||
    (filters.departments.length > 0 && !filters.departments.includes("all")) ||
    (filters.jobRoles.length > 0 && !filters.jobRoles.includes("all"));

  const handleExport = () => {
    const csv = [
      ["Name", "Category", "Type", "Size", "Date", "Departments", "Job Roles"],
      ...filteredDocuments.map((doc) => [
        doc.name,
        doc.category || "",
        doc.type,
        `${(doc.size / 1024).toFixed(2)} KB`,
        new Date(doc.createdAt).toLocaleDateString(),
        (Array.isArray(doc.departments) ? doc.departments : Array.isArray(doc.Department) ? doc.Department : []).map((d) => d.name).join("; "),
        (Array.isArray(doc.jobRoles) ? doc.jobRoles : Array.isArray(doc.JobRole) ? doc.JobRole : []).map((jr) => jr.name).join("; "),
      ]),
    ]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documents-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      return toast.error("Please select a file to upload.");
    }
    if (!name) {
      return toast.error("Please enter a document name.");
    }
    if (!category || category === "all") {
      return toast.error("Please select a category for this document.");
    }
    if (!canViewManager && !canViewEmployee) {
      return toast.error("Select at least one audience (Managers or Employees).");
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("category", category);
    formData.append("departments", JSON.stringify(uploadDepartments.includes("all") ? [] : uploadDepartments));
    formData.append("jobRoles", JSON.stringify(uploadJobRoles.includes("all") ? [] : uploadJobRoles));
    formData.append("canViewAdmin", "true"); // Admins always see all documents
    formData.append("canViewManager", canViewManager.toString());
    formData.append("canViewEmployee", canViewEmployee.toString());
    formData.append("requiresAck", requiresAck.toString());
    formData.append("requiresSignature", requiresSignature.toString());
    if (signatureDueAt) formData.append("signatureDueAt", signatureDueAt);
    formData.append("deferNotifications", requiresSignature ? "true" : "false");
    formData.append("requireAckFromNewStarters", requireAckFromNewStarters.toString());
    try {
      const res = await tenantFetch("/api/documents/upload", { method: "POST", body: formData });
      if (res.ok) {
        const payload = await res.json();
        toast.success("Document uploaded successfully!");
        if (requiresSignature && payload?.Document?.id) {
          setPlacementPendingDocId(payload.Document.id);
          setPlacementPendingDocName(payload.Document.name);
          setSigDocId(payload.Document.id);
          setSigDocName(payload.Document.name);
          setIsPlacementBeforeSendOpen(true);
        } else {
          resetUploadForm();
          setIsUploadModalOpen(false);
          refetchDocuments();
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData?.error || "Failed to upload document.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Network error uploading document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const { trigger: acknowledgeDocument } = usePostMutation<any, { documentId: string }>(
    '/api/documents/acknowledge',
    {
      successMessage: 'Document acknowledged successfully',
      errorMessage: 'Failed to acknowledge document',
      invalidateKeys: ['/api/documents/list'],
      onSuccess: () => {
        setAcknowledged(true);
        const now = new Date();
        setAckDate(now);
        setIsPreviewModalOpen(false);
        setShowAckSuccess(true);
        refetchDocuments();
      },
    }
  );

  const { trigger: deleteDocument } = usePostMutation<any, { documentId: string }>(
    '/api/documents/delete',
    {
      successMessage: 'Document deleted successfully',
      errorMessage: 'Failed to delete document',
      invalidateKeys: ['/api/documents/list'],
      onSuccess: () => {
        refetchDocuments();
      },
    }
  );

  const handleAcknowledge = async () => {
    if (!selectedDoc) return;
    await acknowledgeDocument({ documentId: selectedDoc.id });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    await deleteDocument({ documentId: id });
  };

  const formatFileSize = (size: number) =>
    size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;

  const openDocument = (doc: Document) => {
    setAcknowledged(false);
    setAckDate(null);
    setSigned(false);
    setFields([]);
    setSignatureValue(null);
    setShowCapture(false);
    setActiveFieldIdx(null);
    setSelectedDoc(doc);
    setIsPreviewModalOpen(true);
  };

  const handleRowClick = (doc: Document) => {
    openDocument(doc);
  };

  const resetUploadForm = () => {
    setFile(null);
    setName("");
    // Preserve category for bulk uploads - don't reset
    // setCategory("");
    setRequiresAck(false);
    setRequireAckFromNewStarters(false);
    setRequiresSignature(false);
    setSignatureDueAt("");
    setUploadDepartments(["all"]);
    setUploadJobRoles(["all"]);
    setCanViewManager(true);
    setCanViewEmployee(true);
  };

  const handlePlacementComplete = async () => {
    if (!placementPendingDocId) return;
    setSendingNotifications(true);
    try {
      const res = await tenantFetch("/api/documents/send-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: placementPendingDocId }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Notifications sent successfully!");
        setPlacementPendingDocId(null);
        setPlacementPendingDocName(null);
        setIsPlacementBeforeSendOpen(false);
        resetUploadForm();
        setIsUploadModalOpen(false);
        refetchDocuments();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData?.error || "Failed to send notifications.");
      }
    } catch (error) {
      console.error("Send notifications error:", error);
      toast.error("Network error sending notifications.");
    } finally {
      setSendingNotifications(false);
    }
  };

  const handleListPlacementComplete = async () => {
    if (!sigDocId) return;
    setSendingNotifications(true);
    try {
      const res = await tenantFetch("/api/documents/send-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: sigDocId }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Notifications sent successfully!");
        setIsFieldPlacementOpen(false);
        refetchDocuments();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData?.error || "Failed to send notifications.");
      }
    } catch (error) {
      console.error("Send notifications error:", error);
      toast.error("Network error sending notifications.");
    } finally {
      setSendingNotifications(false);
    }
  };

  const handlePlacementCancel = () => {
    if (placementPendingDocId) {
      toast.warning("Field placement not completed. You can complete it later from the document actions menu.", { duration: 6000 });
    }
    setIsPlacementBeforeSendOpen(false);
    resetUploadForm();
    setIsUploadModalOpen(false);
    refetchDocuments();
  };

  const handlePlacementDiscard = async () => {
    if (placementPendingDocId) {
      await deleteDocument({ documentId: placementPendingDocId });
      toast.success("Upload cancelled and document discarded.");
    }
    setIsPlacementBeforeSendOpen(false);
    resetUploadForm();
    setIsUploadModalOpen(false);
    refetchDocuments();
  };

  const handleSign = async (signature: SignatureCaptureValue) => {
    if (!selectedDoc) return;
    setSignSubmitting(true);
    try {
      const res = await tenantFetch("/api/documents/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedDoc.id,
          method: signature.method,
          typedText: signature.typedText,
          drawnDataUrl: signature.dataUrl,
          fieldId: undefined,
        }),
      });
      if (res.ok) {
        const payload = await res.json();
        setSigned(true);
        setAckDate(payload?.signature?.signedAt ? new Date(payload.signature.signedAt) : new Date());
        try {
          const u = await tenantFetch(`/api/documents/signed-url/${selectedDoc.id}`).then((r) => r.json());
          if (u?.url) setSelectedDoc({ ...selectedDoc, url: u.url });
        } catch {}
        setIsPreviewModalOpen(false);
        setShowSignSuccess(true);
        refetchDocuments();
      } else {
        toast("Failed to submit signature");
      }
    } catch {
      toast("Error submitting signature");
    } finally {
      setSignSubmitting(false);
    }
  };

  const breadcrumbs = useBreadcrumbs();

  // Loading state
  if (loading) {
    return (
      <PageShell
        title="Documents"
        description="Manage and organise your company documents"
        icon={<FileText className="w-6 h-6" />}
        breadcrumbs={breadcrumbs || undefined}
      >
        <div className="flex items-center justify-center h-96">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full"
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Documents"
      description="Manage and organise your company documents"
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={breadcrumbs || undefined}
      action={
        isAdminUser ? (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
            >
              <UploadCloud className="w-4 h-4 mr-2" /> 
              Upload Document
            </Button>
          </motion.div>
        ) : undefined
      }
    >
      <TooltipProvider>
        <div className="space-y-6">
          {/* Stats Cards */}
          {documents.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Total Documents"
                value={stats.totalDocs}
                subtitle="In your library"
                icon={FileText}
                gradient="from-blue-500 to-blue-600"
                delay={0}
              />
              <StatsCard
                title="Pending Acknowledgements"
                value={stats.pendingAck}
                subtitle="Awaiting response"
                icon={CheckCircle2}
                gradient="from-amber-500 to-orange-500"
                delay={0.1}
              />
              <StatsCard
                title="Pending Signatures"
                value={stats.pendingSig}
                subtitle="Need attention"
                icon={FileSignature}
                gradient="from-indigo-500 to-violet-500"
                delay={0.2}
              />
              <StatsCard
                title="Added This Month"
                value={stats.thisMonth}
                subtitle={new Date().toLocaleDateString("en-NZ", { month: "long" })}
                icon={TrendingUp}
                gradient="from-emerald-500 to-teal-500"
                delay={0.3}
              />
            </div>
          )}

          {/* Search and Filter Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row gap-4 items-stretch justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4 shadow-sm"
          >
            <div className="flex-1 min-w-0">
              <FilterBar
                config={filterConfig}
                departmentOptions={departmentsList}
                jobRoleOptions={jobRolesList}
                documentTypeOptions={documentTypeOptions}
                categoryOptions={categoryOptions}
                sortOptions={sortOptions}
                onExport={handleExport}
              />
            </div>

            <div className="flex items-center gap-3 self-start lg:self-center">
              {/* View Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === "grid" 
                      ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600" 
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === "list" 
                      ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600" 
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Documents Display */}
          <AnimatePresence mode="wait">
            {filteredDocuments.length === 0 ? (
              <EmptyState
                hasFilters={!!hasActiveFilters}
                onClearFilters={() => {
                  clearFilters();
                }}
                onUpload={() => setIsUploadModalOpen(true)}
                isAdmin={isAdminUser}
              />
            ) : viewMode === "grid" ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-visible"
              >
                {filteredDocuments.map((doc, index) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    index={index}
                    isAdmin={isAdminUser}
                    onOpen={() => handleRowClick(doc)}
                    onEdit={() => {
                      setEditingDoc(doc);
                      setIsEditAccessOpen(true);
                    }}
                    onDelete={() => handleDelete(doc.id)}
                    onViewAck={() => {
                      setAckDocId(doc.id);
                      setAckDocName(doc.name);
                      setIsViewAckOpen(true);
                    }}
                    onViewSig={() => {
                      setSigDocId(doc.id);
                      setSigDocName(doc.name);
                      setIsViewSignaturesOpen(true);
                    }}
                    onPlaceFields={() => {
                      setSigDocId(doc.id);
                      setSigDocName(doc.name);
                      setSelectedDoc(doc);
                      setIsFieldPlacementOpen(true);
                    }}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-visible"
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Department</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Size</TableHead>
                      {isAdminUser && <TableHead className="w-[50px] text-right font-semibold">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc, index) => {
                      const docDepartments = Array.isArray(doc.departments) ? doc.departments : Array.isArray(doc.Department) ? doc.Department : [];
                      return (
                        <motion.tr
                          key={doc.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleRowClick(doc)}
                          className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors group border-b border-slate-100 dark:border-slate-800"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-lg shadow-inner">
                                📄
                              </div>
                              <span className="font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {doc.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                              {normalizeCategoryLabel(doc.category) || "Uncategorised"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400">
                            {docDepartments.length > 0 ? docDepartments.map((d) => d.name).join(", ") : "All"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1.5">
                              {doc.requiresAck && (
                                <Badge className={`text-xs ${
                                  doc.ackCompletedCount === doc.ackTargetCount && doc.ackTargetCount && doc.ackTargetCount > 0
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}>
                                  {doc.ackCompletedCount || 0}/{doc.ackTargetCount || 0}
                                </Badge>
                              )}
                              {doc.requiresSignature && (
                                <Badge className={`text-xs ${
                                  doc.signatureCompletedCount === doc.signatureTargetCount && doc.signatureTargetCount && doc.signatureTargetCount > 0
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-indigo-100 text-indigo-700"
                                }`}>
                                  {doc.signatureCompletedCount || 0}/{doc.signatureTargetCount || 0}
                                </Badge>
                              )}
                              {!doc.requiresAck && !doc.requiresSignature && (
                                <span className="text-slate-400 text-sm">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400">
                            {new Date(doc.createdAt).toLocaleDateString("en-NZ", { month: "short", day: "numeric", year: "numeric" })}
                          </TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400">
                            {formatFileSize(doc.size)}
                          </TableCell>
                          {isAdminUser && (
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setEditingDoc(doc); setIsEditAccessOpen(true); }}>
                                    <Settings className="w-4 h-4 mr-2" />
                                    Edit Access
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setAckDocId(doc.id); setAckDocName(doc.name); setIsViewAckOpen(true); }}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    View Acknowledgements
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setSigDocId(doc.id); setSigDocName(doc.name); setIsViewSignaturesOpen(true); }}>
                                    <FileSignature className="w-4 h-4 mr-2" />
                                    View Signatures
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setSigDocId(doc.id); setSigDocName(doc.name); setSelectedDoc(doc); setIsFieldPlacementOpen(true); }}>
                                    <PenLine className="w-4 h-4 mr-2" />
                                    Place Signature Fields
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDelete(doc.id)} className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Upload Modal */}
        <Dialog open={isUploadModalOpen} onOpenChange={(open) => {
          if (!open) {
            // Reset category when modal is closed to prevent accidental wrong category selection
            setCategory("");
          }
          setIsUploadModalOpen(open);
        }}>
          <DialogContent rawContent className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 flex-shrink-0 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30"
                >
                  <FileUp className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Upload Company Document
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Share documents with your organisation
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <form onSubmit={handleUpload} className="px-8 pb-8 space-y-6 flex-1 overflow-y-auto">
              {/* Document Details */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4 pt-6"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Document Details
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Document Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                      placeholder="Enter document name"
                      className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <Select value={category} onValueChange={(v: string) => {
                      if (v === "__new__") setManageCategoriesOpen(true);
                      else setCategory(v);
                    }}>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {uploadCategoryOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                        <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                          <SelectItem value="__new__">
                            <span className="text-blue-600 dark:text-blue-400">+ Add new category</span>
                          </SelectItem>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>

              {/* Target Audience */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  Target Audience
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Departments</Label>
                    <MultiSelect
                      options={departmentsList}
                      selected={uploadDepartments}
                      onChange={(values) => values.includes("all") ? setUploadDepartments(["all"]) : setUploadDepartments(values)}
                      placeholder="Select department(s)"
                      searchable
                      searchPlaceholder="Search departments..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Job Roles</Label>
                    <MultiSelect
                      options={jobRolesList}
                      selected={uploadJobRoles}
                      onChange={(values) => values.includes("all") ? setUploadJobRoles(["all"]) : setUploadJobRoles(values)}
                      placeholder="Select job role(s)"
                      searchable
                      searchPlaceholder="Search job roles..."
                    />
                  </div>
                </div>
              </motion.div>

              {/* Access & Compliance */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Shield className="w-4 h-4 text-amber-500" />
                  Access & Compliance
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-4">
                  {/* Visibility */}
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Visible to:</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/30 cursor-help">
                              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">?</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p>Admins always have access to all documents regardless of these settings.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch checked={canViewManager} onChange={setCanViewManager} />
                      <span className="text-sm">Managers</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch checked={canViewEmployee} onChange={setCanViewEmployee} />
                      <span className="text-sm">Employees</span>
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Note: Admins can always see all documents.</p>

                  {!hasAnyAudience ? (
                    <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                      <AlertCircle className="w-4 h-4 mt-0.5" />
                      <span>Select at least one audience (Managers or Employees).</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Visible to: {audienceSummary}
                    </div>
                  )}

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium">Requires Acknowledgement</p>
                          <p className="text-xs text-slate-500">Employees must confirm they've read this</p>
                        </div>
                      </div>
                      <Switch checked={requiresAck} onChange={setRequiresAck} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-slate-400" />
                        <div className="flex items-center gap-1.5">
                          <div>
                            <p className="text-sm font-medium">Auto-assign to New Starters</p>
                            <p className="text-xs text-slate-500">Include in onboarding package</p>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-center">
                              This document will automatically appear in onboarding journey templates and new starters will be required to acknowledge it during their onboarding.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      <Switch checked={requireAckFromNewStarters} onChange={setRequireAckFromNewStarters} />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* File Upload */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Upload File <span className="text-red-500">*</span>
                </Label>
                <div
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                    file 
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" 
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                  }`}
                >
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  
                  {file ? (
                    <div className="space-y-3">
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center"
                      >
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                      </motion.div>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">{file.name}</p>
                      <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            setUploadPreviewOpen(true);
                          }}
                          className="rounded-xl"
                        >
                          <Eye className="w-4 h-4 mr-1" /> Preview
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setFile(null); }}
                          className="text-slate-500 hover:text-red-500"
                        >
                          <X className="w-4 h-4 mr-1" /> Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          Drag & drop or click to upload
                        </p>
                        <p className="text-sm text-slate-500">
                          PDF, Word, Excel, or image files
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800"
              >
                <Button type="button" variant="ghost" onClick={() => setIsUploadModalOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={uploading}
                  loadingText="Uploading..."
                  disabled={!file || !name || !category || category === "all" || !hasAnyAudience}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 rounded-xl px-6"
                  icon={<UploadCloud className="h-4 w-4" />}
                >
                  Upload Document
                </Button>
              </motion.div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Manage Categories Modal */}
        <Dialog open={manageCategoriesOpen} onOpenChange={setManageCategoriesOpen}>
          <DialogContent className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-md rounded-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold">Manage Categories</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2 max-h-60 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  {categoryOptions.filter((o) => o.value !== "all").map((opt) => (
                    <div key={opt.value} className="flex items-center justify-between gap-2 p-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                      <span className="text-sm font-medium">{opt.label}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-3 text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/document-categories", {
                              method: "DELETE",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ name: opt.value }),
                            });
                            if (!res.ok) {
                              const data = await res.json().catch(() => ({}));
                              throw new Error(data.error || "Failed to delete category");
                            }
                            setCategoriesList((prev) => prev.filter((x) => x !== opt.value));
                            if (category === opt.value) setCategory("");
                          } catch (e: any) {
                            toast.error(e.message);
                          }
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {categoryOptions.filter((o) => o.value !== "all").length === 0 && (
                    <p className="text-sm text-slate-500 p-4 text-center">No categories yet.</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategoryName(e.target.value)}
                    placeholder="New category name"
                    className="h-11 rounded-xl"
                  />
                  <Button
                    className="h-11 px-5 rounded-xl"
                    onClick={async () => {
                      const catName = newCategoryName.trim();
                      if (!catName) return;
                      try {
                        const res = await fetch("/api/document-categories", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name: catName }),
                        });
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}));
                          throw new Error(data.error || "Failed to add category");
                        }
                        setCategoriesList((prev) => (prev.includes(catName) ? prev : [...prev, catName]));
                        setCategory(catName);
                        setNewCategoryName("");
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <Button variant="ghost" onClick={() => setManageCategoriesOpen(false)} className="rounded-xl">
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Placement Modal */}
        <FieldPlacementModal
          isOpen={isPlacementBeforeSendOpen}
          onClose={handlePlacementCancel}
          documentId={sigDocId || ""}
          url={selectedDoc?.url || ""}
          onSaveComplete={handlePlacementComplete}
          sendingNotifications={sendingNotifications}
          isInitialUpload={true}
          onDiscard={handlePlacementDiscard}
        />

        {/* Document Preview */}
        {selectedDoc && (
          <ModernDocumentPreview
            isOpen={isPreviewModalOpen}
            onClose={() => setIsPreviewModalOpen(false)}
            document={selectedDoc}
            acknowledged={acknowledged}
            ackDate={ackDate}
            signed={signed}
            eligible={true}
            onAcknowledge={handleAcknowledge}
            onSign={handleSign}
            signSubmitting={signSubmitting}
            companyName={companyName}
          />
        )}

        {/* Success Animations */}
        <AcknowledgmentSuccessAnimation
          isOpen={showAckSuccess}
          onClose={() => setShowAckSuccess(false)}
          documentName={selectedDoc?.name || ""}
          acknowledgedAt={ackDate || new Date()}
          companyName={companyName}
        />
        
        <SignatureSuccessAnimation
          isOpen={showSignSuccess}
          onClose={() => setShowSignSuccess(false)}
          documentName={selectedDoc?.name || ""}
          signedAt={ackDate || new Date()}
          signatureMethod={signatureValue?.method || "DRAWN"}
          companyName={companyName}
        />

        <EditAccessModal
          isOpen={isEditAccessOpen}
          onClose={() => setIsEditAccessOpen(false)}
          document={editingDoc}
          onSaved={refetchDocuments}
        />
        <ViewAcknowledgementsModal
          isOpen={isViewAckOpen}
          onClose={() => setIsViewAckOpen(false)}
          documentId={ackDocId}
          documentName={ackDocName}
        />
        <ViewSignaturesModal
          isOpen={isViewSignaturesOpen}
          onClose={() => setIsViewSignaturesOpen(false)}
          documentId={sigDocId}
          documentName={sigDocName}
        />
        <FieldPlacementModal
          isOpen={isFieldPlacementOpen}
          onClose={() => setIsFieldPlacementOpen(false)}
          documentId={sigDocId || ""}
          url={selectedDoc?.url || ""}
          onSaveComplete={handleListPlacementComplete}
          sendingNotifications={sendingNotifications}
        />

        {/* Upload Preview Modal */}
        <Dialog open={uploadPreviewOpen} onOpenChange={handleUploadPreviewOpenChange}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Preview: {file?.name}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden border relative">
              {previewUrl && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full"
                  title="Preview"
                  onLoad={() => {
                    clearUploadPreviewTimeout();
                    setUploadPreviewLoading(false);
                    setUploadPreviewError(null);
                  }}
                  onError={() => {
                    clearUploadPreviewTimeout();
                    setUploadPreviewLoading(false);
                    setUploadPreviewError("Failed to load preview.");
                  }}
                />
              )}

              {(uploadPreviewLoading || uploadPreviewError) && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-950/50 backdrop-blur-sm">
                  {uploadPreviewLoading ? (
                    <div className="flex flex-col items-center gap-2 text-slate-600 dark:text-slate-200">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <div className="text-sm font-medium">Loading preview...</div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">Large files can take a moment.</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-700 dark:text-slate-200 px-6 text-center">
                      <AlertCircle className="w-6 h-6" />
                      <div className="text-sm font-medium">{uploadPreviewError}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">You can close this dialog and try again.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={() => handleUploadPreviewOpenChange(false)}
                disabled={uploadPreviewLoading && !uploadPreviewError}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </PageShell>
  );
}

export default function DocumentsPageClient() {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId;
  
  return (
    <FilterProvider 
      persistenceKey="documents-filters" 
      enableUrlSync={true} 
      enableLocalStorage={true}
      companyId={companyId}
    >
      <DocumentsContent />
    </FilterProvider>
  );
}
