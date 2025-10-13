'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Plus, 
  Filter, 
  Send, 
  AlertTriangle,
  Sparkles,
  Download,
  ChevronDown,
} from 'lucide-react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import RotaCalendar from '@/components/rota/RotaCalendar';
import ShiftCard from '@/components/rota/ShiftCard';
import LaborCostSummary from '@/components/rota/LaborCostSummary';
import CreateShiftModal from '@/components/rota/CreateShiftModal';
import EditShiftModal from '@/components/rota/EditShiftModal';
import { toast } from '@/hooks/use-toast';

interface Shift {
  id: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  notes?: string | null;
  role?: string | null;
  attendanceStatus: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  isPublished: boolean;
  requiresConfirmation: boolean;
  confirmedAt?: string | null;
  cost?: number | null;
  employeeId?: string | null;
  employee?: {
    id: string;
    User: {
      name: string;
      email: string;
      profileImageUrl?: string | null;
    };
    Department?: {
      name: string;
    } | null;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  location?: {
    id: string;
    name: string;
    address?: string | null;
  } | null;
}

interface Conflict {
  type: 'DOUBLE_BOOKING' | 'REST_PERIOD' | 'OVERTIME' | 'UNAVAILABLE' | 'SKILL_MISMATCH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  shift1Id?: string;
  shift2Id?: string;
  employeeId: string;
  employee?: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
}

export default function RotaPage() {
  const { data: session, status } = useSession();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showCostSummary, setShowCostSummary] = useState(true);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<Date | undefined>(undefined);
  
  // Filter data
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Filter states
  const [dateRange, setDateRange] = useState({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [isPublishedFilter, setIsPublishedFilter] = useState<string>('all');

  // Selected shifts for bulk actions
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'authenticated') {
      fetchShifts();
      fetchConflicts();
      fetchDepartments();
      fetchEmployees();
    }
  }, [status, dateRange, departmentFilter, employeeFilter, isPublishedFilter]);

  const fetchShifts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      if (departmentFilter) params.append('departmentId', departmentFilter);
      if (employeeFilter) params.append('employeeId', employeeFilter);
      if (isPublishedFilter !== 'all') {
        params.append('isPublished', isPublishedFilter);
      }

      const response = await fetch(`/api/shifts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch shifts');

      const data = await response.json();
      setShifts(data.shifts || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConflicts = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      if (departmentFilter) params.append('departmentId', departmentFilter);
      if (employeeFilter) params.append('employeeId', employeeFilter);

      const response = await fetch(`/api/shifts/conflicts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch conflicts');

      const data = await response.json();
      setConflicts(data.conflicts || []);
    } catch (error) {
      console.error('Error fetching conflicts:', error);
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

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees?status=active');
      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handlePublishSelected = async () => {
    if (selectedShiftIds.size === 0) return;

    try {
      const shiftIdsArray = Array.from(selectedShiftIds);
      const response = await fetch(`/api/shifts/${shiftIdsArray[0]}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftIds: shiftIdsArray,
          notifyEmployees: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to publish shifts');

      const data = await response.json();
      toast({
        title: 'Success',
        description: data.message || `${shiftIdsArray.length} shift(s) published successfully`,
      });
      
      setSelectedShiftIds(new Set());
      fetchShifts();
    } catch (error: any) {
      console.error('Error publishing shifts:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to publish shifts',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete shift');
      }

      toast({
        title: 'Success',
        description: 'Shift deleted successfully',
      });

      fetchShifts();
      setSelectedShift(null);
      setEditingShift(null);
    } catch (error: any) {
      console.error('Error deleting shift:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete shift',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleAutoSchedule = async () => {
    toast({
      title: 'Auto-Schedule',
      description: 'AI-powered auto-scheduling is coming in Phase 6. This feature will optimize shift assignments based on availability, skills, and labor costs.',
    });
  };

  const handleExportToPayroll = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        format: 'csv',
      });

      if (departmentFilter) params.append('departmentId', departmentFilter);

      const response = await fetch(`/api/payroll/export?${params}`);
      if (!response.ok) throw new Error('Failed to export payroll data');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${format(dateRange.start, 'yyyy-MM-dd')}_${format(dateRange.end, 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'Payroll data exported successfully',
      });
    } catch (error: any) {
      console.error('Error exporting payroll:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to export payroll data',
        variant: 'destructive',
      });
    }
  };

  const handleCreateShift = () => {
    setPreselectedDate(undefined);
    setShowCreateModal(true);
  };

  const handleDateClick = (date: Date) => {
    setPreselectedDate(date);
    setShowCreateModal(true);
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShowEditModal(true);
  };

  const handleShiftSuccess = () => {
    fetchShifts();
    fetchConflicts();
  };

  // Calculate labor cost summary
  const calculateLaborCost = () => {
    let totalCost = 0;
    let regularCost = 0;
    let overtimeCost = 0;
    const departmentBreakdown = new Map<string, {
      departmentId: string;
      departmentName: string;
      cost: number;
      hours: number;
      employeeCount: number;
    }>();

    for (const shift of shifts) {
      const cost = shift.cost ? parseFloat(shift.cost.toString()) : 0;
      totalCost += cost;
      regularCost += cost; // Simplified - should calculate based on overtime threshold

      // Department breakdown
      const deptId = shift.department?.id || 'unassigned';
      const deptName = shift.department?.name || 'Unassigned';
      
      if (!departmentBreakdown.has(deptId)) {
        departmentBreakdown.set(deptId, {
          departmentId: deptId,
          departmentName: deptName,
          cost: 0,
          hours: 0,
          employeeCount: 0,
        });
      }

      const dept = departmentBreakdown.get(deptId)!;
      dept.cost += cost;
      
      const startTime = new Date(shift.startTime);
      const endTime = new Date(shift.endTime);
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) - (shift.breakDuration / 60);
      dept.hours += hours;
    }

    return {
      totalCost,
      regularCost,
      overtimeCost,
      departmentBreakdown: Array.from(departmentBreakdown.values()),
    };
  };

  const laborCostData = calculateLaborCost();

  // Get critical conflicts
  const criticalConflicts = conflicts.filter(c => c.severity === 'CRITICAL' || c.severity === 'HIGH');

  if (status === 'loading' || isLoading) {
    return (
      <div className="p-8">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 animate-pulse">
          <div className="h-8 bg-white/20 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-white/20 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 backdrop-blur-md border border-red-500/30 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-red-400">Unauthorized</h2>
          <p className="text-gray-300 mt-2">Please sign in to view the rota.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Shift Rota</h1>
          <p className="text-gray-400">
            Manage employee shifts and schedules
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-all flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          <button
            onClick={handleAutoSchedule}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Auto-Schedule
          </button>

          <button
            onClick={handleCreateShift}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Shift
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Employee
              </label>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.User.name} {emp.Department ? `- ${emp.Department.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={isPublishedFilter}
                onChange={(e) => setIsPublishedFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Shifts</option>
                <option value="true">Published Only</option>
                <option value="false">Drafts Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Warnings */}
      {criticalConflicts.length > 0 && (
        <div className="bg-amber-500/10 backdrop-blur-md border border-amber-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-400 mb-2">
                {criticalConflicts.length} Critical Conflict{criticalConflicts.length !== 1 ? 's' : ''} Detected
              </h3>
              <div className="space-y-2">
                {criticalConflicts.slice(0, 3).map((conflict, idx) => (
                  <div key={idx} className="text-sm text-gray-300">
                    <span className="font-medium">{conflict.employee?.name}:</span> {conflict.description}
                  </div>
                ))}
                {criticalConflicts.length > 3 && (
                  <button className="text-sm text-amber-400 hover:text-amber-300 font-medium">
                    View all {criticalConflicts.length} conflicts →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedShiftIds.size > 0 && (
        <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-white">
              {selectedShiftIds.size} shift{selectedShiftIds.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedShiftIds(new Set())}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-all"
              >
                Clear
              </button>
              <button
                onClick={handlePublishSelected}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Publish Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RotaCalendar
            shifts={shifts}
            conflicts={conflicts}
            onShiftClick={(shift: any) => setSelectedShift(shift)}
            onDateClick={handleDateClick}
            onShiftEdit={handleEditShift}
            onShiftDelete={handleDeleteShift}
            showActions={true}
          />
        </div>

        {/* Sidebar - Labor Cost Summary */}
        <div className="space-y-6">
          <LaborCostSummary
            data={laborCostData}
            dateRange={dateRange}
            onExport={handleExportToPayroll}
            collapsible={true}
          />
        </div>
      </div>

      {/* Selected Shift Detail Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Shift Details</h2>
                <button
                  onClick={() => setSelectedShift(null)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                >
                  ×
                </button>
              </div>
              
              <ShiftCard
                shift={selectedShift}
                onEdit={() => handleEditShift(selectedShift)}
                onDelete={() => handleDeleteShift(selectedShift.id)}
                onPublish={() => handlePublishSelected()}
                showActions={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Shift Modal */}
      <CreateShiftModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setPreselectedDate(undefined);
        }}
        onSuccess={handleShiftSuccess}
        preselectedDate={preselectedDate}
      />

      {/* Edit Shift Modal */}
      <EditShiftModal
        isOpen={showEditModal}
        shift={editingShift}
        onClose={() => {
          setShowEditModal(false);
          setEditingShift(null);
        }}
        onSuccess={handleShiftSuccess}
        onDelete={handleDeleteShift}
      />
    </div>
  );
}
