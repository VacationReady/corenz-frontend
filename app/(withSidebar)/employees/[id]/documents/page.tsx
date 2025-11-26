"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import Button from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  FileSignature, 
  Upload, 
  X, 
  Shield, 
  Eye, 
  PenLine, 
  Clock, 
  FileUp,
  Search,
  MoreHorizontal,
  Trash2,
  Settings,
  Download,
  Grid3X3,
  List,
  Calendar,
  User,
  FolderOpen,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import EditAccessModal from "@/components/documents/EditAccessModal";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import ViewAcknowledgementsModal from "@/components/documents/ViewAcknowledgementsModal";
import FieldPlacementModal from "@/components/documents/FieldPlacementModal";
import ModernSignatureCapture, { SignatureCaptureValue } from "@/components/documents/ModernSignatureCapture";
import AcknowledgmentSuccessAnimation from "@/components/documents/AcknowledgmentSuccessAnimation";
import SignatureSuccessAnimation from "@/components/documents/SignatureSuccessAnimation";
import DocumentUploadSuccessAnimation, { UploadSuccessType } from "@/components/documents/DocumentUploadSuccessAnimation";
import DocumentDeleteConfirmModal from "@/components/documents/DocumentDeleteConfirmModal";
import DocumentDeleteSuccessAnimation from "@/components/documents/DocumentDeleteSuccessAnimation";
import ModernDocumentPreview from "@/components/documents/ModernDocumentPreview";
import SignatureProgressRing from "@/components/documents/SignatureProgressRing";

type Department = { id: string; name: string };
type JobRole = { id: string; name: string };

type Document = {
  id: string;
  name: string;
  category: string | null;
  createdAt: string;
  size: number;
  url: string;
  canViewAdmin: boolean;
  canViewManager: boolean;
  canViewEmployee: boolean;
  requiresAck?: boolean;
  requiresSignature?: boolean;
  signatureDueAt?: string | null;
  departments: Department[];
  jobRoles: JobRole[];
  ackCompletedCount?: number;
  ackOutstandingCount?: number;
  signatureCompletedCount?: number;
  signatureOutstandingCount?: number;
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
    <div className="relative p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  </motion.div>
);

// Document Card Component
const DocumentCard = ({ 
  doc, 
  onOpen, 
  onEdit, 
  onDelete, 
  onViewAck, 
  isAdmin,
  index,
  signed,
  params
}: { 
  doc: Document; 
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewAck: () => void;
  isAdmin: boolean;
  index: number;
  signed: boolean;
  params: any;
}) => {
  const formatFileSize = (size: number) =>
    size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;

  const getFileIcon = (name: string) => {
    if (name?.toLowerCase().includes('.pdf')) return '📄';
    if (name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)/)) return '🖼️';
    if (name?.toLowerCase().match(/\.(doc|docx)/)) return '📝';
    if (name?.toLowerCase().match(/\.(xls|xlsx)/)) return '📊';
    return '📁';
  };

  const isSignedByEmployee = (doc as any).SignatureArtifacts?.some?.((a: any) => a.employeeId === params?.id) || signed;

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
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-2xl shadow-inner">
              {getFileIcon(doc.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {doc.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {doc.category || "Uncategorized"}
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
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Access
                </DropdownMenuItem>
                {doc.requiresAck && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewAck(); }}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    View Acknowledgements
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-600 dark:text-red-400">
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
              className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Requires Acknowledgement
            </Badge>
          )}
          {doc.requiresSignature && (
            <Badge 
              variant="secondary"
              className={`text-xs px-2.5 py-1 rounded-full ${
                isSignedByEmployee
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}
            >
              <FileSignature className="w-3 h-3 mr-1" />
              {isSignedByEmployee ? "Signed" : "Signature Required"}
            </Badge>
          )}
        </div>

        {/* Access badges */}
        <div className="flex flex-wrap gap-1 mb-4">
          {doc.canViewAdmin && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              Admin
            </span>
          )}
          {doc.canViewManager && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              Manager
            </span>
          )}
          {doc.canViewEmployee && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              Employee
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(doc.createdAt).toLocaleDateString("en-NZ", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span>{formatFileSize(doc.size)}</span>
          </div>
          <motion.span 
            whileHover={{ scale: 1.1 }}
            className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400 font-medium"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
};

// Empty State Component
const EmptyState = ({ 
  onUpload, 
  isAdmin,
  employeeName 
}: { 
  onUpload: () => void;
  isAdmin: boolean;
  employeeName: string;
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
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center shadow-xl shadow-emerald-500/10"
      >
        <FolderOpen className="w-12 h-12 text-emerald-500 dark:text-emerald-400" />
      </motion.div>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg"
      >
        <User className="w-4 h-4 text-white" />
      </motion.div>
    </div>
    
    <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
      No documents yet
    </h3>
    <p className="mt-2 text-slate-500 dark:text-slate-400 text-center max-w-md">
      No documents have been uploaded for {employeeName} yet. Upload documents like contracts, ID verification, or training certificates.
    </p>
    
    {isAdmin && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6"
      >
        <Button
          onClick={onUpload}
          size="lg"
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25"
        >
          <Upload className="w-5 h-5 mr-2" />
          Upload First Document
        </Button>
      </motion.div>
    )}
  </motion.div>
);

export default function EmployeeDocumentsPage() {
  const params = useParams();
  const employeeId = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState<string>("Employee");
  const [uploading, setUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [requiresAck, setRequiresAck] = useState(false);
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [signatureDueAt, setSignatureDueAt] = useState("");
  const [isPlacementBeforeSendOpen, setIsPlacementBeforeSendOpen] = useState(false);
  const [fields, setFields] = useState<any[]>([]);
  const [showCapture, setShowCapture] = useState(false);
  const [activeFieldIdx, setActiveFieldIdx] = useState<number | null>(null);
  const [showAckSuccess, setShowAckSuccess] = useState(false);
  const [showSignSuccess, setShowSignSuccess] = useState(false);
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);
  const [uploadSuccessType, setUploadSuccessType] = useState<UploadSuccessType>("standard");
  const [uploadSuccessDocName, setUploadSuccessDocName] = useState("");
  const [companyName, setCompanyName] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const [canViewAdmin, setCanViewAdmin] = useState(true);
  const [canViewManager, setCanViewManager] = useState(false);
  const [canViewEmployee, setCanViewEmployee] = useState(true);

  const [userRole, setUserRole] = useState<"ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN" | null>(null);
  const isAdminUser = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const [isEditAccessOpen, setIsEditAccessOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  const [acknowledged, setAcknowledged] = useState(false);
  const [ackDate, setAckDate] = useState<Date | null>(null);
  const [signed, setSigned] = useState(false);
  const [eligible, setEligible] = useState<boolean>(true);
  const [signSubmitting, setSignSubmitting] = useState(false);
  const [signatureValue, setSignatureValue] = useState<SignatureCaptureValue | null>(null);
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);

  const [isViewAckOpen, setIsViewAckOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [deletingDocName, setDeletingDocName] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  const fetchUserRole = async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (!res.ok) return;
      const session = await res.json();
      const role = session?.user?.role || null;
      setUserRole(role);
      if (session?.user?.company?.name) {
        setCompanyName(session.user.company.name);
      }
    } catch (error) {
      console.error("Error fetching user role", error);
    }
  };

  const tenantFetch = useTenantFetch();

  const fetchDocuments = async () => {
    const res = await tenantFetch(`/api/documents/list?employeeId=${employeeId}`);
    const data = await res.json();
    setDocuments(data);
    setLoading(false);
  };

  const fetchEmployeeName = async () => {
    try {
      const res = await tenantFetch(`/api/employees/${employeeId}`);
      if (res.ok) {
        const employee = await res.json();
        const name = `${employee.user?.firstName || ""} ${employee.user?.lastName || ""}`.trim();
        setEmployeeName(name || "Employee");
      }
    } catch (error) {
      console.error("Error fetching employee name:", error);
    }
  };

  useEffect(() => {
    if (selectedDoc?.id) {
      tenantFetch(`/api/documents/acknowledge/${selectedDoc.id}/me`)
        .then((res) => res.json())
        .then((data) => {
          if (data.acknowledged) {
            setAcknowledged(true);
            setAckDate(new Date(data.acknowledgedAt));
          } else {
            setAcknowledged(false);
            setAckDate(null);
          }
        });
      tenantFetch(`/api/documents/signatures/${selectedDoc.id}/me`)
        .then((res) => res.json())
        .then((data) => { setSigned(!!data.signed); setEligible(!!data.eligible); })
        .catch(() => { setSigned(false); setEligible(false); });
      tenantFetch(`/api/documents/signature-fields/${selectedDoc.id}`)
        .then((r) => r.json())
        .then((data) => setFields(Array.isArray(data) ? data : []))
        .catch(() => setFields([]));
    }
  }, [selectedDoc, tenantFetch]);

  useEffect(() => {
    if (employeeId) {
      fetchDocuments();
      fetchUserRole();
      fetchEmployeeName();
      const url = new URL(window.location.href);
      const openId = url.searchParams.get("open");
      if (openId) setPendingOpenId(openId);
    }
  }, [employeeId]);

  useEffect(() => {
    if (!pendingOpenId || loading) return;
    const doc = (documents || []).find((d) => d.id === pendingOpenId);
    if (doc) {
      setSelectedDoc(doc);
      setIsPreviewModalOpen(true);
    }
    setPendingOpenId(null);
  }, [pendingOpenId, documents, loading]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.employeeId === employeeId) fetchDocuments();
    };
    window.addEventListener("employee-documents-updated", handler);
    return () => window.removeEventListener("employee-documents-updated", handler);
  }, [employeeId]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const pendingAck = documents.filter(d => d.requiresAck && d.ackOutstandingCount && d.ackOutstandingCount > 0).length;
    const pendingSig = documents.filter(d => d.requiresSignature && d.signatureOutstandingCount && d.signatureOutstandingCount > 0).length;
    const thisMonth = documents.filter(doc => {
      const date = new Date(doc.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    return { totalDocs, pendingAck, pendingSig, thisMonth };
  }, [documents]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents;
    const search = searchQuery.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.name.toLowerCase().includes(search) ||
        doc.category?.toLowerCase().includes(search)
    );
  }, [documents, searchQuery]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !name || !category) {
      toast("Please fill in all fields and select a file.");
      return;
    }
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("category", category);
    formData.append("employeeId", employeeId);
    formData.append("type", "employee");
    formData.append("canViewAdmin", String(canViewAdmin));
    formData.append("canViewManager", String(canViewManager));
    formData.append("canViewEmployee", String(canViewEmployee));
    formData.append("requiresAck", String(requiresAck));
    formData.append("requiresSignature", String(requiresSignature));
    if (signatureDueAt) formData.append("signatureDueAt", signatureDueAt);
    formData.append("deferNotifications", requiresSignature ? "true" : "false");

    try {
      const res = await tenantFetch("/api/documents/upload", { method: "POST", body: formData });
      if (res.ok) {
        const payload = await res.json();
        if (requiresSignature && payload?.Document?.id) {
          setSelectedDoc({
            ...(payload.Document as any),
            canViewAdmin: true,
            canViewManager: true,
            canViewEmployee: true,
            requiresAck,
          });
          setIsPlacementBeforeSendOpen(true);
        } else {
          setIsUploadModalOpen(false);
          setFile(null);
          setName("");
          setCategory("");
          setCanViewAdmin(true);
          setCanViewManager(false);
          setCanViewEmployee(true);
          setRequiresAck(false);
          fetchDocuments();
          setUploadSuccessDocName(name);
          setUploadSuccessType(requiresAck ? "ack" : "standard");
          setShowUploadSuccess(true);
        }
      } else {
        toast("Upload failed", { description: "Please try again." });
      }
    } catch (error) {
      console.error(error);
      toast("Upload failed", { description: "An error occurred." });
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (id: string) => {
    const doc = documents.find((d) => d.id === id);
    setDeletingDocId(id);
    setDeletingDocName(doc?.name || "Document");
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDocId) return;
    setIsDeleting(true);
    try {
      const res = await tenantFetch("/api/documents/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: deletingDocId }),
      });
      if (res.ok) {
        setIsDeleteConfirmOpen(false);
        setShowDeleteSuccess(true);
        fetchDocuments();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete document");
      }
    } catch (error) {
      toast.error("Error deleting document");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (size: number) =>
    size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

  const handleRowClick = (doc: Document) => {
    setSelectedDoc(doc);
    setIsPreviewModalOpen(true);
  };

  const handleAcknowledge = async () => {
    if (!selectedDoc?.id) return;
    try {
      const res = await tenantFetch("/api/documents/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: selectedDoc.id }),
      });
      if (res.ok) {
        setAcknowledged(true);
        setAckDate(new Date());
        setIsPreviewModalOpen(false);
        setShowAckSuccess(true);
        fetchDocuments();
      } else {
        toast("Failed to acknowledge document");
      }
    } catch {
      toast("Error acknowledging document");
    }
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
          fieldId: activeFieldIdx != null ? fields[activeFieldIdx]?.id : undefined,
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
        fetchDocuments();
      } else {
        toast("Failed to submit signature");
      }
    } catch {
      toast("Error submitting signature");
    } finally {
      setSignSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageShell
        title="Documents"
        description={`Documents for ${employeeName}`}
        icon={<FileText className="w-6 h-6" />}
        breadcrumbs={{
          items: [
            { label: "Dashboard", href: "/dashboard" },
            { label: "Employees", href: "/employees" },
            { label: employeeName, href: `/employees/${employeeId}/overview` },
            { label: "Documents", isCurrentPage: true },
          ],
        }}
      >
        <div className="flex items-center justify-center h-96">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full"
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Documents"
      description={`Documents for ${employeeName}`}
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees", href: "/employees" },
          { label: employeeName, href: `/employees/${employeeId}/overview` },
          { label: "Documents", isCurrentPage: true },
        ],
      }}
      action={
        isAdminUser ? (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25"
            >
              <Upload className="w-4 h-4 mr-2" />
              Add Document
            </Button>
          </motion.div>
        ) : undefined
      }
    >
      <TooltipProvider>
        <div className="space-y-6">
          {/* Stats Cards */}
          {documents.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Total Documents"
                value={stats.totalDocs}
                subtitle="In employee file"
                icon={FileText}
                gradient="from-emerald-500 to-teal-500"
                delay={0}
              />
              <StatsCard
                title="Pending Ack"
                value={stats.pendingAck}
                subtitle="Needs review"
                icon={CheckCircle2}
                gradient="from-amber-500 to-orange-500"
                delay={0.1}
              />
              <StatsCard
                title="Pending Signatures"
                value={stats.pendingSig}
                subtitle="Awaiting signature"
                icon={FileSignature}
                gradient="from-blue-500 to-indigo-500"
                delay={0.2}
              />
              <StatsCard
                title="This Month"
                value={stats.thisMonth}
                subtitle="Recently added"
                icon={TrendingUp}
                gradient="from-violet-500 to-purple-500"
                delay={0.3}
              />
            </div>
          )}

          {/* Outstanding Items Alert */}
          {isAdminUser && documents.length > 0 && (stats.pendingAck > 0 || stats.pendingSig > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-800 rounded-2xl">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="flex items-center gap-4 flex-wrap ml-2">
                  <span className="font-semibold text-amber-900 dark:text-amber-100">
                    Outstanding Items:
                  </span>
                  {stats.pendingAck > 0 && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 rounded-full px-3">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      {stats.pendingAck} document{stats.pendingAck !== 1 ? 's' : ''} need acknowledgement
                    </Badge>
                  )}
                  {stats.pendingSig > 0 && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-200 rounded-full px-3">
                      <FileSignature className="w-3.5 h-3.5 mr-1.5" />
                      {stats.pendingSig} document{stats.pendingSig !== 1 ? 's' : ''} need signature
                    </Badge>
                  )}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Search and View Toggle */}
          {documents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4 shadow-sm"
            >
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === "grid" 
                        ? "bg-white dark:bg-slate-700 shadow-sm text-emerald-600" 
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === "list" 
                        ? "bg-white dark:bg-slate-700 shadow-sm text-emerald-600" 
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Documents Display */}
          <AnimatePresence mode="wait">
            {filteredDocuments.length === 0 ? (
              <EmptyState
                onUpload={() => setIsUploadModalOpen(true)}
                isAdmin={isAdminUser}
                employeeName={employeeName}
              />
            ) : viewMode === "grid" ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredDocuments.map((doc, index) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    index={index}
                    isAdmin={isAdminUser}
                    signed={signed}
                    params={params}
                    onOpen={() => handleRowClick(doc)}
                    onEdit={() => {
                      setEditingDoc(doc);
                      setIsEditAccessOpen(true);
                    }}
                    onDelete={() => confirmDelete(doc.id)}
                    onViewAck={() => {
                      setSelectedDoc(doc);
                      setIsViewAckOpen(true);
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
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Access</TableHead>
                      <TableHead className="font-semibold">Signatures</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Size</TableHead>
                      {isAdminUser && <TableHead className="w-[50px] text-right font-semibold">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc, index) => {
                      const accessBadges = [
                        doc.canViewAdmin && <Badge key="admin" className="bg-red-100 text-red-700 text-xs">Admin</Badge>,
                        doc.canViewManager && <Badge key="manager" className="bg-blue-100 text-blue-700 text-xs">Manager</Badge>,
                        doc.canViewEmployee && <Badge key="employee" className="bg-emerald-100 text-emerald-700 text-xs">Employee</Badge>,
                      ].filter(Boolean);

                      const isSignedByEmployee = (doc as any).SignatureArtifacts?.some?.((a: any) => a.employeeId === params?.id) || signed;

                      return (
                        <motion.tr
                          key={doc.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleRowClick(doc)}
                          className="cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors group border-b border-slate-100 dark:border-slate-800"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-lg shadow-inner">
                                📄
                              </div>
                              <span className="font-medium text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {doc.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                              {doc.category || "Uncategorized"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">{accessBadges}</div>
                          </TableCell>
                          <TableCell>
                            {doc.requiresSignature ? (
                              isSignedByEmployee ? (
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs rounded-full">Signed</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 text-xs rounded-full">Required</Badge>
                              )
                            ) : (
                              <span className="text-slate-400 text-sm">—</span>
                            )}
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
                                  <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setEditingDoc(doc); setIsEditAccessOpen(true); }}>
                                    <Settings className="w-4 h-4 mr-2" />
                                    Edit Access
                                  </DropdownMenuItem>
                                  {doc.requiresAck && (
                                    <DropdownMenuItem onClick={() => { setSelectedDoc(doc); setIsViewAckOpen(true); }}>
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      View Acknowledgements
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => confirmDelete(doc.id)} className="text-red-600">
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

          {/* Upload Modal */}
          {isAdminUser && (
            <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
              <DialogContent className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-xl rounded-2xl overflow-hidden" rawContent>
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30"
                    >
                      <FileUp className="w-5 h-5 text-white" />
                    </motion.div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Upload Document
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Add a document for {employeeName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <form onSubmit={handleUpload} className="px-6 pb-6 space-y-5 pt-5">
                  {/* Document Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      Document Details
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Document Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter document name"
                          className="h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                          required
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Category <span className="text-red-500">*</span>
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Employment Checks">Employment Checks</SelectItem>
                            <SelectItem value="Driver Licence">Driver Licence</SelectItem>
                            <SelectItem value="Training">Training</SelectItem>
                            <SelectItem value="Visa Documents">Visa Documents</SelectItem>
                            <SelectItem value="General HR">General HR</SelectItem>
                            <SelectItem value="Contract">Contract</SelectItem>
                            <SelectItem value="Performance">Performance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Compliance Section */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="font-semibold text-sm text-amber-900 dark:text-amber-200">Compliance Requirements</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium">Requires Acknowledgement</p>
                            <p className="text-xs text-slate-500">Employee must confirm reading</p>
                          </div>
                        </div>
                        <Switch checked={requiresAck} onChange={setRequiresAck} />
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                          <PenLine className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium">Requires Signature</p>
                            <p className="text-xs text-slate-500">Document needs to be signed</p>
                          </div>
                        </div>
                        <Switch checked={requiresSignature} onChange={setRequiresSignature} />
                      </div>
                    </div>

                    <AnimatePresence>
                      {requiresSignature && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800"
                        >
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium flex items-center gap-1 text-amber-900 dark:text-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              Signature Due Date
                            </Label>
                            <Input
                              type="datetime-local"
                              value={signatureDueAt}
                              onChange={(e) => setSignatureDueAt(e.target.value)}
                              className="h-10 rounded-xl border-amber-200 dark:border-amber-800 bg-white/50 dark:bg-slate-900/50"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Visibility Settings */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-sm text-blue-900 dark:text-blue-200">Visibility</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <Switch checked={canViewAdmin} onChange={setCanViewAdmin} />
                          <span className="text-xs font-medium">Admin</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <Switch checked={canViewManager} onChange={setCanViewManager} />
                          <span className="text-xs font-medium">Manager</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <Switch checked={canViewEmployee} onChange={setCanViewEmployee} />
                          <span className="text-xs font-medium">Employee</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Upload File <span className="text-red-500">*</span>
                    </Label>
                    <div
                      className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 ${
                        file 
                          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" 
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                      }`}
                    >
                      <input
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required
                      />
                      
                      {file ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center"
                            >
                              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </motion.div>
                            <div className="text-left">
                              <p className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm truncate max-w-[200px]">{file.name}</p>
                              <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                            className="text-slate-500 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Upload className="w-6 h-6 text-slate-400" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                              Drag & drop or click to upload
                            </p>
                            <p className="text-xs text-slate-500">
                              PDF, Word, Excel, or image files
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsUploadModalOpen(false)}
                      className="h-10 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={uploading || !file || !name || !category}
                      className="h-10 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg shadow-emerald-500/25"
                    >
                      {uploading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                          />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Document
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* Document Preview */}
          {selectedDoc && (
            <ModernDocumentPreview
              isOpen={isPreviewModalOpen}
              onClose={() => setIsPreviewModalOpen(false)}
              document={selectedDoc}
              acknowledged={acknowledged}
              ackDate={ackDate}
              signed={signed}
              eligible={eligible}
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

          <DocumentUploadSuccessAnimation
            isOpen={showUploadSuccess}
            onClose={() => setShowUploadSuccess(false)}
            type={uploadSuccessType}
            documentName={uploadSuccessDocName}
          />

          <DocumentDeleteConfirmModal
            isOpen={isDeleteConfirmOpen}
            onClose={() => {
              setIsDeleteConfirmOpen(false);
              setDeletingDocId(null);
              setDeletingDocName("");
            }}
            onConfirm={handleDeleteConfirm}
            documentName={deletingDocName}
            isDeleting={isDeleting}
          />

          <DocumentDeleteSuccessAnimation
            isOpen={showDeleteSuccess}
            onClose={() => {
              setShowDeleteSuccess(false);
              setDeletingDocId(null);
              setDeletingDocName("");
            }}
            documentName={deletingDocName}
          />

          {isAdminUser && (
            <EditAccessModal
              isOpen={isEditAccessOpen}
              onClose={() => setIsEditAccessOpen(false)}
              document={editingDoc}
              onSaved={fetchDocuments}
              isEmployeeDocument
            />
          )}

          {isAdminUser && (
            <ViewAcknowledgementsModal
              isOpen={isViewAckOpen}
              onClose={() => setIsViewAckOpen(false)}
              documentId={selectedDoc?.id || null}
              documentName={selectedDoc?.name || null}
              isEmployeeDocument
            />
          )}
          
          <FieldPlacementModal
            isOpen={isPlacementBeforeSendOpen}
            onClose={() => setIsPlacementBeforeSendOpen(false)}
            onDiscard={async () => {
              if (selectedDoc?.id) {
                try {
                  await tenantFetch("/api/documents/delete", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ documentId: selectedDoc.id }),
                  });
                } catch (e) {
                  console.error("Failed to cleanup discarded document", e);
                }
              }
              setIsPlacementBeforeSendOpen(false);
              setIsUploadModalOpen(false);
              fetchDocuments();
            }}
            onSaveComplete={async () => {
              setIsPlacementBeforeSendOpen(false);
              setIsUploadModalOpen(false);
              fetchDocuments();
              setUploadSuccessDocName(selectedDoc?.name || "");
              setUploadSuccessType("sign");
              setShowUploadSuccess(true);
            }}
            documentId={selectedDoc?.id || ""}
            url={selectedDoc?.url || ""}
            defaultAssigneeId={employeeId}
            isInitialUpload
          />
        </div>
      </TooltipProvider>
    </PageShell>
  );
}
