'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Loader2, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Shift {
  id: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  notes?: string | null;
  role?: string | null;
  employeeId?: string | null;
  departmentId?: string | null;
  locationId?: string | null;
  requiresConfirmation: boolean;
  isPublished: boolean;
  employee?: {
    id: string;
    User: {
      name: string;
    };
  } | null;
}

interface EditShiftModalProps {
  isOpen: boolean;
  shift: Shift | null;
  onClose: () => void;
  onSuccess: () => void;
  onDelete?: (shiftId: string) => void;
}

interface Employee {
  id: string;
  User: {
    name: string;
    email: string;
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

interface Conflict {
  type: string;
  severity: string;
  description: string;
}

export default function EditShiftModal({
  isOpen,
  shift,
  onClose,
  onSuccess,
  onDelete,
}: EditShiftModalProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [shiftBasedOnly, setShiftBasedOnly] = useState(true); // Default to only showing shift-based workers

  // Form state
  const [formData, setFormData] = useState({
    employeeId: '',
    departmentId: '',
    locationId: '',
    startTime: '',
    endTime: '',
    breakDuration: 30,
    role: '',
    notes: '',
    requiresConfirmation: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && shift) {
      setFormData({
        employeeId: shift.employeeId || '',
        departmentId: shift.departmentId || '',
        locationId: shift.locationId || '',
        startTime: format(new Date(shift.startTime), "yyyy-MM-dd'T'HH:mm"),
        endTime: format(new Date(shift.endTime), "yyyy-MM-dd'T'HH:mm"),
        breakDuration: shift.breakDuration,
        role: shift.role || '',
        notes: shift.notes || '',
        requiresConfirmation: shift.requiresConfirmation,
      });
      fetchEmployees();
      fetchDepartments();
      fetchLocations();
    }
  }, [isOpen, shift, shiftBasedOnly]);

  useEffect(() => {
    if (formData.employeeId && formData.startTime && formData.endTime) {
      checkConflicts();
    }
  }, [formData.employeeId, formData.startTime, formData.endTime]);

  // Auto-populate department and location based on selected employee
  useEffect(() => {
    if (!formData.employeeId) {
      // Don't clear when no employee - allow manual selection for open shifts
      return;
    }

    const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
    if (!selectedEmployee) return;

    // Auto-set department from employee
    if (selectedEmployee.departmentId) {
      setFormData(prev => ({ ...prev, departmentId: selectedEmployee.departmentId as string }));
    }

    // Auto-set location from employee
    if (selectedEmployee.locationId) {
      setFormData(prev => ({ ...prev, locationId: selectedEmployee.locationId as string }));
    }
  }, [formData.employeeId, employees]);

  const fetchEmployees = async () => {
    try {
      // Build URL with optional filter for shift-based workers
      const params = new URLSearchParams({
        status: 'active',
        limit: 'all',
      });
      if (shiftBasedOnly) {
        params.set('workingPatternType', 'SHIFT_BASED');
      }
      
      const response = await fetch(`/api/employees?${params}`);
      const data = await response.json();
      // API returns { data: [...], pagination: {...} } with flat employee objects
      // Transform to expected nested format for the component
      const employeeList = (data.data || data.employees || []).map((emp: any) => ({
        id: emp.id,
        User: {
          name: emp.firstName && emp.lastName 
            ? `${emp.firstName} ${emp.lastName}`.trim()
            : emp.User?.name || emp.email || 'Unknown',
          email: emp.email || emp.User?.email || '',
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

  const checkConflicts = async () => {
    if (!shift || !formData.employeeId || !formData.startTime || !formData.endTime) return;

    setCheckingConflicts(true);
    try {
      const params = new URLSearchParams({
        employeeId: formData.employeeId,
        startTime: formData.startTime,
        endTime: formData.endTime,
        excludeShiftId: shift.id,
      });

      const response = await fetch(`/api/shifts/conflicts?${params}`);
      const data = await response.json();
      setConflicts(data.conflicts || []);
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

    if (formData.breakDuration < 0) {
      newErrors.breakDuration = 'Break duration cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shift || !validate()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/shifts/${shift.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: formData.employeeId || null,
          departmentId: formData.departmentId || null,
          locationId: formData.locationId || null,
          startTime: new Date(formData.startTime).toISOString(),
          endTime: new Date(formData.endTime).toISOString(),
          breakDuration: formData.breakDuration,
          role: formData.role || null,
          notes: formData.notes || null,
          requiresConfirmation: formData.requiresConfirmation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update shift');
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

  const handleDelete = () => {
    if (!shift || !onDelete) return;
    // Close the edit modal and let the parent open the delete modal
    onDelete(shift.id);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      departmentId: '',
      locationId: '',
      startTime: '',
      endTime: '',
      breakDuration: 30,
      role: '',
      notes: '',
      requiresConfirmation: false,
    });
    setErrors({});
    setConflicts([]);
    setSearchQuery('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const filteredEmployees = employees.filter(emp =>
    emp.User.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.User.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const criticalConflicts = conflicts.filter(
    c => c.severity === 'CRITICAL' || c.severity === 'HIGH'
  );

  // Check if there are blocking conflicts that prevent shift updates
  const hasBlockingConflicts = criticalConflicts.length > 0;

  if (!isOpen || !shift) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Edit Shift</h2>
            <p className="text-gray-400 text-sm mt-1">
              {shift.isPublished && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 mr-2">
                  Published
                </span>
              )}
              Modify shift details
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Published Warning */}
          {shift.isPublished && (
            <div className="bg-blue-900/40 backdrop-blur-md border border-blue-600 rounded-lg p-4 shadow-md">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-400 mb-1">
                    Published Shift
                  </h4>
                  <p className="text-sm text-gray-300">
                    This shift has been published. Changes will be visible to the assigned employee immediately.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* BLOCKING Conflict Warning - Full Width Blocker */}
          {hasBlockingConflicts && (
            <div className="relative overflow-hidden rounded-xl border-2 border-red-500/60 shadow-lg">
              {/* Red gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-900/40 via-red-800/30 to-red-900/20" />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(239,68,68,0.05)_10px,rgba(239,68,68,0.05)_20px)]" />
              
              <div className="relative p-5">
                {/* Big Icon and Title */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500/30 rounded-full blur-xl animate-pulse" />
                    <div className="relative p-3 rounded-full bg-red-500/20 border-2 border-red-500/40">
                      <X className="w-7 h-7 text-red-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-400">
                      Cannot Save Changes
                    </h3>
                    <p className="text-sm text-red-300/80">
                      {criticalConflicts.length} blocking issue{criticalConflicts.length !== 1 ? 's' : ''} must be resolved
                    </p>
                  </div>
                </div>

                {/* Conflict Details */}
                <div className="space-y-2">
                  {criticalConflicts.map((conflict, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/60 border border-red-500/20"
                    >
                      <div className="p-1.5 rounded-md bg-red-500/10 shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
                            conflict.severity === 'CRITICAL' 
                              ? "bg-red-500 text-white" 
                              : "bg-amber-500 text-white"
                          }`}>
                            {conflict.severity}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">
                            {conflict.type.toLowerCase().replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-200">
                          {conflict.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Help Text */}
                <div className="mt-3 p-2.5 rounded-md bg-gray-800/50 border border-gray-700">
                  <p className="text-xs text-gray-400 flex items-start gap-2">
                    <span className="text-base">💡</span>
                    <span>
                      <strong className="text-gray-300">To resolve:</strong> Choose a different time slot, select a different employee, 
                      or ensure there's adequate rest time between shifts.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Employee Filter Toggle */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <span className="text-lg">👷</span> Worker Type Filter
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {shiftBasedOnly 
                    ? 'Showing only shift-based workers' 
                    : 'Showing all employees'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShiftBasedOnly(!shiftBasedOnly)}
                className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  shiftBasedOnly ? 'bg-blue-600' : 'bg-gray-600'
                }`}
                role="switch"
                aria-checked={shiftBasedOnly}
                aria-label="Filter to shift-based workers only"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    shiftBasedOnly ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Employee
              {shiftBasedOnly && (
                <span className="text-xs text-gray-500 font-normal ml-2">
                  ({employees.length} shift-based worker{employees.length !== 1 ? 's' : ''})
                </span>
              )}
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={shiftBasedOnly ? "Search shift-based workers..." : "Search employees..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" className="bg-gray-800 text-white">Unassigned (Open Shift)</option>
              {filteredEmployees.map((emp) => (
                <option key={emp.id} value={emp.id} className="bg-gray-800 text-white">
                  {emp.User.name} {emp.Department ? `- ${emp.Department.name}` : ''}
                </option>
              ))}
            </select>
            {shiftBasedOnly && employees.length === 0 && (
              <p className="text-xs text-amber-400 mt-2">
                No shift-based workers found. Toggle the filter above to see all employees.
              </p>
            )}
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Time <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                required
              />
              {errors.startTime && (
                <p className="text-red-400 text-xs mt-1">{errors.startTime}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Time <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                required
              />
              {errors.endTime && (
                <p className="text-red-400 text-xs mt-1">{errors.endTime}</p>
              )}
            </div>
          </div>

          {/* Break Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Break Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.breakDuration}
              onChange={(e) => setFormData({ ...formData, breakDuration: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              min="0"
              step="15"
            />
            {errors.breakDuration && (
              <p className="text-red-400 text-xs mt-1">{errors.breakDuration}</p>
            )}
          </div>

          {/* Department and Location - Auto-populated from employee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Department
                {formData.employeeId && (
                  <span className="ml-2 text-xs text-gray-500 font-normal">(from employee)</span>
                )}
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                disabled={!!formData.employeeId}
                className={`w-full px-4 py-2 rounded-lg border text-white ${
                  formData.employeeId 
                    ? 'bg-gray-800/50 border-gray-700 cursor-not-allowed opacity-75' 
                    : 'bg-gray-800 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              >
                <option value="" className="bg-gray-800 text-white">No Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id} className="bg-gray-800 text-white">
                    {dept.name}
                  </option>
                ))}
              </select>
              {formData.employeeId && !formData.departmentId && (
                <p className="text-xs text-amber-400 mt-1">
                  Selected employee has no department assigned
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Location
                {formData.employeeId && (
                  <span className="ml-2 text-xs text-gray-500 font-normal">(from employee)</span>
                )}
              </label>
              <select
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                disabled={!!formData.employeeId}
                className={`w-full px-4 py-2 rounded-lg border text-white ${
                  formData.employeeId 
                    ? 'bg-gray-800/50 border-gray-700 cursor-not-allowed opacity-75' 
                    : 'bg-gray-800 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              >
                <option value="" className="bg-gray-800 text-white">No Location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id} className="bg-gray-800 text-white">
                    {loc.name}
                  </option>
                ))}
              </select>
              {formData.employeeId && !formData.locationId && (
                <p className="text-xs text-amber-400 mt-1">
                  Selected employee has no location assigned
                </p>
              )}
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role/Position
            </label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="e.g., Server, Cashier, Manager"
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information about this shift..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {/* Requires Confirmation */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="requiresConfirmation"
              checked={formData.requiresConfirmation}
              onChange={(e) => setFormData({ ...formData, requiresConfirmation: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="requiresConfirmation" className="text-sm text-gray-300">
              Require employee confirmation before shift becomes active
            </label>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || checkingConflicts || hasBlockingConflicts}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                hasBlockingConflicts 
                  ? "bg-red-500/20 text-red-400 border-2 border-red-500/30 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : hasBlockingConflicts ? (
                <>
                  <X className="w-4 h-4" />
                  Blocked - Resolve Conflicts
                </>
              ) : checkingConflicts ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
