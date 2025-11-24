"use client";

import React, { useEffect, useState, useMemo } from "react";
import Button from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UploadCloud, FileText } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { apiClient } from "@/lib/apiClient";
import { usePostMutation, useDeleteMutation } from "@/hooks/useMutationWithRefresh";
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
} from "@/components/ui/select";
import EditAccessModal from "@/components/documents/EditAccessModal";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
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
  // For backward compatibility we support both flattened and relation-based shapes
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

function DocumentsContent() {
  const tenantFetch = useTenantFetch();
  // Fetch documents using API hook
  const { data: documentsData, error: documentsError, isLoading: loading, mutate: refetchDocuments } = useApi<Document[]>('/api/documents/list');
  const documents = documentsData || [];

  // Fetch departments and job roles
  const { data: departmentsData } = useApi<Array<{ id: string; name: string }>>('/api/departments/active');
  const { data: jobRolesData } = useApi<Array<{ id: string; name: string }>>('/api/job-roles/active');

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [requiresAck, setRequiresAck] = useState(false);
  const [requireAckFromNewStarters, setRequireAckFromNewStarters] =
    useState(false);
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [signatureDueAt, setSignatureDueAt] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPlacementBeforeSendOpen, setIsPlacementBeforeSendOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isEditAccessOpen, setIsEditAccessOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [userRole, setUserRole] = useState<
    "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN" | null
  >(null);
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
  
  // Access permissions state for upload
  const [canViewAdmin, setCanViewAdmin] = useState(true);
  const [canViewManager, setCanViewManager] = useState(true);
  const [canViewEmployee, setCanViewEmployee] = useState(true);
  
  // Placement pending state
  const [placementPendingDocId, setPlacementPendingDocId] = useState<string | null>(null);
  const [placementPendingDocName, setPlacementPendingDocName] = useState<string | null>(null);
  const [sendingNotifications, setSendingNotifications] = useState(false);

  const isAdminUser = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  // Build dropdown lists from fetched data
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

  // Initialize upload filters
  useEffect(() => {
    if (departmentsList.length && !uploadDepartments.length) {
      setUploadDepartments(["all"]);
    }
    if (jobRolesList.length && !uploadJobRoles.length) {
      setUploadJobRoles(["all"]);
    }
  }, [departmentsList, jobRolesList, uploadDepartments.length, uploadJobRoles.length]);

  // Handle document fetch errors
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
    if (selectedDoc?.id && selectedDoc.requiresAck) {
      tenantFetch(`/api/documents/acknowledge/${selectedDoc.id}/me`)
        .then((res) => res.json())
        .then((data) => {
          setAcknowledged(data.acknowledged);
          setAckDate(data.acknowledged ? new Date(data.acknowledgedAt) : null);
        });
    }
    if (selectedDoc?.id && (selectedDoc as any).requiresSignature) {
      tenantFetch(`/api/documents/signatures/${selectedDoc.id}/me`)
        .then((res) => res.json())
        .then((data) => setSigned(!!data.signed))
        .catch(() => setSigned(false));
      tenantFetch(`/api/documents/signature-fields/${selectedDoc.id}`)
        .then((r) => r.json())
        .then((data) => setFields(Array.isArray(data) ? data : []))
        .catch(() => setFields([]));
    }
  }, [selectedDoc, tenantFetch]);

  // Initial data fetch on mount
  useEffect(() => {
    fetchUserRole();
  }, []);

  // Handle auto-open from query param after documents load
  useEffect(() => {
    if (loading || documents.length === 0) return;
    
    const url = new URL(window.location.href);
    const openId = url.searchParams.get("open");
    
    if (openId) {
      const doc = documents.find((d) => d.id === openId);
      if (doc) {
        setSelectedDoc(doc);
        setIsPreviewModalOpen(true);
        // Clean up query param after opening
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("open");
        window.history.replaceState({}, "", newUrl.toString());
      } else {
        // Handle stale ID gracefully
        console.warn(`Document with ID ${openId} not found or not accessible`);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("open");
        window.history.replaceState({}, "", newUrl.toString());
      }
    }
  }, [documents, loading]);

  const { filters } = useFilters();

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
    const base = categoriesList.length
      ? categoriesList
      : Array.from(
          new Set(
            documents
              .map((doc) => doc.category)
              .filter((x): x is string => Boolean(x)) as string[],
          ),
        );
    return [
      { label: "All Categories", value: "all" },
      ...base.map((cat) => ({ label: cat, value: cat })),
    ];
  }, [documents, categoriesList]);

  const sortOptions: FilterOption[] = [
    { label: "Name", value: "name" },
    { label: "Date", value: "date" },
    { label: "Size", value: "size" },
    { label: "Type", value: "type" },
    { label: "Category", value: "category" },
  ];

  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.name.toLowerCase().includes(search) ||
          doc.category?.toLowerCase().includes(search) ||
          doc.type.toLowerCase().includes(search),
      );
    }
    if (
      filters.documentTypes.length > 0 &&
      !filters.documentTypes.includes("all")
    ) {
      filtered = filtered.filter((doc) =>
        filters.documentTypes.includes(doc.type),
      );
    }
    if (filters.categories.length > 0 && !filters.categories.includes("all")) {
      filtered = filtered.filter(
        (doc) => doc.category && filters.categories.includes(doc.category),
      );
    }
    if (
      filters.departments.length > 0 &&
      !filters.departments.includes("all")
    ) {
      filtered = filtered.filter((doc) => {
        const docDepartments: Array<{ id: string; name: string }> = Array.isArray(doc.departments)
          ? (doc.departments as Array<{ id: string; name: string }>)
          : Array.isArray(doc.Department)
            ? (doc.Department as Array<{ id: string; name: string }>)
            : [];
        return docDepartments.some((dept) => filters.departments.includes(dept.id));
      });
    }
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let aVal = "",
          bVal = "";
        switch (filters.sortBy) {
          case "name":
            aVal = a.name;
            bVal = b.name;
            break;
          case "date":
            aVal = a.createdAt;
            bVal = b.createdAt;
            break;
          case "size":
            return filters.sortOrder === "desc"
              ? b.size - a.size
              : a.size - b.size;
          case "type":
            aVal = a.type;
            bVal = b.type;
            break;
          case "category":
            aVal = a.category || "";
            bVal = b.category || "";
            break;
        }
        const comp = aVal.localeCompare(bVal);
        return filters.sortOrder === "desc" ? -comp : comp;
      });
    }
    return filtered;
  }, [documents, filters]);

  const handleExport = () => {
    const csv = [
      ["Name", "Category", "Type", "Size", "Date", "Departments", "Job Roles"],
      ...filteredDocuments.map((doc) => [
        doc.name,
        doc.category || "",
        doc.type,
        `${(doc.size / 1024).toFixed(2)} KB`,
        new Date(doc.createdAt).toLocaleDateString(),
        (doc.departments ?? []).map((d) => d.name).join("; "),
        (doc.jobRoles ?? []).map((jr) => jr.name).join("; "),
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
    if (!file || !name || !category)
      return toast("Please fill in all fields and select a file.");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("category", category);
    formData.append(
      "departments",
      JSON.stringify(
        uploadDepartments.includes("all") ? [] : uploadDepartments,
      ),
    );
    formData.append(
      "jobRoles",
      JSON.stringify(uploadJobRoles.includes("all") ? [] : uploadJobRoles),
    );
    formData.append("canViewAdmin", canViewAdmin.toString());
    formData.append("canViewManager", canViewManager.toString());
    formData.append("canViewEmployee", canViewEmployee.toString());
    formData.append("requiresAck", requiresAck.toString());
    formData.append("requiresSignature", requiresSignature.toString());
    if (signatureDueAt) formData.append("signatureDueAt", signatureDueAt);
    formData.append("deferNotifications", requiresSignature ? "true" : "false");
    formData.append(
      "requireAckFromNewStarters",
      requireAckFromNewStarters.toString(),
    );
    try {
      const res = await tenantFetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const payload = await res.json();
        toast.success("Document uploaded successfully!");
        if (requiresSignature && payload?.Document?.id) {
          // Set placement pending state
          setPlacementPendingDocId(payload.Document.id);
          setPlacementPendingDocName(payload.Document.name);
          setSigDocId(payload.Document.id);
          setSigDocName(payload.Document.name);
          setIsPlacementBeforeSendOpen(true);
        } else {
          // Normal upload flow - close modal and refresh
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

  // Mutation for acknowledging documents
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

  // Mutation for deleting documents
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
  const handleRowClick = (doc: Document) => {
    setSelectedDoc(doc);
    setIsPreviewModalOpen(true);
  };

  const resetUploadForm = () => {
    setFile(null);
    setName("");
    setCategory("");
    setRequiresAck(false);
    setRequireAckFromNewStarters(false);
    setRequiresSignature(false);
    setSignatureDueAt("");
    setUploadDepartments(["all"]);
    setUploadJobRoles(["all"]);
    setCanViewAdmin(true);
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
        // Clear pending state
        setPlacementPendingDocId(null);
        setPlacementPendingDocName(null);
        setIsPlacementBeforeSendOpen(false);
        resetUploadForm();
        setIsUploadModalOpen(false);
        refetchDocuments();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData?.error || "Failed to send notifications. You can retry from the document actions menu.");
      }
    } catch (error) {
      console.error("Send notifications error:", error);
      toast.error("Network error sending notifications. You can retry from the document actions menu.");
    } finally {
      setSendingNotifications(false);
    }
  };

  const handlePlacementCancel = () => {
    if (placementPendingDocId) {
      toast.warning(
        "Field placement not completed. The document is uploaded but notifications have not been sent. You can complete placement later from the document actions menu.",
        { duration: 6000 }
      );
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

  return (
    <PageShell
      title="Documents"
      description="Manage and organise your company documents"
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={breadcrumbs || undefined}
      action={
        isAdminUser ? (
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <UploadCloud className="w-4 h-4 mr-2" /> Add Document
          </Button>
        ) : undefined
      }
    >
      <TooltipProvider>
        <div className="mb-6">
          <FilterBar
            config={{
              searchPlaceholder: "Search documents by name, category, type...",
              showDocumentTypeFilter: true,
              showCategoryFilter: true,
              showDepartmentFilter: true,
            }}
            documentTypeOptions={documentTypeOptions}
            categoryOptions={categoryOptions}
            departmentOptions={departmentsList}
            sortOptions={sortOptions}
            onExport={handleExport}
          />
        </div>
        {loading ? (
          <p>Loading documents...</p>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {filters.search ||
            filters.documentTypes.length > 0 ||
            filters.categories.length > 0 ||
            filters.departments.length > 0
              ? "No documents match your current filters."
              : "No documents found."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Job Role</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Read Receipt</TableHead>
                <TableHead>Signatures</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Size</TableHead>
                {isAdminUser && (
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => {
                const docDepartments: Array<{ id: string; name: string }> = Array.isArray((doc as any).departments)
                  ? ((doc as any).departments as Array<{ id: string; name: string }>)
                  : Array.isArray((doc as any).Department)
                    ? ((doc as any).Department as Array<{ id: string; name: string }>)
                    : [];
                const docJobRoles: Array<{ id: string; name: string }> = Array.isArray((doc as any).jobRoles)
                  ? ((doc as any).jobRoles as Array<{ id: string; name: string }>)
                  : Array.isArray((doc as any).JobRole)
                    ? ((doc as any).JobRole as Array<{ id: string; name: string }>)
                    : [];
                const accessList = [
                  doc.canViewAdmin ? "Admin" : null,
                  doc.canViewManager ? "Manager" : null,
                  doc.canViewEmployee ? "Employee" : null,
                  ...docDepartments.map((d) => d.name),
                  ...docJobRoles.map((jr) => jr.name),
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
                      {docDepartments.length > 0
                        ? docDepartments.map((d) => d.name).join(", ")
                        : "All Departments"}
                    </TableCell>
                    <TableCell>
                      {docJobRoles.length > 0
                        ? docJobRoles.map((jr) => jr.name).join(", ")
                        : "All Job Roles"}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="underline cursor-pointer">
                            {docDepartments.length === 0 &&
                            docJobRoles.length === 0
                              ? "All"
                              : accessList.join(", ")}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs max-w-xs">
                          {docDepartments.length === 0 &&
                          docJobRoles.length === 0
                            ? "All (Unrestricted)"
                            : accessList.map((item, idx) => (
                                <div key={idx}>{item}</div>
                              ))}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {doc.requiresAck ? (
                        typeof doc.ackCompletedCount === "number" &&
                        typeof doc.ackTargetCount === "number" ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                doc.ackCompletedCount === doc.ackTargetCount
                                  ? "text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs font-medium"
                                  : doc.ackCompletedCount > 0
                                  ? "text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-xs font-medium"
                                  : "text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs font-medium"
                              }
                            >
                              {doc.ackCompletedCount}/{doc.ackTargetCount}
                            </span>
                            {doc.ackOutstandingCount && doc.ackOutstandingCount > 0 ? (
                              <span className="text-xs text-muted-foreground">
                                ({doc.ackOutstandingCount} pending)
                              </span>
                            ) : (
                              <span className="text-xs text-green-600">✓ Complete</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs">✓ Required</span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {doc.requiresSignature ? (
                        typeof doc.signatureCompletedCount === "number" &&
                        typeof doc.signatureTargetCount === "number" ? (
                          <div className="flex items-center gap-2">
                            <SignatureProgressRing
                              completed={doc.signatureCompletedCount}
                              total={doc.signatureTargetCount}
                              size="sm"
                            />
                            <div className="flex flex-col">
                              <span
                                className={
                                  doc.signatureCompletedCount === doc.signatureTargetCount
                                    ? "text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs font-medium"
                                    : doc.signatureCompletedCount > 0
                                    ? "text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-xs font-medium"
                                    : "text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs font-medium"
                                }
                              >
                                {doc.signatureCompletedCount}/{doc.signatureTargetCount}
                              </span>
                              {doc.signatureOutstandingCount && doc.signatureOutstandingCount > 0 ? (
                                <span className="text-xs text-muted-foreground mt-1">
                                  {doc.signatureOutstandingCount} pending
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs">
                            Required
                          </span>
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
                            <Button size="sm" variant="ghost">
                              ⋮
                            </Button>
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
                          <DropdownMenuItem
                            onClick={() => {
                              setAckDocId(doc.id);
                              setAckDocName(doc.name);
                              setIsViewAckOpen(true);
                            }}
                          >
                            View Acknowledgements
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSigDocId(doc.id);
                              setSigDocName(doc.name);
                              setIsViewSignaturesOpen(true);
                            }}
                          >
                            View Signatures
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSigDocId(doc.id);
                              setSigDocName(doc.name);
                              setIsFieldPlacementOpen(true);
                            }}
                          >
                            Place Signature Fields
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(doc.id)}
                            className="text-destructive"
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

        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Document Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(v) => {
                  if (v === "__new__") {
                    setManageCategoriesOpen(true);
                  } else {
                    setCategory(v);
                    setNewCategory("");
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">+ Add new category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departments</Label>
                <MultiSelect
                  options={departmentsList}
                  selected={uploadDepartments}
                  onChange={(values) =>
                    values.includes("all")
                      ? setUploadDepartments(["all"])
                      : setUploadDepartments(values)
                  }
                  placeholder="Select department(s)"
                  searchable
                  searchPlaceholder="Search departments..."
                />
              </div>
              <div>
                <Label>Job Roles</Label>
                <MultiSelect
                  options={jobRolesList}
                  selected={uploadJobRoles}
                  onChange={(values) =>
                    values.includes("all")
                      ? setUploadJobRoles(["all"])
                      : setUploadJobRoles(values)
                  }
                  placeholder="Select job role(s)"
                  searchable
                  searchPlaceholder="Search job roles..."
                />
              </div>
              <div className="mt-2 space-y-3">
                <div className="border-t pt-3">
                  <Label className="text-sm font-semibold mb-2 block">Access Permissions</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="canViewAdmin" className="text-sm font-normal">Admins can view</Label>
                      <Switch
                        id="canViewAdmin"
                        checked={canViewAdmin}
                        onChange={setCanViewAdmin}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="canViewManager" className="text-sm font-normal">Managers can view</Label>
                      <Switch
                        id="canViewManager"
                        checked={canViewManager}
                        onChange={setCanViewManager}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="canViewEmployee" className="text-sm font-normal">Employees can view</Label>
                      <Switch
                        id="canViewEmployee"
                        checked={canViewEmployee}
                        onChange={setCanViewEmployee}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Requires Acknowledgement</Label>
                  <Switch checked={requiresAck} onChange={setRequiresAck} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Require Acknowledgement from New Starters</Label>
                  <Switch
                    checked={requireAckFromNewStarters}
                    onChange={setRequireAckFromNewStarters}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Requires Signature</Label>
                  <Switch
                    checked={requiresSignature}
                    onChange={setRequiresSignature}
                  />
                </div>
                {requiresSignature && (
                  <div>
                    <Label>Signature Due (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={signatureDueAt}
                      onChange={(e) => setSignatureDueAt(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={uploading}
                  loadingText="Uploading document"
                  icon={<UploadCloud className="h-4 w-4" />}
                >
                  Upload
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Manage Categories Modal */}
        <Dialog open={manageCategoriesOpen} onOpenChange={setManageCategoriesOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Categories</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2 max-h-60 overflow-auto border rounded p-2">
                {categoryOptions
                  .filter((o) => o.value !== "all")
                  .map((opt) => (
                    <div key={opt.value} className="flex items-center justify-between gap-2">
                      <span className="text-sm">{opt.label}</span>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/document-categories", {
                              method: "DELETE",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ name: opt.value }),
                            });
                            if (!res.ok) throw new Error("Failed to delete category");
                            setCategoriesList((prev) => prev.filter((x) => x !== opt.value));
                            if (category === opt.value) setCategory("");
                          } catch (e: any) {
                            toast.error(e.message);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                {categoryOptions.filter((o) => o.value !== "all").length === 0 && (
                  <p className="text-sm text-muted-foreground">No categories yet.</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                />
                <Button
                  onClick={async () => {
                    const name = newCategoryName.trim();
                    if (!name) return;
                    try {
                      const res = await fetch("/api/document-categories", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name }),
                      });
                      if (!res.ok) throw new Error("Failed to add category");
                      setCategoriesList((prev) => (prev.includes(name) ? prev : [...prev, name]));
                      setCategory(name);
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setManageCategoriesOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Place before send (post-upload) */}
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

        {/* Modern Document Preview Panel */}
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
        />
      </TooltipProvider>
    </PageShell>
  );
}

export default function DocumentsPageClient() {
  return (
    <FilterProvider
      persistenceKey="documents-filters"
      enableUrlSync={true}
      enableLocalStorage={true}
    >
      <DocumentsContent />
    </FilterProvider>
  );
}
