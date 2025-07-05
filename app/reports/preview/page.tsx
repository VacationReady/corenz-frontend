"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        obj[headers[idx]] = row[parent]?.[child] ?? "";
      } else {
        obj[headers[idx]] = row[field] ?? "";
      }
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

export default function ReportsPreviewPage() {
  const searchParams = useSearchParams();
  const fieldsParam = searchParams?.get("fields");
  const selectedFields = fieldsParam ? fieldsParam.split(",") : [];

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fieldsParam) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/reports/generate?fields=${encodeURIComponent(fieldsParam)}`
        );
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fieldsParam]);

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

  const dataKeys = data.length > 0 ? Object.keys(data[0]) : [];

  const columns = dataKeys.map((key) => {
    if (key.includes(".")) {
      const [parent, child] = key.split(".");
      return {
        header: key,
        accessorFn: (row) => row[parent]?.[child] ?? "",
        cell: (info) => info.getValue(),
      };
    } else if (typeof data[0][key] === "object" && data[0][key] !== null) {
      return {
        header: key,
        accessorFn: (row) => {
          const obj = row[key];
          if (obj?.name) return obj.name;
          if (obj?.id) return obj.id;
          return JSON.stringify(obj);
        },
        cell: (info) => info.getValue(),
      };
    } else {
      return {
        header: key,
        accessorFn: (row) => row[key] ?? "",
        cell: (info) => info.getValue(),
      };
    }
  });

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Report Preview</h1>
      <p className="mb-4">
        Your custom report is displayed below. You can sort and filter as needed.
      </p>
      <Button
        className="mb-4"
        onClick={() => downloadCSV(data, columns)}
      >
        Download CSV
      </Button>
      <DataTable columns={columns} data={data} />
    </main>
  );
}
