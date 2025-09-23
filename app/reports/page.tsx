"use client";

import { useCallback, useEffect, useState } from "react";
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
import { toast } from "@/hooks/use-toast";

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
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  const router = useRouter();
  const breadcrumbs = useBreadcrumbs();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reports");

      if (!res.ok) {
        let message = "Failed to load reports.";
        try {
          const errorBody = await res.json();
          message = errorBody?.error ?? message;
        } catch (jsonError) {
          console.error("Failed to parse reports error response", jsonError);
          message = `${message} (${res.status})`;
        }
        throw new Error(message);
      }

      const data = await res.json();
      setReports(data);
      toast({
        title: "Reports loaded",
        description: "Saved reports are up to date.",
      });
    } catch (err) {
      console.error("Failed to fetch reports", err);
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while loading reports.";
      setError(message);
      toast({
        title: "Unable to load reports",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this report?")) return;
    const previousReports = reports;
    const reportToDelete = reports.find((report) => report.id === id);

    setDeletingIds((prev) => [...prev, id]);
    setReports((prev) => prev.filter((r) => r.id !== id));

    try {
      const response = await fetch(`/api/reports/${id}`, { method: "DELETE" });

      if (!response.ok) {
        let message = "Failed to delete report.";
        try {
          const errorBody = await response.json();
          message = errorBody?.error ?? message;
        } catch (jsonError) {
          console.error("Failed to parse delete error response", jsonError);
          message = `${message} (${response.status})`;
        }
        throw new Error(message);
      }

      toast({
        title: "Report deleted",
        description: reportToDelete?.name
          ? `${reportToDelete.name} has been removed.`
          : "The report has been removed.",
      });
    } catch (err) {
      console.error("Failed to delete report", err);
      setReports(previousReports);
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while deleting the report.";
      toast({
        title: "Failed to delete report",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeletingIds((prev) => prev.filter((reportId) => reportId !== id));
    }
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
      {error && (
        <div className="mb-6 rounded-md border border-destructive/20 bg-destructive/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-destructive">Unable to load reports</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
            <Button variant="outline" onClick={() => void fetchReports()}>
              Retry
            </Button>
          </div>
        </div>
      )}
      {reports.length === 0 ? (
        error ? null : (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No saved reports found</p>
            <p className="text-muted-foreground mb-6">Create your first report to get started</p>
            <Button onClick={() => router.push("/reports/builder-new")}>
              Create Report
            </Button>
          </div>
        )
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
                        toast({
                          title: "Unable to open report",
                          description: "No fields were saved with this report configuration.",
                          variant: "destructive",
                        });
                        return;
                      }

                      const fieldArray = Array.isArray(report.fields)
                        ? report.fields
                        : JSON.parse(report.fields || "[]");

                      if (!fieldArray.length) {
                        toast({
                          title: "Unable to open report",
                          description: "This report does not contain any fields yet.",
                          variant: "destructive",
                        });
                        return;
                      }

                      const params = new URLSearchParams();
                      params.set("fields", fieldArray.join(","));
                      params.set("returnTo", "/reports");
                      router.push(`/reports/preview?${params.toString()}`);
                    }}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={deletingIds.includes(report.id)}
                    onClick={() => handleDelete(report.id)}
                  >
                    {deletingIds.includes(report.id) ? "Deleting..." : "Delete"}
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
