"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import Button from "@/components/ui/Button";
import Papa from "papaparse";

function downloadCSV(data: any[], columns: any[]) {
  if (!data || data.length === 0) return;

  const headers = columns.map((col: any) => col.header);
  const fields = columns.map((col: any) =>
    col.accessorKey ? col.accessorKey : col.header,
  );

  const csvData = data.map((row) => {
    const obj: Record<string, any> = {};
    fields.forEach((field, idx) => {
      obj[headers[idx]] = row[field] ?? "";
    });
    return obj;
  });

  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `peoplecore-report-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ReportsPreviewClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fieldsParam = searchParams?.get("fields");
  const reportIdParam = searchParams?.get("reportId");
  
  const [selectedFields, setSelectedFields] = useState<string[]>(
    fieldsParam ? fieldsParam.split(",") : []
  );
  const [reportConfig, setReportConfig] = useState<any>(null);

  console.log("🔍 useSearchParams:", searchParams?.toString());
  console.log("🔍 fieldsParam:", fieldsParam);
  console.log("🔍 reportIdParam:", reportIdParam);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  // Load report configuration if reportId is provided
  useEffect(() => {
    if (!reportIdParam) return;
    
    const loadReport = async () => {
      setLoadingReport(true);
      try {
        console.log("🔄 Loading report with ID:", reportIdParam);
        const res = await fetch(`/api/reports/${reportIdParam}`);
        
        if (!res.ok) {
          throw new Error(`Failed to load report: ${res.status}`);
        }
        
        const report = await res.json();
        console.log("📄 Loaded report:", report);
        
        setReportConfig(report);
        setSelectedFields(report.fields || []);
      } catch (error) {
        console.error("❌ Error loading report:", error);
      } finally {
        setLoadingReport(false);
      }
    };
    
    loadReport();
  }, [reportIdParam]);

  // Load report data when fields are available
  useEffect(() => {
    if (selectedFields.length === 0) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/reports/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedFields,
            filters: [],
            pagination: { page: 1, limit: 50 },
            sort: { direction: "asc" },
          }),
        });

        const json = await res.json();
        console.log("🔥 FULL API RESPONSE:", json);

        const firstModel = selectedFields[0]?.split(".")[0];
        const results = json.data?.[firstModel] ?? [];
        console.log("🔥 Extracted modelKey:", firstModel);
        console.log("🔥 Raw results:", results);

        setData([...results]);
      } catch (error) {
        console.error("❌ Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedFields]);

  const handleSaveReport = async () => {
    const reportName = prompt("Enter a name for this report:");
    if (!reportName) return;

    try {
      const res = await fetch("/api/reports/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reportName,
          fields: selectedFields,
          category: "General", // or let user choose later
        }),
      });

      if (!res.ok) throw new Error("Failed to save report");

      alert("Report saved!");
      router.push("/reports");
    } catch (err) {
      console.error(err);
      alert("Error saving report.");
    }
  };

  if (loadingReport) {
    return (
      <main className="flex flex-col items-center justify-center p-10">
        <p className="text-lg">Loading report configuration...</p>
      </main>
    );
  }

  if (!selectedFields.length && !loadingReport) {
    return (
      <main className="flex flex-col items-center justify-center p-10">
        <p className="text-lg">
          No fields selected. Please go back and select fields for your report.
        </p>
        <Button className="mt-4" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center p-10">
        <p className="text-lg">Loading report data...</p>
      </main>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center p-10">
        <p className="text-lg">No data found for the selected fields.</p>
        <Button className="mt-4" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </main>
    );
  }

  const columns = selectedFields.map((field) => {
    const keys = field.split(".");
    const flatKey = keys[1] || keys[0];

    return {
      header: flatKey,
      accessorKey: flatKey, // ✅ simpler, faster, and works
    };
  });

  // ✅ Moved outside JSX so it executes
  console.log("✅ Final data being sent to DataTable:", data);
  console.log("✅ Columns:", columns);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Report Preview</h1>
      <p className="mb-4">
        Your custom report is displayed below. You can sort and filter as
        needed.
      </p>
      <div className="flex gap-2 mb-4">
        <Button onClick={() => downloadCSV(data, columns)}>Download CSV</Button>
        <Button onClick={handleSaveReport}>Save Report</Button>
      </div>
      <DataTable columns={columns} data={data} />
    </main>
  );
}
