"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import Button from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { FileText, AlertCircle, CheckCircle2, FileSignature, Upload, X, Shield, Eye, PenLine, Clock, FileUp } from "lucide-react";
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
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
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

export default function EmployeeDocumentsPage() {
  const params = useParams();
  const employeeId = Array.isArray(params?.id)
    ? params.id[0]
    : (params?.id ?? "");

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

  const [canViewAdmin, setCanViewAdmin] = useState(true);
  const [canViewManager, setCanViewManager] = useState(false);
  const [canViewEmployee, setCanViewEmployee] = useState(true);

  const [userRole, setUserRole] = useState<
    "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN" | null
  >(null);
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
      if (!res.ok) {
        console.error("Failed to fetch session");
        return;
      }
      const session = await res.json();
      const role = session?.user?.role || null;
      setUserRole(role);

      const companyNameFromSession = session?.user?.company?.name;
      if (companyNameFromSession) {
        setCompanyName(companyNameFromSession);
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
      if (openId) {
        setPendingOpenId(openId);
      }
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
      if (detail?.employeeId === employeeId) {
        fetchDocuments();
      }
    };
    window.addEventListener("employee-documents-updated", handler);
    return () =>
      window.removeEventListener("employee-documents-updated", handler);
  }, [employeeId]);

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
      const res = await tenantFetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
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
          
          // Trigger success animation
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
    size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;

  // Calculate summary statistics
  const calculateSummary = () => {
    let totalAckPending = 0;
    let totalSigPending = 0;
    let docsRequiringAck = 0;
    let docsRequiringSig = 0;

    documents.forEach((doc) => {
      if (doc.requiresAck && doc.ackOutstandingCount) {
        totalAckPending += doc.ackOutstandingCount;
        docsRequiringAck++;
      }
      if (doc.requiresSignature && doc.signatureOutstandingCount) {
        totalSigPending += doc.signatureOutstandingCount;
        docsRequiringSig++;
      }
    });

    return {
      totalAckPending,
      totalSigPending,
      docsRequiringAck,
      docsRequiringSig,
    };
  };

  const summary = calculateSummary();

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
        const now = new Date();
        setAckDate(now);
        setIsPreviewModalOpen(false);
        // Show success animation
        setShowAckSuccess(true);
        // Refresh documents list
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
        // Refresh the signed URL
        try {
          const u = await tenantFetch(`/api/documents/signed-url/${selectedDoc.id}`).then((r) => r.json());
          if (u?.url) {
            setSelectedDoc({ ...selectedDoc, url: u.url });
          }
        } catch {}
        setIsPreviewModalOpen(false);
        // Show success animation
        setShowSignSuccess(true);
        // Refresh documents list
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
        description="Employee documents and files"
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
        <PageLoader text="Loading documents..." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Documents"
      description="Employee documents and files"
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
          <Button onClick={() => setIsUploadModalOpen(true)}>
            Add Document
          </Button>
        ) : undefined
      }
    >
      <TooltipProvider>
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Document Status Summary */}
          {isAdminUser && documents.length > 0 && (summary.totalAckPending > 0 || summary.totalSigPending > 0) && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="flex items-center gap-4 flex-wrap">
                <span className="font-medium text-amber-900 dark:text-amber-100">
                  Outstanding Items:
                </span>
                {summary.totalAckPending > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-100">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {summary.totalAckPending} acknowledgement{summary.totalAckPending !== 1 ? 's' : ''} pending
                  </Badge>
                )}
                {summary.totalSigPending > 0 && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-100">
                    <FileSignature className="w-3 h-3 mr-1" />
                    {summary.totalSigPending} signature{summary.totalSigPending !== 1 ? 's' : ''} pending
                  </Badge>
                )}
              </AlertDescription>
            </Alert>
          )}

          {documents.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No documents found</p>
              <p className="text-muted-foreground">No documents have been uploaded for this employee yet.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Signatures</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Size</TableHead>
                {isAdminUser && (
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const accessBadges = [
                  doc.canViewAdmin && (
                    <span
                      key="admin"
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded"
                    >
                      Admin
                    </span>
                  ),
                  doc.canViewManager && (
                    <span
                      key="manager"
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                    >
                      Manager
                    </span>
                  ),
                  doc.canViewEmployee && (
                    <span
                      key="employee"
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded"
                    >
                      Employee
                    </span>
                  ),
                ].filter(Boolean);

                return (
                  <TableRow
                    key={doc.id}
                    onClick={() => handleRowClick(doc)}
                    className="cursor-pointer hover:bg-muted transition"
                  >
                    <TableCell className="text-blue-600 underline">
                      {doc.name}
                    </TableCell>
                    <TableCell>{doc.category ?? "Uncategorized"}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex gap-1">{accessBadges}</div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs space-y-1">
                            {accessBadges}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {doc.requiresSignature ? (
                        (doc as any).SignatureArtifacts?.some?.((a: any) => a.employeeId === params?.id) || signed ? (
                          <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs">Signed</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs">Required</span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{formatFileSize(doc.size)}</TableCell>
                    {isAdminUser && (
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 hover:bg-gray-100 rounded">
                              ⋮
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                            onClick={() => {
                              setEditingDoc(doc);
                              setIsEditAccessOpen(true);
                            }}
                          >
                            Edit Access
                          </DropdownMenuItem>
                          {doc.requiresAck && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedDoc(doc);
                                setIsViewAckOpen(true);
                              }}
                            >
                              View Acknowledgements
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => confirmDelete(doc.id)}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          )}

          {/* Upload Modal - Modern Glassmorphic Design */}
        {isAdminUser && (
          <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
            <DialogContent className="p-0 bg-transparent border-none shadow-none max-w-2xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="glass-ultra rounded-3xl overflow-hidden shadow-depth-5"
              >
                {/* Header with gradient accent */}
                <div className="relative px-8 pt-8 pb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-emerald-500/10 to-violet-500/5" />
                  <div className="relative flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                      <FileUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                        Upload Document
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Add a document for {employeeName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <form onSubmit={handleUpload} className="px-8 pb-8 space-y-5">
                  {/* Document Details */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-muted/30 space-y-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Document Details</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground/80">
                          Document Name <span className="text-primary">*</span>
                        </Label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter document name"
                          className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground/80">
                          Category <span className="text-primary">*</span>
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Employment Checks">Employment Checks</SelectItem>
                            <SelectItem value="Driver Licence">Driver Licence</SelectItem>
                            <SelectItem value="Training">Training</SelectItem>
                            <SelectItem value="Visa Documents">Visa Documents</SelectItem>
                            <SelectItem value="General HR">General HR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </motion.div>

                  {/* Compliance Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="font-medium text-sm">Compliance Requirements</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/30 dark:bg-white/5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <Label className="text-sm cursor-pointer">Requires Acknowledgement</Label>
                            <p className="text-xs text-muted-foreground">Employee must confirm reading</p>
                          </div>
                        </div>
                        <Switch checked={requiresAck} onChange={setRequiresAck} />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/30 dark:bg-white/5">
                        <div className="flex items-center gap-2">
                          <PenLine className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <Label className="text-sm cursor-pointer">Requires Signature</Label>
                            <p className="text-xs text-muted-foreground">Document needs to be signed</p>
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
                          transition={{ duration: 0.2 }}
                          className="mt-4 pt-4 border-t border-amber-500/20"
                        >
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Signature Due Date
                            </Label>
                            <Input
                              type="datetime-local"
                              value={signatureDueAt}
                              onChange={(e) => setSignatureDueAt(e.target.value)}
                              className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Visibility Settings */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-primary/5 border border-blue-500/20"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-sm">Visibility Settings</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-white/30 dark:bg-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium">Admin</Label>
                          <Switch checked={canViewAdmin} onChange={setCanViewAdmin} />
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white/30 dark:bg-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium">Manager</Label>
                          <Switch checked={canViewManager} onChange={setCanViewManager} />
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white/30 dark:bg-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium">Employee</Label>
                          <Switch checked={canViewEmployee} onChange={setCanViewEmployee} />
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
                    <Label className="text-sm font-medium text-foreground/80">
                      Upload File <span className="text-primary">*</span>
                    </Label>
                    <div
                      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                        file 
                          ? "border-emerald-500 bg-emerald-500/10" 
                          : "border-muted/50 bg-white/30 dark:bg-white/5 hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      <input
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required
                      />
                      
                      {file ? (
                        <div className="space-y-2">
                          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <p className="font-medium text-emerald-600 dark:text-emerald-400">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4 mr-1" /> Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-12 h-12 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center">
                            <Upload className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              Drag & drop or click to upload
                            </p>
                            <p className="text-sm text-muted-foreground">
                              PDF, Word, Excel, or image files
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-end gap-3 pt-4"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsUploadModalOpen(false)}
                      className="h-11 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={uploading || !file || !name || !category}
                      className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-white font-semibold shadow-lg shadow-primary/25"
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
                  </motion.div>
                </form>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}

        {/* Modern Document Preview Panel */}
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
          onClose={() => {
            setIsPlacementBeforeSendOpen(false);
            // Don't close the upload modal or refresh if just closing placement
            // This keeps the upload modal open so they can try again or cancel properly
          }}
          onDiscard={async () => {
            // If they explicitly discard, delete the document if it was already created
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
            
            // Trigger signature success animation
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
