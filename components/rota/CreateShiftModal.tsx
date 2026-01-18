'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, AlertTriangle, Loader2, Search, Check, ChevronsUpDown, User, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedDate?: Date;
  preselectedEmployeeId?: string;
}

interface Employee {
  id: string;
  User: {
    name: string;
    email: string;
    profileImageUrl?: string | null;
  };
  Department?: {
    name: string;
  };
  departmentId?: string | null;
  locationId?: string | null;
  workingPatternType?: 'STANDARD' | 'SHIFT_BASED' | 'FLEXIBLE' | 'COMPRESSED' | null;
  workingPatternName?: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface RotaGroup {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  roles: string[];
  Location?: { name: string };
  Department?: { name: string };
  _count: {
    Members: number;
  };
}

interface GroupMember {
  id: string;
  employeeId: string;
  assignedRoles: string[];
  Employee: Employee;
}

interface Conflict {
  type: string;
  severity: string;
  description: string;
}
interface ShiftFormData {
  employeeIds: string[];
  departmentId: string;
  locationId: string;
  rotaGroupId: string;
  selectedRole: string;
  startTime: string;
  endTime: string;
  breakDuration: number | '';
  notes: string;
  requiresConfirmation: boolean;
}

// Searchable Multi-Select Component for Employees
interface EmployeeMultiSelectProps {
  employees: Employee[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

function EmployeeMultiSelect({
  employees,
  selectedIds,
  onChange,
  placeholder = 'Select employees...',
  disabled = false,
  loading = false,
}: EmployeeMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;

    const name = (emp.User && emp.User.name ? emp.User.name : '').toLowerCase();
    const email = (emp.User && emp.User.email ? emp.User.email : '').toLowerCase();
    const departmentName = (emp.Department && emp.Department.name ? emp.Department.name : '').toLowerCase();

    return (
      name.includes(query) ||
      email.includes(query) ||
      departmentName.includes(query)
    );
  });

  const toggleEmployee = useCallback((employeeId: string) => {
    if (selectedIds.includes(employeeId)) {
      onChange(selectedIds.filter(id => id !== employeeId));
    } else {
      onChange([...selectedIds, employeeId]);
    }
  }, [selectedIds, onChange]);

  const selectedEmployees = employees.filter(emp => selectedIds.includes(emp.id));

  const removeEmployee = (employeeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter(id => id !== employeeId));
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 100);
            }
          }
        }}
        disabled={disabled || loading}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select employees"
        className={cn(
          "w-full min-h-[44px] px-3 py-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border text-left flex items-center gap-2",
          "transition-all duration-200 ease-out",
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/60 hover:bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
          isOpen && 'border-primary ring-2 ring-primary/40 bg-card'
        )}
      >
        {loading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading employees...
          </span>
        ) : selectedEmployees.length === 0 ? (
          <span className="text-muted-foreground flex items-center gap-2">
            <Users className="w-4 h-4" />
            {placeholder}
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5 flex-1">
            {selectedEmployees.map(emp => {
              const displayName = (emp.User && emp.User.name) || (emp.User && emp.User.email) || 'Unknown';
              return (
                <span
                  key={emp.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-medium animate-in fade-in zoom-in-95 duration-200"
                >
                  {displayName}
                  <button
                    type="button"
                    onClick={(e) => removeEmployee(emp.id, e)}
                    className="ml-0.5 hover:text-primary-foreground hover:bg-primary rounded-full p-0.5 transition-colors duration-150"
                    aria-label={`Remove ${displayName}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <ChevronsUpDown className={cn(
          "w-4 h-4 text-muted-foreground shrink-0 ml-auto transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown with animations */}
      <div
        className={cn(
          "absolute z-50 w-full mt-2 rounded-xl bg-card border border-border shadow-depth-4 overflow-hidden",
          "transition-all duration-200 ease-out origin-top",
          isOpen 
            ? "opacity-100 scale-100 translate-y-0" 
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        )}
        role="listbox"
        aria-label="Employee list"
      >
        {/* Search Input */}
        <div className="p-3 border-b border-border bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
              aria-label="Search employees"
            />
          </div>
        </div>

        {/* Employee List */}
        <div className="max-h-64 overflow-y-auto overscroll-contain">
          {filteredEmployees.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              {employees.length === 0 ? 'No employees available' : 'No employees match your search'}
            </div>
          ) : (
            <>
              {/* Unassigned option */}
              <button
                type="button"
                onClick={() => onChange([])}
                role="option"
                aria-selected={selectedIds.length === 0}
                className={cn(
                  "w-full px-3 py-3 flex items-center gap-3 text-left transition-all duration-150",
                  selectedIds.length === 0
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-muted/50'
                )}
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center ring-2 ring-border">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">Open Shift (Unassigned)</div>
                  <div className="text-xs text-muted-foreground">Employees can claim this shift</div>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150",
                  selectedIds.length === 0 
                    ? "border-primary bg-primary text-primary-foreground" 
                    : "border-border"
                )}>
                  {selectedIds.length === 0 && <Check className="w-3 h-3" />}
                </div>
              </button>

              <div className="h-px bg-border mx-3 my-1" />

              {/* Employee options */}
              {filteredEmployees.map((emp, index) => {
                const isSelected = selectedIds.includes(emp.id);
                const displayName = (emp.User && emp.User.name) || (emp.User && emp.User.email) || 'Unknown';
                const initial = displayName.charAt(0).toUpperCase();

                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => toggleEmployee(emp.id)}
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "w-full px-3 py-3 flex items-center gap-3 text-left transition-all duration-150",
                      isSelected
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted/50'
                    )}
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-sm font-semibold shrink-0 shadow-sm">
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{displayName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {emp.Department?.name || (emp.User && emp.User.email) || ''}
                      </div>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150",
                      isSelected 
                        ? "border-primary bg-primary text-primary-foreground scale-110" 
                        : "border-border"
                    )}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer with selection count */}
        {selectedIds.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">
              {selectedIds.length} employee{selectedIds.length !== 1 ? 's' : ''} selected
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-primary hover:text-primary/80 font-medium transition-colors duration-150 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateShiftModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedDate,
  preselectedEmployeeId,
}: CreateShiftModalProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [rotaGroups, setRotaGroups] = useState<RotaGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [shiftBasedOnly, setShiftBasedOnly] = useState(true); // Default to only showing shift-based workers

  // Form state - now supports multiple employees
  const [formData, setFormData] = useState<ShiftFormData>({
    employeeIds: preselectedEmployeeId ? [preselectedEmployeeId] : [] as string[],
    departmentId: '',
    locationId: '',
    rotaGroupId: '',
    selectedRole: '',
    startTime: preselectedDate ? format(preselectedDate, "yyyy-MM-dd'T'09:00") : '',
    endTime: preselectedDate ? format(preselectedDate, "yyyy-MM-dd'T'17:00") : '',
    breakDuration: 30,
    notes: '',
    requiresConfirmation: false,
  });

  // When the modal is opened with a preselected date (e.g. by clicking a day in the rota
  // calendar), pre-fill the start/end times so the user only needs to tweak the time.
  useEffect(() => {
    if (isOpen && preselectedDate) {
      setFormData(prev => ({
        ...prev,
        startTime: format(preselectedDate, "yyyy-MM-dd'T'09:00"),
        endTime: format(preselectedDate, "yyyy-MM-dd'T'17:00"),
      }));
    }
  }, [isOpen, preselectedDate]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      fetchDepartments();
      fetchLocations();
      fetchRotaGroups();
    }
  }, [isOpen, shiftBasedOnly]);

  useEffect(() => {
    if (formData.rotaGroupId) {
      fetchGroupMembers(formData.rotaGroupId);
    } else {
      setGroupMembers([]);
    }
  }, [formData.rotaGroupId]);

  useEffect(() => {
    if (formData.employeeIds.length > 0 && formData.startTime && formData.endTime) {
      checkConflicts();
    }
  }, [formData.employeeIds, formData.startTime, formData.endTime]);

  // Auto-populate department and location based on selected employees
  useEffect(() => {
    if (formData.employeeIds.length === 0) {
      // Don't clear when no employees - allow manual selection for open shifts
      return;
    }

    const selectedEmps = employees.filter(emp => formData.employeeIds.includes(emp.id));
    if (selectedEmps.length === 0) return;

    // Get unique department and location IDs from selected employees
    const departmentIds = [...new Set(selectedEmps.map(e => e.departmentId).filter(Boolean))];
    const locationIds = [...new Set(selectedEmps.map(e => e.locationId).filter(Boolean))];

    // Auto-set department if all selected employees share the same department
    if (departmentIds.length === 1 && departmentIds[0]) {
      setFormData(prev => ({ ...prev, departmentId: departmentIds[0] as string }));
    } else if (departmentIds.length > 1) {
      // Multiple different departments - clear to indicate mixed selection
      setFormData(prev => ({ ...prev, departmentId: '' }));
    }

    // Auto-set location if all selected employees share the same location
    if (locationIds.length === 1 && locationIds[0]) {
      setFormData(prev => ({ ...prev, locationId: locationIds[0] as string }));
    } else if (locationIds.length > 1) {
      // Multiple different locations - clear to indicate mixed selection
      setFormData(prev => ({ ...prev, locationId: '' }));
    }
  }, [formData.employeeIds, employees]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      // Build URL with optional filter for shift-based workers
      const params = new URLSearchParams({
        status: 'active',
        limit: '100', // Fetch 100 per page (API max)
      });
      if (shiftBasedOnly) {
        params.set('workingPatternType', 'SHIFT_BASED');
      }
      
      // Fetch all pages using cursor-based pagination
      let allEmployees: any[] = [];
      let cursor: string | null = null;
      let hasMore = true;
      
      while (hasMore) {
        if (cursor) {
          params.set('cursor', cursor);
        }
        
        const response = await fetch(`/api/employees?${params}`);
        const data = await response.json();
        
        if (!response.ok) {
          console.error('Error fetching employees:', data);
          break;
        }
        
        const pageEmployees = data.data || [];
        allEmployees = [...allEmployees, ...pageEmployees];
        
        // Check if there are more pages
        hasMore = data.pagination?.hasMore || false;
        cursor = data.pagination?.cursor || null;
        
        // Safety check to prevent infinite loops
        if (!cursor || !hasMore) {
          break;
        }
      }
      
      // Transform to expected nested format for the component
      const employeeList = allEmployees.map((emp: any) => ({
        id: emp.id,
        User: {
          name: emp.firstName && emp.lastName 
            ? `${emp.firstName} ${emp.lastName}`.trim()
            : emp.User?.name || emp.email || 'Unknown',
          email: emp.email || emp.User?.email || '',
          profileImageUrl: emp.profileImageUrl || emp.User?.profileImageUrl || null,
        },
        Department: emp.departmentName 
          ? { name: emp.departmentName }
          : emp.Department || undefined,
        // Include department and location IDs for auto-population
        departmentId: emp.departmentId || null,
        locationId: emp.locationId || null,
        // Working pattern info
        workingPatternType: emp.workingPatternType || null,
        workingPatternName: emp.workingPatternName || null,
      }));
      setEmployees(employeeList);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      const data = await response.json();
      setLocations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchRotaGroups = async () => {
    try {
      const response = await fetch('/api/rota-groups');
      const data = await response.json();
      setRotaGroups(data.rotaGroups || []);
    } catch (error) {
      console.error('Error fetching rota groups:', error);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const response = await fetch(`/api/rota-groups/${groupId}/members`);
      const data = await response.json();
      setGroupMembers(data.members || []);
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  };

  const checkConflicts = async () => {
    if (formData.employeeIds.length === 0 || !formData.startTime || !formData.endTime) return;

    setCheckingConflicts(true);
    try {
      // Check conflicts for all selected employees
      const allConflicts: Conflict[] = [];
      for (const employeeId of formData.employeeIds) {
        const params = new URLSearchParams({
          employeeId,
          startTime: formData.startTime,
          endTime: formData.endTime,
        });

        const response = await fetch(`/api/shifts/conflicts?${params}`);
        const data = await response.json();
        if (data.conflicts) {
          allConflicts.push(...data.conflicts);
        }
      }
      setConflicts(allConflicts);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setCheckingConflicts(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      if (end <= start) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    const breakDurationValue = formData.breakDuration === '' ? 0 : formData.breakDuration;

    if (breakDurationValue < 0) {
      newErrors.breakDuration = 'Break duration cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      // Create shifts for each selected employee (or one unassigned shift)
      const employeeIdsToProcess = formData.employeeIds.length > 0 ? formData.employeeIds : [null];
      const results = [];
      
      for (const employeeId of employeeIdsToProcess) {
        // When creating shifts for multiple employees, use each employee's own department/location
        // This ensures the department breakdown correctly reflects each employee's department
        let shiftDepartmentId = formData.departmentId || null;
        let shiftLocationId = formData.locationId || null;
        
        if (employeeId) {
          const selectedEmployee = employees.find(emp => emp.id === employeeId);
          if (selectedEmployee) {
            // Use employee's department if available, otherwise fall back to form value
            shiftDepartmentId = selectedEmployee.departmentId || formData.departmentId || null;
            shiftLocationId = selectedEmployee.locationId || formData.locationId || null;
          }
        }
        
        const response = await fetch('/api/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: employeeId,
            departmentId: shiftDepartmentId,
            locationId: shiftLocationId,
            rotaGroupId: formData.rotaGroupId || null,
            startTime: new Date(formData.startTime).toISOString(),
            endTime: new Date(formData.endTime).toISOString(),
            breakDuration: formData.breakDuration === '' ? 0 : formData.breakDuration,
            role: formData.selectedRole || null,
            notes: formData.notes || null,
            requiresConfirmation: formData.requiresConfirmation,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create shift');
        }
        results.push(data);
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employeeIds: [],
      departmentId: '',
      locationId: '',
      rotaGroupId: '',
      selectedRole: '',
      startTime: '',
      endTime: '',
      breakDuration: 30,
      notes: '',
      requiresConfirmation: false,
    });
    setErrors({});
    setConflicts([]);
    setGroupMembers([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Filter employees by rota group and role if selected
  // If no team selected, show all employees to allow ad-hoc shift creation
  const availableEmployees = formData.rotaGroupId && formData.selectedRole
    ? groupMembers
        .filter(member => member.assignedRoles.includes(formData.selectedRole))
        .map(member => member.Employee)
    : formData.rotaGroupId
    ? groupMembers.map(member => member.Employee)
    : employees;

  const selectedGroup = rotaGroups.find(g => g.id === formData.rotaGroupId);

  const criticalConflicts = conflicts.filter(
    c => c.severity === 'CRITICAL' || c.severity === 'HIGH'
  );

  // Check if there are blocking conflicts that prevent shift creation
  const hasBlockingConflicts = criticalConflicts.length > 0;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shift-modal-title"
    >
      <div 
        className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-depth-5 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent backdrop-blur-xl border-b border-border p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 id="shift-modal-title" className="text-2xl font-bold text-foreground">Create New Shift</h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                {formData.employeeIds.length > 1 
                  ? `Scheduling ${formData.employeeIds.length} employees for the same shift`
                  : 'Schedule a shift for one or more employees'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2.5 rounded-xl bg-muted/50 hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-all duration-150"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* BLOCKING Conflict Warning - Full Width Blocker */}
          {hasBlockingConflicts && (
            <div className="relative overflow-hidden rounded-2xl border-2 border-destructive/50 shadow-lg animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300">
              {/* Red gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/20 via-destructive/10 to-destructive/5" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImRpYWdvbmFsIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0tMTAgMzBsMjAgLTIwTTAgNDBsMjAgLTIwTTEwIDUwbDIwIC0yME0yMCAwbDIwIDIwTTMwIC0xMGwyMCAyME00MCAwbDIwIDIwIiBzdHJva2U9InJnYmEoMjM5LCA2OCwgNjgsIDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNkaWFnb25hbCkiLz48L3N2Zz4=')] opacity-50" />
              
              <div className="relative p-6">
                {/* Big Icon and Title */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-destructive/30 rounded-full blur-xl animate-pulse" />
                    <div className="relative p-4 rounded-full bg-destructive/20 border-2 border-destructive/40">
                      <X className="w-8 h-8 text-destructive" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-destructive">
                      Cannot Assign This Shift
                    </h3>
                    <p className="text-sm text-destructive/80 mt-0.5">
                      {criticalConflicts.length} blocking issue{criticalConflicts.length !== 1 ? 's' : ''} must be resolved
                    </p>
                  </div>
                </div>

                {/* Conflict Details */}
                <div className="space-y-3">
                  {criticalConflicts.map((conflict, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-start gap-3 p-4 rounded-xl bg-background/80 backdrop-blur-sm border border-destructive/20"
                    >
                      <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide",
                            conflict.severity === 'CRITICAL' 
                              ? "bg-destructive text-destructive-foreground" 
                              : "bg-amber-500 text-white"
                          )}>
                            {conflict.severity}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {conflict.type.toLowerCase().replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-foreground font-medium">
                          {conflict.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Help Text */}
                <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-lg">💡</span>
                    <span>
                      <strong>To resolve:</strong> Choose a different time slot, select a different employee, 
                      or ensure there's adequate rest time between shifts.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rota Group Selection */}
          {rotaGroups.length > 0 && (
            <div className="bg-primary/5 backdrop-blur-sm border border-primary/20 rounded-xl p-5 shadow-sm">
              <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="text-lg">📍</span> Which team are you scheduling?
              </label>
              <select
                value={formData.rotaGroupId}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  rotaGroupId: e.target.value,
                  selectedRole: '',
                  employeeIds: [],
                })}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
              >
                <option value="">All Employees (No Filter)</option>
                {rotaGroups.map((group) => (
                  <optgroup key={group.id} label={`${group.icon || '📋'} ${group.name}`}>
                    <option value={group.id}>
                      {group.icon || '📋'} {group.name} ({group._count.Members} employees)
                    </option>
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <span>💡</span> Select a team to only show qualified employees for this location/role
              </p>
            </div>
          )}

          {/* Role Selection (if group selected) */}
          {formData.rotaGroupId && selectedGroup && selectedGroup.roles.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-medium text-foreground mb-2">
                Role for this Shift
              </label>
              <select
                value={formData.selectedRole}
                onChange={(e) => setFormData({ ...formData, selectedRole: e.target.value, employeeIds: [] })}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
              >
                <option value="">Select Role First</option>
                {selectedGroup.roles.map((role) => {
                  const qualifiedCount = groupMembers.filter(m => m.assignedRoles.includes(role)).length;
                  return (
                    <option key={role} value={role}>
                      {role} ({qualifiedCount} qualified)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Employee Filter Toggle */}
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span className="text-lg">👷</span> Worker Type Filter
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  {shiftBasedOnly 
                    ? 'Showing only shift-based workers (employees with variable schedules)' 
                    : 'Showing all employees including those with fixed schedules'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShiftBasedOnly(!shiftBasedOnly);
                  setFormData(prev => ({ ...prev, employeeIds: [] })); // Clear selection when toggling
                }}
                className={cn(
                  "relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background",
                  shiftBasedOnly ? "bg-primary" : "bg-muted"
                )}
                role="switch"
                aria-checked={shiftBasedOnly}
                aria-label="Filter to shift-based workers only"
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
                    shiftBasedOnly ? "translate-x-7" : "translate-x-0"
                  )}
                />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className={cn(
                "px-2 py-1 rounded-full font-medium",
                shiftBasedOnly ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}>
                Shift-based only
              </span>
              <span className="text-muted-foreground">or</span>
              <span className={cn(
                "px-2 py-1 rounded-full font-medium",
                !shiftBasedOnly ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}>
                All employees
              </span>
            </div>
          </div>

          {/* Employee Selection with Multi-Select */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Assign Employees
                {shiftBasedOnly && (
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    ({employees.length} shift-based worker{employees.length !== 1 ? 's' : ''} available)
                  </span>
                )}
              </span>
            </label>
            <EmployeeMultiSelect
              employees={availableEmployees}
              selectedIds={formData.employeeIds}
              onChange={(ids) => setFormData({ ...formData, employeeIds: ids })}
              placeholder={shiftBasedOnly 
                ? "Select shift-based employees..." 
                : "Select employees or leave empty for open shift..."}
              loading={loadingEmployees}
            />
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <span>💡</span> 
              {shiftBasedOnly 
                ? 'Only showing employees on shift-based working patterns. Toggle above to include all employees.' 
                : 'Select multiple employees to create shifts for all of them at once, or leave empty to create an open shift.'}
            </p>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Start Time <span className="text-destructive">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
                required
              />
              {errors.startTime && (
                <p className="text-destructive text-xs mt-1 animate-in fade-in duration-150">{errors.startTime}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                End Time <span className="text-destructive">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
                required
              />
              {errors.endTime && (
                <p className="text-destructive text-xs mt-1 animate-in fade-in duration-150">{errors.endTime}</p>
              )}
            </div>
          </div>

          {/* Break Duration */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Break Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.breakDuration === '' ? '' : formData.breakDuration}
              onChange={(e) => {
                const value = e.target.value;

                if (value === '') {
                  setFormData({ ...formData, breakDuration: '' });
                  return;
                }

                const parsed = parseInt(value, 10);

                setFormData({
                  ...formData,
                  breakDuration: Number.isNaN(parsed) ? '' : Math.max(0, parsed),
                });
              }}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
              min="0"
              step="15"
            />
            {errors.breakDuration && (
              <p className="text-destructive text-xs mt-1 animate-in fade-in duration-150">{errors.breakDuration}</p>
            )}
          </div>

          {/* Department and Location - Auto-populated from employee */}
          {(() => {
            // Compute unique departments and locations from selected employees
            const selectedEmps = employees.filter(emp => formData.employeeIds.includes(emp.id));
            const uniqueDepts = [...new Set(selectedEmps.map(e => e.departmentId).filter(Boolean))];
            const uniqueLocs = [...new Set(selectedEmps.map(e => e.locationId).filter(Boolean))];
            const deptNames = uniqueDepts.map(id => departments.find(d => d.id === id)?.name).filter(Boolean);
            const locNames = uniqueLocs.map(id => locations.find(l => l.id === id)?.name).filter(Boolean);
            const hasMultipleDepts = uniqueDepts.length > 1;
            const hasMultipleLocs = uniqueLocs.length > 1;
            const hasNoDepts = selectedEmps.length > 0 && uniqueDepts.length === 0;
            const hasNoLocs = selectedEmps.length > 0 && uniqueLocs.length === 0;
            
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Department
                    {formData.employeeIds.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">(from employee)</span>
                    )}
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    disabled={formData.employeeIds.length > 0}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-foreground transition-all duration-150",
                      formData.employeeIds.length > 0
                        ? "bg-muted/50 border-border cursor-not-allowed opacity-75"
                        : "bg-background border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    )}
                  >
                    <option value="">
                      {hasMultipleDepts 
                        ? `Multiple departments (${deptNames.join(', ')})` 
                        : 'No Department'}
                    </option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {formData.employeeIds.length > 0 && hasMultipleDepts && (
                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                      <span>✓</span> Each shift will use the employee's own department
                    </p>
                  )}
                  {formData.employeeIds.length > 0 && hasNoDepts && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Selected employee(s) have no department assigned
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Location
                    {formData.employeeIds.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">(from employee)</span>
                    )}
                  </label>
                  <select
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    disabled={formData.employeeIds.length > 0}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-foreground transition-all duration-150",
                      formData.employeeIds.length > 0
                        ? "bg-muted/50 border-border cursor-not-allowed opacity-75"
                        : "bg-background border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    )}
                  >
                    <option value="">
                      {hasMultipleLocs 
                        ? `Multiple locations (${locNames.join(', ')})` 
                        : 'No Location'}
                    </option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  {formData.employeeIds.length > 0 && hasMultipleLocs && (
                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                      <span>✓</span> Each shift will use the employee's own location
                    </p>
                  )}
                  {formData.employeeIds.length > 0 && hasNoLocs && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Selected employee(s) have no location assigned
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information about this shift..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150 resize-none"
            />
          </div>

          {/* Requires Confirmation */}
          <label className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border cursor-pointer hover:bg-muted/50 transition-colors duration-150">
            <input
              type="checkbox"
              id="requiresConfirmation"
              checked={formData.requiresConfirmation}
              onChange={(e) => setFormData({ ...formData, requiresConfirmation: e.target.checked })}
              className="w-5 h-5 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary/40 transition-all duration-150"
            />
            <div>
              <span className="text-sm font-medium text-foreground block">Require employee confirmation</span>
              <span className="text-xs text-muted-foreground">Shift won't become active until the employee confirms</span>
            </div>
          </label>

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 animate-in fade-in shake duration-200">
              <p className="text-destructive text-sm font-medium">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-6 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-5 py-3 rounded-xl bg-muted/50 hover:bg-muted border border-border text-foreground font-medium transition-all duration-150 hover:scale-[0.99] active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || checkingConflicts || hasBlockingConflicts}
              className={cn(
                "flex-1 px-5 py-3 rounded-xl font-medium transition-all duration-150 flex items-center justify-center gap-2",
                hasBlockingConflicts 
                  ? "bg-destructive/20 text-destructive border-2 border-destructive/30 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating{formData.employeeIds.length > 1 ? ` ${formData.employeeIds.length} shifts...` : '...'}
                </>
              ) : hasBlockingConflicts ? (
                <>
                  <X className="w-4 h-4" />
                  Blocked - Resolve Conflicts
                </>
              ) : checkingConflicts ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking availability...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {formData.employeeIds.length > 1 
                    ? `Create ${formData.employeeIds.length} Shifts` 
                    : 'Create Shift'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
