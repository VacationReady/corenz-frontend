// File: app/documents/page.tsx
"use client";

import { useState } from "react";

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
    {
      id: "1",
      name: "Health & Safety Policy.pdf",
      category: "Policy",
      dateAdded: "2025-06-10",
      actionRequired: "acknowledge",
    },
    {
      id: "2",
      name: "Employment Contract.pdf",
      category: "Employment",
      dateAdded: "2025-06-08",
      actionRequired: "esign",
    },
    {
      id: "3",
      name: "Payroll_May_2025.pdf",
      category: "Payroll",
      dateAdded: "2025-06-05",
      actionRequired: "none",
    },
  ];

  const dummyAcknowledgements: EmployeeStatus[] = [
    {
      id: "a1",
      name: "Jane Smith",
      department: "Finance",
      status: "read",
      timestamp: "2025-06-10 14:23",
    },
    {
      id: "a2",
      name: "John Doe",
      department: "Marketing",
      status: "pending",
      timestamp: null,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Company Documents</h1>
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Document Name</th>
            <th className="p-2 border">Category</th>
            <th className="p-2 border">Date Added</th>
            <th className="p-2 border">Action Required</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="text-center hover:bg-gray-50">
              <td className="p-2 border">{doc.name}</td>
              <td className="p-2 border">{doc.category}</td>
              <td className="p-2 border">{doc.dateAdded}</td>
              <td
                className="p-2 border text-blue-600 cursor-pointer hover:underline"
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

      {selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">
              {selectedDoc.actionRequired === "acknowledge"
                ? "Acknowledgement Status"
                : "E-Sign Status"}
            </h2>
            <table className="w-full mb-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Employee Name</th>
                  <th className="p-2 border">Department</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {dummyAcknowledgements.map((emp) => (
                  <tr key={emp.id} className="text-center">
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
            <button
              onClick={() => setSelectedDoc(null)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
