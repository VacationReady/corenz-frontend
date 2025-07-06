"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Label } from "@/components/ui/label";
import { UploadCloud } from "lucide-react";

type Document = {
  id: string;
  name: string;
  category: string | null;
  path: string;
  size: number;
  type: string;
  createdAt: string;
  uploader: {
    name: string | null;
    email: string | null;
  };
};

export default function EmployeeDocumentsPage() {
  const params = useParams();
  const employeeId = params.id as string;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    const fetchDocuments = async () => {
      const res = await fetch(`/api/documents/list-employee?employeeId=${employeeId}`);
      const data = await res.json();
      setDocuments(data);
    };
    if (employeeId) {
      fetchDocuments();
    }
  }, [employeeId]);

  const handleUpload = async () => {
    if (!file || !name || !category) {
      toast.error("Please fill in all fields and select a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("category", category);
    formData.append("employeeId", employeeId);

    const res = await fetch("/api/documents/upload-employee", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      toast.success(`${name} has been uploaded successfully.`);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      toast.error("Upload failed. Please try again.");
    }
  };

  const handleDownload = async (path: string) => {
    const res = await fetch(`/api/documents/download?path=${encodeURIComponent(path)}`);
    const { url } = await res.json();
    window.open(url, "_blank");
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Employee Documents</h1>

      <Card className="mb-6">
        <CardContent className="p-4 space-y-2">
          <Label>Document Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="E.g., Signed Contract" />

          <Label>Category</Label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="E.g., Onboarding" />

          <Label>File</Label>
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

          <Button onClick={handleUpload} className="mt-4">
            <UploadCloud className="w-4 h-4 mr-2" /> Upload Document
          </Button>
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
                  {doc.category ?? "Uncategorized"} • Uploaded by {doc.uploader?.name ?? doc.uploader?.email ?? "Unknown"} •{" "}
                  {new Date(doc.createdAt).toLocaleDateString()} • {Math.round(doc.size / 1024)} KB
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
