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
import EditAccessModal from "@/components/documents/EditAccessModal";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ViewAcknowledgementsModal from "@/components/documents/ViewAcknowledgementsModal";
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
};

function DocumentsContent() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [requiresAck, setRequiresAck] = useState(false);
  const [requireAckFromNewStarters, setRequireAckFromNewStarters] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isEditAccessOpen, setIsEditAccessOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [userRole, setUserRole] = useState<
    "ADMIN" | "MANAGER" | "EMPLOYEE" | null
  >(null);
  const [isViewAckOpen, setIsViewAckOpen] = useState(false);
  const [ackDocId, setAckDocId] = useState<string | null>(null);
  const [ackDocName, setAckDocName] = useState<string | null>(null);
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

  const fetchDocuments = async () => {
    setLoading(true);
    const res = await fetch(`/api/documents/list`);
    const data = await res.json();
    setDocuments(data);
    setLoading(false);
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
  }, [selectedDoc]);

  useEffect(() => {
    fetchDocuments();
    fetchDropdownData();
    fetchUserRole();
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
    const categories = documents
      .map((doc) => doc.category)
      .filter(Boolean)
      .filter((cat, i, arr) => arr.indexOf(cat) === i);
    return [
      { label: "All Categories", value: "all" },
      ...categories.map((cat) => ({ label: cat!, value: cat! })),
    ];
  }, [documents]);

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
        toast("Document uploaded successfully!");
        setFile(null);
        setName("");
        setCategory("");
        setRequiresAck(false);
        setRequireAckFromNewStarters(false);
        setUploadDepartments(["all"]);
        setUploadJobRoles(["all"]);
        setIsUploadModalOpen(false);
        fetchDocuments();
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
        userRole === "ADMIN" ? (
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
                <TableHead>Date</TableHead>
                <TableHead>Size</TableHead>
                {userRole === "ADMIN" && (
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
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{formatFileSize(doc.size)}</TableCell>
                    {userRole === "ADMIN" && (
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
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
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
              <div className="flex items-center space-x-2">
                <Switch checked={requiresAck} onChange={setRequiresAck} />
                <Label>Requires Acknowledgement</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={requireAckFromNewStarters}
                  onChange={setRequireAckFromNewStarters}
                />
                <Label>Require Acknowledgement from New Starters</Label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={uploading}>
                  Upload
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedDoc?.name}</DialogTitle>
            </DialogHeader>
            {selectedDoc && (
              <div className="space-y-4">
                <iframe
                  src={selectedDoc.url}
                  className="w-full h-[500px] rounded border"
                ></iframe>
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
