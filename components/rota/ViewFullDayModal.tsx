'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Filter,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Briefcase,
  Search,
  Sparkles,
  Eye,
  Edit,
  DollarSign,
  GitCompare,
  Loader2,
  Flag,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Simple inline Badge component to avoid import issues
function Badge({ 
  className, 
  variant = "default",
  children, 
  ...props 
}: { 
  className?: string; 
  variant?: "default" | "outline";
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variant === "default"
          ? "bg-primary text-primary-foreground"
          : "border-border bg-background",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
import { VarianceBadge, ShiftActualComparison, ReconciliationActions, AdjustmentDialog } from '@/components/reconciliation';
import type { VarianceType } from '@/components/reconciliation';

// Helper function to get display name from User object
function getEmployeeDisplayName(user: { name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null } | null | undefined): string {
  if (!user) return 'Unassigned';
  if (user.name) return user.name;
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ');
  }
  if (user.email) return user.email;
  return 'Unassigned';
}

interface Shift {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  breakDuration: number;
  notes?: string | null;
  role?: string | null;
  attendanceStatus: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  isPublished: boolean;
  requiresConfirmation: boolean;
  confirmedAt?: string | Date | null;
  cost?: number | null;
  employee?: {
    id: string;
    User?: {
      name?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      profileImageUrl?: string | null;
    } | null;
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

interface ReconciliationData {
  shift: {
    id: string;
    employeeId: string | null;
    startTime: Date;
    endTime: Date;
    breakDuration: number;
    role: string | null;
    attendanceStatus: string;
    isPublished: boolean;
    employee?: {
      id: string;
      User?: {
        name: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        profileImageUrl: string | null;
      } | null;
    } | null;
  };
  clockEntry?: {
    id: string;
    clockInTime: Date;
    clockOutTime: Date | null;
    matchConfidence: number | null;
  } | null;
  timesheetEntry?: {
    id: string;
    startTime: Date;
    endTime: Date;
    hours: number;
    reconciliationStatus: string;
    reconciliationNotes: string | null;
  } | null;
  variance: {
    minutes: number;
    type: VarianceType;
    startVarianceMinutes: number;
    endVarianceMinutes: number;
  };
  reconciliationStatus: string;
}

interface ViewFullDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  shifts: Shift[];
  onShiftClick?: (shift: Shift) => void;
  onShiftEdit?: (shift: Shift) => void;
  showReconciliation?: boolean; // Enable reconciliation tab
}

const STATUS_CONFIG = {
  SCHEDULED: {
    className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40',
    icon: Clock,
    label: 'Scheduled',
    color: 'amber',
  },
  CONFIRMED: {
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40',
    icon: CheckCircle,
    label: 'Confirmed',
    color: 'emerald',
  },
  COMPLETED: {
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40',
    icon: CheckCircle,
    label: 'Completed',
    color: 'emerald',
  },
  NO_SHOW: {
    className: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/40',
    icon: XCircle,
    label: 'No Show',
    color: 'rose',
  },
  CANCELLED: {
    className: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/40',
    icon: XCircle,
    label: 'Cancelled',
    color: 'rose',
  },
};

interface FilterDropdownProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
}

function FilterDropdown({ label, icon, value, options, onChange, placeholder = 'All' }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "group flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
            "bg-background hover:bg-muted border border-border hover:border-border",
            value && "bg-primary/10 border-primary/40"
          )}
        >
          {icon}
          <span className="hidden sm:inline text-muted-foreground group-hover:text-foreground">{label}:</span>
          <span className={cn("truncate max-w-[100px]", value ? "text-foreground" : "text-muted-foreground")}>
            {selectedLabel}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0 bg-popover border-border" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty className="text-muted-foreground text-sm py-4 text-center">No results found</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value=""
                onSelect={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                All {label.toLowerCase()}s
                {!value && <CheckCircle className="ml-auto h-4 w-4 text-primary" />}
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
                  {option.label}
                  {value === option.value && <CheckCircle className="ml-auto h-4 w-4 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function ViewFullDayModal({
  isOpen,
  onClose,
  date,
  shifts,
  onShiftClick,
  onShiftEdit,
  showReconciliation = true,
}: ViewFullDayModalProps) {
  const [locationFilter, setLocationFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'shifts' | 'reconciliation'>('shifts');
  
  // Reconciliation state
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData[]>([]);
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const [reconciliationError, setReconciliationError] = useState<string | null>(null);
  const [adjustmentEntry, setAdjustmentEntry] = useState<{
    id: string;
    startTime: Date;
    endTime: Date;
    scheduledStart?: Date;
    scheduledEnd?: Date;
  } | null>(null);

  // Fetch reconciliation data when tab changes
  useEffect(() => {
    if (activeTab === 'reconciliation' && isOpen && showReconciliation) {
      fetchReconciliationData();
    }
  }, [activeTab, isOpen, date]);

  const fetchReconciliationData = async () => {
    setReconciliationLoading(true);
    setReconciliationError(null);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await fetch(`/api/reconciliation/day/${dateStr}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reconciliation data');
      }
      const data = await response.json();
      // Convert date strings to Date objects
      const processed = data.shifts.map((item: any) => ({
        ...item,
        shift: {
          ...item.shift,
          startTime: new Date(item.shift.startTime),
          endTime: new Date(item.shift.endTime),
        },
        clockEntry: item.clockEntry ? {
          ...item.clockEntry,
          clockInTime: new Date(item.clockEntry.clockInTime),
          clockOutTime: item.clockEntry.clockOutTime ? new Date(item.clockEntry.clockOutTime) : null,
        } : null,
        timesheetEntry: item.timesheetEntry ? {
          ...item.timesheetEntry,
          startTime: new Date(item.timesheetEntry.startTime),
          endTime: new Date(item.timesheetEntry.endTime),
        } : null,
      }));
      setReconciliationData(processed);
    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
      setReconciliationError('Failed to load reconciliation data');
    } finally {
      setReconciliationLoading(false);
    }
  };

  // Reconciliation stats
  const reconStats = useMemo(() => {
    const pending = reconciliationData.filter(r => r.reconciliationStatus === 'PENDING').length;
    const approved = reconciliationData.filter(r => r.reconciliationStatus === 'APPROVED').length;
    const flagged = reconciliationData.filter(r => r.reconciliationStatus === 'FLAGGED').length;
    const noShow = reconciliationData.filter(r => r.variance.type === 'NO_SHOW').length;
    return { pending, approved, flagged, noShow, total: reconciliationData.length };
  }, [reconciliationData]);

  // Extract unique filter options from shifts
  const filterOptions = useMemo(() => {
    const locations = new Map<string, string>();
    const departments = new Map<string, string>();

    shifts.forEach(shift => {
      if (shift.location) {
        locations.set(shift.location.id, shift.location.name);
      }
      if (shift.department) {
        departments.set(shift.department.id, shift.department.name);
      }
    });

    return {
      locations: Array.from(locations, ([value, label]) => ({ value, label })),
      departments: Array.from(departments, ([value, label]) => ({ value, label })),
      statuses: Object.entries(STATUS_CONFIG).map(([value, config]) => ({
        value,
        label: config.label,
      })),
    };
  }, [shifts]);

  // Filter shifts based on selected filters
  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      if (locationFilter && shift.location?.id !== locationFilter) return false;
      if (departmentFilter && shift.department?.id !== departmentFilter) return false;
      if (statusFilter && shift.attendanceStatus !== statusFilter) return false;
      if (searchQuery) {
        const employeeName = getEmployeeDisplayName(shift.employee?.User).toLowerCase();
        const role = (shift.role || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        if (!employeeName.includes(query) && !role.includes(query)) return false;
      }
      return true;
    });
  }, [shifts, locationFilter, departmentFilter, statusFilter, searchQuery]);

  // Sort shifts by start time
  const sortedShifts = useMemo(() => {
    return [...filteredShifts].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [filteredShifts]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalHours = filteredShifts.reduce((acc, shift) => {
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60) - (shift.breakDuration / 60);
      return acc + hours;
    }, 0);

    const totalCost = filteredShifts.reduce((acc, shift) => {
      const cost = shift.cost != null ? Number(shift.cost) : 0;
      return acc + (isNaN(cost) ? 0 : cost);
    }, 0);

    const byStatus = {
      scheduled: filteredShifts.filter(s => s.attendanceStatus === 'SCHEDULED').length,
      confirmed: filteredShifts.filter(s => s.attendanceStatus === 'CONFIRMED' || s.attendanceStatus === 'COMPLETED').length,
      cancelled: filteredShifts.filter(s => s.attendanceStatus === 'CANCELLED' || s.attendanceStatus === 'NO_SHOW').length,
    };

    return { totalHours, totalCost, byStatus, total: filteredShifts.length };
  }, [filteredShifts]);

  const hasActiveFilters = locationFilter || departmentFilter || statusFilter || searchQuery;

  const clearFilters = () => {
    setLocationFilter('');
    setDepartmentFilter('');
    setStatusFilter('');
    setSearchQuery('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 gap-0 bg-background border border-border shadow-2xl overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <DialogHeader className="relative px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                  {format(date, 'EEEE, MMMM d')}
                </DialogTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  {format(date, 'yyyy')} • {shifts.length} total shift{shifts.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-muted hover:bg-muted/80 border border-border transition-all group"
            >
              <X className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
            </button>
          </div>

          {/* Tabs - Show only if reconciliation is enabled */}
          {showReconciliation && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'shifts' | 'reconciliation')} className="mt-4">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger 
                  value="shifts"
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Shifts
                </TabsTrigger>
                <TabsTrigger 
                  value="reconciliation"
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  Reconciliation
                  {reconStats.pending > 0 && (
                    <Badge className="ml-2 h-5 px-1.5 bg-amber-500/20 text-amber-600 border-amber-500/30 text-xs">
                      {reconStats.pending}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Quick Stats - Different for each tab */}
          <AnimatePresence mode="wait">
            {activeTab === 'shifts' ? (
              <motion.div
                key="shifts-stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5"
              >
                <div className="bg-muted/50 rounded-xl px-4 py-3 border border-border">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Shifts</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">{stats.total}</div>
                </div>
                <div className="bg-muted/50 rounded-xl px-4 py-3 border border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-sky-500" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Hours</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">{stats.totalHours.toFixed(1)}</div>
                </div>
                <div className="bg-muted/50 rounded-xl px-4 py-3 border border-border">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Cost</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">${stats.totalCost.toFixed(0)}</div>
                </div>
                <div className="bg-muted/50 rounded-xl px-4 py-3 border border-border">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Confirmed</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">{stats.byStatus.confirmed}</div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="reconciliation-stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5"
              >
                <div className="bg-muted/50 rounded-xl px-4 py-3 border border-border">
                  <div className="flex items-center gap-2">
                    <GitCompare className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Total</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">{reconStats.total}</div>
                </div>
                <div className="bg-amber-500/10 rounded-xl px-4 py-3 border border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide">Pending</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{reconStats.pending}</div>
                </div>
                <div className="bg-emerald-500/10 rounded-xl px-4 py-3 border border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Approved</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{reconStats.approved}</div>
                </div>
                <div className="bg-rose-500/10 rounded-xl px-4 py-3 border border-rose-500/30">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-rose-500" />
                    <span className="text-xs text-rose-600 dark:text-rose-400 uppercase tracking-wide">Flagged</span>
                  </div>
                  <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{reconStats.flagged}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogHeader>

        {/* Shifts Tab Content */}
        {activeTab === 'shifts' && (
          <>
            {/* Filters Section */}
            <div className="relative px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>

                {/* Filter Dropdowns */}
                <FilterDropdown
                  label="Location"
                  icon={<MapPin className="h-4 w-4 text-emerald-500" />}
                  value={locationFilter}
                  options={filterOptions.locations}
                  onChange={setLocationFilter}
                />
                <FilterDropdown
                  label="Department"
                  icon={<Building2 className="h-4 w-4 text-purple-500" />}
                  value={departmentFilter}
                  options={filterOptions.departments}
                  onChange={setDepartmentFilter}
                />
                <FilterDropdown
                  label="Status"
                  icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
                  value={statusFilter}
                  options={filterOptions.statuses}
                  onChange={setStatusFilter}
                />

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </button>
                )}
              </div>

              {/* Active filter count */}
              {hasActiveFilters && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" />
                  Showing {filteredShifts.length} of {shifts.length} shifts
                </div>
              )}
            </div>

            {/* Shifts List */}
            <ScrollArea className="relative h-[400px] bg-muted/40">
              <div className="p-6 space-y-3">
                {sortedShifts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-2xl bg-muted border border-border mb-4">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No shifts found</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                  {hasActiveFilters 
                    ? 'Try adjusting your filters to see more results'
                    : 'No shifts are scheduled for this day'
                  }
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              sortedShifts.map((shift, index) => {
                const startTime = new Date(shift.startTime);
                const endTime = new Date(shift.endTime);
                const durationHours = ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)) - (shift.breakDuration / 60);
                const StatusIcon = STATUS_CONFIG[shift.attendanceStatus].icon;
                const statusConfig = STATUS_CONFIG[shift.attendanceStatus];

                return (
                  <div
                    key={shift.id}
                    className={cn(
                      "group relative flex gap-4 p-4 rounded-2xl transition-all cursor-pointer",
                      "bg-card hover:bg-accent border border-border",
                      "hover:shadow-lg hover:shadow-black/10"
                    )}
                    onClick={() => onShiftClick?.(shift)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Time Column */}
                    <div className="flex-shrink-0 w-20 text-center">
                      <div className="text-lg font-bold text-foreground">
                        {format(startTime, 'h:mm')}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase">
                        {format(startTime, 'a')}
                      </div>
                      <div className="w-px h-4 bg-border mx-auto my-1.5" />
                      <div className="text-sm font-medium text-muted-foreground">
                        {format(endTime, 'h:mm a')}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Employee */}
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={shift.employee?.User?.profileImageUrl ?? undefined}
                              name={getEmployeeDisplayName(shift.employee?.User) !== 'Unassigned' ? getEmployeeDisplayName(shift.employee?.User) : undefined}
                              size={32}
                              className="border-2 border-border"
                            />
                            <div>
                              <h4 className="font-semibold text-foreground truncate">
                                {getEmployeeDisplayName(shift.employee?.User)}
                              </h4>
                              {shift.role && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  {shift.role}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Meta Info */}
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs border", statusConfig.className)}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            {!shift.isPublished && (
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                Draft
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {durationHours.toFixed(1)}h
                              {shift.breakDuration > 0 && ` (${shift.breakDuration}m break)`}
                            </span>
                          </div>

                          {/* Location & Department */}
                          <div className="flex flex-wrap items-center gap-4 mt-2">
                            {shift.location && (
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 text-emerald-500" />
                                {shift.location.name}
                              </span>
                            )}
                            {shift.department && (
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3 text-purple-500" />
                                {shift.department.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onShiftEdit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onShiftEdit(shift);
                              }}
                              className="p-2 rounded-lg bg-muted hover:bg-muted/80 border border-border text-muted-foreground hover:text-foreground transition-all"
                              title="Edit shift"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onShiftClick?.(shift);
                            }}
                            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary transition-all"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Cost (if available) - positioned at bottom right */}
                      {shift.cost != null && !isNaN(Number(shift.cost)) && (
                        <div className="absolute bottom-4 right-4 flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                          <DollarSign className="h-3.5 w-3.5" />
                          {Number(shift.cost).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
              </div>
            </ScrollArea>
          </>
        )}

        {/* Reconciliation Tab Content */}
        {activeTab === 'reconciliation' && (
          <ScrollArea className="relative h-[500px] bg-muted/40">
            <div className="p-6 space-y-4">
              {reconciliationLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Loading reconciliation data...</p>
                </div>
              ) : reconciliationError ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 mb-4">
                    <AlertCircle className="h-8 w-8 text-rose-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Error Loading Data</h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-xs">{reconciliationError}</p>
                  <button
                    onClick={fetchReconciliationData}
                    className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all"
                  >
                    Try Again
                  </button>
                </div>
              ) : reconciliationData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 rounded-2xl bg-muted border border-border mb-4">
                    <GitCompare className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">No Reconciliation Data</h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                    There are no shifts to reconcile for this day.
                  </p>
                </div>
              ) : (
                <>
                  {/* Reconciliation list */}
                  {reconciliationData.map((item, index) => (
                    <motion.div
                      key={item.shift.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ShiftActualComparison
                        shift={item.shift}
                        actual={item.clockEntry || item.timesheetEntry ? {
                          startTime: item.clockEntry?.clockInTime || item.timesheetEntry!.startTime,
                          endTime: item.clockEntry?.clockOutTime || item.timesheetEntry!.endTime,
                          hours: item.timesheetEntry?.hours,
                        } : null}
                        variance={item.variance}
                        reconciliationStatus={item.reconciliationStatus}
                      />
                      
                      {/* Actions for timesheet entries */}
                      {item.timesheetEntry && (
                        <div className="mt-2 flex justify-end">
                          <ReconciliationActions
                            entryId={item.timesheetEntry.id}
                            entryType="timesheet"
                            currentStatus={item.timesheetEntry.reconciliationStatus}
                            hasShiftLink={!!item.shift.id}
                            varianceMinutes={item.variance.minutes}
                            onAdjust={() => setAdjustmentEntry({
                              id: item.timesheetEntry!.id,
                              startTime: item.timesheetEntry!.startTime,
                              endTime: item.timesheetEntry!.endTime,
                              scheduledStart: item.shift.startTime,
                              scheduledEnd: item.shift.endTime,
                            })}
                            onRefresh={fetchReconciliationData}
                            compact
                          />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Adjustment Dialog */}
        {adjustmentEntry && (
          <AdjustmentDialog
            isOpen={!!adjustmentEntry}
            onClose={() => setAdjustmentEntry(null)}
            entryId={adjustmentEntry.id}
            currentStartTime={adjustmentEntry.startTime}
            currentEndTime={adjustmentEntry.endTime}
            scheduledStartTime={adjustmentEntry.scheduledStart}
            scheduledEndTime={adjustmentEntry.scheduledEnd}
            onSuccess={() => {
              setAdjustmentEntry(null);
              fetchReconciliationData();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

