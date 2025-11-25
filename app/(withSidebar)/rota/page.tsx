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
} from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import RotaCalendar from '@/components/rota/RotaCalendar';
import ShiftCard from '@/components/rota/ShiftCard';
import LaborCostSummary from '@/components/rota/LaborCostSummary';
import CreateShiftModal from '@/components/rota/CreateShiftModal';
import EditShiftModal from '@/components/rota/EditShiftModal';
import AutoScheduleWizard, { AutoScheduleResult } from '@/components/rota/AutoScheduleWizard';
import VirtualizedShiftList from '@/components/rota/VirtualizedShiftList';
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

  const [dateRange] = useState(() => ({
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
  const [shiftToEdit, setShiftToEdit] = useState<ShiftRecord | null>(null);
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

      setEmployees(
        Array.isArray(empData?.employees)
          ? empData.employees.map((emp: any) => ({
              value: emp.id,
              label: emp.User?.firstName && emp.User?.lastName
                ? `${emp.User.firstName} ${emp.User.lastName}`
                : emp.User?.name ?? 'Unnamed employee',
              meta: emp.User?.email,
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

  const handleDeleteShift = useCallback(
    async (shiftId: string) => {
      try {
        const response = await fetch(`/api/shifts/${shiftId}`, { method: 'DELETE' });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || 'Failed to delete shift');
        }

        toast({
          title: 'Shift deleted',
          description: 'The shift has been removed from the rota.',
        });
        await refresh();
        fetchConflicts();
      } catch (error) {
        toast({
          title: 'Delete failed',
          description: error instanceof Error ? error.message : 'Unable to delete shift',
          variant: 'destructive',
        });
      }
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
                  onShiftDelete={handleDeleteShift}
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
                onShiftDelete={shiftId => handleDeleteShift(shiftId)}
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
                    <dd className="text-lg font-semibold text-foreground">{summary.unpublishedCount}</dd>
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
        <DialogContent className="max-w-3xl border border-border bg-card text-card-foreground">
          {selectedShift && (
            <>
              <DialogHeader>
                <DialogTitle>Shift details</DialogTitle>
                <DialogDescription>
                  {format(new Date(selectedShift.startTime), 'EEEE, MMMM d, yyyy')}
                </DialogDescription>
              </DialogHeader>
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
          onDelete={async shiftId => {
            await handleDeleteShift(shiftId);
            setShowEditModal(false);
            setShiftToEdit(null);
          }}
        />
      )}

      <Link
        href="/rota/settings"
        className="fixed bottom-8 right-8 z-50 flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-card p-4 shadow-xl transition hover:scale-105 hover:bg-accent"
      >
        <Settings className="h-6 w-6 text-card-foreground transition duration-300 group-hover:rotate-90" />
        <span className="text-sm font-medium text-card-foreground">Settings</span>
      </Link>
    </div>
  );
}
