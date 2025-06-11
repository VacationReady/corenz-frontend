"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { FileText, X } from "lucide-react";
import { PageShell } from "@/components/ui/PageShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Document {
  id: string;
  name: string;
  category: string;
  dateAdded: string;
  actionRequired: "none" | "acknowledge" | "esign";
}

interface EmployeeStatus {
  id: string;
  name: string;
  department: string;
  status: "read" | "signed" | "pending";
  timestamp: string | null;
}

export default function DocumentsPage() {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const documents: Document[] = [
    { id: "1", name: "Health & Safety Policy.pdf", category: "Policy", dateAdded: "2025-06-10", actionRequired: "acknowledge" },
    { id: "2", name: "Employment Contract.pdf", category: "Employment", dateAdded: "2025-06-08", actionRequired: "esign" },
    { id: "3", name: "Payroll_May_2025.pdf", category: "Payroll", dateAdded: "2025-06-05", actionRequired: "none" },
  ];

  const dummyAcknowledgements: EmployeeStatus[] = [
    { id: "a1", name: "Jane Smith", department: "Finance", status: "read", timestamp: "2025-06-10 14:23" },
    { id: "a2", name: "John Doe", department: "Marketing", status: "pending", timestamp: null },
  ];

  return (
    <PageShell
      title="Company Documents"
      icon={<FileText className="w-5 h-5" />}
      action={<Button>Upload Document</Button>}
    >
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200">
            <thead className="bg-neutral-100">
              <tr>
                <th className="text-left p-3 border">Document Name</th>
                <th className="text-left p-3 border">Category</th>
                <th className="text-left p-3 border">Date Added</th>
                <th className="text-left p-3 border">Action Required</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-neutral-50">
                  <td className="p-3 border">{doc.name}</td>
                  <td className="p-3 border">{doc.category}</td>
                  <td className="p-3 border">{doc.dateAdded}</td>
                  <td
                    className="p-3 border text-blue-600 cursor-pointer hover:underline"
                    onClick={() => setSelectedDoc(doc)}
                  >
                    {doc.actionRequired === "none"
                      ? "None"
                      : doc.actionRequired === "acknowledge"
                      ? "Read Acknowledgement"
                      : "E-Sign"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl relative">
            <button
              onClick={() => setSelectedDoc(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold mb-4">
              {selectedDoc.actionRequired === "acknowledge"
                ? "Acknowledgement Status"
                : "E-Sign Status"}
            </h2>
            <table className="w-full mb-4 text-sm border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border text-left">Employee Name</th>
                  <th className="p-2 border text-left">Department</th>
                  <th className="p-2 border text-left">Status</th>
                  <th className="p-2 border text-left">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {dummyAcknowledgements.map((emp) => (
                  <tr key={emp.id}>
                    <td className="p-2 border">{emp.name}</td>
                    <td className="p-2 border">{emp.department}</td>
                    <td className="p-2 border">
                      {emp.status === "read" || emp.status === "signed" ? "✅" : "❌"} {emp.status}
                    </td>
                    <td className="p-2 border">{emp.timestamp || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right">
              <Button onClick={() => setSelectedDoc(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
