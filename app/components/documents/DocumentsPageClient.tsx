"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import Tooltip from "@/components/ui/tooltip";
import EditAccessModal from "@/components/documents/EditAccessModal";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ViewAcknowledgementsModal from "@/components/documents/ViewAcknowledgementsModal";
import { Switch } from "@/components/ui/switch"; // ✅ Toggle import

type Department = { id: string; name: string };
type JobRole = { id: string; name: string };

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
  departments: Department[];
  jobRoles: JobRole[];
  requiresAck: boolean; // ✅ NEW
};

export default function DocumentsPageClient() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [requiresAck, setRequiresAck] = useState(false); // ✅ NEW
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isEditAccessOpen, setIsEditAccessOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [userRole, setUserRole] = useState<"ADMIN" | "MANAGER" | "EMPLOYEE" | null>(null);

  const [isViewAckOpen, setIsViewAckOpen] = useState(false);
  const [ackDocId, setAckDocId] = useState<string | null>(null);
  const [ackDocName, setAckDocName] = useState<string | null>(null);

  const [departmentsList, setDepartmentsList] = useState<{ label: string; value: string }[]>([]);
  const [jobRolesList, setJobRolesList] = useState<{ label: string; value: string }[]>([]);
  const [uploadDepartments, setUploadDepartments] = useState<string[]>([]);
  const [uploadJobRoles, setUploadJobRoles] = useState<string[]>([]);

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
      const deptData = await deptRes.json();
      const roleData = await roleRes.json();

      const deptOptions = [{ label: "All Departments", value: "all" }, ...deptData.map((d: any) => ({ label: d.name, value: d.id }))];
      const roleOptions = [{ label: "All Job Roles", value: "all" }, ...roleData.map((r: any) => ({ label: r.name, value: r.id }))];

      setDepartmentsList(deptOptions);
      setJobRolesList(roleOptions);

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
    fetchDocuments();
    fetchDropdownData();
    fetchUserRole();
  }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !name || !category) {
      toast("Please fill in all fields and select a file.");
      return;
    }
    setUploading(true);

    const selectedDepartments = uploadDepartments.includes("all") ? [] : uploadDepartments;
    const selectedJobRoles = uploadJobRoles.includes("all") ? [] : uploadJobRoles;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("category", category);
    formData.append("departments", JSON.stringify(selectedDepartments));
    formData.append("jobRoles", JSON.stringify(selectedJobRoles));
    formData.append("requiresAck", JSON.stringify(requiresAck)); // ✅ Pass toggle state

    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      if (res.ok) {
        toast("Upload successful", { description: `${name} has been uploaded.` });
        setIsUploadModalOpen(false);
        setFile(null);
        setName("");
        setCategory("");
        setRequiresAck(false);
        setUploadDepartments(["all"]);
        setUploadJobRoles(["all"]);
        fetchDocuments();
      } else {
        toast("Upload failed", { description: "Please try again or check your connection." });
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
    fetchDocuments();
  };

  const formatFileSize = (size: number) =>
    size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

  const handleRowClick = (doc: Document) => {
    setSelectedDoc(doc);
    setIsPreviewModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Document Management</h1>
        {userRole === "ADMIN" && (
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <UploadCloud className="w-4 h-4 mr-2" /> Add Document
          </Button>
        )}
      </div>

      {loading ? (
        <p>Loading documents...</p>
      ) : documents.length === 0 ? (
        <p>No documents found.</p>
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
              {userRole === "ADMIN" && <TableHead className="w-[50px] text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => {
              const accessList = [
                doc.canViewAdmin ? "Admin" : null,
                doc.canViewManager ? "Manager" : null,
                doc.canViewEmployee ? "Employee" : null,
                ...doc.departments.map((d) => d.name),
                ...doc.jobRoles.map((jr) => jr.name),
              ].filter(Boolean);

              return (
                <TableRow key={doc.id} onClick={() => handleRowClick(doc)} className="cursor-pointer hover:bg-muted transition">
                  <TableCell className="text-blue-600 underline">{doc.name}</TableCell>
                  <TableCell>{doc.category ?? "Uncategorized"}</TableCell>
                  <TableCell>{doc.departments.length > 0 ? doc.departments.map((d) => d.name).join(", ") : "All Departments"}</TableCell>
                  <TableCell>{doc.jobRoles.length > 0 ? doc.jobRoles.map((jr) => jr.name).join(", ") : "All Job Roles"}</TableCell>
                  <TableCell>
                    <Tooltip
                      content={
                        <div className="text-xs">
                          {doc.departments.length === 0 && doc.jobRoles.length === 0
                            ? "All (Unrestricted)"
                            : accessList.map((item, idx) => <div key={idx}>{item}</div>)}
                        </div>
                      }
                    >
                      <span className="underline cursor-pointer">
                        {doc.departments.length === 0 && doc.jobRoles.length === 0 ? "All" : accessList.join(", ")}
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{formatFileSize(doc.size)}</TableCell>
                  {userRole === "ADMIN" && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu trigger={<button className="p-2 hover:bg-gray-100 rounded">⋮</button>}>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingDoc(doc);
                            setIsEditAccessOpen(true);
                          }}
                        >
                          Edit Access
                        </DropdownMenuItem>
                        {doc.requiresAck && ( // ✅ Only show for ack docs
                          <DropdownMenuItem
                            onClick={() => {
                              setAckDocId(doc.id);
                              setAckDocName(doc.name);
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
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="E.g., Leave Policy" required />
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
                <Label>Requires Acknowledgement</Label>
                <Switch checked={requiresAck} onChange={setRequiresAck} />
              </div>
              <div>
                <Label>Restrict by Department</Label>
                <MultiSelect
                  options={departmentsList}
                  selected={uploadDepartments}
                  onChange={(values) => {
                    if (values.includes("all")) setUploadDepartments(["all"]);
                    else setUploadDepartments(values);
                  }}
                  placeholder="Select department(s)"
                />
              </div>
              <div>
                <Label>Restrict by Job Role</Label>
                <MultiSelect
                  options={jobRolesList}
                  selected={uploadJobRoles}
                  onChange={(values) => {
                    if (values.includes("all")) setUploadJobRoles(["all"]);
                    else setUploadJobRoles(values);
                  }}
                  placeholder="Select job role(s)"
                />
              </div>
              <div>
                <Label>File</Label>
                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
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
            <div className="space-y-2">
              <iframe src={selectedDoc.url} className="w-full h-[500px] rounded border"></iframe>
              <a
                href={selectedDoc.url}
                download={selectedDoc.name}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Download
              </a>
              {selectedDoc.requiresAck && userRole === "EMPLOYEE" && ( // ✅ Ack button
                <Button
                  className="w-full mt-4"
                  onClick={async () => {
                    const res = await fetch("/api/documents/acknowledge", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ documentId: selectedDoc.id }),
                    });
                    if (res.ok) {
                      toast("Acknowledged successfully!");
                      setIsPreviewModalOpen(false);
                      fetchDocuments();
                    } else {
                      toast("Failed to acknowledge document.");
                    }
                  }}
                >
                  Acknowledge Document
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Access Modal */}
      <EditAccessModal
        isOpen={isEditAccessOpen}
        onClose={() => setIsEditAccessOpen(false)}
        document={editingDoc}
        onSaved={fetchDocuments}
      />

      {/* View Acknowledgements Modal */}
      <ViewAcknowledgementsModal
        isOpen={isViewAckOpen}
        onClose={() => setIsViewAckOpen(false)}
        documentId={ackDocId}
        documentName={ackDocName}
      />
    </div>
  );
}
