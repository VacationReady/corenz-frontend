"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  ClipboardList,
  Sparkles,
  ArrowRight,
  User,
} from "lucide-react";
import { DynamicFormRenderer } from "@/components/forms/DynamicFormRenderer";
import HistoryButton from "@/components/audit/HistoryButton";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import { ProfileUpdateSuccessAnimation } from "@/components/animations";
import { cn } from "@/lib/utils";

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
  const tenantFetch = useTenantFetch();
  const params = useParams();
  const employeeId = params?.id ? String(params.id) : "";

  const [assignments, setAssignments] = useState<FormAssignment[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<FormAssignment | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [employeeName, setEmployeeName] = useState<string>("Employee");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignmentsRes, submissionsRes, employeeRes] = await Promise.all([
          tenantFetch(`/api/employees/${employeeId}/form-assignments`),
          tenantFetch(`/api/employees/${employeeId}/form-submissions`),
          tenantFetch(`/api/employees/${employeeId}`),
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
      const res = await tenantFetch(
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
        setShowSuccess(true);
        setIsFormDialogOpen(false);
        setSelectedForm(null);
        // Refresh data after animation closes
        setTimeout(() => window.location.reload(), 1500);
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

  const pendingForms = assignments.filter((a) => a.status === "pending");
  const overdueForms = assignments.filter((a) => a.status === "overdue");

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
      action={<HistoryButton employeeId={employeeId} section="forms" />}
    >
      <div className="space-y-6">
        {/* Stats Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {/* Pending */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200/50 dark:border-amber-700/30 p-5 shadow-depth-2"
          >
            <div className="absolute top-0 right-0 w-16 h-16 -mr-4 -mt-4 rounded-full bg-amber-500/10 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Pending</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">{pendingForms.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>

          {/* Completed */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border border-emerald-200/50 dark:border-emerald-700/30 p-5 shadow-depth-2"
          >
            <div className="absolute top-0 right-0 w-16 h-16 -mr-4 -mt-4 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Completed</p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">{submissions.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>

          {/* Total */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200/50 dark:border-blue-700/30 p-5 shadow-depth-2"
          >
            <div className="absolute top-0 right-0 w-16 h-16 -mr-4 -mt-4 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Assigned</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{assignments.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Pending Forms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass-card rounded-2xl overflow-hidden shadow-depth-2"
        >
          {/* Header */}
          <div className="relative px-6 py-5 border-b border-white/20 dark:border-white/10">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Pending Forms</h2>
                <p className="text-sm text-muted-foreground">{pendingForms.length} form{pendingForms.length !== 1 ? 's' : ''} awaiting completion</p>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {pendingForms.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">All caught up!</h3>
                <p className="text-sm text-muted-foreground">No pending forms to complete</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {pendingForms.map((assignment, index) => (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="group flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-border/50 hover:border-primary/30 hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{assignment.form.name}</h4>
                          {assignment.form.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{assignment.form.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1.5">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Due: {formatDate(assignment.dueDate)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="w-3.5 h-3.5" />
                              <span>By: {getAssignerName(assignment.assignedBy)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleFillForm(assignment)}
                        className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/25 transition-all duration-200 rounded-xl"
                      >
                        Fill Form
                        <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        {/* Completed Forms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="glass-card rounded-2xl overflow-hidden shadow-depth-2"
        >
          {/* Header */}
          <div className="relative px-6 py-5 border-b border-white/20 dark:border-white/10">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Completed Forms</h2>
                <p className="text-sm text-muted-foreground">{submissions.length} form{submissions.length !== 1 ? 's' : ''} submitted</p>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {submissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-slate-500 dark:text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No submissions yet</h3>
                <p className="text-sm text-muted-foreground">Completed forms will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {submissions.map((submission, index) => (
                    <motion.div
                      key={submission.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-border/50 hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{submission.form.name}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Submitted: {formatDate(submission.submittedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant="default" 
                        className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0"
                      >
                        Completed
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        {/* Form Fill Dialog */}
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                {selectedForm
                  ? selectedForm.form.name
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

        <ProfileUpdateSuccessAnimation
          isOpen={showSuccess}
          onClose={() => setShowSuccess(false)}
          fieldName="Form"
        />
      </div>
    </PageShell>
  );
}
