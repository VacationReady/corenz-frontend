"use client";

import { useState, useRef } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/Badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  Users,
  Building,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Clock,
  Info,
  Eye,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; errors: string[] }>;
  created: Array<{ id: string; email: string; name: string }>;
  activation?: {
    total: number;
    activated: number;
    emailsSent: number;
    permissionsChecked: number;
    managersPromoted: number;
    errors: Array<{ employeeId: string; error: string }>;
    details: Array<{
      employeeId: string;
      name: string;
      email: string;
      status: string;
      actions: string[];
    }>;
  };
}

interface ImportProgress {
  status: "idle" | "uploading" | "processing" | "completed" | "error";
  progress: number;
  message: string;
  result?: ImportResult;
}

type ImportType = "departments" | "job-roles" | "working-patterns" | "employees";

export default function CSVImportPage() {
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImportType, setSelectedImportType] = useState<ImportType>("departments");
  const [showResults, setShowResults] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showActivationOptions, setShowActivationOptions] = useState(false);
  const [activationOptions, setActivationOptions] = useState({
    sendEmails: true,
    checkPermissions: true,
    promoteManagers: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setValidationErrors(["Please select a CSV file"]);
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setValidationErrors(["File size must be less than 10MB"]);
      return;
    }

    setSelectedFile(file);
    setValidationErrors([]);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImportProgress({
      status: "uploading",
      progress: 0,
      message: "Uploading file...",
    });

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      setImportProgress({
        status: "processing",
        progress: 50,
        message: `Processing ${selectedImportType} data...`,
      });

      const response = await fetch(`/api/csv-import/${selectedImportType}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setImportProgress({
        status: "completed",
        progress: 100,
        message: "Import completed successfully!",
        result: data.results,
      });

      setShowResults(true);
      toast.success(`Import completed: ${data.results.successful} ${selectedImportType} processed`);

    } catch (error) {
      setImportProgress({
        status: "error",
        progress: 0,
        message: error instanceof Error ? error.message : "Import failed",
      });
      toast.error("Import failed");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`/api/csv-import/${selectedImportType}`);
      if (!response.ok) throw new Error("Failed to download template");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedImportType}_import_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Template downloaded successfully");
    } catch (error) {
      toast.error("Failed to download template");
    }
  };

  const handleDownloadAll = async () => {
    try {
      const response = await fetch("/api/csv-import/download-all");
      if (!response.ok) throw new Error("Failed to download templates");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "csv_import_templates.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("All templates downloaded successfully");
    } catch (error) {
      toast.error("Failed to download templates");
    }
  };

  const resetImport = () => {
    setImportProgress({
      status: "idle",
      progress: 0,
      message: "",
    });
    setSelectedFile(null);
    setShowResults(false);
    setShowActivationOptions(false);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleActivateEmployees = async () => {
    if (!importProgress.result?.created) {
      toast.error("No employees to activate");
      return;
    }

    const employeeIds = importProgress.result.created.map((emp: any) => emp.id);

    setImportProgress({
      status: "processing",
      progress: 50,
      message: "Activating employees and sending welcome emails...",
    });

    try {
      const response = await fetch("/api/csv-import/employees/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeIds,
          ...activationOptions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Activation failed");
      }

      setImportProgress({
        status: "completed",
        progress: 100,
        message: "Employee activation completed successfully!",
        result: {
          ...importProgress.result,
          activation: data.results,
        },
      });

      toast.success(
        `Activation completed: ${data.results.activated} employees activated, ${data.results.emailsSent} emails sent`
      );

    } catch (error) {
      setImportProgress({
        status: "error",
        progress: 0,
        message: error instanceof Error ? error.message : "Activation failed",
      });
      toast.error("Employee activation failed");
    }
  };

  const getImportTypeInfo = (type: ImportType) => {
    switch (type) {
      case "departments":
        return {
          title: "Departments",
          description: "Organizational structure and departments",
          icon: <Building className="h-5 w-5" />,
          fields: ["name", "description", "headEmail", "code", "active"],
          dependencies: "None - foundational data",
        };
      case "job-roles":
        return {
          title: "Job Roles",
          description: "Job titles and role definitions",
          icon: <Users className="h-5 w-5" />,
          fields: ["name", "description", "departmentName", "level", "payGrade", "active"],
          dependencies: "Requires departments to be imported first",
        };
      case "working-patterns":
        return {
          title: "Working Patterns",
          description: "Work schedules and time patterns",
          icon: <Clock className="h-5 w-5" />,
          fields: ["name", "description", "patternType", "mondayHours", "tuesdayHours", "wednesdayHours", "thursdayHours", "fridayHours", "saturdayHours", "sundayHours", "active"],
          dependencies: "None - can be imported independently",
        };
      case "employees":
        return {
          title: "Employees",
          description: "Employee personal and employment data",
          icon: <Users className="h-5 w-5" />,
          fields: [
            // Personal Information
            "firstName", "lastName", "email", "phoneNumber", "dateOfBirth", 
            "address", "city", "country", "postalCode", "nationalId", 
            "pronouns", "residencyStatus",
            // Emergency Contact
            "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship",
            // Employment Information
            "departmentName", "jobTitle", "employmentType", "contractType", 
            "startDate", "contractEndDate", "siteLocation",
            // Compensation
            "salary", "hourlyRate", "workingPatternName",
            // Banking & Tax
            "bankAccountNumber", "irdNumber", "taxCode",
            // KiwiSaver
            "kiwiSaverEnrolled", "kiwiSaverContribution",
            // Management
            "managerEmail"
          ],
          dependencies: "Requires departments, job roles, and working patterns",
        };
    }
  };

  const getStatusIcon = () => {
    switch (importProgress.status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "error":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "processing":
      case "uploading":
        return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (importProgress.status) {
      case "completed":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "processing":
      case "uploading":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <PageShell
      title="CSV Import"
      description="Import employee data, departments, and other master data via CSV files"
      breadcrumbs={breadcrumbConfigs.settingsSection("CSV Import")}
      showHomeIcon={false}
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
          <Button variant="outline" onClick={handleDownloadAll}>
            <Download className="w-4 h-4 mr-2" />
            Download All
          </Button>
          {importProgress.status !== "idle" && (
            <Button variant="outline" onClick={resetImport}>
              <X className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Import Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Select Import Type
            </CardTitle>
            <CardDescription>
              Choose the type of data you want to import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-type">Import Type</Label>
              <Select value={selectedImportType} onValueChange={(value: ImportType) => setSelectedImportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="departments">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Departments
                    </div>
                  </SelectItem>
                  <SelectItem value="job-roles">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Job Roles
                    </div>
                  </SelectItem>
                  <SelectItem value="working-patterns">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Working Patterns
                    </div>
                  </SelectItem>
                  <SelectItem value="employees">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Employees
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Import Type Info */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-3">
                {getImportTypeInfo(selectedImportType).icon}
                <div className="flex-1">
                  <h4 className="font-medium">{getImportTypeInfo(selectedImportType).title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {getImportTypeInfo(selectedImportType).description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Dependencies:</strong> {getImportTypeInfo(selectedImportType).dependencies}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Import Instructions
            </CardTitle>
            <CardDescription>
              Follow these steps to import {getImportTypeInfo(selectedImportType).title.toLowerCase()} data via CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Start Option */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Download className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Quick Start</h4>
                  <p className="text-sm text-blue-700 mb-2">
                    New to CSV imports? Use the "Download All" button above to get all templates at once with detailed instructions.
                  </p>
                  <p className="text-xs text-blue-600">
                    Includes: Departments → Job Roles → Working Patterns → Employees (in correct order)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Download Template</h4>
                  <p className="text-sm text-muted-foreground">
                    Get the CSV template with all required fields
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary">2</span>
                </div>
                <div>
                  <h4 className="font-medium">Fill Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Add {getImportTypeInfo(selectedImportType).title.toLowerCase()} information to the CSV file
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary">3</span>
                </div>
                <div>
                  <h4 className="font-medium">Upload File</h4>
                  <p className="text-sm text-muted-foreground">
                    Select and upload your completed CSV file
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary">4</span>
                </div>
                <div>
                  <h4 className="font-medium">Review & Import</h4>
                  <p className="text-sm text-muted-foreground">
                    Review validation results and complete import
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
            <CardDescription>
              Select a CSV file containing employee data to import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                ref={fileInputRef}
                disabled={importProgress.status === "processing" || importProgress.status === "uploading"}
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={!selectedFile || validationErrors.length > 0 || importProgress.status === "processing" || importProgress.status === "uploading"}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import {getImportTypeInfo(selectedImportType).title}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import Progress */}
        {importProgress.status !== "idle" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon()}
                Import Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={getStatusColor()}>{importProgress.message}</span>
                  <span className="text-muted-foreground">{importProgress.progress}%</span>
                </div>
                <Progress value={importProgress.progress} className="w-full" />
              </div>

              {importProgress.status === "completed" && importProgress.result && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {importProgress.result.successful}
                      </div>
                      <div className="text-sm text-muted-foreground">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {importProgress.result.failed}
                      </div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {importProgress.result.total}
                      </div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                  </div>

                  {/* Employee Activation Options */}
                  {selectedImportType === "employees" && importProgress.result.created && importProgress.result.created.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium">Employee Activation</h4>
                          <p className="text-sm text-muted-foreground">
                            Activate imported employees and send welcome emails
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowActivationOptions(!showActivationOptions)}
                        >
                          {showActivationOptions ? "Hide Options" : "Show Options"}
                        </Button>
                      </div>

                      {showActivationOptions && (
                        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="sendEmails"
                                checked={activationOptions.sendEmails}
                                onChange={(e) =>
                                  setActivationOptions(prev => ({
                                    ...prev,
                                    sendEmails: e.target.checked,
                                  }))
                                }
                                className="rounded"
                              />
                              <label htmlFor="sendEmails" className="text-sm font-medium">
                                Send activation emails
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="checkPermissions"
                                checked={activationOptions.checkPermissions}
                                onChange={(e) =>
                                  setActivationOptions(prev => ({
                                    ...prev,
                                    checkPermissions: e.target.checked,
                                  }))
                                }
                                className="rounded"
                              />
                              <label htmlFor="checkPermissions" className="text-sm font-medium">
                                Assign default permissions
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="promoteManagers"
                                checked={activationOptions.promoteManagers}
                                onChange={(e) =>
                                  setActivationOptions(prev => ({
                                    ...prev,
                                    promoteManagers: e.target.checked,
                                  }))
                                }
                                className="rounded"
                              />
                              <label htmlFor="promoteManagers" className="text-sm font-medium">
                                Auto-promote employees with direct reports to manager
                              </label>
                            </div>
                          </div>

                          <Button
                            onClick={handleActivateEmployees}
                            className="w-full"
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            Activate {importProgress.result.created.length} Employees
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Activation Results */}
                  {importProgress.result.activation && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-green-600 mb-2">Activation Results:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-600">
                            {importProgress.result.activation.activated}
                          </div>
                          <div className="text-xs text-muted-foreground">Activated</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-blue-600">
                            {importProgress.result.activation.emailsSent}
                          </div>
                          <div className="text-xs text-muted-foreground">Emails Sent</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-purple-600">
                            {importProgress.result.activation.managersPromoted}
                          </div>
                          <div className="text-xs text-muted-foreground">Managers Promoted</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-orange-600">
                            {importProgress.result.activation.permissionsChecked}
                          </div>
                          <div className="text-xs text-muted-foreground">Permissions Checked</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Import Results */}
        {showResults && importProgress.result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Import Results
              </CardTitle>
              <CardDescription>
                Detailed results of the CSV import process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Successfully Created Employees */}
              {importProgress.result.created.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Successfully Created ({importProgress.result.created.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {importProgress.result.created.map((employee, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded border">
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">{employee.email}</div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Created</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {importProgress.result.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Errors ({importProgress.result.errors.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {importProgress.result.errors.map((error, index) => (
                      <div key={index} className="p-2 bg-red-50 rounded border">
                        <div className="font-medium text-red-800">Row {error.row}</div>
                        <ul className="text-sm text-red-700 mt-1">
                          {error.errors.map((err, errIndex) => (
                            <li key={errIndex} className="list-disc list-inside">{err}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Supported Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Supported Fields
            </CardTitle>
            <CardDescription>
              Complete list of fields that can be imported for {getImportTypeInfo(selectedImportType).title.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                {getImportTypeInfo(selectedImportType).icon}
                {getImportTypeInfo(selectedImportType).title} Fields
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {getImportTypeInfo(selectedImportType).fields.map((field, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    • {field}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
