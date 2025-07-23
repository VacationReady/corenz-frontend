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
    col.accessorKey ? col.accessorKey : col.header
  );

  const csvData = data.map((row) => {
    const obj: Record<string, any> = {};
    fields.forEach((field, idx) => {
      let value;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        value = row[parent]?.[child] ?? "";
      } else {
        const cellValue = row[field];
        if (typeof cellValue === "object" && cellValue !== null) {
          if (cellValue?.name) {
            value = cellValue.name;
          } else if (cellValue?.id) {
            value = cellValue.id;
          } else {
            value = JSON.stringify(cellValue);
          }
        } else {
          value = cellValue ?? "";
        }
      }
      obj[headers[idx]] = value;
    });
    return obj;
  });

  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `corenz-report-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ReportsPreviewClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fieldsParam = searchParams?.get("fields");
  const selectedFields = fieldsParam ? fieldsParam.split(",") : [];

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fieldsParam) return;

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
        const results = (Object.values(json.data || {})[0] || []) as any[];
        setData(results);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fieldsParam]);

  const handleSaveReport = async () => {
    const reportName = prompt("Enter a name for this report:");
    if (!reportName) return;

    try {
      const res = await fetch("/api/reports/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reportName,
          fields: selectedFields,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save report");
      }

      alert("Report saved successfully!");
      router.push("/reports/saved");
    } catch (error) {
      console.error(error);
      alert("Error saving report. Please try again.");
    }
  };

  if (!selectedFields.length) {
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

  const columns = selectedFields.map((field) => ({
    header: field,
    accessorFn: (row: any) =>
      field.split(".").reduce((obj, key) => (obj ? obj[key] : ""), row) ?? "",
    cell: (info: any) => info.getValue(),
  }));

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Report Preview</h1>
      <p className="mb-4">
        Your custom report is displayed below. You can sort and filter as needed.
      </p>
      <div className="flex gap-2 mb-4">
        <Button onClick={() => downloadCSV(data, columns)}>Download CSV</Button>
        <Button onClick={handleSaveReport}>Save Report</Button>
      </div>
      <DataTable columns={columns} data={data} />
    </main>
  );
}
