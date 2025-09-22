"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import FilterableDataTable from "@/components/reports/FilterableDataTable";
import Button from "@/components/ui/Button";
import Papa from "papaparse";

function getNested(obj: any, path: string): any {
	return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function downloadCSV(data: any[], columns: any[]) {
	if (!data || data.length === 0) return;

	const headers = columns.map((col: any) => col.header);
	const fields = columns.map((col: any) => (col.accessorKey ? col.accessorKey : col.header));

	const csvData = data.map((row) => {
		const obj: Record<string, any> = {};
		fields.forEach((field, idx) => {
			obj[headers[idx]] = getNested(row, field) ?? "";
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

	const [data, setData] = useState<any[]>([]);
        const [filteredData, setFilteredData] = useState<any[]>([]);
        const [page, setPage] = useState(1);
        const [pageSize, setPageSize] = useState(50);
        const [total, setTotal] = useState<number>(0);
        const [exportingFull, setExportingFull] = useState(false);
	const [loading, setLoading] = useState(false);
	const [loadingReport, setLoadingReport] = useState(false);
	const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});

	// Build field label map from server (includes dynamic Forms)
	useEffect(() => {
		const load = async () => {
			try {
				const res = await fetch("/api/reports/fields", { cache: "no-store" });
				if (!res.ok) throw new Error(String(res.status));
				const list = await res.json();
				const map: Record<string, string> = {};
				if (Array.isArray(list)) list.forEach((f: any) => { if (f?.field && f?.label) map[f.field] = f.label; });
				setFieldLabels(map);
			} catch {
				setFieldLabels({});
			}
		};
		load();
	}, []);

	// Load report configuration if reportId is provided
	useEffect(() => {
		if (!reportIdParam) return;
		const loadReport = async () => {
			setLoadingReport(true);
			try {
				const res = await fetch(`/api/reports/${reportIdParam}`);
				if (!res.ok) throw new Error(`Failed to load report: ${res.status}`);
				const report = await res.json();
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

        useEffect(() => {
                setPage((prev) => (prev === 1 ? prev : 1));
        }, [selectedFields.join(",")]);

        const fetchReportPage = async (pageToFetch: number, limitToFetch: number) => {
                const sortField = selectedFields[0];
                const res = await fetch("/api/reports/query", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                                selectedFields,
                                filters: [],
                                pagination: { page: pageToFetch, limit: limitToFetch },
                                sort: sortField ? { field: sortField, direction: "asc" } : undefined,
                        }),
                });
                const json = await res.json();
                const results = Array.isArray(json.data) ? json.data : [];
                const totalCount = typeof json.total === "number" ? json.total : results.length;
                return { results, totalCount };
        };

        // Load report data when fields are available
        useEffect(() => {
                if (selectedFields.length === 0) return;
                let cancelled = false;
                const fetchData = async () => {
                        setLoading(true);
                        try {
                                const { results, totalCount } = await fetchReportPage(page, pageSize);
                                if (cancelled) return;
                                setData([...results]);
                                setFilteredData([...results]);
                                setTotal(totalCount);
                        } catch (error) {
                                console.error("❌ Error fetching report data:", error);
                        } finally {
                                if (!cancelled) {
                                        setLoading(false);
                                }
                        }
                };
                fetchData();
                return () => {
                        cancelled = true;
                };
        }, [selectedFields, page, pageSize]);

	const handleSaveReport = async () => {
		const reportName = prompt("Enter a name for this report:");
		if (!reportName) return;
		try {
			const res = await fetch("/api/reports/save", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: reportName, fields: selectedFields, category: "General" }),
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
				<p className="text-lg">No fields selected. Please go back and select fields for your report.</p>
				<Button className="mt-4" onClick={() => window.history.back()}>Go Back</Button>
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
				<Button className="mt-4" onClick={() => window.history.back()}>Go Back</Button>
			</main>
		);
	}

	const translateLegacy = (f: string) => {
		const map: Record<string, string> = {
			"User.department.name": "User.Department_User_departmentIdToDepartment.name",
			"User.Department.name": "User.Department_User_departmentIdToDepartment.name",
			"User.jobRole.name": "User.JobRole.name",
		};
		return map[f] || f;
	};

	const columns = selectedFields.map((field) => {
		const keys = field.split(".");
		let accessorKey: string;
		let headerFallback: string;
		if (keys.length >= 3) {
			accessorKey = `${keys.slice(1).join(".")}`; // support nested
			headerFallback = keys[keys.length - 1];
		} else if (keys.length === 2) {
			accessorKey = keys[1];
			headerFallback = keys[1];
		} else {
			accessorKey = keys[keys.length - 1];
			headerFallback = keys[keys.length - 1];
		}

		const translated = translateLegacy(field);
		const label = fieldLabels[field] || fieldLabels[translated] || headerFallback.charAt(0).toUpperCase() + headerFallback.slice(1);

		return { header: label, accessorKey };
	});

        return (
                <main className="p-6">
                        <h1 className="text-2xl font-bold mb-4">Report Preview</h1>
                        <p className="mb-4">Your custom report is displayed below. You can sort and filter as needed.</p>
                        <div className="flex gap-2 mb-4">
                                <Button onClick={() => downloadCSV(filteredData, columns)}>Download CSV ({filteredData.length} rows)</Button>
                                {total > data.length ? (
                                        <Button
                                                disabled={exportingFull}
                                                onClick={async () => {
                                                        if (exportingFull) return;
                                                        setExportingFull(true);
                                                        try {
                                                                const combined: any[] = [];
                                                                const pagesToFetch = Math.max(1, Math.ceil(total / pageSize));
                                                                for (let currentPage = 1; currentPage <= pagesToFetch; currentPage++) {
                                                                        const { results } = await fetchReportPage(currentPage, pageSize);
                                                                        combined.push(...results);
                                                                }
                                                                downloadCSV(combined, columns);
                                                        } catch (error) {
                                                                console.error("❌ Error exporting full report:", error);
                                                                alert("Failed to export full report. Please try again.");
                                                        } finally {
                                                                setExportingFull(false);
                                                        }
                                                }}
                                        >
                                                {exportingFull
                                                        ? "Exporting full report..."
                                                        : `Download Full CSV (${total} rows)`}
                                        </Button>
                                ) : null}
                                <Button onClick={handleSaveReport}>Save Report</Button>
                        </div>
                        <div className="min-h-[200px]">
                                <FilterableDataTable
                                        columns={columns}
                                        data={data}
                                        total={total}
                                        page={page}
                                        pageSize={pageSize}
                                        onFilteredDataChange={setFilteredData}
                                        onPageChange={setPage}
                                        onPageSizeChange={(size) => {
                                                setPageSize(size);
                                                setPage(1);
                                        }}
                                />
                        </div>
                </main>
        );
}
