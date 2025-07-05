"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import Button from "@/components/ui/Button";

export default function ReportsPreviewPage() {
  const searchParams = useSearchParams();
  const fieldsParam = searchParams?.get("fields");
  const selectedFields = fieldsParam ? fieldsParam.split(",") : [];

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedFields.length) return;

    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/reports/generate?fields=${encodeURIComponent(
            selectedFields.join(",")
          )}`
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
  }, [selectedFields]);

  if (!selectedFields.length) {
    return (
      <main className="flex flex-col items-center justify-center p-10">
        <p className="text-lg">No fields selected. Please go back and select fields for your report.</p>
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

  const columns = selectedFields.map((field) => ({
    accessorKey: field,
    header: field,
  }));

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Report Preview</h1>
      <p className="mb-4">Your custom report is displayed below. You can sort and filter as needed.</p>
      <DataTable columns={columns} data={data} />
    </main>
  );
}
