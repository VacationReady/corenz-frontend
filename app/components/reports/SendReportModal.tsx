"use client";

import { useState, useEffect, useMemo } from "react";
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
import { 
  Mail, 
  FileText, 
  FileSpreadsheet, 
  Users, 
  Briefcase, 
  Loader2, 
  ChevronDown, 
  ChevronRight,
  Search,
  Building2,
  UserCheck,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Department {
  id: string;
  name: string;
}

interface JobRole {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string | null;
  departmentName?: string | null;
}

interface SendReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: number;
  reportName: string;
  fields: string[];
  filters?: any[];
  filterGroup?: any;
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
  filterGroup,
  sort,
  onSuccess,
}: SendReportModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedJobRoles, setSelectedJobRoles] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [format, setFormat] = useState<"PDF" | "EXCEL">("PDF");
  const [subject, setSubject] = useState(`Report: ${reportName}`);
  const [messageBody, setMessageBody] = useState("");

  // Data state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // UI state
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"groups" | "individuals">("groups");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const employeeIdToUserId = useMemo(() => {
    return new Map(employees.map((emp) => [emp.id, emp.userId] as const));
  }, [employees]);

  useEffect(() => {
    if (isOpen) {
      fetchDepartmentsAndRoles();
    }
  }, [isOpen]);

  const fetchDepartmentsAndRoles = async () => {
    setLoadingData(true);
    try {
      const [deptRes, roleRes, empRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/job-roles"),
        fetch("/api/employees?limit=all"),
      ]);

      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(Array.isArray(deptData) ? deptData : []);
      }

      if (roleRes.ok) {
        const roleData = await roleRes.json();
        setJobRoles(Array.isArray(roleData) ? roleData : []);
      }

      if (empRes.ok) {
        const empData = await empRes.json();
        // Handle paginated response: { data: [...], pagination: {...} }
        const employeeList = empData?.data ?? (Array.isArray(empData) ? empData : []);
        setEmployees(employeeList);
      }
    } catch (error) {
      console.error("Failed to fetch departments/job roles/employees:", error);
      toast({
        title: "Error loading filters",
        description: "Failed to load departments, job roles, and employees",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Filter employees by search term
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const search = employeeSearch.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.firstName?.toLowerCase().includes(search) ||
        emp.lastName?.toLowerCase().includes(search) ||
        emp.email?.toLowerCase().includes(search)
    );
  }, [employees, employeeSearch]);

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

  const handleEmployeeToggle = (empId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(empId)
        ? prev.filter((id) => id !== empId)
        : [...prev, empId]
    );
  };

  const handleSelectAllEmployeesInDept = (deptId: string | null) => {
    const deptEmployees = employees.filter((emp) => emp.departmentId === deptId);
    const deptEmployeeIds = deptEmployees.map((e) => e.id);
    const allSelected = deptEmployeeIds.every((id) => selectedEmployees.includes(id));

    if (allSelected) {
      setSelectedEmployees((prev) => prev.filter((id) => !deptEmployeeIds.includes(id)));
    } else {
      setSelectedEmployees((prev) => [...new Set([...prev, ...deptEmployeeIds])]);
    }
  };

  const toggleDepartmentExpansion = (deptId: string) => {
    setExpandedDepartments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };

  const getEmployeesByDepartment = (deptId: string | null) => {
    return employees.filter((emp) => emp.departmentId === deptId);
  };

  const handleSubmit = async () => {
    // Validation
    if (selectedDepartments.length === 0 && selectedJobRoles.length === 0 && selectedEmployees.length === 0) {
      toast({
        title: "No recipients selected",
        description: "Please select at least one department, job role, or individual employee",
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
          employees: Array.from(
            new Set(
              selectedEmployees.map(
                (employeeId) => employeeIdToUserId.get(employeeId) ?? employeeId
              )
            )
          ),
          format,
          subject,
          messageBody,
          fields,
          filters,
          filterGroup,
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
    setSelectedEmployees([]);
    setFormat("PDF");
    setSubject(`Report: ${reportName}`);
    setMessageBody("");
    setExpandedDepartments(new Set());
    setActiveTab("groups");
    setEmployeeSearch("");
  };

  // Get total selected count for summary
  const totalRecipientCount = useMemo(() => {
    return selectedDepartments.length + selectedJobRoles.length + selectedEmployees.length;
  }, [selectedDepartments, selectedJobRoles, selectedEmployees]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-premium border-0 rounded-2xl shadow-depth-4 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Send Report via Email
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Send &quot;{reportName}&quot; to selected recipients
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loadingData ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading recipients...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("groups")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
                  activeTab === "groups"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Building2 className="w-4 h-4" />
                By Group
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("individuals")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
                  activeTab === "individuals"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <UserCheck className="w-4 h-4" />
                Individual
                {selectedEmployees.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {selectedEmployees.length}
                  </span>
                )}
              </button>
            </div>

            {/* Groups Tab Content */}
            {activeTab === "groups" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Departments */}
                  <div className="space-y-3 bg-muted/30 rounded-xl p-4 border border-border/50">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        Departments
                      </label>
                      {departments.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAllDepartments}
                          className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                          {selectedDepartments.length === departments.length
                            ? "Clear all"
                            : "Select all"}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {departments.length > 0 ? (
                        departments.map((dept) => (
                          <label
                            key={dept.id}
                            className={cn(
                              "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all",
                              selectedDepartments.includes(dept.id)
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-muted/50 border border-transparent"
                            )}
                          >
                            <Checkbox
                              id={`dept-${dept.id}`}
                              checked={selectedDepartments.includes(dept.id)}
                              onCheckedChange={() => handleDepartmentToggle(dept.id)}
                            />
                            <span className="text-sm flex-1">{dept.name}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No departments available
                        </p>
                      )}
                    </div>
                    {selectedDepartments.length > 0 && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-xs text-primary font-medium">
                          {selectedDepartments.length} department{selectedDepartments.length !== 1 ? "s" : ""} selected
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Job Roles */}
                  <div className="space-y-3 bg-muted/30 rounded-xl p-4 border border-border/50">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary" />
                        Job Roles
                      </label>
                      {jobRoles.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAllJobRoles}
                          className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                          {selectedJobRoles.length === jobRoles.length
                            ? "Clear all"
                            : "Select all"}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {jobRoles.length > 0 ? (
                        jobRoles.map((role) => (
                          <label
                            key={role.id}
                            className={cn(
                              "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all",
                              selectedJobRoles.includes(role.id)
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-muted/50 border border-transparent"
                            )}
                          >
                            <Checkbox
                              id={`role-${role.id}`}
                              checked={selectedJobRoles.includes(role.id)}
                              onCheckedChange={() => handleJobRoleToggle(role.id)}
                            />
                            <span className="text-sm flex-1">{role.name}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No job roles available
                        </p>
                      )}
                    </div>
                    {selectedJobRoles.length > 0 && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-xs text-primary font-medium">
                          {selectedJobRoles.length} role{selectedJobRoles.length !== 1 ? "s" : ""} selected
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Individuals Tab Content */}
            {activeTab === "individuals" && (
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees by name or email..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="pl-10 bg-muted/30 border-border/50"
                  />
                  {employeeSearch && (
                    <button
                      type="button"
                      onClick={() => setEmployeeSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Employee List by Department */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {departments.length > 0 ? (
                    departments.map((dept) => {
                      const deptEmployees = filteredEmployees.filter((emp) => emp.departmentId === dept.id);
                      if (deptEmployees.length === 0 && employeeSearch) return null;
                      
                      const isExpanded = expandedDepartments.has(dept.id);
                      const selectedInDept = deptEmployees.filter((e) =>
                        selectedEmployees.includes(e.id)
                      ).length;

                      return (
                        <div key={dept.id} className="bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleDepartmentExpansion(dept.id)}
                            className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span className="font-medium text-sm">{dept.name}</span>
                              <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                                {deptEmployees.length}
                              </span>
                            </div>
                            {selectedInDept > 0 && (
                              <span className="text-xs text-primary font-medium px-2 py-0.5 bg-primary/10 rounded-full">
                                {selectedInDept} selected
                              </span>
                            )}
                          </button>
                          
                          {isExpanded && (
                            <div className="border-t border-border/50">
                              {deptEmployees.length > 0 ? (
                                <div className="p-2 space-y-1">
                                  <div className="flex justify-end px-2 pb-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectAllEmployeesInDept(dept.id)}
                                      className="text-xs text-primary hover:text-primary/80 font-medium"
                                    >
                                      {selectedInDept === deptEmployees.length ? "Clear all" : "Select all"}
                                    </button>
                                  </div>
                                  {deptEmployees.map((emp) => (
                                    <label
                                      key={emp.id}
                                      className={cn(
                                        "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all",
                                        selectedEmployees.includes(emp.id)
                                          ? "bg-primary/10"
                                          : "hover:bg-muted/50"
                                      )}
                                    >
                                      <Checkbox
                                        id={`emp-${emp.id}`}
                                        checked={selectedEmployees.includes(emp.id)}
                                        onCheckedChange={() => handleEmployeeToggle(emp.id)}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                          {emp.firstName} {emp.lastName}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {emp.email}
                                        </p>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No employees in this department
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No employees available
                    </p>
                  )}
                  
                  {/* Employees without department */}
                  {(() => {
                    const unassignedEmployees = filteredEmployees.filter((emp) => !emp.departmentId);
                    if (unassignedEmployees.length === 0) return null;
                    
                    const isExpanded = expandedDepartments.has("unassigned");
                    const selectedInDept = unassignedEmployees.filter((e) =>
                      selectedEmployees.includes(e.id)
                    ).length;

                    return (
                      <div className="bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleDepartmentExpansion("unassigned")}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="font-medium text-sm text-muted-foreground">Unassigned</span>
                            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                              {unassignedEmployees.length}
                            </span>
                          </div>
                          {selectedInDept > 0 && (
                            <span className="text-xs text-primary font-medium px-2 py-0.5 bg-primary/10 rounded-full">
                              {selectedInDept} selected
                            </span>
                          )}
                        </button>
                        
                        {isExpanded && (
                          <div className="border-t border-border/50 p-2 space-y-1">
                            {unassignedEmployees.map((emp) => (
                              <label
                                key={emp.id}
                                className={cn(
                                  "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all",
                                  selectedEmployees.includes(emp.id)
                                    ? "bg-primary/10"
                                    : "hover:bg-muted/50"
                                )}
                              >
                                <Checkbox
                                  id={`emp-${emp.id}`}
                                  checked={selectedEmployees.includes(emp.id)}
                                  onCheckedChange={() => handleEmployeeToggle(emp.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {emp.firstName} {emp.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {emp.email}
                                  </p>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Format Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat("PDF")}
                  className={cn(
                    "flex items-center justify-center gap-2 h-12 rounded-xl transition-all border",
                    format === "PDF"
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/30 border-border/50 hover:bg-muted/50 text-foreground"
                  )}
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("EXCEL")}
                  className={cn(
                    "flex items-center justify-center gap-2 h-12 rounded-xl transition-all border",
                    format === "EXCEL"
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/30 border-border/50 hover:bg-muted/50 text-foreground"
                  )}
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
                  className="bg-muted/30 border-border/50"
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
                  rows={4}
                  className="bg-muted/30 border-border/50 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Use {"{firstName}"} to personalize each email
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t border-border/50 gap-2 sm:gap-0">
          {totalRecipientCount > 0 && (
            <div className="flex-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{totalRecipientCount}</span> recipient group{totalRecipientCount !== 1 ? "s" : ""} selected
            </div>
          )}
          <div className="flex gap-2">
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

