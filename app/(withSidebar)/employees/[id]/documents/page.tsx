'use client';

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { Switch } from "@/components/ui/switch"; // ✅ Added import for Switch
import { toast } from "sonner";

type Document = {
  id: string;
  name: string;
  category: string | null;
  createdAt: string;
  size: number;
  url: string;
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

  // ✅ Added state for access control switches
  const [canViewAdmin, setCanViewAdmin] = useState(true);
  const [canViewManager, setCanViewManager] = useState(false);
  const [canViewEmployee, setCanViewEmployee] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      const res = await fetch(`/api/documents/list?employeeId=${employeeId}`);
      const data = await res.json();
      setDocuments(data);
      setLoading(false);
    };

    if (employeeId) fetchDocuments();
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

    // ✅ Append access control flags
    formData.append("canViewAdmin", String(canViewAdmin));
    formData.append("canViewManager", String(canViewManager));
    formData.append("canViewEmployee", String(canViewEmployee));

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newDoc = await res.json();
        toast("Upload successful", { description: `${name} has been uploaded.` });
        setDocuments((prev) => [newDoc, ...prev]);
        setIsUploadModalOpen(false);
        setFile(null);
        setName("");
        setCategory("");
        setCanViewAdmin(true); // ✅ Reset switches after upload
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

  const formatFileSize = (size: number) =>
    size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

  const handleRowClick = (doc: Document) => {
    setSelectedDoc(doc);
    setIsPreviewModalOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employee Documents</h1>
        <Button onClick={() => setIsUploadModalOpen(true)}>Add Document</Button>
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

            {/* ✅ Access Control Switches */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Admin Access</Label>
                <Switch checked={canViewAdmin} onCheckedChange={setCanViewAdmin} />
              </div>
              <div>
                <Label>Manager Access</Label>
                <Switch checked={canViewManager} onCheckedChange={setCanViewManager} />
              </div>
              <div>
                <Label>Employee Access</Label>
                <Switch checked={canViewEmployee} onCheckedChange={setCanViewEmployee} />
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
