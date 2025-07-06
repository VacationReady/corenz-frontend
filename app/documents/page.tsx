// /app/documents/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { getDownloadUrl } from "@/lib/getDownloadUrl";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Label } from "@/components/ui/label";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import Select, SelectTrigger, SelectValue, SelectContent, SelectItem from "@/components/ui/Select";


type Document = {
  id: string;
  name: string;
  category: string | null;
  path: string;
  size: number;
  type: string;
  createdAt: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    const fetchDocuments = async () => {
      const res = await fetch("/api/documents/list");
      const data = await res.json();
      setDocuments(data);
    };
    fetchDocuments();
  }, []);

  const handleUpload = async () => {
    if (!file || !name || !category) {
      alert("Please fill in all fields and select a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("category", category);

    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
  toast("Upload successful", {
    description: `${name} has been uploaded successfully.`,
});
  setTimeout(() => {
    window.location.reload();
  }, 1500);
} else {
  toast("Upload failed", {
    description: "Please try again or check your connection.",
});
}
};

  const handleDownload = async (path: string) => {
    const res = await fetch(`/api/documents/download?path=${encodeURIComponent(path)}`);
    const { url } = await res.json();
    window.open(url, "_blank");
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Document Management</h1>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="space-y-2">
            <Label>Document Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="E.g., Leave Policy" />

            <Label>Category</Label>
<Select onValueChange={(value) => setCategory(value)}>
  <SelectTrigger className="w-full">
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

            <Label>File</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

            <Button onClick={handleUpload} className="mt-4">
              <UploadCloud className="w-4 h-4 mr-2" /> Upload Document
            </Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold mb-2">Uploaded Documents</h2>

      <div className="space-y-2">
        {documents.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="p-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{doc.name}</p>
                <p className="text-sm text-gray-500">
                  {doc.category ?? "Uncategorized"} • {new Date(doc.createdAt).toLocaleDateString()} • {Math.round(doc.size / 1024)} KB
                </p>
              </div>
              <Button onClick={() => handleDownload(doc.path)}>Download</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
