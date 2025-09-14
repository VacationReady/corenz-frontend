"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Button from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

interface SavedReport {
  id: number;
  name: string;
  category: string;
  fields: string[]; // ✅ native array
  createdAt: string;
  createdBy: {
    email: string;
  };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const breadcrumbs = useBreadcrumbs();

  useEffect(() => {
    const fetchReports = async () => {
      const res = await fetch("/api/reports");
      const data = await res.json();
      setReports(data);
      setLoading(false);
    };
    fetchReports();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this report?")) return;
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading) {
    return (
      <PageShell
        title="Reports"
        description="View and manage your saved reports"
        icon={<FileText className="w-6 h-6" />}
        breadcrumbs={breadcrumbs}
      >
        <PageLoader text="Loading reports..." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Reports"
      description="View and manage your saved reports"
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={breadcrumbs}
      action={
        <div className="flex gap-2">
          <Button onClick={() => router.push("/reports/builder-new")}>
            + New Report Builder
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push("/reports/builder")}
          >
            Legacy Builder
          </Button>
        </div>
      }
    >
      {reports.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">No saved reports found</p>
          <p className="text-muted-foreground mb-6">Create your first report to get started</p>
          <Button onClick={() => router.push("/reports/builder-new")}>
            Create Report
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell>{report.name}</TableCell>
                <TableCell>{report.category}</TableCell>
                <TableCell>{report.createdBy?.email || "Unknown"}</TableCell>
                <TableCell>
                  {format(new Date(report.createdAt), "PPP")}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      console.log("🧪 Raw report.fields:", report.fields);

                      if (!report.fields) {
                        alert("No fields found in this report.");
                        return;
                      }

                      const fieldArray = Array.isArray(report.fields)
                        ? report.fields
                        : JSON.parse(report.fields || "[]");

                      if (!fieldArray.length) {
                        alert("This report has no fields.");
                        return;
                      }

                      router.push(
                        `/reports/preview?fields=${encodeURIComponent(fieldArray.join(","))}`,
                      );
                    }}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(report.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageShell>
  );
}
