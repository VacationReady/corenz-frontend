"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import Button from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/Skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Users,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Building,
  Briefcase,
  Filter,
  ChevronDown,
  UserCheck,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  User?: {
    id: string;
    name: string;
    email: string;
  };
  Department?: {
    id: string;
    name: string;
  };
  JobRole?: {
    id: string;
    name: string;
  };
}

interface Department {
  id: string;
  name: string;
}

interface JobRole {
  id: string;
  name: string;
}

interface JourneyTemplate {
  id: string;
  name: string;
  status: string;
}

interface AssignJourneyDialogProps {
  journey: JourneyTemplate;
  isOpen: boolean;
  onClose: () => void;
  onAssigned?: (count: number) => void;
}

export function AssignJourneyDialog({
  journey,
  isOpen,
  onClose,
  onAssigned,
}: AssignJourneyDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [activeInstanceIds, setActiveInstanceIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [jobRoleFilter, setJobRoleFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch employees and existing instances
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, journey.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch employees, departments, job roles, and existing instances in parallel
      const [employeesRes, departmentsRes, jobRolesRes, instancesRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/departments"),
        fetch("/api/job-roles/active"),
        fetch(`/api/journeys/${journey.id}/instances?status=IN_PROGRESS&limit=1000`),
      ]);

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        // Handle both array and object with employees property
        setEmployees(Array.isArray(data) ? data : data.employees || []);
      }

      if (departmentsRes.ok) {
        const data = await departmentsRes.json();
        setDepartments(Array.isArray(data) ? data : []);
      }

      if (jobRolesRes.ok) {
        const data = await jobRolesRes.json();
        setJobRoles(Array.isArray(data) ? data : []);
      }

      if (instancesRes.ok) {
        const data = await instancesRes.json();
        const activeIds = new Set<string>();
        (data.instances || []).forEach((instance: any) => {
          if (instance.participantId) {
            activeIds.add(instance.participantId);
          }
        });
        setActiveInstanceIds(activeIds);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load employee data");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter employees based on search and filters
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      // Search filter
      const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
      const email = employee.email?.toLowerCase() || "";
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        fullName.includes(searchLower) ||
        email.includes(searchLower);

      // Department filter
      const matchesDepartment =
        departmentFilter === "all" ||
        employee.Department?.id === departmentFilter;

      // Job role filter
      const matchesJobRole =
        jobRoleFilter === "all" || employee.JobRole?.id === jobRoleFilter;

      return matchesSearch && matchesDepartment && matchesJobRole;
    });
  }, [employees, searchQuery, departmentFilter, jobRoleFilter]);

  // Separate available and unavailable employees
  const { availableEmployees, unavailableEmployees } = useMemo(() => {
    const available: Employee[] = [];
    const unavailable: Employee[] = [];

    filteredEmployees.forEach((emp) => {
      if (activeInstanceIds.has(emp.id)) {
        unavailable.push(emp);
      } else {
        available.push(emp);
      }
    });

    return { availableEmployees: available, unavailableEmployees: unavailable };
  }, [filteredEmployees, activeInstanceIds]);

  const handleSelectAll = useCallback(() => {
    const allAvailableIds = new Set(availableEmployees.map((e) => e.id));
    setSelectedIds(allAvailableIds);
  }, [availableEmployees]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleToggleEmployee = useCallback((employeeId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  }, []);

  const handleAssign = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one employee");
      return;
    }

    setIsAssigning(true);
    try {
      const response = await fetch(`/api/journeys/${journey.id}/instances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign employees");
      }

      const result = await response.json();
      toast.success(result.message || `Successfully assigned ${result.created} employees`);
      
      if (onAssigned) {
        onAssigned(result.created);
      }
      
      handleClose();
    } catch (error) {
      console.error("Error assigning employees:", error);
      toast.error(error instanceof Error ? error.message : "Failed to assign employees");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearchQuery("");
    setDepartmentFilter("all");
    setJobRoleFilter("all");
    setShowFilters(false);
    onClose();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl h-[80vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <UserPlus className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Assign Employees
              </DialogTitle>
              <DialogDescription>
                Select employees to start &quot;{journey.name}&quot;
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "gap-2",
                showFilters && "bg-gray-100"
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                showFilters && "rotate-180"
              )} />
            </Button>
          </div>

          {showFilters && (
            <div className="flex items-center gap-4 pt-2">
              <div className="flex-1">
                <Label className="text-xs text-gray-500 mb-1 block">Department</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="h-9">
                    <Building className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-gray-500 mb-1 block">Job Role</Label>
                <Select value={jobRoleFilter} onValueChange={setJobRoleFilter}>
                  <SelectTrigger className="h-9">
                    <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    {jobRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Selection stats and actions */}
        <div className="px-6 py-3 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">
              <strong>{availableEmployees.length}</strong> available
            </span>
            {unavailableEmployees.length > 0 && (
              <span className="text-amber-600 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <strong>{unavailableEmployees.length}</strong> already assigned
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              disabled={availableEmployees.length === 0}
              className="text-xs"
            >
              Select All ({availableEmployees.length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeselectAll}
              disabled={selectedIds.size === 0}
              className="text-xs"
            >
              Deselect All
            </Button>
          </div>
        </div>

        {/* Employee list */}
        <ScrollArea className="flex-1 px-6">
          {isLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No employees found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="py-4 space-y-1">
              {/* Available employees */}
              {availableEmployees.map((employee) => {
                const isSelected = selectedIds.has(employee.id);
                return (
                  <button
                    key={employee.id}
                    onClick={() => handleToggleEmployee(employee.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                      isSelected
                        ? "bg-indigo-50 border border-indigo-200"
                        : "hover:bg-gray-50 border border-transparent"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={employee.profilePicture} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-sm">
                          {getInitials(employee.firstName, employee.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">
                          {employee.firstName} {employee.lastName}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {employee.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {employee.Department && (
                          <Badge variant="secondary" className="text-xs">
                            {employee.Department.name}
                          </Badge>
                        )}
                        {employee.JobRole && (
                          <Badge variant="outline" className="text-xs">
                            {employee.JobRole.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleEmployee(employee.id)}
                      className="pointer-events-none"
                    />
                  </button>
                );
              })}

              {/* Unavailable employees (already assigned) */}
              {unavailableEmployees.length > 0 && (
                <>
                  <div className="pt-4 pb-2 px-1">
                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">
                      Already Assigned
                    </p>
                  </div>
                  {unavailableEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center gap-3 p-3 rounded-lg opacity-50 cursor-not-allowed"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={employee.profilePicture} />
                        <AvatarFallback className="bg-gray-200 text-gray-500 text-sm">
                          {getInitials(employee.firstName, employee.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-600 truncate">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 truncate">
                          {employee.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-600">
              {selectedIds.size > 0 ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <strong>{selectedIds.size}</strong> employee{selectedIds.size !== 1 ? "s" : ""} selected
                </span>
              ) : (
                <span className="text-gray-400">No employees selected</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isAssigning}>
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={selectedIds.size === 0 || isAssigning}
                className="gap-2 min-w-[140px]"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Assign {selectedIds.size > 0 ? selectedIds.size : ""} Employee{selectedIds.size !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}








