'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';

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
  };
  Department?: {
    name: string;
  };
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

export default function CreateShiftModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedDate,
  preselectedEmployeeId,
}: CreateShiftModalProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    employeeId: preselectedEmployeeId || '',
    departmentId: '',
    locationId: '',
    startTime: preselectedDate ? format(preselectedDate, "yyyy-MM-dd'T'09:00") : '',
    endTime: preselectedDate ? format(preselectedDate, "yyyy-MM-dd'T'17:00") : '',
    breakDuration: 30,
    role: '',
    notes: '',
    requiresConfirmation: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      fetchDepartments();
      fetchLocations();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.employeeId && formData.startTime && formData.endTime) {
      checkConflicts();
    }
  }, [formData.employeeId, formData.startTime, formData.endTime]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees?status=active');
      const data = await response.json();
      setEmployees(data.employees || []);
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
    if (!formData.employeeId || !formData.startTime || !formData.endTime) return;

    setCheckingConflicts(true);
    try {
      const params = new URLSearchParams({
        employeeId: formData.employeeId,
        startTime: formData.startTime,
        endTime: formData.endTime,
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

    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
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
        throw new Error(data.error || 'Failed to create shift');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-white/10 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Create New Shift</h2>
            <p className="text-gray-400 text-sm mt-1">Schedule a new shift for an employee</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Conflict Warning */}
          {criticalConflicts.length > 0 && (
            <div className="bg-amber-500/10 backdrop-blur-md border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-400 mb-1">
                    {criticalConflicts.length} Conflict{criticalConflicts.length !== 1 ? 's' : ''} Detected
                  </h4>
                  <div className="space-y-1">
                    {criticalConflicts.map((conflict, idx) => (
                      <p key={idx} className="text-sm text-gray-300">
                        {conflict.description}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Employee (Optional)
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned (Open Shift)</option>
              {filteredEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.User.name} {emp.Department ? `- ${emp.Department.name}` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Leave unassigned to create an open shift that employees can claim
            </p>
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
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="15"
            />
            {errors.breakDuration && (
              <p className="text-red-400 text-xs mt-1">{errors.breakDuration}</p>
            )}
          </div>

          {/* Department and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Department
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Location
              </label>
              <select
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
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
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Requires Confirmation */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="requiresConfirmation"
              checked={formData.requiresConfirmation}
              onChange={(e) => setFormData({ ...formData, requiresConfirmation: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-2 focus:ring-blue-500"
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
          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || checkingConflicts}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Shift
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
