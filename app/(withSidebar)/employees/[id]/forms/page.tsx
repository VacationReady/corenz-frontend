"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/Table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
} from "lucide-react";
import { DynamicFormRenderer } from "@/components/forms/DynamicFormRenderer";

interface FormAssignment {
  id: string;
  form: {
    id: string;
    name: string;
    description?: string;
  };
  status: string;
  dueDate?: string;
  completedAt?: string;
  assignedBy: {
    name?: string;
    firstName?: string;
    lastName?: string;
  };
}

interface FormSubmission {
  id: string;
  form: {
    id: string;
    name: string;
  };
  submittedAt: string;
  data: any;
}

export default function EmployeeFormsPage() {
  const params = useParams();
  const employeeId = params?.id ? String(params.id) : "";

  const [assignments, setAssignments] = useState<FormAssignment[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<FormAssignment | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [employeeName, setEmployeeName] = useState<string>("Employee");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignmentsRes, submissionsRes, employeeRes] = await Promise.all([
          fetch(`/api/employees/${employeeId}/form-assignments`),
          fetch(`/api/employees/${employeeId}/form-submissions`),
          fetch(`/api/employees/${employeeId}`),
        ]);

        if (assignmentsRes.ok) {
          const assignmentsData = await assignmentsRes.json();
          setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
        }

        if (submissionsRes.ok) {
          const submissionsData = await submissionsRes.json();
          setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
        }

        if (employeeRes.ok) {
          const employee = await employeeRes.json();
          const name = `${employee.user?.firstName || ""} ${employee.user?.lastName || ""}`.trim();
          setEmployeeName(name || "Employee");
        }
      } catch (error) {
        console.error("Failed to fetch forms data:", error);
        toast.error("Failed to load forms data");
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchData();
    }
  }, [employeeId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "overdue":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      completed: "default",
      pending: "secondary",
      overdue: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleFillForm = (assignment: FormAssignment) => {
    setSelectedForm(assignment);
    setIsFormDialogOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (!selectedForm) return;

    try {
      const res = await fetch(
        `/api/forms/${selectedForm.form.id}/submissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId,
            data,
            assignmentId: selectedForm.id,
          }),
        },
      );

      if (res.ok) {
        toast.success("Form submitted successfully");
        setIsFormDialogOpen(false);
        setSelectedForm(null);
        // Refresh data
        window.location.reload();
      } else {
        toast.error("Failed to submit form");
      }
    } catch (error) {
      toast.error("Failed to submit form");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No date set";
    return new Date(dateString).toLocaleDateString();
  };

  const getAssignerName = (assignedBy: FormAssignment["assignedBy"]) => {
    if (assignedBy.name) return assignedBy.name;
    if (assignedBy.firstName || assignedBy.lastName) {
      return `${assignedBy.firstName || ""} ${assignedBy.lastName || ""}`.trim();
    }
    return "Unknown";
  };

  if (loading) {
    return (
      <PageShell
        title="Forms"
        description="Employee forms and assignments"
        icon={<FileText className="w-6 h-6" />}
        breadcrumbs={{
          items: [
            { label: "Dashboard", href: "/dashboard" },
            { label: "Employees", href: "/employees" },
            { label: employeeName, href: `/employees/${employeeId}/overview` },
            { label: "Forms", isCurrentPage: true },
          ],
        }}
      >
        <PageLoader text="Loading forms..." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Forms"
      description="Employee forms and assignments"
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employees", href: "/employees" },
          { label: employeeName, href: `/employees/${employeeId}/overview` },
          { label: "Forms", isCurrentPage: true },
        ],
      }}
    >
      <div className="space-y-6">
      {/* Pending Forms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Forms (
            {assignments.filter((a) => a.status === "pending").length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.filter((a) => a.status === "pending").length === 0 ? (
            <p className="text-gray-500 text-center py-4">No pending forms</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Name</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments
                  .filter((a) => a.status === "pending")
                  .map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {assignment.form.name}
                          </div>
                          {assignment.form.description && (
                            <div className="text-sm text-gray-500">
                              {assignment.form.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(assignment.dueDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getAssignerName(assignment.assignedBy)}
                      </TableCell>
                      <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleFillForm(assignment)}
                        >
                          Fill Form
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Completed Forms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Completed Forms ({submissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No completed forms</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Name</TableHead>
                  <TableHead>Submitted Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">
                      {submission.form.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(submission.submittedAt)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge("completed")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Fill Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedForm
                ? `Fill Form: ${selectedForm.form.name}`
                : "Fill Form"}
            </DialogTitle>
          </DialogHeader>
          {selectedForm && (
            <DynamicFormRenderer
              formId={selectedForm.form.id}
              employeeId={employeeId}
              onSubmitSuccess={handleFormSubmit}
            />
          )}
        </DialogContent>
      </Dialog>
      </div>
    </PageShell>
  );
}
