'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, addDays, subWeeks, addWeeks, isSameDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  CheckCircle,
  Flag,
  Users,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  GitCompare,
  CheckSquare,
  Search,
  Download,
  RefreshCw,
  Building2,
  TrendingUp,
  Link2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { FeatureGuardedPage } from '@/components/FeatureGuardedPage';
import { FEATURE_KEYS } from '@/lib/feature-toggles/types';
import { 
  ReconciliationStats,
  ShiftActualComparison, 
  ReconciliationActions, 
  AdjustmentDialog,
  VarianceBadge,
  ReconciliationAddEntryDialog,
  EditClockEntryDialog,
  StatsDetailModal,
  LinkToShiftDialog,
} from '@/components/reconciliation';
import type { VarianceType, DetailType } from '@/components/reconciliation';

interface ReconciliationEntry {
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
    shiftId?: string | null;
  } | null;
  timesheetEntry?: {
    id: string;
    startTime: Date;
    endTime: Date;
    hours: number;
    reconciliationStatus: string;
    reconciliationNotes: string | null;
    shiftId?: string | null;
  } | null;
  variance: {
    minutes: number;
    type: VarianceType;
    startVarianceMinutes: number;
    endVarianceMinutes: number;
  };
  reconciliationStatus: string;
}

interface DayData {
  date: Date;
  shifts: ReconciliationEntry[];
  unmatchedClockEntries: any[];
  totalShifts: number;
  matchedCount: number;
  pendingCount: number;
}

interface StatsData {
  totalShifts: number;
  matchedShifts: number;
  pendingReconciliation: number;
  approvedCount: number;
  flaggedCount: number;
  noShowCount: number;
  averageVarianceMinutes: number;
  totalScheduledHours: number;
  totalActualHours: number;
}

export default function ReconciliationHubPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  
  // Adjustment dialog
  const [adjustmentEntry, setAdjustmentEntry] = useState<{
    id: string;
    startTime: Date;
    endTime: Date;
    scheduledStart?: Date;
    scheduledEnd?: Date;
  } | null>(null);
  const [addEntryShift, setAddEntryShift] = useState<ReconciliationEntry['shift'] | null>(null);
  
  // Edit clock entry dialog
  const [editClockEntry, setEditClockEntry] = useState<{
    clockEntry: ReconciliationEntry['clockEntry'];
    shift: ReconciliationEntry['shift'];
    employeeName: string;
  } | null>(null);

  // Stats detail modal
  const [statsDetailType, setStatsDetailType] = useState<DetailType | null>(null);

  // Link to shift dialog
  const [linkToShiftEntry, setLinkToShiftEntry] = useState<{
    entryType: 'clock' | 'timesheet';
    entryId: string;
    entryStartTime: Date;
    entryEndTime: Date;
    employeeId: string;
    employeeName: string;
  } | null>(null);
  
  const { toast } = useToast();
  
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [weekStart]);

  // Fetch stats for the current week
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const response = await fetch(
        `/api/reconciliation/stats?period=custom&startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
      );
      if (!response.ok) {
        let errorMessage = 'Failed to load weekly stats';
        try {
          const text = await response.text();
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed?.error) errorMessage = parsed.error;
          }
        } catch {
          // ignore
        }
        setStats(null);
        setStatsError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }
      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
      const errorMessage = 'Failed to load weekly stats';
      setStats(null);
      setStatsError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setStatsLoading(false);
    }
  }, [weekStart, weekEnd, toast]);

  // Fetch day data
  const fetchDayData = useCallback(async (date: Date) => {
    setDayLoading(true);
    setDayError(null);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await fetch(`/api/reconciliation/day/${dateStr}`);
      if (!response.ok) throw new Error('Failed to fetch day data');
      const data = await response.json();
      
      // Parse dates
      const processed: DayData = {
        date: new Date(data.date),
        shifts: data.shifts
          .filter((item: any) => item.shift && item.shift.startTime && item.shift.endTime)
          .map((item: any) => ({
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
          })),
        unmatchedClockEntries: data.unmatchedClockEntries,
        totalShifts: data.totalShifts,
        matchedCount: data.matchedCount,
        pendingCount: data.pendingCount,
      };
      
      setDayData(processed);
    } catch (err) {
      console.error('Error fetching day data:', err);
      setDayData(null);
      setSelectedEntries(new Set());
      setDayError('Failed to load reconciliation data');
      toast({
        title: 'Error',
        description: 'Failed to load reconciliation data',
        variant: 'destructive',
      });
    } finally {
      setDayLoading(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchStats();
        // Select today by default if it's within the week
        const today = new Date();
        if (today >= weekStart && today <= weekEnd) {
          setSelectedDate(today);
          await fetchDayData(today);
        } else {
          setSelectedDate(weekStart);
          await fetchDayData(weekStart);
        }
      } catch (err) {
        setError('Failed to load reconciliation data');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [weekStart, weekEnd, fetchStats, fetchDayData]);

  // Handle date selection
  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    setSelectedEntries(new Set());
    await fetchDayData(date);
  };

  // Navigate weeks
  const goToPreviousWeek = () => setWeekStart(subWeeks(weekStart, 1));
  const goToNextWeek = () => setWeekStart(addWeeks(weekStart, 1));
  const goToCurrentWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Filter entries
  const filteredEntries = useMemo(() => {
    if (!dayData) return [];
    
    return dayData.shifts.filter((entry) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && entry.reconciliationStatus !== 'PENDING') return false;
        if (statusFilter === 'approved' && entry.reconciliationStatus !== 'APPROVED') return false;
        if (statusFilter === 'flagged' && entry.reconciliationStatus !== 'FLAGGED') return false;
        if (statusFilter === 'no_show' && entry.variance.type !== 'NO_SHOW') return false;
      }
      
      // Search filter
      if (searchQuery) {
        const name = entry.shift.employee?.User?.name ||
          `${entry.shift.employee?.User?.firstName || ''} ${entry.shift.employee?.User?.lastName || ''}`.trim();
        const role = entry.shift.role || '';
        const query = searchQuery.toLowerCase();
        if (!name.toLowerCase().includes(query) && !role.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [dayData, statusFilter, searchQuery]);

  // Get approvable entries count (entries with timesheet data that aren't already approved)
  const approvableSelectedCount = useMemo(() => {
    return (dayData?.shifts ?? []).filter(
      (e) => selectedEntries.has(e.shift.id) &&
             e.timesheetEntry &&
             e.reconciliationStatus !== 'APPROVED'
    ).length;
  }, [dayData, selectedEntries]);

  // Bulk actions
  const handleBulkApprove = async () => {
    if (selectedEntries.size === 0) return;
    
    try {
      // Get timesheet entry IDs for selected shifts that have timesheet entries
      const entryIds = Array.from(
        new Set(
          (dayData?.shifts ?? [])
            .filter((e) => selectedEntries.has(e.shift.id) && e.timesheetEntry)
            .map((e) => e.timesheetEntry!.id)
        )
      );
      
      if (entryIds.length === 0) {
        toast({
          title: 'No Entries to Approve',
          description: 'Selected entries do not have timesheet data yet. Clock entries need to be processed first.',
          variant: 'destructive',
        });
        setSelectedEntries(new Set());
        return;
      }
      
      const response = await fetch('/api/reconciliation/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds }),
      });
      
      if (!response.ok) throw new Error('Failed to bulk approve');
      
      const result = await response.json();
      toast({
        title: 'Bulk Approve Complete',
        description: `Approved ${result.approved} entries, skipped ${result.skipped}`,
      });
      
      setSelectedEntries(new Set());
      await fetchDayData(selectedDate!);
      await fetchStats();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to bulk approve entries',
        variant: 'destructive',
      });
    }
  };

  const toggleEntrySelection = (shiftId: string) => {
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(shiftId)) {
        next.delete(shiftId);
      } else {
        next.add(shiftId);
      }
      return next;
    });
  };

  const selectAllEntries = () => {
    // Select all entries that have actual time data (clock or timesheet)
    const ids = filteredEntries
      .filter((e) => e.clockEntry || e.timesheetEntry)
      .map((e) => e.shift.id);
    setSelectedEntries(new Set(ids));
  };

  const clearSelection = () => setSelectedEntries(new Set());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading reconciliation data...</p>
        </div>
      </div>
    );
  }

  return (
    <FeatureGuardedPage featureKey={FEATURE_KEYS.ROTA_SHIFTS}>
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
              <GitCompare className="h-7 w-7 text-violet-500" />
            </div>
            Shift Reconciliation
          </h1>
          <p className="text-muted-foreground mt-1">
            Compare scheduled shifts with actual time worked
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              fetchStats();
              if (selectedDate) fetchDayData(selectedDate);
            }}
            disabled={statsLoading}
            className="rounded-xl"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {statsError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-500 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Unable to load weekly stats</p>
                <p className="text-sm text-muted-foreground">{statsError}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => fetchStats()}
              disabled={statsLoading}
              className="rounded-xl"
            >
              {statsLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Retry stats
            </Button>
          </div>
        </div>
      )}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ReconciliationStats 
            stats={stats} 
            onCardClick={(type) => setStatsDetailType(type)}
          />
        </motion.div>
      )}

      {/* Week Navigation */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousWeek}
              className="rounded-xl"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[200px]">
              <h3 className="font-semibold text-foreground">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </h3>
              <p className="text-xs text-muted-foreground">
                Week {format(weekStart, 'w')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextWeek}
              className="rounded-xl"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToCurrentWeek}
            className="rounded-xl"
          >
            Today
          </Button>
        </div>

        {/* Day Selector */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <motion.button
                key={day.toISOString()}
                onClick={() => handleDateSelect(day)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'relative p-3 rounded-xl border-2 transition-all text-center',
                  isSelected
                    ? 'bg-primary/10 border-primary shadow-lg shadow-primary/20'
                    : 'bg-muted/50 border-border hover:border-primary/30 hover:bg-muted',
                )}
              >
                <div className={cn(
                  'text-xs font-medium uppercase',
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  'text-xl font-bold mt-1',
                  isSelected ? 'text-primary' : 'text-foreground'
                )}>
                  {format(day, 'd')}
                </div>
                {isToday && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Day Detail View */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl overflow-hidden"
        >
          {/* Day Header */}
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {format(selectedDate, 'EEEE, MMMM d')}
                  </h2>
                  {dayData && (
                    <p className="text-sm text-muted-foreground">
                      {dayData.totalShifts} shifts • {dayData.matchedCount} matched • {dayData.pendingCount} pending
                    </p>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                {selectedEntries.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {selectedEntries.size} selected
                    </span>
                    {approvableSelectedCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({approvableSelectedCount} can be approved)
                      </span>
                    )}
                    <Button
                      size="sm"
                      onClick={handleBulkApprove}
                      disabled={approvableSelectedCount === 0}
                      className="rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Bulk Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearSelection}
                      className="rounded-xl"
                    >
                      Clear
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name or role..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] rounded-xl">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllEntries}
                className="rounded-xl"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Select All
              </Button>
            </div>
          </div>

          {/* Entries List */}
          <div className="p-6">
            {dayLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : dayError ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-2xl bg-muted border border-border mb-4">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Unable to load day data</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-xs">Please try again.</p>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedDate) fetchDayData(selectedDate);
                    }}
                    className="rounded-xl"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-2xl bg-muted border border-border mb-4">
                  <GitCompare className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No entries found</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                  {statusFilter !== 'all' || searchQuery
                    ? 'Try adjusting your filters'
                    : 'No shifts scheduled for this day'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEntries.map((entry, index) => {
                  const hasActualData = entry.clockEntry || entry.timesheetEntry;
                  const isSelected = selectedEntries.has(entry.shift.id);
                  const isApproved = entry.reconciliationStatus === 'APPROVED';
                  
                  return (
                  <motion.div
                    key={entry.shift.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'relative flex gap-3 items-start',
                      isSelected && 'ring-2 ring-primary/30 rounded-2xl bg-primary/5'
                    )}
                  >
                    {/* Selection checkbox - visible for all entries with actual data */}
                    <div className="flex-shrink-0 pt-4 pl-3">
                      {hasActualData ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEntrySelection(entry.shift.id)}
                          disabled={isApproved}
                          className={cn(
                            'h-5 w-5 rounded border-2 text-primary focus:ring-primary cursor-pointer transition-all',
                            isApproved 
                              ? 'border-emerald-300 bg-emerald-100 cursor-not-allowed opacity-60' 
                              : 'border-border hover:border-primary'
                          )}
                          title={isApproved ? 'Already approved' : 'Select for bulk action'}
                        />
                      ) : (
                        <div className="h-5 w-5" /> // Spacer for alignment
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <ShiftActualComparison
                        shift={entry.shift}
                        actual={(() => {
                          // If we have a timesheet entry, use it
                          if (entry.timesheetEntry) {
                            return {
                              startTime: entry.timesheetEntry.startTime,
                              endTime: entry.timesheetEntry.endTime,
                              hours: entry.timesheetEntry.hours,
                            };
                          }
                          // If we have a clock entry (complete or clock-in-only), use it
                          if (entry.clockEntry?.clockInTime) {
                            return {
                              startTime: entry.clockEntry.clockInTime,
                              endTime: entry.clockEntry.clockOutTime || null, // null for active clock-ins
                              hours: undefined,
                              isActive: !entry.clockEntry.clockOutTime, // Flag for active clock-ins
                            };
                          }
                          // Otherwise, no actual data available
                          return null;
                        })()}
                        variance={entry.variance}
                        reconciliationStatus={entry.reconciliationStatus}
                        onAddEntry={
                          !entry.clockEntry &&
                          !entry.timesheetEntry &&
                          !!entry.shift.employeeId &&
                          selectedDate
                            ? () => setAddEntryShift(entry.shift)
                            : undefined
                        }
                      />
                      
                      {/* Actions */}
                      {entry.timesheetEntry && (
                        <div className="mt-2 flex justify-end gap-2">
                          {/* Direct Approve button for pending entries */}
                          {entry.reconciliationStatus !== 'APPROVED' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={async () => {
                                try {
                                  const response = await fetch('/api/reconciliation/approve', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ entryId: entry.timesheetEntry!.id }),
                                  });
                                  if (!response.ok) throw new Error('Failed to approve');
                                  
                                  toast({
                                    title: 'Success',
                                    description: 'Timesheet entry approved successfully',
                                  });
                                  
                                  await fetchDayData(selectedDate);
                                  await fetchStats();
                                } catch (error) {
                                  toast({
                                    title: 'Error',
                                    description: 'Failed to approve entry',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                              className="h-9 bg-emerald-500 hover:bg-emerald-600 text-white font-medium min-w-[100px]"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                          )}
                          
                          {/* Link to Shift button - show when entry is not linked to a shift */}
                          {!entry.timesheetEntry.shiftId && entry.shift.employeeId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const employeeName = entry.shift.employee?.User?.name ||
                                  `${entry.shift.employee?.User?.firstName || ''} ${entry.shift.employee?.User?.lastName || ''}`.trim() ||
                                  'Unknown';
                                setLinkToShiftEntry({
                                  entryType: 'timesheet',
                                  entryId: entry.timesheetEntry!.id,
                                  entryStartTime: entry.timesheetEntry!.startTime,
                                  entryEndTime: entry.timesheetEntry!.endTime,
                                  employeeId: entry.shift.employeeId!,
                                  employeeName,
                                });
                              }}
                              className="h-9 border-violet-500/30 text-violet-600 hover:bg-violet-500/10 rounded-xl"
                              title="Link this time entry to a scheduled shift for reconciliation tracking"
                            >
                              <Link2 className="mr-2 h-4 w-4" />
                              Link to Shift
                            </Button>
                          )}
                          {/* Edit Clock Entry button */}
                          {entry.clockEntry && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const employeeName = entry.shift.employee?.User?.name ||
                                  `${entry.shift.employee?.User?.firstName || ''} ${entry.shift.employee?.User?.lastName || ''}`.trim() ||
                                  'Unknown';
                                setEditClockEntry({
                                  clockEntry: entry.clockEntry!,
                                  shift: entry.shift,
                                  employeeName,
                                });
                              }}
                              className="h-9 border-blue-500/30 text-blue-600 hover:bg-blue-500/10 rounded-xl"
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Edit Clock
                            </Button>
                          )}
                          <ReconciliationActions
                            entryId={entry.timesheetEntry.id}
                            entryType="timesheet"
                            currentStatus={entry.timesheetEntry.reconciliationStatus}
                            hasShiftLink={!!entry.shift.id}
                            varianceMinutes={entry.variance.minutes}
                            onAdjust={() => setAdjustmentEntry({
                              id: entry.timesheetEntry!.id,
                              startTime: entry.timesheetEntry!.startTime,
                              endTime: entry.timesheetEntry!.endTime,
                              scheduledStart: entry.shift.startTime,
                              scheduledEnd: entry.shift.endTime,
                            })}
                            onRefresh={async () => {
                              await fetchDayData(selectedDate);
                              await fetchStats();
                            }}
                          />
                        </div>
                      )}
                      {/* Edit button for entries with clock but no timesheet yet */}
                      {entry.clockEntry && !entry.timesheetEntry && (
                        <div className="mt-2 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const employeeName = entry.shift.employee?.User?.name ||
                                `${entry.shift.employee?.User?.firstName || ''} ${entry.shift.employee?.User?.lastName || ''}`.trim() ||
                                'Unknown';
                              setEditClockEntry({
                                clockEntry: entry.clockEntry!,
                                shift: entry.shift,
                                employeeName,
                              });
                            }}
                            className="h-9 border-blue-500/30 text-blue-600 hover:bg-blue-500/10 rounded-xl"
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Edit Clock Entry
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
                })}
              </div>
            )}
          </div>
        </motion.div>
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
          onSuccess={async () => {
            setAdjustmentEntry(null);
            await fetchDayData(selectedDate!);
            await fetchStats();
          }}
        />
      )}

      {/* Add Entry Dialog */}
      {addEntryShift && selectedDate && (
        <ReconciliationAddEntryDialog
          open={!!addEntryShift}
          onOpenChange={(open) => {
            if (!open) {
              setAddEntryShift(null);
            }
          }}
          shift={addEntryShift}
          date={selectedDate}
          onSuccess={async () => {
            setAddEntryShift(null);
            await fetchDayData(selectedDate);
            await fetchStats();
          }}
        />
      )}

      {/* Edit Clock Entry Dialog */}
      {editClockEntry && editClockEntry.clockEntry && (
        <EditClockEntryDialog
          open={!!editClockEntry}
          onOpenChange={(open) => {
            if (!open) {
              setEditClockEntry(null);
            }
          }}
          clockEntry={editClockEntry.clockEntry}
          shift={editClockEntry.shift}
          employeeName={editClockEntry.employeeName}
          onSuccess={async () => {
            setEditClockEntry(null);
            if (selectedDate) {
              await fetchDayData(selectedDate);
              await fetchStats();
            }
          }}
        />
      )}

      {/* Stats Detail Modal */}
      {statsDetailType && (
        <StatsDetailModal
          isOpen={!!statsDetailType}
          onClose={() => setStatsDetailType(null)}
          type={statsDetailType}
          startDate={weekStart}
          endDate={weekEnd}
          onShiftClick={(shiftId, date) => {
            setStatsDetailType(null);
            handleDateSelect(date);
          }}
        />
      )}

      {/* Link to Shift Dialog */}
      {linkToShiftEntry && selectedDate && (
        <LinkToShiftDialog
          open={!!linkToShiftEntry}
          onOpenChange={(open) => {
            if (!open) {
              setLinkToShiftEntry(null);
            }
          }}
          entryType={linkToShiftEntry.entryType}
          entryId={linkToShiftEntry.entryId}
          entryStartTime={linkToShiftEntry.entryStartTime}
          entryEndTime={linkToShiftEntry.entryEndTime}
          employeeId={linkToShiftEntry.employeeId}
          employeeName={linkToShiftEntry.employeeName}
          date={selectedDate}
          onSuccess={async () => {
            setLinkToShiftEntry(null);
            await fetchDayData(selectedDate);
            await fetchStats();
          }}
        />
      )}
    </div>
    </FeatureGuardedPage>
  );
}

