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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDateForCreate, setSelectedDateForCreate] = useState<Date | undefined>();
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null);
  
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
      alert(data.message);
      
      setSelectedShiftIds(new Set());
      fetchShifts();
    } catch (error) {
      console.error('Error publishing shifts:', error);
      alert('Failed to publish shifts');
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete shift');

      fetchShifts();
      setSelectedShift(null);
    } catch (error) {
      console.error('Error deleting shift:', error);
      alert('Failed to delete shift');
    }
  };

  const handleAutoSchedule = async () => {
    try {
      const response = await fetch('/api/shifts/auto-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
          departmentId: departmentFilter || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Auto-schedule not yet implemented');
      }

      const data = await response.json();
      alert(`Auto-scheduled ${data.shiftsCreated} shifts`);
      fetchShifts();
    } catch (error) {
      alert('Auto-schedule feature coming soon!');
    }
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
      <div className="w-full min-h-screen bg-content-panel p-8">
        <div className="bg-card backdrop-blur-md border border-border rounded-xl p-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="w-full min-h-screen bg-content-panel p-8">
        <div className="bg-destructive/10 backdrop-blur-md border border-destructive/30 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-destructive">Unauthorized</h2>
          <p className="text-muted-foreground mt-2">Please sign in to view the rota.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-content-panel">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10">
        <div
          className="relative overflow-hidden rounded-b-3xl border border-white/40 bg-gradient-to-r from-primary/10 via-sky-100/40 to-transparent shadow-xl backdrop-blur-sm dark:border-slate-800/80 dark:from-primary/30 dark:via-slate-900/80 before:pointer-events-none before:absolute before:-inset-px before:bg-[radial-gradient(circle_at_top_left,var(--tw-gradient-stops))] before:from-primary/40 before:via-primary/0 before:to-transparent before:opacity-60 before:blur-3xl before:content-[''] after:pointer-events-none after:absolute after:-inset-32 after:bg-[conic-gradient(from_90deg_at_50%_50%,var(--tw-gradient-stops))] after:from-transparent after:via-primary/30 after:to-transparent after:opacity-30 after:blur-3xl after:animate-[spin_20s_linear_infinite] after:content-['']"
        >
          <div className="relative z-10 px-8 py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center text-primary">
                  <h1 className="text-3xl font-bold text-foreground">Shift Rota</h1>
                </div>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Manage employee shifts and schedules
                </p>
              </div>

              <div className="md:self-end">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 rounded-lg bg-card hover:bg-accent border border-border text-card-foreground font-medium transition-all flex items-center gap-2 shadow-md"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <button
                    onClick={handleAutoSchedule}
                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Auto-Schedule
                  </button>

                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Shift
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-6">
        {/* Filters Panel */}
      {showFilters && (
        <div className="bg-card backdrop-blur-md border border-border rounded-xl p-6 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring shadow-sm"
              >
                <option value="" className="bg-background text-foreground">All Departments</option>
                {/* TODO: Load departments dynamically */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Employee
              </label>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              >
                <option value="" className="bg-background text-foreground">All Employees</option>
                {/* TODO: Load employees dynamically */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Status
              </label>
              <select
                value={isPublishedFilter}
                onChange={(e) => setIsPublishedFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              >
                <option value="all" className="bg-background text-foreground">All Shifts</option>
                <option value="true" className="bg-background text-foreground">Published Only</option>
                <option value="false" className="bg-background text-foreground">Drafts Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Warnings */}
      {criticalConflicts.length > 0 && (
        <div className="bg-amber-500/10 backdrop-blur-md border border-amber-500/30 rounded-xl p-6 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-600 mb-2">
                {criticalConflicts.length} Critical Conflict{criticalConflicts.length !== 1 ? 's' : ''} Detected
              </h3>
              <div className="space-y-2">
                {criticalConflicts.slice(0, 3).map((conflict, idx) => (
                  <div key={idx} className="text-sm text-card-foreground font-medium">
                    <span className="font-medium">{conflict.employee?.name}:</span> {conflict.description}
                  </div>
                ))}
                {criticalConflicts.length > 3 && (
                  <button className="text-sm text-amber-600 hover:text-amber-700 font-medium">
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
        <div className="bg-primary/10 backdrop-blur-md border border-primary/30 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="text-card-foreground">
              {selectedShiftIds.size} shift{selectedShiftIds.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedShiftIds(new Set())}
                className="px-4 py-2 rounded-lg bg-card hover:bg-accent border border-border text-card-foreground font-medium transition-all"
              >
                Clear
              </button>
              <button
                onClick={handlePublishSelected}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all flex items-center gap-2"
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
            onDateClick={(date: Date) => {
              setSelectedDateForCreate(date);
              setShowCreateModal(true);
            }}
            onShiftEdit={(shift: any) => {
              setShiftToEdit(shift);
              setShowEditModal(true);
            }}
            onShiftDelete={handleDeleteShift}
            showActions={true}
          />
        </div>

        {/* Sidebar - Labor Cost Summary */}
        <div className="space-y-6">
          <LaborCostSummary
            data={laborCostData}
            dateRange={dateRange}
            onExport={() => {/* TODO: Export to payroll */}}
            collapsible={true}
          />
        </div>
      </div>
      </div>

      {/* Selected Shift Detail Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-card-foreground">Shift Details</h2>
                <button
                  onClick={() => setSelectedShift(null)}
                  className="p-2 rounded-lg bg-accent hover:bg-accent/80 text-card-foreground transition-all"
                >
                  ×
                </button>
              </div>
              
              <ShiftCard
                shift={selectedShift}
                onEdit={() => {
                  setShiftToEdit(selectedShift);
                  setShowEditModal(true);
                  setSelectedShift(null);
                }}
                onDelete={() => handleDeleteShift(selectedShift.id)}
                onPublish={async () => {
                  try {
                    const response = await fetch(`/api/shifts/${selectedShift.id}/publish`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ notifyEmployees: true }),
                    });
                    if (response.ok) {
                      alert('Shift published successfully');
                      fetchShifts();
                      setSelectedShift(null);
                    }
                  } catch (error) {
                    alert('Failed to publish shift');
                  }
                }}
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
          setSelectedDateForCreate(undefined);
        }}
        onSuccess={() => {
          fetchShifts();
          fetchConflicts();
        }}
        preselectedDate={selectedDateForCreate}
      />

      {/* Edit Shift Modal */}
      {shiftToEdit && (
        <EditShiftModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setShiftToEdit(null);
          }}
          onSuccess={() => {
            fetchShifts();
            fetchConflicts();
          }}
          shift={shiftToEdit}
        />
      )}
    </div>
  );
}
