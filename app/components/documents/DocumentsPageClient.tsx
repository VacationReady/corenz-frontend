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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  departments: Department[];
  jobRoles: JobRole[];
};

export default function DocumentsPageClient() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // ✅ Dropdown state
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

      const deptOptions = [
        { label: "All Departments", value: "all" },
        ...deptData.map((d: any) => ({ label: d.name, value: d.id })),
      ];
      const roleOptions = [
        { label: "All Job Roles", value: "all" },
        ...roleData.map((r: any) => ({ label: r.name, value: r.id })),
      ];

      setDepartmentsList(deptOptions);
      setJobRolesList(roleOptions);

      if (!uploadDepartments.length) setUploadDepartments(["all"]);
      if (!uploadJobRoles.length) setUploadJobRoles(["all"]);
    } catch (err) {
      console.error("Failed to load dropdown data", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchDropdownData();
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

    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      if (res.ok) {
        toast("Upload successful", { description: `${name} has been uploaded.` });
        setIsUploadModalOpen(false);
        setFile(null);
        setName("");
        setCategory("");
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

  const formatFileSize = (size: number) =>
    size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

  const handleRowClick = (doc: Document) => {
    setSelectedDoc(doc);
    setIsPreviewModalOpen(true);
  };

  return (
    <TooltipProvider>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Document Management</h1>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <UploadCloud className="w-4 h-4 mr-2" /> Add Document
          </Button>
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
                <TableHead>Access</TableHead> {/* ✅ NEW COLUMN */}
                <TableHead>Date</TableHead>
                <TableHead>Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const accessList = [
                  doc.canViewAdmin ? "Admin" : null,
                  ...doc.departments.map((d) => d.name),
                  ...doc.jobRoles.map((jr) => jr.name),
                ].filter(Boolean);

                return (
                  <TableRow
                    key={doc.id}
                    onClick={() => handleRowClick(doc)}
                    className="cursor-pointer hover:bg-muted transition"
                  >
                    <TableCell className="text-blue-600 underline">{doc.name}</TableCell>
                    <TableCell>{doc.category ?? "Uncategorized"}</TableCell>
                    <TableCell>
                      {doc.departments.length > 0
                        ? doc.departments.map((d) => d.name).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {doc.jobRoles.length > 0
                        ? doc.jobRoles.map((jr) => jr.name).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="underline cursor-pointer">
                            {accessList.length > 0 ? accessList.join(", ") : "—"}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            {accessList.length > 0
                              ? accessList.map((item, idx) => <div key={idx}>{item}</div>)
                              : "No specific access (visible to all)"}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{formatFileSize(doc.size)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Upload Modal */}
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
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
