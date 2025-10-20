"use client";

import { useState, useEffect, useMemo } from "react";
import { Check, Mail, Search, Filter, Users, Building, MapPin, User } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";

interface Employee {
  id: string;
  userId: string;
  name: string;
  email: string;
  department: string | null;
  departmentId: string | null;
  jobRole: string | null;
  jobRoleId: string | null;
  location: string | null;
  welcomeEmailSentAt: string | null;
  isActivated: boolean;
  status: "no_email" | "email_sent_pending" | "activated";
}

interface Department {
  id: string;
  name: string;
}

interface JobRole {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface SendWelcomeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendEmails: (employeeIds: string[]) => Promise<void>;
}

export default function SendWelcomeEmailModal({
  isOpen,
  onClose,
  onSendEmails,
}: SendWelcomeEmailModalProps) {
  const ALL_DEPARTMENTS_OPTION = "__all_departments__";
  const ALL_JOB_ROLES_OPTION = "__all_job_roles__";
  const ALL_LOCATIONS_OPTION = "__all_locations__";
  const ALL_STATUS_OPTION = "__all_status__";
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(ALL_DEPARTMENTS_OPTION);
  const [selectedJobRoleId, setSelectedJobRoleId] = useState<string>(ALL_JOB_ROLES_OPTION);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(ALL_LOCATIONS_OPTION);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS_OPTION);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeesResponse, departmentsResponse, jobRolesResponse, locationsResponse] = await Promise.all([
        fetch("/api/csv-import/employees/activation-status"),
        fetch("/api/departments"),
        fetch("/api/job-roles"),
        fetch("/api/locations"),
      ]);

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        setEmployees(employeesData.employees || []);
      }

      if (departmentsResponse.ok) {
        const departmentsData = await departmentsResponse.json();
        setDepartments(departmentsData || []);
      }

      if (jobRolesResponse.ok) {
        const jobRolesData = await jobRolesResponse.json();
        setJobRoles(jobRolesData || []);
      }

      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        setLocations(locationsData || []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load employee data");
    } finally {
      setLoading(false);
    }
  };

  // Filter employees based on search and filters
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          employee.name.toLowerCase().includes(query) ||
          employee.email.toLowerCase().includes(query) ||
          (employee.department && employee.department.toLowerCase().includes(query)) ||
          (employee.jobRole && employee.jobRole.toLowerCase().includes(query));
        
        if (!matchesSearch) return false;
      }

      // Department filter
      if (selectedDepartmentId !== ALL_DEPARTMENTS_OPTION && employee.departmentId !== selectedDepartmentId) {
        return false;
      }

      // Job role filter
      if (selectedJobRoleId !== ALL_JOB_ROLES_OPTION && employee.jobRoleId !== selectedJobRoleId) {
        return false;
      }

      // Location filter (assuming location is stored in employee data)
      if (selectedLocationId !== ALL_LOCATIONS_OPTION) {
        // This would need to be implemented based on how location is stored
        // For now, we'll skip this filter
      }

      // Status filter
      if (statusFilter !== ALL_STATUS_OPTION && employee.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [employees, searchQuery, selectedDepartmentId, selectedJobRoleId, selectedLocationId, statusFilter]);

  // Select all functionality
  const handleSelectAll = () => {
    if (selectedEmployeeIds.length === filteredEmployees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(filteredEmployees.map(emp => emp.id));
    }
  };

  // Individual selection
  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeIds(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDepartmentId(ALL_DEPARTMENTS_OPTION);
    setSelectedJobRoleId(ALL_JOB_ROLES_OPTION);
    setSelectedLocationId(ALL_LOCATIONS_OPTION);
    setStatusFilter(ALL_STATUS_OPTION);
    setSelectedEmployeeIds([]);
  };

  // Send emails to selected employees
  const handleSendEmails = async () => {
    if (selectedEmployeeIds.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }

    try {
      setSending(true);
      await onSendEmails(selectedEmployeeIds);
      toast.success(`Welcome emails sent to ${selectedEmployeeIds.length} employee${selectedEmployeeIds.length === 1 ? '' : 's'}`);
      onClose();
    } catch (error) {
      console.error("Failed to send emails:", error);
      toast.error("Failed to send welcome emails");
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: Employee["status"]) => {
    switch (status) {
      case "no_email":
        return <Badge variant="destructive">No Email</Badge>;
      case "email_sent_pending":
        return <Badge variant="secondary">Email Sent</Badge>;
      case "activated":
        return <Badge variant="default">Activated</Badge>;
      default:
        return null;
    }
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedDepartmentId !== ALL_DEPARTMENTS_OPTION ||
    selectedJobRoleId !== ALL_JOB_ROLES_OPTION ||
    selectedLocationId !== ALL_LOCATIONS_OPTION ||
    statusFilter !== ALL_STATUS_OPTION;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Welcome Emails"
      description="Select employees to send welcome emails to"
      size="xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="text-sm text-muted-foreground">
            {selectedEmployeeIds.length} of {filteredEmployees.length} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmails} 
              disabled={selectedEmployeeIds.length === 0 || sending}
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send to {selectedEmployeeIds.length} Employee{selectedEmployeeIds.length === 1 ? '' : 's'}
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span className="font-medium text-sm">Filters</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Department</label>
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_DEPARTMENTS_OPTION}>All departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        {dept.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Job Role */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Job Role</label>
              <Select value={selectedJobRoleId} onValueChange={setSelectedJobRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="All job roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_JOB_ROLES_OPTION}>All job roles</SelectItem>
                  {jobRoles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_LOCATIONS_OPTION}>All locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {location.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUS_OPTION}>All statuses</SelectItem>
                  <SelectItem value="no_email">No Email Sent</SelectItem>
                  <SelectItem value="email_sent_pending">Email Sent (Pending)</SelectItem>
                  <SelectItem value="activated">Activated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Select All */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={filteredEmployees.length > 0 && selectedEmployeeIds.length === filteredEmployees.length}
              onCheckedChange={handleSelectAll}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="font-medium">
              Select All ({filteredEmployees.length} employees)
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {selectedEmployeeIds.length} selected
          </div>
        </div>

        {/* Employee List */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-muted-foreground">Loading employees...</span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No employees found matching your filters</p>
            </div>
          ) : (
            filteredEmployees.map(employee => (
              <div
                key={employee.id}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:bg-muted/30 transition-colors"
              >
                <Checkbox
                  checked={selectedEmployeeIds.includes(employee.id)}
                  onCheckedChange={() => handleEmployeeSelect(employee.id)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium truncate">{employee.name}</div>
                    {getStatusBadge(employee.status)}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {employee.email}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    {employee.department && (
                      <span className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {employee.department}
                      </span>
                    )}
                    {employee.jobRole && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {employee.jobRole}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
