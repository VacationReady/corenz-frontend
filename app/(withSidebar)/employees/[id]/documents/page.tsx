'use client';

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import EditAccessModal from "@/components/documents/EditAccessModal";
import Tooltip from "@/components/ui/tooltip";
import { toast } from "sonner";
import ViewAcknowledgementsModal from "@/components/documents/ViewAcknowledgementsModal"; // ✅ NEW

// ✅ Unified Document type to match EditAccessModal expectations
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
  requiresAck?: boolean; // ✅ Added acknowledgement flag
  departments: Department[];
  jobRoles: JobRole[];
};

export default function EmployeeDocumentsPage() {
  const params = useParams();
  const employeeId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  // Access Control for Upload
  const [canViewAdmin, setCanViewAdmin] = useState(true);
  const [canViewManager, setCanViewManager] = useState(false);
  const [canViewEmployee, setCanViewEmployee] = useState(true);

  // Admin-only control
  const [userRole, setUserRole] = useState<"ADMIN" | "MANAGER" | "EMPLOYEE" | null>(null);
  const [isEditAccessOpen, setIsEditAccessOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  // ✅ Acknowledgement state
  const [acknowledged, setAcknowledged] = useState(false);
  const [ackDate, setAckDate] = useState<Date | null>(null);

  // ✅ View Acknowledgements modal state
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

  // ✅ Check acknowledgement when previewing
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
    }
  }, [selectedDoc]);

  useEffect(() => {
    if (employeeId) {
      fetchDocuments();
      fetchUserRole();
    }
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
    formData.append("canViewAdmin", String(canViewAdmin));
    formData.append("canViewManager", String(canViewManager));
    formData.append("canViewEmployee", String(canViewEmployee));

    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      if (res.ok) {
        const newDoc = await res.json();
        toast("Upload successful", { description: `${name} has been uploaded.` });
        setDocuments((prev) => [newDoc, ...prev]);
        setIsUploadModalOpen(false);
        setFile(null);
        setName("");
        setCategory("");
        setCanViewAdmin(true);
        setCanViewManager(false);
        setCanViewEmployee(true);
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
    size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

  const handleRowClick = (doc: Document) => {
    setSelectedDoc(doc);
    setIsPreviewModalOpen(true);
  };

  // ✅ Handle Acknowledgement click
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

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employee Documents</h1>
        {userRole === "ADMIN" && (
          <Button onClick={() => setIsUploadModalOpen(true)}>Add Document</Button>
        )}
      </div>

      {loading ? (
        <p>Loading documents...</p>
      ) : documents.length === 0 ? (
        <p>No documents for this employee yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Size</TableHead>
              {userRole === "ADMIN" && <TableHead className="w-[50px] text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => {
              const accessBadges = [
                doc.canViewAdmin && <span key="admin" className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Admin</span>,
                doc.canViewManager && <span key="manager" className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Manager</span>,
                doc.canViewEmployee && <span key="employee" className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Employee</span>,
              ].filter(Boolean);

              return (
                <TableRow key={doc.id} onClick={() => handleRowClick(doc)} className="cursor-pointer hover:bg-muted transition">
                  <TableCell className="text-blue-600 underline">{doc.name}</TableCell>
                  <TableCell>{doc.category ?? "Uncategorized"}</TableCell>
                  <TableCell>
                    <Tooltip content={<div className="text-xs">{accessBadges}</div>}>
                      <div className="flex gap-1">{accessBadges}</div>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{formatFileSize(doc.size)}</TableCell>
                  {userRole === "ADMIN" && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu trigger={<button className="p-2 hover:bg-gray-100 rounded">⋮</button>}>
                        <DropdownMenuItem onClick={() => { setEditingDoc(doc); setIsEditAccessOpen(true); }}>Edit Access</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelectedDoc(doc); setIsViewAckOpen(true); }}>View Acknowledgements</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => confirmDelete(doc.id)} className="text-red-600">
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

      {/* Upload Modal (Admin Only) */}
      {userRole === "ADMIN" && (
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label>Document Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
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
              <div>
                <Label>File</Label>
                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
              </div>

              {/* Access Control Switches */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Admin Access</Label>
                  <Switch checked={canViewAdmin} onChange={setCanViewAdmin} />
                </div>
                <div>
                  <Label>Manager Access</Label>
                  <Switch checked={canViewManager} onChange={setCanViewManager} />
                </div>
                <div>
                  <Label>Employee Access</Label>
                  <Switch checked={canViewEmployee} onChange={setCanViewEmployee} />
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
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <iframe src={selectedDoc.url} className="w-full h-[500px] rounded border"></iframe>
              <a
                href={selectedDoc.url}
                download={selectedDoc.name}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline block"
              >
                Download
              </a>

              {/* ✅ Acknowledgement UI */}
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

      {/* Edit Access Modal (Admin Only) */}
      {userRole === "ADMIN" && (
        <EditAccessModal
          isOpen={isEditAccessOpen}
          onClose={() => setIsEditAccessOpen(false)}
          document={editingDoc}
          onSaved={fetchDocuments}
          isEmployeeDocument
        />
      )}

      {/* View Acknowledgements Modal (Admin Only) */}
      {userRole === "ADMIN" && (
        <ViewAcknowledgementsModal
          isOpen={isViewAckOpen}
          onClose={() => setIsViewAckOpen(false)}
          documentId={selectedDoc?.id || null}
          documentName={selectedDoc?.name || null}
        />
      )}
    </div>
  );
}
