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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  ListChecks,
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

interface ImportFieldGroup {
  title: string;
  description?: string;
  fields: Array<{ label: string; required?: boolean; note?: string }>;
}

interface ImportTypeInfo {
  title: string;
  description: string;
  icon: JSX.Element;
  dependencies: string;
  templateFile: string;
  fieldGroups: ImportFieldGroup[];
  keyNotes?: string[];
}

const importSequence: Array<{ label: string; value: ImportType }> = [
  { label: "Departments", value: "departments" },
  { label: "Job Roles", value: "job-roles" },
  { label: "Working Patterns", value: "working-patterns" },
  { label: "Employees", value: "employees" },
];

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
  const importInfo = getImportTypeInfo(selectedImportType);

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

  const getImportTypeInfo = (type: ImportType): ImportTypeInfo => {
    switch (type) {
      case "departments":
        return {
          title: "Departments",
          description: "Organisational units, cost centres, and reporting structures",
          icon: <Building className="h-5 w-5" />,
          dependencies: "None – foundational data",
          templateFile: "01_departments_template.csv",
          fieldGroups: [
            {
              title: "Core details",
              fields: [
                { label: "name", required: true },
                { label: "description" },
                { label: "headEmail", note: "Must match an existing user" },
                { label: "code" },
                { label: "active" },
              ],
            },
          ],
        };
      case "job-roles":
        return {
          title: "Job Roles",
          description: "Job titles, levels, and pay bands for your organisation",
          icon: <Users className="h-5 w-5" />,
          dependencies: "Requires departments to be imported first",
          templateFile: "02_job_roles_template.csv",
          fieldGroups: [
            {
              title: "Role definition",
              fields: [
                { label: "name", required: true },
                { label: "departmentName", required: true, note: "Must match a department" },
                { label: "description" },
                { label: "level" },
                { label: "payGrade" },
                { label: "active" },
              ],
            },
          ],
        };
      case "working-patterns":
        return {
          title: "Working Patterns",
          description: "Standard hours templates, shifts, and flexible schedules",
          icon: <Clock className="h-5 w-5" />,
          dependencies: "None – can be imported independently",
          templateFile: "03_working_patterns_template.csv",
          keyNotes: [
            "Enter hours as decimal values (e.g. 7.5 for 7 hours 30 minutes).",
            "Leave a day blank or set to 0 if no hours are worked on that day.",
          ],
          fieldGroups: [
            {
              title: "Pattern meta",
              fields: [
                { label: "name", required: true },
                { label: "description" },
                { label: "patternType" },
                { label: "active" },
              ],
            },
            {
              title: "Weekly hours",
              description: "Number of hours worked on each day of the week",
              fields: [
                { label: "mondayHours" },
                { label: "tuesdayHours" },
                { label: "wednesdayHours" },
                { label: "thursdayHours" },
                { label: "fridayHours" },
                { label: "saturdayHours" },
                { label: "sundayHours" },
              ],
            },
          ],
        };
      case "employees":
      default:
        return {
          title: "Employees",
          description: "Full employee record including people data, payroll, compliance, and onboarding essentials",
          icon: <Users className="h-5 w-5" />,
          dependencies: "Requires departments, job roles, and working patterns",
          templateFile: "04_employees_template.csv",
          keyNotes: [
            "Keep firstName and lastName as the first two columns in every CSV to guarantee accurate matching.",
            "Dates should use the ISO format YYYY-MM-DD. Leave cells blank if data is not yet available.",
          ],
          fieldGroups: [
            {
              title: "Personal information",
              description: "Matches the Personal Info panel in the employee profile",
              fields: [
                { label: "firstName", required: true },
                { label: "lastName", required: true },
                { label: "email", required: true },
                { label: "phoneNumber" },
                { label: "dateOfBirth" },
                { label: "gender" },
                { label: "street" },
                { label: "city" },
                { label: "postcode" },
                { label: "country" },
                { label: "nationalId" },
                { label: "pronouns" },
                { label: "residencyStatus" },
              ],
            },
            {
              title: "Holiday & leave setup",
              description: "Seed Annual Leave balances ready for go-live",
              fields: [
                { label: "holidayTotalBalance" },
                { label: "holidayCarryover" },
                { label: "holidayCurrentBalance" },
                { label: "holidayYear" },
              ],
            },
            {
              title: "Employment details",
              fields: [
                { label: "departmentName", note: "Must match an imported department" },
                { label: "jobRoleName", note: "Must match an imported job role" },
                { label: "employmentType" },
                { label: "contractType" },
                { label: "siteLocation" },
                { label: "startDate" },
                { label: "contractEndDate" },
                { label: "workingPatternName", note: "Must match an imported working pattern" },
                { label: "managerEmail" },
                { label: "salaryAmount" },
                { label: "hourlyRate" },
              ],
            },
            {
              title: "Emergency contacts",
              fields: [
                { label: "emergencyContactName" },
                { label: "emergencyContactRelationship" },
                { label: "emergencyContactPhone" },
                { label: "emergencyContactEmail" },
              ],
            },
            {
              title: "Banking & payroll",
              fields: [
                { label: "bankAccountNumber" },
                { label: "irdNumber" },
                { label: "taxCode" },
                { label: "kiwiSaverEnrolled" },
                { label: "kiwiSaverContribution" },
              ],
            },
            {
              title: "Driver licence",
              fields: [
                { label: "driverLicenceType" },
                { label: "driverLicenceNumber" },
                { label: "driverLicenceIssueDate" },
                { label: "driverLicenceExpiryDate" },
              ],
            },
            {
              title: "Training & compliance",
              fields: [
                { label: "trainingCourse" },
                { label: "trainingProvider" },
                { label: "trainingDateCompleted" },
                { label: "trainingExpiryDate" },
                { label: "employmentCheckType" },
                { label: "employmentCheckDocumentNumber" },
                { label: "employmentCheckIssueDate" },
                { label: "employmentCheckExpiryDate" },
              ],
            },
          ],
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
                {importInfo.icon}
                <div className="flex-1 space-y-2">
                  <div>
                    <h4 className="font-medium">{importInfo.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {importInfo.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>
                      <strong>Dependencies:</strong> {importInfo.dependencies}
                    </span>
                    <span>
                      <strong>Template file:</strong> {importInfo.templateFile}
                    </span>
                  </div>
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
              Follow these steps to import {importInfo.title.toLowerCase()} data via CSV
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

            {importInfo.keyNotes && importInfo.keyNotes.length > 0 && (
              <Alert className="border-primary/20 bg-primary/5">
                <AlertTitle>Implementation notes</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {importInfo.keyNotes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

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
                    Add {importInfo.title.toLowerCase()} information to the CSV file
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

            <div className="border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Recommended import order
              </h4>
              <div className="flex flex-wrap gap-2 mt-3">
                {importSequence.map((step, index) => (
                  <Badge
                    key={step.value}
                    variant={step.value === selectedImportType ? "default" : "outline"}
                    className="flex items-center gap-2"
                  >
                    <span className="text-xs font-semibold">{index + 1}</span>
                    {step.label}
                  </Badge>
                ))}
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
                Import {importInfo.title}
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
              Template Field Blueprint
            </CardTitle>
            <CardDescription>
              Complete list of fields that can be imported for {importInfo.title.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-3">
              {importInfo.icon}
              <div>
                <h4 className="font-medium">{importInfo.title} template structure</h4>
                <p className="text-sm text-muted-foreground">
                  Review the grouped columns below before preparing your CSV to minimise rework during onboarding.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {importInfo.fieldGroups.map((group, index) => (
                <div key={index} className="border rounded-lg p-4 bg-muted/40 space-y-3">
                  <div>
                    <h5 className="font-medium">{group.title}</h5>
                    {group.description && (
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {group.fields.map((field, fieldIndex) => (
                      <li key={fieldIndex} className="rounded-md border bg-background/50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{field.label}</span>
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wide ${
                              field.required ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {field.required ? "Required" : "Optional"}
                          </span>
                        </div>
                        {field.note && (
                          <p className="text-xs text-muted-foreground mt-1">{field.note}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
