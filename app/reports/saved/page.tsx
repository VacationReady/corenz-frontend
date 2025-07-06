"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";

interface SavedReport {
  id: string;
  name: string;
  fields: string[];
  createdAt: string;
  createdBy: {
    email: string;
  };
}

export default function SavedReportsPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports/saved");
      if (!res.ok) {
        throw new Error("Failed to fetch reports");
      }
      const data = await res.json();
      setReports(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    try {
      const res = await fetch(`/api/reports/saved/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete report");
      }
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Saved Reports</h1>

      {loading && <p>Loading saved reports...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && reports.length === 0 && (
        <p className="text-gray-500">No saved reports found.</p>
      )}

      {!loading && reports.length > 0 && (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="border rounded p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div>
                <p className="font-semibold">{report.name}</p>
                <p className="text-sm text-gray-600">
                  Created by: {report.createdBy?.email || "Unknown"} on{" "}
                  {format(new Date(report.createdAt), "PPP")}
                </p>
                <p className="text-sm text-gray-600">
                  Fields: {report.fields.join(", ")}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => deleteReport(report.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
