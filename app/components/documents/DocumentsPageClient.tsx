"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/Card";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect"; // ✅ NEW (custom multi-select)

type Document = {
  id: string;
  name: string;
  category: string | null;
  path: string;
  size: number;
  type: string;
  createdAt: string;
  url: string;
  department?: string;
  jobRole?: string;
};

const DEPARTMENTS = ["HR", "Finance", "IT", "Sales", "Marketing"];
const JOB_ROLES = ["Manager", "Team Lead", "Staff", "Intern"];

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

  // ✅ New filter states
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedJobRoles, setSelectedJobRoles] = useState<string[]>([]);

  const fetchDocuments = async () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (selectedDepartments.length) query.append("departments", selectedDepartments.join(","));
    if (selectedJobRoles.length) query.append("jobRoles", selectedJobRoles.join(","));

    const res = await fetch(`/api/documents/list?${query.toString()}`);
    const data = await res.json();
    setDocuments(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedDepartments, selectedJobRoles]);

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

    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      if (res.ok) {
        toast("Upload successful", { description: `${name} has been uploaded.` });
        setIsUploadModalOpen(false);
        setFile(null);
        setName("");
        setCategory("");
        fetchDocuments(); // ✅ Refetch after upload
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
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Document Management</h1>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          <UploadCloud className="w-4 h-4 mr-2" /> Add Document
        </Button>
      </div>

      {/* ✅ Department & Job Role Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <Label>Filter by Department</Label>
          <MultiSelect
            options={DEPARTMENTS.map((d) => ({ label: d, value: d }))}
            selected={selectedDepartments}
            onChange={setSelectedDepartments}
            placeholder="Select department(s)"
          />
        </div>
        <div className="flex-1">
          <Label>Filter by Job Role</Label>
          <MultiSelect
            options={JOB_ROLES.map((r) => ({ label: r, value: r }))}
            selected={selectedJobRoles}
            onChange={setSelectedJobRoles}
            placeholder="Select job role(s)"
          />
        </div>
      </div>

      {loading ? (
        <p>Loading documents...</p>
      ) : documents.length === 0 ? (
        <p>No documents found for selected filters.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Job Role</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow
                key={doc.id}
                onClick={() => handleRowClick(doc)}
                className="cursor-pointer hover:bg-muted transition"
              >
                <TableCell className="text-blue-600 underline">{doc.name}</TableCell>
                <TableCell>{doc.category ?? "Uncategorized"}</TableCell>
                <TableCell>{doc.department ?? "—"}</TableCell>
                <TableCell>{doc.jobRole ?? "—"}</TableCell>
                <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{formatFileSize(doc.size)}</TableCell>
              </TableRow>
            ))}
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
  );
}
