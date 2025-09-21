"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { FileText } from "lucide-react";
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
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import EditAccessModal from "@/components/documents/EditAccessModal";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import ViewAcknowledgementsModal from "@/components/documents/ViewAcknowledgementsModal";
import FieldPlacementModal from "@/components/documents/FieldPlacementModal";
import SignatureCapture from "@/components/documents/SignatureCapture";

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

  const [canViewAdmin, setCanViewAdmin] = useState(true);
  const [canViewManager, setCanViewManager] = useState(false);
  const [canViewEmployee, setCanViewEmployee] = useState(true);

  const [userRole, setUserRole] = useState<
    "ADMIN" | "MANAGER" | "EMPLOYEE" | null
  >(null);
  const [isEditAccessOpen, setIsEditAccessOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  const [acknowledged, setAcknowledged] = useState(false);
  const [ackDate, setAckDate] = useState<Date | null>(null);
  const [signed, setSigned] = useState(false);
  const [eligible, setEligible] = useState<boolean>(true);
  const [signSubmitting, setSignSubmitting] = useState(false);
  const [signatureValue, setSignatureValue] = useState<any>(null);

  const [isViewAckOpen, setIsViewAckOpen] = useState(false);

  const fetchUserRole = async () => {
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    setUserRole(session?.user?.role || null);
  };

  const fetchDocuments = async () => {
    const res = await fetch(`/api/documents/list?employeeId=${employeeId}`);
    const data = await res.json();
    setDocuments(data);
    setLoading(false);
  };

  const fetchEmployeeName = async () => {
    try {
      const res = await fetch(`/api/employees/${employeeId}`);
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
      fetch(`/api/documents/acknowledge/${selectedDoc.id}/me`)
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
      fetch(`/api/documents/signatures/${selectedDoc.id}/me`)
        .then((res) => res.json())
        .then((data) => { setSigned(!!data.signed); setEligible(!!data.eligible); })
        .catch(() => { setSigned(false); setEligible(false); });
      fetch(`/api/documents/signature-fields/${selectedDoc.id}`)
        .then((r) => r.json())
        .then((data) => setFields(Array.isArray(data) ? data : []))
        .catch(() => setFields([]));
    }
  }, [selectedDoc]);

  useEffect(() => {
    if (employeeId) {
      fetchDocuments();
      fetchUserRole();
      fetchEmployeeName();
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
    }
  }, [employeeId]);

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
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const payload = await res.json();
        toast("Upload successful");
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

  const confirmDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    await fetch("/api/documents/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: id }),
    });
    toast("Document deleted");
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

  const handleAcknowledge = async () => {
    if (!selectedDoc?.id) return;
    await fetch("/api/documents/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: selectedDoc.id }),
    });
    setAcknowledged(true);
    setAckDate(new Date());
    toast("Document acknowledged");
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
        userRole === "ADMIN" ? (
          <Button onClick={() => setIsUploadModalOpen(true)}>
            Add Document
          </Button>
        ) : undefined
      }
    >
      <TooltipProvider>
        <div className="max-w-4xl mx-auto space-y-4">
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
                {userRole === "ADMIN" && (
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
                        signed ? (
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
                    {userRole === "ADMIN" && (
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu
                          trigger={
                            <button className="p-2 hover:bg-gray-100 rounded">
                              ⋮
                            </button>
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
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          )}

          {/* Upload Modal */}
        {userRole === "ADMIN" && (
          <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <Label>Document Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Employment Checks">
                        Employment Checks
                      </SelectItem>
                      <SelectItem value="Driver Licence">
                        Driver Licence
                      </SelectItem>
                      <SelectItem value="Training">Training</SelectItem>
                      <SelectItem value="Visa Documents">
                        Visa Documents
                      </SelectItem>
                      <SelectItem value="General HR">General HR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Requires Acknowledgement</Label>
                    <Switch
                      checked={requiresAck}
                      onChange={(checked) => setRequiresAck(checked)}
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
                <div>
                  <Label>File</Label>
                  <Input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Admin Access</Label>
                    <Switch
                      checked={canViewAdmin}
                      onChange={(checked) => setCanViewAdmin(checked)}
                    />
                  </div>
                  <div>
                    <Label>Manager Access</Label>
                    <Switch
                      checked={canViewManager}
                      onChange={(checked) => setCanViewManager(checked)}
                    />
                  </div>
                  <div>
                    <Label>Employee Access</Label>
                    <Switch
                      checked={canViewEmployee}
                      onChange={(checked) => setCanViewEmployee(checked)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? "Uploading..." : "Upload Document"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Preview Modal */}
        <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedDoc?.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">Preview and sign this document if required.</p>
            </DialogHeader>
            {selectedDoc && (
              <div className="space-y-4">
                <div className="rounded border overflow-hidden">
                  <embed src={selectedDoc.url} type="application/pdf" className="w-full h-[80vh]" />
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
                {(selectedDoc as any).requiresSignature && (
                  <div className="relative">
                    {!signed && fields.map((f, idx) => (
                      <button
                        key={idx}
                        className="absolute bg-amber-200 border border-amber-500 text-amber-900 text-xs px-2 py-1 rounded"
                        style={{
                          left: `${Math.min(Math.max(f.x, 0), 1) * 100}%`,
                          top: `${Math.min(Math.max(f.y, 0), 1) * 100}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        onClick={() => { setActiveFieldIdx(idx); setShowCapture(true); }}
                      >
                        {f.label || "Sign"}
                      </button>
                    ))}
                    {signed && (
                      <p className="text-green-600 text-sm mt-2">✅ Signed</p>
                    )}
                  </div>
                )}
                {(selectedDoc as any).requiresSignature && eligible && !signed && (
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
                              fieldId: activeFieldIdx != null ? fields[activeFieldIdx]?.id : undefined,
                            }),
                          });
                          if (res.ok) {
                            setSigned(true);
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
                  <p className="text-green-600 text-sm">✅ Signed on {ackDate?.toLocaleString() || new Date().toLocaleString()}</p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {userRole === "ADMIN" && (
          <EditAccessModal
            isOpen={isEditAccessOpen}
            onClose={() => setIsEditAccessOpen(false)}
            document={editingDoc}
            onSaved={fetchDocuments}
            isEmployeeDocument
          />
        )}

        {userRole === "ADMIN" && (
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
            setIsUploadModalOpen(false);
            fetchDocuments();
          }}
          documentId={selectedDoc?.id || ""}
          url={selectedDoc?.url || ""}
        />
        </div>
      </TooltipProvider>
    </PageShell>
  );
}
