"use client";

import React, { useEffect, useState, useMemo } from "react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UploadCloud, FileText } from "lucide-react";
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
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ViewAcknowledgementsModal from "@/components/documents/ViewAcknowledgementsModal";
import ViewSignaturesModal from "@/components/documents/ViewSignaturesModal";
import FieldPlacementModal from "@/components/documents/FieldPlacementModal";
import SignatureCapture from "@/components/documents/SignatureCapture";
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
  departments: { id: string; name: string }[];
  jobRoles: { id: string; name: string }[];
  requiresAck: boolean;
  requiresSignature?: boolean;
  signatureDueAt?: string | null;
  signatureCompletedCount?: number;
  signatureTargetCount?: number;
  signatureOutstandingCount?: number;
};

function DocumentsContent() {
  const [documents, setDocuments] = useState<Document[]>([]);
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
  const [loading, setLoading] = useState(true);
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
  const [departmentsList, setDepartmentsList] = useState<
    { label: string; value: string }[]
  >([]);
  const [jobRolesList, setJobRolesList] = useState<
    { label: string; value: string }[]
  >([]);
  const [uploadDepartments, setUploadDepartments] = useState<string[]>([]);
  const [uploadJobRoles, setUploadJobRoles] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [ackDate, setAckDate] = useState<Date | null>(null);
  const [signed, setSigned] = useState(false);
  const [signSubmitting, setSignSubmitting] = useState(false);
  const [signatureValue, setSignatureValue] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [showCapture, setShowCapture] = useState(false);
  const [activeFieldIdx, setActiveFieldIdx] = useState<number | null>(null);

  const isAdminUser = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/documents/list`);
      if (!res.ok) {
        setDocuments([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load documents", e);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [deptRes, roleRes] = await Promise.all([
        fetch("/api/departments/active"),
        fetch("/api/job-roles/active"),
      ]);
      const deptDataRaw = await deptRes.json();
      const roleDataRaw = await roleRes.json();
      const deptData = Array.isArray(deptDataRaw) ? deptDataRaw : [];
      const roleData = Array.isArray(roleDataRaw) ? roleDataRaw : [];
      setDepartmentsList([
        { label: "All Departments", value: "all" },
        ...deptData.map((d: any) => ({ label: d.name, value: d.id })),
      ]);
      setJobRolesList([
        { label: "All Job Roles", value: "all" },
        ...roleData.map((r: any) => ({ label: r.name, value: r.id })),
      ]);
      if (!uploadDepartments.length) setUploadDepartments(["all"]);
      if (!uploadJobRoles.length) setUploadJobRoles(["all"]);
    } catch (err) {
      console.error("Failed to load dropdown data", err);
    }
  };

  const fetchUserRole = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      setUserRole(session?.user?.role || null);
    } catch (err) {
      console.error("Failed to fetch user role", err);
    }
  };

  useEffect(() => {
    if (selectedDoc?.id && selectedDoc.requiresAck) {
      fetch(`/api/documents/acknowledge/${selectedDoc.id}/me`)
        .then((res) => res.json())
        .then((data) => {
          setAcknowledged(data.acknowledged);
          setAckDate(data.acknowledged ? new Date(data.acknowledgedAt) : null);
        });
    }
    if (selectedDoc?.id && (selectedDoc as any).requiresSignature) {
      fetch(`/api/documents/signatures/${selectedDoc.id}/me`)
        .then((res) => res.json())
        .then((data) => setSigned(!!data.signed))
        .catch(() => setSigned(false));
      fetch(`/api/documents/signature-fields/${selectedDoc.id}`)
        .then((r) => r.json())
        .then((data) => setFields(Array.isArray(data) ? data : []))
        .catch(() => setFields([]));
    }
  }, [selectedDoc]);

  useEffect(() => {
    fetchDocuments();
    fetchDropdownData();
    fetchUserRole();
    const url = new URL(window.location.href);
    const openId = url.searchParams.get("open");
    if (openId) {
      setTimeout(() => {
        const doc = (documents || []).find((d) => d.id === openId);
        if (doc) {
          setSelectedDoc(doc);
          setIsPreviewModalOpen(true);
        }
      }, 300);
    }
  }, []);

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
      filtered = filtered.filter((doc) =>
        doc.departments.some((dept) => filters.departments.includes(dept.id)),
      );
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
    formData.append("canViewAdmin", "true");
    formData.append("canViewManager", "true");
    formData.append("canViewEmployee", "true");
    formData.append("requiresAck", requiresAck.toString());
    formData.append("requiresSignature", requiresSignature.toString());
    if (signatureDueAt) formData.append("signatureDueAt", signatureDueAt);
    // Defer notifications so admin can place fields first
    formData.append("deferNotifications", requiresSignature ? "true" : "false");
    formData.append(
      "requireAckFromNewStarters",
      requireAckFromNewStarters.toString(),
    );
    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const payload = await res.json();
        toast("Document uploaded successfully!");
        if (requiresSignature && payload?.Document?.id) {
          setSigDocId(payload.Document.id);
          setSigDocName(payload.Document.name);
          setIsPlacementBeforeSendOpen(true);
        } else {
          setIsUploadModalOpen(false);
          fetchDocuments();
        }
      } else toast("Failed to upload document.");
    } catch {
      toast("Error uploading document.");
    }
    setUploading(false);
  };

  const handleAcknowledge = async () => {
    if (!selectedDoc) return;
    try {
      const res = await fetch("/api/documents/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: selectedDoc.id }),
      });
      if (res.ok) {
        setAcknowledged(true);
        setAckDate(new Date());
        toast("Document acknowledged!");
      } else toast("Failed to acknowledge document.");
    } catch {
      toast("Error acknowledging document.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    await fetch("/api/documents/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: id }),
    });
    fetchDocuments();
  };

  const formatFileSize = (size: number) =>
    size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;
  const handleRowClick = (doc: Document) => {
    setSelectedDoc(doc);
    setIsPreviewModalOpen(true);
  };

  const breadcrumbs = useBreadcrumbs();

  return (
    <PageShell
      title="Documents"
      description="Manage and organize your company documents"
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
                const docDepartments = Array.isArray(doc.departments) ? doc.departments : [];
                const docJobRoles = Array.isArray(doc.jobRoles) ? doc.jobRoles : [];
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
                        <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs">✓ Required</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {doc.requiresSignature ? (
                        <div className="text-xs">
                          <div>
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                              Required
                            </span>
                          </div>
                          <div className="mt-1">
                            {typeof doc.signatureOutstandingCount === "number" &&
                            typeof doc.signatureTargetCount === "number" ? (
                              <span>
                                {doc.signatureTargetCount - (doc.signatureOutstandingCount || 0)} / {doc.signatureTargetCount}
                              </span>
                            ) : (
                              <span className="text-destructive">✕</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-destructive text-xs">✕</span>
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
                        <DropdownMenu
                          trigger={
                            <Button size="sm" variant="ghost">
                              ⋮
                            </Button>
                          }
                        >
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
                  onChange={setUploadDepartments}
                  placeholder="Select departments..."
                />
              </div>
              <div>
                <Label>Job Roles</Label>
                <MultiSelect
                  options={jobRolesList}
                  selected={uploadJobRoles}
                  onChange={setUploadJobRoles}
                  placeholder="Select job roles..."
                />
              </div>
              <div className="mt-2 space-y-3">
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
          onClose={() => {
            setIsPlacementBeforeSendOpen(false);
            setIsUploadModalOpen(false);
            setFile(null);
            setName("");
            setCategory("");
            setRequiresAck(false);
            setRequireAckFromNewStarters(false);
            setUploadDepartments(["all"]);
            setUploadJobRoles(["all"]);
            fetchDocuments();
          }}
          documentId={sigDocId || ""}
          url={selectedDoc?.url || ""}
        />

        <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedDoc?.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">Preview and sign this document if required.</p>
            </DialogHeader>
            {selectedDoc && (
              <div className="space-y-4">
                <div className="rounded border overflow-hidden">
                  <embed src={(selectedDoc.url || "") + "#toolbar=0&navpanes=0&scrollbar=1"} type="application/pdf" className="w-full h-[80vh]" />
                </div>
                <a
                  href={selectedDoc.url}
                  download={selectedDoc.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline block"
                >
                  Download
                </a>
                {selectedDoc.requiresAck && !acknowledged && (
                  <Button onClick={handleAcknowledge} className="w-full mt-2">
                    Acknowledge Document
                  </Button>
                )}
                {selectedDoc.requiresAck && acknowledged && (
                  <p className="text-green-600 text-sm">
                    ✅ Acknowledged on {ackDate?.toLocaleDateString()}
                  </p>
                )}
                {(selectedDoc as any).requiresSignature && !signed && (
                  <div className="space-y-3">
                    <SignatureCapture
                      value={signatureValue}
                      onChange={setSignatureValue}
                    />
                    <Button
                      disabled={!signatureValue || signSubmitting}
                      onClick={async () => {
                        if (!selectedDoc) return;
                        setSignSubmitting(true);
                        try {
                          const res = await fetch("/api/documents/sign", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              documentId: selectedDoc.id,
                              method: signatureValue.method,
                              typedText: signatureValue.typedText,
                              drawnDataUrl: signatureValue.dataUrl,
                              // Optional activeFieldId support if you’re clicking field markers in this view
                              fieldId: undefined,
                            }),
                          });
                          if (res.ok) {
                            const payload = await res.json();
                            setSigned(true);
                            try {
                              const u = await fetch(`/api/documents/signed-url/${selectedDoc.id}`).then((r) => r.json());
                              if (u?.url) {
                                setSelectedDoc({ ...selectedDoc, url: u.url });
                              }
                            } catch {}
                            toast("Signature submitted");
                          } else {
                            toast("Failed to submit signature");
                          }
                        } finally {
                          setSignSubmitting(false);
                        }
                      }}
                    >
                      {signSubmitting ? "Submitting..." : "Sign Document"}
                    </Button>
                  </div>
                )}
                {(selectedDoc as any).requiresSignature && signed && (
                  <p className="text-green-600 text-sm">✅ Signed</p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        <EditAccessModal
          isOpen={isEditAccessOpen}
          onClose={() => setIsEditAccessOpen(false)}
          document={editingDoc}
          onSaved={fetchDocuments}
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
    <FilterProvider>
      <DocumentsContent />
    </FilterProvider>
  );
}
