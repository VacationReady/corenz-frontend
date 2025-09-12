"use client";

import { useState } from "react";
import useSWR from "swr";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function exportToCsv(rows: any[], selectedFields: string[]) {
  const header = selectedFields.join(",");
  const csvRows = rows.map((row) =>
    selectedFields
      .map((field) => {
        const value =
          field.split(".").reduce((obj, key) => (obj ? obj[key] : ""), row) ||
          "";
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(","),
  );
  const csvContent = [header, ...csvRows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", "report.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ReportBuilder() {
  const router = useRouter();
  type ReportField = {
    model: string;
    field: string;
    label: string;
    type: string;
    filterable: boolean;
    join?: string;
  };

  const { data: fieldsData } = useSWR<ReportField[]>(
    "/api/reports/fields",
    fetcher,
  );
  const models: string[] = Array.from(
    new Set(fieldsData?.map((f) => f.model) || []),
  );

  const [selectedModel, setSelectedModel] = useState<string | undefined>(
    undefined,
  );
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<any[]>([]);
  const [sort, setSort] = useState<{
    field: string | undefined;
    direction: "asc" | "desc";
  }>({
    field: undefined,
    direction: "asc",
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 50 });
  const [results, setResults] = useState<any[]>([]);

  const handleGenerate = async () => {
    const res = await fetch("/api/reports/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        selectedFields,
        filters,
        pagination,
        sort,
      }),
    });

    router.push(`/reports/preview?fields=${selectedFields.join(",")}`);
  };

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  };

  const addFilter = () => {
    setFilters((prev) => [
      ...prev,
      { field: undefined, operator: "equals", value: "" },
    ]);
  };

  const updateFilter = (index: number, key: string, value: any) => {
    setFilters((prev) => {
      const updated = [...prev];
      updated[index][key] = value;
      return updated;
    });
  };

  const removeFilter = (index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Dynamic Report Builder</h1>

      <div className="flex gap-4 items-center">
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger>{selectedModel || "Select Model"}</SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedModel && (
        <>
          <div className="border p-4 rounded">
            <h2 className="font-semibold mb-2">Select Fields</h2>
            {fieldsData &&
              fieldsData
                .filter((f) => f.model === selectedModel)
                .map((field) => (
                  <div key={field.field}>
                    <Checkbox
                      id={field.field}
                      checked={selectedFields.includes(field.field)}
                      onCheckedChange={() => toggleField(field.field)}
                    />
                    <span className="ml-2">{field.label}</span>
                  </div>
                ))}
          </div>

          <div className="border p-4 rounded">
            <h2 className="font-semibold mb-2">Filters</h2>
            {filters.map((filter, idx) => (
              <div key={idx} className="flex gap-2 items-center mb-2">
                <Select
                  value={filter.field || undefined}
                  onValueChange={(val) => updateFilter(idx, "field", val)}
                >
                  <SelectTrigger>
                    {filter.field || "Select Field"}
                  </SelectTrigger>
                  <SelectContent>
                    {fieldsData &&
                      fieldsData
                        .filter((f) => f.model === selectedModel)
                        .map((field) => (
                          <SelectItem key={field.field} value={field.field}>
                            {field.label}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filter.operator}
                  onValueChange={(val) => updateFilter(idx, "operator", val)}
                >
                  <SelectTrigger>{filter.operator}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="gt">Greater Than</SelectItem>
                    <SelectItem value="lt">Less Than</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={filter.value}
                  onChange={(e) => updateFilter(idx, "value", e.target.value)}
                  placeholder="Value"
                />
                <Button variant="ghost" onClick={() => removeFilter(idx)}>
                  Remove
                </Button>
              </div>
            ))}
            <Button onClick={addFilter}>Add Filter</Button>
          </div>

          <div className="border p-4 rounded">
            <h2 className="font-semibold mb-2">Sorting & Pagination</h2>
            <div className="flex gap-2 items-center">
              <Select
                value={sort.field || undefined}
                onValueChange={(val) => setSort({ ...sort, field: val })}
              >
                <SelectTrigger>{sort.field || "Sort By"}</SelectTrigger>
                <SelectContent>
                  {selectedFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sort.direction}
                onValueChange={(val) =>
                  setSort({ ...sort, direction: val as "asc" | "desc" })
                }
              >
                <SelectTrigger>{sort.direction}</SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                value={pagination.page}
                onChange={(e) =>
                  setPagination({
                    ...pagination,
                    page: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                placeholder="Page"
              />
              <Input
                type="number"
                min="1"
                value={pagination.limit}
                onChange={(e) =>
                  setPagination({
                    ...pagination,
                    limit: Math.max(1, parseInt(e.target.value) || 50),
                  })
                }
                placeholder="Limit"
              />
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleGenerate}
          disabled={!selectedModel || selectedFields.length === 0}
        >
          Generate Report
        </Button>
        <Button
          variant="ghost"
          onClick={() => exportToCsv(results, selectedFields)}
          disabled={results.length === 0}
        >
          Export CSV
        </Button>
      </div>

      {results.length > 0 && (
        <div className="mt-4 border p-4 rounded">
          <h2 className="font-semibold mb-2">Results</h2>
          <table className="w-full border">
            <thead>
              <tr>
                {selectedFields.map((field) => (
                  <th key={field} className="border p-2">
                    {field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row, idx) => (
                <tr key={idx}>
                  {selectedFields.map((field) => (
                    <td key={field} className="border p-2">
                      {field
                        .split(".")
                        .reduce((obj, key) => (obj ? obj[key] : ""), row) || ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
