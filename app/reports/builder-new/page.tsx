"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ReportWizard, { ReportConfig } from "@/components/reports/ReportWizard";
import Button from "@/components/ui/Button";
import { PlusIcon, ChartBarIcon } from "@heroicons/react/24/outline";

export default function NewReportBuilderPage() {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);

  const handleCreateReport = async (config: ReportConfig) => {
    try {
      // Save the report configuration
      const response = await fetch("/api/reports/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: config.name,
          category: config.template?.category || "custom",
          selectedFields: config.selectedFields,
          filters: config.filters,
          sort: config.sort,
          templateId: config.template?.id,
        }),
      });

      if (response.ok) {
        const savedReport = await response.json();
        // Navigate to the preview page with the saved report
        router.push(`/reports/preview?reportId=${savedReport.id}`);
      } else {
        console.error("Failed to save report");
        // Handle error - show toast or modal
      }
    } catch (error) {
      console.error("Error saving report:", error);
      // Handle error - show toast or modal
    }
    
    setShowWizard(false);
  };

  const handleCancelWizard = () => {
    setShowWizard(false);
  };

  if (showWizard) {
    return (
      <ReportWizard
        onComplete={handleCreateReport}
        onCancel={handleCancelWizard}
      />
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
                <h1 className="text-xl font-semibold text-gray-900">
                  HR Report Builder
                </h1>
                <p className="text-sm text-gray-600">
                  Create insightful reports from your HR data
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowWizard(true)}
              className="flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Report
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
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to the HR Report Builder
          </h2>
          
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Create powerful, customized reports from your HR data. Our intuitive wizard guides you through
            selecting fields, applying filters, and configuring your perfect report in just a few steps.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">HR-Focused Fields</h3>
              <p className="text-sm text-gray-600">
                Access curated data fields organized by HR business areas like People, Employment, Time Off, and more.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Filtering</h3>
              <p className="text-sm text-gray-600">
                Apply intelligent filters with type-aware controls that adapt to your data for precise results.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Quick Templates</h3>
              <p className="text-sm text-gray-600">
                Start with pre-built templates for common HR reports or build completely custom reports from scratch.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowWizard(true)}
            size="lg"
            className="flex items-center mx-auto"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Your First Report
          </Button>
        </div>

        {/* Recent Reports Section - Placeholder for future enhancement */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Reports</h3>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-gray-500">
              Your recent reports will appear here once you start creating them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
