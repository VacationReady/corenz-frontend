"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import Checkbox from "@/components/ui/Checkbox";
import { useToast } from "@/hooks/use-toast";
import { Mail, FileText, FileSpreadsheet, Users, Briefcase, Loader2 } from "lucide-react";

interface Department {
  id: string;
  name: string;
}

interface JobRole {
  id: string;
  name: string;
}

interface SendReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: number;
  reportName: string;
  fields: string[];
  filters?: any[];
  sort?: any;
  onSuccess?: () => void;
}

export function SendReportModal({
  isOpen,
  onClose,
  reportId,
  reportName,
  fields,
  filters,
  sort,
  onSuccess,
}: SendReportModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedJobRoles, setSelectedJobRoles] = useState<string[]>([]);
  const [format, setFormat] = useState<"PDF" | "EXCEL">("PDF");
  const [subject, setSubject] = useState(`Report: ${reportName}`);
  const [messageBody, setMessageBody] = useState("");

  // Data state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchDepartmentsAndRoles();
    }
  }, [isOpen]);

  const fetchDepartmentsAndRoles = async () => {
    setLoadingData(true);
    try {
      const [deptRes, roleRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/job-roles"),
      ]);

      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(Array.isArray(deptData) ? deptData : []);
      }

      if (roleRes.ok) {
        const roleData = await roleRes.json();
        setJobRoles(Array.isArray(roleData) ? roleData : []);
      }
    } catch (error) {
      console.error("Failed to fetch departments/job roles:", error);
      toast({
        title: "Error loading filters",
        description: "Failed to load departments and job roles",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleDepartmentToggle = (deptId: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(deptId)
        ? prev.filter((id) => id !== deptId)
        : [...prev, deptId]
    );
  };

  const handleJobRoleToggle = (roleId: string) => {
    setSelectedJobRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSelectAllDepartments = () => {
    if (selectedDepartments.length === departments.length) {
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments(departments.map((d) => d.id));
    }
  };

  const handleSelectAllJobRoles = () => {
    if (selectedJobRoles.length === jobRoles.length) {
      setSelectedJobRoles([]);
    } else {
      setSelectedJobRoles(jobRoles.map((r) => r.id));
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (selectedDepartments.length === 0 && selectedJobRoles.length === 0) {
      toast({
        title: "No recipients selected",
        description: "Please select at least one department or job role",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please enter an email subject",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/reports/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          reportName,
          departments: selectedDepartments,
          jobRoles: selectedJobRoles,
          format,
          subject,
          messageBody,
          fields,
          filters,
          sort,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send report");
      }

      const result = await response.json();

      toast({
        title: "Report sent successfully",
        description: `Report sent to ${result.recipientCount} recipient(s)`,
      });

      onSuccess?.();
      onClose();
      resetForm();
    } catch (error) {
      console.error("Error sending report:", error);
      toast({
        title: "Failed to send report",
        description:
          error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedDepartments([]);
    setSelectedJobRoles([]);
    setFormat("PDF");
    setSubject(`Report: ${reportName}`);
    setMessageBody("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="w-5 h-5" />
            Send Report via Email
          </DialogTitle>
          <DialogDescription>
            Send &quot;{reportName}&quot; to selected departments and job roles
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Recipients Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Select Recipients
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Departments */}
                {departments.length > 0 && (
                  <div className="space-y-3 glass-subtle rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Departments</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAllDepartments}
                        className="h-auto py-1 px-2 text-xs"
                      >
                        {selectedDepartments.length === departments.length
                          ? "Deselect All"
                          : "Select All"}
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {departments.map((dept) => (
                        <div key={dept.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`dept-${dept.id}`}
                            checked={selectedDepartments.includes(dept.id)}
                            onCheckedChange={() => handleDepartmentToggle(dept.id)}
                          />
                          <label
                            htmlFor={`dept-${dept.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {dept.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedDepartments.length > 0 && (
                      <p className="text-xs text-primary font-medium">
                        ✓ {selectedDepartments.length} selected
                      </p>
                    )}
                  </div>
                )}

                {/* Job Roles */}
                {jobRoles.length > 0 && (
                  <div className="space-y-3 glass-subtle rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Job Roles
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAllJobRoles}
                        className="h-auto py-1 px-2 text-xs"
                      >
                        {selectedJobRoles.length === jobRoles.length
                          ? "Deselect All"
                          : "Select All"}
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {jobRoles.map((role) => (
                        <div key={role.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`role-${role.id}`}
                            checked={selectedJobRoles.includes(role.id)}
                            onCheckedChange={() => handleJobRoleToggle(role.id)}
                          />
                          <label
                            htmlFor={`role-${role.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {role.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedJobRoles.length > 0 && (
                      <p className="text-xs text-primary font-medium">
                        ✓ {selectedJobRoles.length} selected
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Format Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat("PDF")}
                  className={`flex items-center justify-center gap-2 h-14 rounded-xl transition-all ${
                    format === "PDF"
                      ? "bg-primary text-primary-foreground shadow-lg scale-105"
                      : "glass-subtle hover:bg-muted/50"
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("EXCEL")}
                  className={`flex items-center justify-center gap-2 h-14 rounded-xl transition-all ${
                    format === "EXCEL"
                      ? "bg-primary text-primary-foreground shadow-lg scale-105"
                      : "glass-subtle hover:bg-muted/50"
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="font-medium">Excel (CSV)</span>
                </button>
              </div>
            </div>

            {/* Email Content */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Email Content
              </h3>

              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">
                  Subject <span className="text-destructive">*</span>
                </label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                  className="glass-subtle"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">
                  Message Body <span className="text-muted-foreground">(Optional)</span>
                </label>
                <Textarea
                  id="message"
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Add a custom message (you can use {firstName} for personalization)"
                  rows={5}
                  className="glass-subtle resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Use {"{firstName}"} to personalize each email
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || loadingData}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

