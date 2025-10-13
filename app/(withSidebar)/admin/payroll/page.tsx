"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Eye, FileSpreadsheet, FileJson, FileText } from "lucide-react";
import { format as formatDate } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

type Department = {
  id: string;
  name: string;
};

type PayrollSummary = {
  totalEmployees: number;
  totalHours: number;
  totalCost: number;
};

export default function PayrollExportPage() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [exportFormat, setExportFormat] = useState<"CSV" | "EXCEL" | "JSON">("CSV");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [includeBreaks, setIncludeBreaks] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartments();
    // Set default date range (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay);
    setEndDate(lastDay);
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments");
      if (!response.ok) throw new Error("Failed to fetch departments");
      const data = await response.json();
      setDepartments(data.departments || data);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  };

  const handleGeneratePreview = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    try {
      setPreviewLoading(true);
      const response = await fetch("/api/payroll/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          format: "JSON",
          departmentId: departmentId || undefined,
          includeBreaks,
          includeNotes,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate preview");

      const data = await response.json();
      setSummary({
        totalEmployees: data.totalEmployees,
        totalHours: data.totalHours,
        totalCost: data.totalCost,
      });

      toast({
        title: "Preview Generated",
        description: `Found ${data.totalEmployees} employees with ${data.totalHours.toFixed(2)} total hours`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate preview",
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadExport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/payroll/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          format: exportFormat,
          departmentId: departmentId || undefined,
          includeBreaks,
          includeNotes,
        }),
      });

      if (!response.ok) throw new Error("Failed to export payroll data");

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = exportFormat === "CSV" ? "csv" : exportFormat === "EXCEL" ? "xlsx" : "json";
      a.download = `payroll_export_${startDate.toISOString().split("T")[0]}_${endDate.toISOString().split("T")[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: `Payroll data exported as ${exportFormat}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export payroll data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFormatIcon = () => {
    switch (exportFormat) {
      case "CSV":
        return <FileText className="w-5 h-5" />;
      case "EXCEL":
        return <FileSpreadsheet className="w-5 h-5" />;
      case "JSON":
        return <FileJson className="w-5 h-5" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Payroll Export
        </h1>
        <p className="text-muted-foreground">
          Export approved timesheet data for payroll processing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2">
          <Card className="backdrop-blur-md bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle>Export Configuration</CardTitle>
              <CardDescription>Configure the payroll export parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? formatDate(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? formatDate(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Format Selector */}
              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select value={exportFormat} onValueChange={(v: string) => setExportFormat(v as any)}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      {getFormatIcon()}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CSV">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        CSV (Comma Separated Values)
                      </div>
                    </SelectItem>
                    <SelectItem value="EXCEL">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        Excel (.xlsx)
                      </div>
                    </SelectItem>
                    <SelectItem value="JSON">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-4 h-4" />
                        JSON (JavaScript Object Notation)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Department Filter */}
              <div className="space-y-2">
                <Label>Department (Optional)</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="includeBreaks">Include Break Duration</Label>
                  <Switch
                    id="includeBreaks"
                    checked={includeBreaks}
                    onCheckedChange={setIncludeBreaks}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="includeNotes">Include Notes</Label>
                  <Switch
                    id="includeNotes"
                    checked={includeNotes}
                    onCheckedChange={setIncludeNotes}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleGeneratePreview}
                  disabled={previewLoading || !startDate || !endDate}
                  className="flex-1"
                >
                  {previewLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  Generate Preview
                </Button>

                <Button
                  onClick={handleDownloadExport}
                  disabled={loading || !startDate || !endDate}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Panel */}
        <div className="space-y-6">
          <Card className="backdrop-blur-md bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle>Export Summary</CardTitle>
              <CardDescription>Preview of export data</CardDescription>
            </CardHeader>
            <CardContent>
              {summary ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-muted-foreground mb-1">Total Employees</p>
                    <p className="text-3xl font-bold">{summary.totalEmployees}</p>
                  </div>

                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-sm text-muted-foreground mb-1">Total Hours</p>
                    <p className="text-3xl font-bold">{summary.totalHours.toFixed(2)}</p>
                  </div>

                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-muted-foreground mb-1">Total Cost</p>
                    <p className="text-3xl font-bold">
                      ${summary.totalCost.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Generate a preview to see summary statistics</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Info */}
          <Card className="backdrop-blur-md bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-sm">Export Information</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p>• Only approved timesheets are included</p>
              <p>• Overtime calculated based on company settings</p>
              <p>• All exports are audit logged</p>
              <p>• Date range is inclusive</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
