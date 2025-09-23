"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReportWizard, { ReportConfig } from "@/components/reports/ReportWizard";
import Button from "@/components/ui/Button";
import { PlusIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTenantRegion } from "@/hooks/useTenantRegion";

interface RecentReport {
	id: number;
	name: string;
	category: string;
	createdAt: string;
	createdBy: { email: string };
	fields?: string[];
}

export default function NewReportBuilderPage() {
        const router = useRouter();
        const [showWizard, setShowWizard] = useState(false);
        const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
        const [loadingReports, setLoadingReports] = useState<boolean>(true);
        const { template, regionName } = useTenantRegion();

	useEffect(() => {
		const fetchReports = async () => {
			try {
				const res = await fetch("/api/reports", { cache: "no-store" });
				if (!res.ok) throw new Error("Failed to load reports");
				const data = await res.json();
				setRecentReports(Array.isArray(data) ? data.slice(0, 5) : []);
			} catch (e) {
				console.error("Failed to fetch recent reports", e);
			} finally {
				setLoadingReports(false);
			}
		};
		fetchReports();
	}, []);

	const handleCreateReport = async (config: ReportConfig) => {
		try {
			console.log("🚀 Saving report with config:", config);
			const requestBody = {
				name: config.name,
				category: config.template?.category || "custom",
				selectedFields: config.selectedFields,
				filters: config.filters,
				sort: config.sort,
				templateId: config.template?.id,
			};
			const response = await fetch("/api/reports/save", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody),
			});
			const result = await response.json();
			if (response.ok && result.success) {
				const reportId = result.id || result.data?.id;
				if (reportId) router.push(`/reports/preview?reportId=${reportId}`);
				else router.push(`/reports/preview?fields=${config.selectedFields.join(",")}`);
			} else {
				alert(`Failed to save report: ${result.error || result.details || "Unknown error"}`);
			}
		} catch (error) {
			console.error("💥 Error saving report:", error);
			alert(`Error saving report: ${error instanceof Error ? error.message : "Network error"}`);
		}
		setShowWizard(false);
	};

	const handleCancelWizard = () => setShowWizard(false);

	if (showWizard) {
		return (
			<ReportWizard onComplete={handleCreateReport} onCancel={handleCancelWizard} />
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white shadow-sm border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center">
							<ChartBarIcon className="h-8 w-8 text-blue-600 mr-3" />
							<div>
								<h1 className="text-xl font-semibold text-gray-900">HR Report Builder</h1>
								<p className="text-sm text-gray-600">Create insightful reports from your HR data</p>
							</div>
						</div>
						<Button onClick={() => setShowWizard(true)} className="flex items-center">
							<PlusIcon className="w-4 h-4 mr-2" />
							Create Report
						</Button>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Welcome Section */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
					<div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
						<ChartBarIcon className="w-12 h-12 text-blue-600" />
					</div>
					<h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to the HR Report Builder</h2>
					<p className="text-gray-600 mb-8 max-w-2xl mx-auto">
						Create powerful, customized reports from your HR data. Our intuitive wizard guides you through
						selecting fields, applying filters, and configuring your perfect report in just a few steps.
					</p>
					<Button onClick={() => setShowWizard(true)} size="lg" className="flex items-center mx-auto">
						<PlusIcon className="w-5 h-5 mr-2" />
						Create Report
					</Button>
				</div>

				{/* Recent Reports Section */}
				<div className="mt-8">
					<h3 className="text-lg font-medium text-gray-900 mb-4">Recent Reports</h3>
                                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                                {loadingReports ? (
                                                        <EmptyState
                                                                tone="brand"
                                                                title="Loading recent reports"
                                                                description="We’re fetching the latest analytics your team saved."
                                                                className="py-10"
                                                        />
                                                ) : recentReports.length === 0 ? (
                                                        <EmptyState
                                                                tone="brand"
                                                                title="No reports yet"
                                                                description="Kick things off with a template so stakeholders get insights fast."
                                                                className="py-10"
                                                                guidance={[
                                                                        template === "NZ"
                                                                                ? "Start with the NZ Payroll Summary template to reconcile PAYE before payday."
                                                                                : template === "AU"
                                                                                ? "Start with the AU Award Compliance template to audit allowances and overtime."
                                                                                : template === "UK"
                                                                                ? "Start with the UK Payroll Starter template to prep HMRC exports."
                                                                                : "Start with the People Analytics template to track headcount and turnover trends.",
                                                                        regionName
                                                                                ? `Share your first dashboard with ${regionName} leaders so everyone sees the same numbers.`
                                                                                : "Share your first dashboard with leaders so everyone sees the same numbers.",
                                                                ]}
                                                                action={{
                                                                        label: "Launch the builder",
                                                                        onClick: () => setShowWizard(true),
                                                                }}
                                                        />
                                                ) : (
                                                        <ul className="divide-y divide-gray-200">
								{recentReports.map((r) => (
									<li key={r.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
										<div>
											<div className="font-medium text-gray-900">{r.name}</div>
											<div className="text-sm text-gray-500">{new Date(r.createdAt).toLocaleString()} • {r.category}</div>
										</div>
										<div className="flex items-center gap-2">
											<Button variant="outline" onClick={() => router.push(`/reports/preview?reportId=${r.id}`)}>Open</Button>
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
