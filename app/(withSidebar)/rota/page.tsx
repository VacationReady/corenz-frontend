'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Filter,
  Loader2,
  Plus,
  Send,
  Settings,
  Sparkles,
  CalendarClock,
  Users,
  Radio,
  Building2,
  Calendar,
  Trash2,
  RefreshCw,
  Clock,
  X,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import RotaCalendar from '@/components/rota/RotaCalendar';
import ShiftCard from '@/components/rota/ShiftCard';
import LaborCostSummary from '@/components/rota/LaborCostSummary';
import CreateShiftModal from '@/components/rota/CreateShiftModal';
import EditShiftModal from '@/components/rota/EditShiftModal';
import DeleteShiftModal from '@/components/rota/DeleteShiftModal';
import AutoScheduleWizard, { AutoScheduleResult } from '@/components/rota/AutoScheduleWizard';
import VirtualizedShiftList from '@/components/rota/VirtualizedShiftList';
import ViewFullDayModal from '@/components/rota/ViewFullDayModal';
import {
  usePaginatedShifts,
  ShiftRecord,
  ShiftDepartmentBreakdownEntry,
} from '@/hooks/usePaginatedShifts';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

// Rota Groups types
interface RotaGroup {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  roles: string[];
  Location?: { id: string; name: string };
  Department?: { id: string; name: string };
  _count: {
    Members: number;
    Shifts: number;
    ShiftRequirements: number;
  };
}

// Live Attendance types
interface EmployeeStatus {
  id: string;
  name: string;
  email: string;
  department?: string;
  status: 'CLOCKED_IN' | 'CLOCKED_OUT';
  clockInTime?: string;
  hoursWorked?: number;
}

interface LiveAttendanceData {
  summary: {
    totalEmployees: number;
    totalClockedIn: number;
    totalClockedOut: number;
    attendanceRate: string;
  };
  employees: EmployeeStatus[];
  timestamp: string;
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
  } | null;
}

type ViewMode = 'week' | 'month' | 'list';

interface FilterOption {
  value: string;
  label: string;
  meta?: string;
}

interface FilterComboboxProps {
  label: string;
  placeholder: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
}

function FilterCombobox({ label, placeholder, options, value, onChange, isLoading }: FilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(option => option.value === value);

  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isLoading}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No matches found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  key="all"
                  onSelect={() => {
                    onChange('');
                    setOpen(false);
                  }}
                >
                  <span>All {label.toLowerCase()}</span>
                  {!value && <Check className="ml-auto h-4 w-4" />}
                </CommandItem>
                {options.map(option => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <span>{option.label}</span>
                    {option.meta && (
                      <span className="ml-auto text-xs text-muted-foreground">{option.meta}</span>
                    )}
                    {value === option.value && <Check className="ml-2 h-4 w-4" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function RotaPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState(() => ({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  }));
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [isPublishedFilter, setIsPublishedFilter] = useState<'all' | 'true' | 'false'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<ShiftRecord | null>(null);
  const [shiftToDelete, setShiftToDelete] = useState<ShiftRecord | null>(null);
  const [selectedDateForCreate, setSelectedDateForCreate] = useState<Date | undefined>();
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
  const [autoScheduleOpen, setAutoScheduleOpen] = useState(false);
  const [departments, setDepartments] = useState<FilterOption[]>([]);
  const [employees, setEmployees] = useState<FilterOption[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isConflictsLoading, setIsConflictsLoading] = useState(false);
  const [conflictInspectorOpen, setConflictInspectorOpen] = useState(false);
  
  // Rota Groups panel state
  const [rotaGroupsPanelOpen, setRotaGroupsPanelOpen] = useState(false);
  const [rotaGroups, setRotaGroups] = useState<RotaGroup[]>([]);
  const [loadingRotaGroups, setLoadingRotaGroups] = useState(false);
  
  // Live Attendance panel state
  const [liveAttendancePanelOpen, setLiveAttendancePanelOpen] = useState(false);
  const [liveAttendanceData, setLiveAttendanceData] = useState<LiveAttendanceData | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  
  // View Full Day modal state
  const [viewFullDayOpen, setViewFullDayOpen] = useState(false);
  const [viewFullDayDate, setViewFullDayDate] = useState<Date | null>(null);
  const [viewFullDayShifts, setViewFullDayShifts] = useState<ShiftRecord[]>([]);
  
  // Publishing all shifts state
  const [isPublishingAll, setIsPublishingAll] = useState(false);

  const {
    shifts,
    summary,
    departmentBreakdown,
    pagination,
    isLoading,
    isLoadingMore,
    hasMore,
    size,
    setSize,
    refresh,
  } = usePaginatedShifts({
    startDate: dateRange.start,
    endDate: dateRange.end,
    departmentId: departmentFilter || undefined,
    employeeId: employeeFilter || undefined,
    isPublished: isPublishedFilter,
    pageSize: viewMode === 'list' ? 100 : 60,
  });

  const loadFilterOptions = useCallback(async () => {
    try {
      setIsLoadingFilters(true);
      const [deptResponse, empResponse] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/employees?status=active'),
      ]);

      if (!deptResponse.ok || !empResponse.ok) {
        throw new Error('Unable to load filter data');
      }

      const [deptData, empData] = await Promise.all([
        deptResponse.json(),
        empResponse.json(),
      ]);

      setDepartments(
        Array.isArray(deptData)
          ? deptData.map((dept: any) => ({ value: dept.id, label: dept.name, meta: dept.code }))
          : []
      );

      // API returns { data: [...], pagination: {...} } with flat employee objects
      const employeeList = empData?.data || empData?.employees || [];
      setEmployees(
        Array.isArray(employeeList)
          ? employeeList.map((emp: any) => ({
              value: emp.id,
              label: emp.firstName && emp.lastName
                ? `${emp.firstName} ${emp.lastName}`
                : emp.User?.name ?? emp.email ?? 'Unnamed employee',
              meta: emp.email || emp.User?.email,
            }))
          : []
      );
    } catch (error) {
      console.error(error);
      toast({
        title: 'Filters unavailable',
        description: 'We could not load departments or employees. Try refreshing the page.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingFilters(false);
    }
  }, [toast]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadFilterOptions();
    }
  }, [status, loadFilterOptions]);

  const fetchConflicts = useCallback(async () => {
    if (status !== 'authenticated') return;

    setIsConflictsLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      if (departmentFilter) params.append('departmentId', departmentFilter);
      if (employeeFilter) params.append('employeeId', employeeFilter);

      const response = await fetch(`/api/shifts/conflicts?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conflicts');
      }

      const data = await response.json();
      setConflicts(data.conflicts || []);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Conflict detection failed',
        description: 'We were unable to retrieve the latest conflicts.',
        variant: 'destructive',
      });
    } finally {
      setIsConflictsLoading(false);
    }
  }, [status, dateRange.start, dateRange.end, departmentFilter, employeeFilter, toast]);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  // Fetch rota groups when panel opens
  const fetchRotaGroups = useCallback(async () => {
    setLoadingRotaGroups(true);
    try {
      const response = await fetch('/api/rota-groups');
      const data = await response.json();
      setRotaGroups(data.rotaGroups || []);
    } catch (error) {
      console.error('Error fetching rota groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rota groups',
        variant: 'destructive',
      });
    } finally {
      setLoadingRotaGroups(false);
    }
  }, [toast]);

  useEffect(() => {
    if (rotaGroupsPanelOpen) {
      fetchRotaGroups();
    }
  }, [rotaGroupsPanelOpen, fetchRotaGroups]);

  // Fetch live attendance data when panel opens
  const fetchLiveAttendance = useCallback(async () => {
    setLoadingAttendance(true);
    try {
      const response = await fetch('/api/time-tracking/live');
      const data = await response.json();
      setLiveAttendanceData(data);
    } catch (error) {
      console.error('Error fetching live attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendance data',
        variant: 'destructive',
      });
    } finally {
      setLoadingAttendance(false);
    }
  }, [toast]);

  useEffect(() => {
    if (liveAttendancePanelOpen) {
      fetchLiveAttendance();
      // Auto-refresh every 30 seconds when panel is open
      const interval = setInterval(fetchLiveAttendance, 30000);
      return () => clearInterval(interval);
    }
  }, [liveAttendancePanelOpen, fetchLiveAttendance]);

  const handleDeleteRotaGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rota group?')) return;
    
    try {
      const response = await fetch(`/api/rota-groups/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete');
      }
      setRotaGroups(groups => groups.filter(g => g.id !== id));
      toast({ title: 'Rota group deleted' });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const laborCostData = useMemo(() => {
    if (!summary) {
      return {
        totalCost: 0,
        regularCost: 0,
        overtimeCost: 0,
        departmentBreakdown: [] as Array<{
          departmentId: string;
          departmentName: string;
          cost: number;
          hours: number;
          employeeCount: number;
        }>,
      };
    }

    const averageRate = summary.scheduledHours > 0 ? summary.totalCost / summary.scheduledHours : 0;
    const overtimeCost = averageRate * summary.overtimeHours;

    return {
      totalCost: summary.totalCost,
      regularCost: Math.max(summary.totalCost - overtimeCost, 0),
      overtimeCost,
      departmentBreakdown: departmentBreakdown.map((entry: ShiftDepartmentBreakdownEntry) => ({
        departmentId: entry.departmentId,
        departmentName: entry.departmentName,
        cost: entry.cost,
        hours: entry.hours,
        employeeCount: entry.employeeCount,
      })),
    };
  }, [summary, departmentBreakdown]);

  const criticalConflicts = useMemo(
    () => conflicts.filter(conflict => conflict.severity === 'HIGH' || conflict.severity === 'CRITICAL'),
    [conflicts]
  );

  const toggleShiftSelection = useCallback((shiftId: string) => {
    setSelectedShiftIds(prev => {
      const next = new Set(prev);
      if (next.has(shiftId)) {
        next.delete(shiftId);
      } else {
        next.add(shiftId);
      }
      return next;
    });
  }, []);

  const handlePublishSelected = useCallback(async () => {
    if (selectedShiftIds.size === 0) return;

    const ids = Array.from(selectedShiftIds);
    try {
      const response = await fetch(`/api/shifts/${ids[0]}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftIds: ids, notifyEmployees: true }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to publish shifts');
      }

      const data = await response.json();
      toast({
        title: 'Shifts published',
        description: data.message ?? `${ids.length} shifts published successfully`,
      });
      setSelectedShiftIds(new Set());
      await refresh();
      fetchConflicts();
    } catch (error) {
      toast({
        title: 'Publish failed',
        description: error instanceof Error ? error.message : 'Unable to publish the selected shifts',
        variant: 'destructive',
      });
    }
  }, [selectedShiftIds, refresh, fetchConflicts, toast]);

  // Publish all unpublished shifts in the current view
  const handlePublishAll = useCallback(async () => {
    // Get all unpublished shift IDs from current shifts (excluding virtual shifts from working patterns)
    // Virtual shifts have IDs starting with "virtual-"
    const unpublishedShiftIds = shifts
      .filter(shift => !shift.isPublished && !shift.id.startsWith('virtual-'))
      .map(shift => shift.id);

    if (unpublishedShiftIds.length === 0) {
      toast({
        title: 'No shifts to publish',
        description: 'All shifts in the current view are already published.',
      });
      return;
    }

    setIsPublishingAll(true);
    try {
      const response = await fetch(`/api/shifts/${unpublishedShiftIds[0]}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftIds: unpublishedShiftIds, notifyEmployees: true }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to publish shifts');
      }

      const data = await response.json();
      toast({
        title: 'All shifts published!',
        description: data.message ?? `${unpublishedShiftIds.length} shift${unpublishedShiftIds.length > 1 ? 's' : ''} published and employees notified.`,
      });
      await refresh();
      fetchConflicts();
    } catch (error) {
      toast({
        title: 'Publish failed',
        description: error instanceof Error ? error.message : 'Unable to publish shifts',
        variant: 'destructive',
      });
    } finally {
      setIsPublishingAll(false);
    }
  }, [shifts, refresh, fetchConflicts, toast]);

  const openDeleteModal = useCallback(
    (shiftId: string) => {
      // Find the shift from the list to pass full data to the modal
      const shift = shifts.find(s => s.id === shiftId);
      if (shift) {
        setShiftToDelete(shift);
        setShowDeleteModal(true);
      }
    },
    [shifts]
  );

  const handleDeleteSuccess = useCallback(
    async () => {
      toast({
        title: 'Shift deleted',
        description: 'The shift has been removed from the rota.',
      });
      await refresh();
      fetchConflicts();
      setShowDeleteModal(false);
      setShiftToDelete(null);
      // Also close the shift details dialog if it's open
      setSelectedShift(null);
    },
    [refresh, fetchConflicts, toast]
  );

  const handleLoadMore = useCallback(async () => {
    if (hasMore) {
      await setSize(size + 1);
    }
  }, [hasMore, setSize, size]);

  const handleAutoScheduleComplete = useCallback(
    async (result: AutoScheduleResult) => {
      toast({
        title: 'Schedule generated',
        description: `Assigned ${result.assignments.length} shifts automatically`,
      });
      await refresh();
      fetchConflicts();
    },
    [toast, refresh, fetchConflicts]
  );

  const clearSelection = useCallback(() => setSelectedShiftIds(new Set()), []);

  const handleViewFullDay = useCallback((date: Date, dayShifts: ShiftRecord[]) => {
    setViewFullDayDate(date);
    setViewFullDayShifts(dayShifts);
    setViewFullDayOpen(true);
  }, []);

  if (status === 'loading' || (isLoading && size === 0)) {
    return (
      <div className="w-full min-h-screen bg-content-panel p-8">
        <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="w-full min-h-screen bg-content-panel p-8">
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-destructive">Unauthorized</h2>
          <p className="text-muted-foreground mt-2">Please sign in to view the rota.</p>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Rota & Shifts', isCurrentPage: true },
  ];

  return (
    <div className="w-full min-h-screen bg-content-panel">
      <div className="sticky top-0 z-10">
        <div className="relative overflow-hidden rounded-b-3xl border border-white/30 bg-gradient-to-r from-primary/10 via-sky-100/40 to-transparent shadow-xl backdrop-blur-sm dark:border-slate-800/80 dark:from-primary/30 dark:via-slate-900/80">
          <div className="relative z-10 px-8 py-6">
            {/* Breadcrumbs */}
            <div className="mb-4">
              <Breadcrumb items={breadcrumbItems} showHomeIcon={true} />
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <Link
                  href="/dashboard"
                  className="mt-1 p-2 rounded-lg bg-card/50 hover:bg-card border border-border text-muted-foreground hover:text-foreground transition-all"
                  aria-label="Back to dashboard"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-7 w-7 text-primary" />
                    <h1 className="text-3xl font-bold text-foreground">Shift Rota</h1>
                  </div>
                  <p className="text-muted-foreground mt-1">Confidently schedule warehouse and office teams at scale.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowFilters(prev => !prev)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground shadow-md transition hover:bg-accent"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
                <button
                  onClick={() => setRotaGroupsPanelOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground shadow-md transition hover:bg-accent"
                >
                  <Users className="h-4 w-4" />
                  Teams
                </button>
                <button
                  onClick={() => setLiveAttendancePanelOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground shadow-md transition hover:bg-accent"
                >
                  <Radio className="h-4 w-4" />
                  Live
                  {liveAttendanceData && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-green-500 text-white text-xs font-bold">
                      {liveAttendanceData.summary.totalClockedIn}
                    </span>
                  )}
                </button>
                <div className="flex rounded-lg border border-border bg-background p-1">
                  {(['week', 'month', 'list'] as ViewMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 py-1 text-sm font-medium capitalize transition ${
                        viewMode === mode
                          ? 'rounded-md bg-primary text-primary-foreground shadow'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setAutoScheduleOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition hover:bg-primary/90"
                >
                  <Sparkles className="h-4 w-4" />
                  Auto-schedule
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Create shift
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {showFilters && (
          <div className="rounded-xl border border-border bg-card/80 p-6 shadow-lg">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FilterCombobox
                label="Department"
                placeholder="All departments"
                options={departments}
                value={departmentFilter}
                onChange={setDepartmentFilter}
                isLoading={isLoadingFilters}
              />
              <FilterCombobox
                label="Employee"
                placeholder="All employees"
                options={employees}
                value={employeeFilter}
                onChange={setEmployeeFilter}
                isLoading={isLoadingFilters}
              />
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'true', label: 'Published' },
                    { value: 'false', label: 'Drafts' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setIsPublishedFilter(option.value as 'all' | 'true' | 'false')}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                        isPublishedFilter === option.value
                          ? 'bg-primary text-primary-foreground shadow'
                          : 'border border-border bg-background text-foreground hover:border-primary/40'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {criticalConflicts.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-amber-600">
                    {criticalConflicts.length} high-severity conflict{criticalConflicts.length > 1 ? 's' : ''} detected
                  </h3>
                  <button
                    className="text-sm font-medium text-amber-600 hover:text-amber-700"
                    onClick={() => setConflictInspectorOpen(true)}
                  >
                    View all conflicts →
                  </button>
                </div>
                <div className="space-y-1 text-sm text-amber-900">
                  {criticalConflicts.slice(0, 3).map(conflict => (
                    <p key={`${conflict.employeeId}-${conflict.shift1Id ?? conflict.shift2Id ?? conflict.description}`}>
                      <span className="font-medium">{conflict.employee?.name ?? 'Unassigned'}:</span> {conflict.description}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedShiftIds.size > 0 && (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-medium text-primary-foreground">
                {selectedShiftIds.size} shift{selectedShiftIds.size > 1 ? 's' : ''} selected
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={clearSelection}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Clear
                </button>
                <button
                  onClick={handlePublishSelected}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                  Publish & notify
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {viewMode === 'list' ? (
              <div className="space-y-4">
                <VirtualizedShiftList
                  shifts={shifts}
                  onShiftClick={shift => setSelectedShift(shift)}
                  onShiftEdit={shift => {
                    setShiftToEdit(shift);
                    setShowEditModal(true);
                  }}
                  onShiftDelete={openDeleteModal}
                  selectedShiftIds={selectedShiftIds}
                  onToggleSelect={toggleShiftSelection}
                  emptyState={
                    <div className="text-center space-y-2 text-muted-foreground">
                      <p>No shifts match your filters.</p>
                      <p className="text-sm">Adjust filters or create a new shift to begin scheduling.</p>
                    </div>
                  }
                />
                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading more
                      </>
                    ) : (
                      'Load more shifts'
                    )}
                  </button>
                )}
              </div>
            ) : (
              <RotaCalendar
                shifts={shifts as any}
                conflicts={conflicts}
                view={viewMode}
                onViewChange={(newView) => setViewMode(newView)}
                onShiftClick={shift => setSelectedShift(shift as ShiftRecord)}
                onDateClick={date => {
                  setSelectedDateForCreate(date);
                  setShowCreateModal(true);
                }}
                onShiftEdit={shift => {
                  setShiftToEdit(shift as ShiftRecord);
                  setShowEditModal(true);
                }}
                onShiftDelete={openDeleteModal}
                onViewFullDay={(date, dayShifts) => handleViewFullDay(date, dayShifts as ShiftRecord[])}
                onDateRangeChange={(start, end) => setDateRange({ start, end })}
                showActions
                hideViewToggle
              />
            )}
          </div>

          <div className="space-y-6">
            <LaborCostSummary
              data={laborCostData}
              dateRange={dateRange}
              collapsible
              onExport={() => toast({ title: 'Export coming soon', description: 'Payroll export is under construction.' })}
            />
            {summary && (
              <div className="rounded-xl border border-border bg-card/80 p-5 shadow">
                <h3 className="text-sm font-semibold text-foreground">Coverage snapshot</h3>
                <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Published</dt>
                    <dd className="text-lg font-semibold text-foreground">{summary.publishedCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Draft</dt>
                    <dd className={`text-lg font-semibold ${summary.unpublishedCount > 0 ? 'text-amber-500' : 'text-foreground'}`}>
                      {summary.unpublishedCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Scheduled hours</dt>
                    <dd className="text-lg font-semibold text-foreground">{summary.scheduledHours.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Overtime hours</dt>
                    <dd className="text-lg font-semibold text-foreground">{summary.overtimeHours.toFixed(1)}</dd>
                  </div>
                </dl>
                {summary.unpublishedCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-3">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {summary.unpublishedCount} unpublished shift{summary.unpublishedCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    <Button
                      onClick={handlePublishAll}
                      disabled={isPublishingAll}
                      className="w-full"
                      variant="default"
                    >
                      {isPublishingAll ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Publish all shifts
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Employees will be notified of their schedules
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AutoScheduleWizard
        open={autoScheduleOpen}
        onOpenChange={setAutoScheduleOpen}
        defaultRange={dateRange}
        departmentId={departmentFilter || undefined}
        onCompleted={handleAutoScheduleComplete}
      />

      <Dialog open={Boolean(selectedShift)} onOpenChange={open => !open && setSelectedShift(null)}>
        <DialogContent className="max-w-3xl p-0 gap-0 border-0 bg-transparent shadow-none overflow-hidden">
          {selectedShift && (
            <>
              <ShiftCard
                shift={selectedShift}
                onEdit={() => {
                  setShiftToEdit(selectedShift);
                  setShowEditModal(true);
                  setSelectedShift(null);
                }}
                onDelete={() => {
                  openDeleteModal(selectedShift.id);
                  setSelectedShift(null); // Close the details dialog so delete modal is visible
                }}
                onPublish={async () => {
                  try {
                    const response = await fetch(`/api/shifts/${selectedShift.id}/publish`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ notifyEmployees: true }),
                    });
                    if (!response.ok) {
                      const data = await response.json().catch(() => null);
                      throw new Error(data?.error || 'Failed to publish shift');
                    }
                    toast({ title: 'Shift published' });
                    await refresh();
                    fetchConflicts();
                    setSelectedShift(null);
                  } catch (error) {
                    toast({
                      title: 'Publish failed',
                      description: error instanceof Error ? error.message : 'Unable to publish shift',
                      variant: 'destructive',
                    });
                  }
                }}
                showActions
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={conflictInspectorOpen} onOpenChange={setConflictInspectorOpen}>
        <DialogContent className="max-w-2xl border border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Conflict log</DialogTitle>
            <DialogDescription>
              Review all detected compliance and availability conflicts for this period.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[420px] space-y-3">
            {conflicts.length === 0 && (
              <p className="text-sm text-muted-foreground">No conflicts detected.</p>
            )}
            {conflicts.map(conflict => (
              <div
                key={`${conflict.employeeId}-${conflict.shift1Id ?? conflict.shift2Id ?? conflict.description}`}
                className="rounded-lg border border-border bg-background/60 p-3"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{conflict.employee?.name ?? 'Unassigned'}</span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{conflict.severity}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{conflict.description}</p>
              </div>
            ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <CreateShiftModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedDateForCreate(undefined);
        }}
        onSuccess={async () => {
          await refresh();
          fetchConflicts();
        }}
        preselectedDate={selectedDateForCreate}
      />

      {shiftToEdit && (
        <EditShiftModal
          isOpen={showEditModal}
          shift={shiftToEdit as any}
          onClose={() => {
            setShowEditModal(false);
            setShiftToEdit(null);
          }}
          onSuccess={async () => {
            await refresh();
            fetchConflicts();
          }}
          onDelete={shiftId => {
            openDeleteModal(shiftId);
            setShowEditModal(false);
            setShiftToEdit(null);
          }}
        />
      )}

      <DeleteShiftModal
        isOpen={showDeleteModal}
        shift={shiftToDelete}
        onClose={() => {
          setShowDeleteModal(false);
          setShiftToDelete(null);
        }}
        onSuccess={handleDeleteSuccess}
      />

      {/* Rota Groups Panel */}
      <Sheet open={rotaGroupsPanelOpen} onOpenChange={setRotaGroupsPanelOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Rota Groups / Teams
            </SheetTitle>
            <SheetDescription>
              Manage scheduling pools and shift teams for workforce management
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            <Link
              href="/admin/rota-groups/create"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create New Team
            </Link>

            {loadingRotaGroups ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : rotaGroups.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🏭</div>
                <p className="text-muted-foreground">No rota groups yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first team to organize employees by location and roles.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {rotaGroups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-card border border-border rounded-xl p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="text-2xl p-2 rounded-lg flex-shrink-0"
                        style={{
                          backgroundColor: group.color ? `${group.color}20` : 'rgba(59, 130, 246, 0.2)',
                        }}
                      >
                        {group.icon || '📋'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{group.name}</h4>
                        {group.Location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Building2 className="h-3 w-3" />
                            {group.Location.name}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-green-500" />
                            {group._count.Members}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-purple-500" />
                            {group._count.Shifts}
                          </span>
                        </div>
                        {group.roles?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {group.roles.slice(0, 2).map((role, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                            {group.roles.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{group.roles.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Link
                          href={`/admin/rota-groups/${group.id}/edit`}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteRotaGroup(group.id)}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Live Attendance Panel */}
      <Sheet open={liveAttendancePanelOpen} onOpenChange={setLiveAttendancePanelOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-green-500" />
              Live Attendance
            </SheetTitle>
            <SheetDescription className="flex items-center justify-between">
              <span>Real-time clock in/out status</span>
              <Button variant="outline" size="sm" onClick={fetchLiveAttendance} disabled={loadingAttendance}>
                <RefreshCw className={`h-3 w-3 mr-1 ${loadingAttendance ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {loadingAttendance && !liveAttendanceData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : liveAttendanceData ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">{liveAttendanceData.summary.totalClockedIn}</div>
                    <div className="text-xs text-muted-foreground mt-1">Clocked In</div>
                  </div>
                  <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-muted-foreground">{liveAttendanceData.summary.totalClockedOut}</div>
                    <div className="text-xs text-muted-foreground mt-1">Not Working</div>
                  </div>
                </div>

                <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{liveAttendanceData.summary.attendanceRate}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Attendance Rate</div>
                </div>

                {/* Employee List */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Currently Working</h4>
                  {liveAttendanceData.employees.filter(e => e.status === 'CLOCKED_IN').map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center gap-3 p-3 border border-border rounded-lg"
                    >
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{employee.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {employee.department || 'No Department'}
                        </p>
                      </div>
                      {employee.clockInTime && (
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(employee.clockInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {employee.hoursWorked !== undefined && (
                            <div className="text-xs font-medium text-primary">
                              {employee.hoursWorked.toFixed(1)}h
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {liveAttendanceData.employees.filter(e => e.status === 'CLOCKED_IN').length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No employees currently clocked in
                    </p>
                  )}
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Last updated: {new Date(liveAttendanceData.timestamp).toLocaleTimeString()}
                </p>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Unable to load attendance data</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Link
        href="/admin/settings/time-tracking"
        className="fixed bottom-8 right-8 z-50 flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-card p-4 shadow-xl transition hover:scale-105 hover:bg-accent"
      >
        <Settings className="h-6 w-6 text-card-foreground transition duration-300 group-hover:rotate-90" />
        <span className="text-sm font-medium text-card-foreground">Settings</span>
      </Link>

      {/* View Full Day Modal */}
      {viewFullDayDate && (
        <ViewFullDayModal
          isOpen={viewFullDayOpen}
          onClose={() => {
            setViewFullDayOpen(false);
            setViewFullDayDate(null);
            setViewFullDayShifts([]);
          }}
          date={viewFullDayDate}
          shifts={viewFullDayShifts as any}
          onShiftClick={(shift) => {
            setSelectedShift(shift as ShiftRecord);
            setViewFullDayOpen(false);
          }}
          onShiftEdit={(shift) => {
            setShiftToEdit(shift as ShiftRecord);
            setShowEditModal(true);
            setViewFullDayOpen(false);
          }}
        />
      )}
    </div>
  );
}
