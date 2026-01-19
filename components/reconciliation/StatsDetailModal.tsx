'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  CheckCircle,
  Clock,
  Flag,
  Users,
  TrendingUp,
  TrendingDown,
  XCircle,
  AlertTriangle,
  Loader2,
  Search,
  Download,
  ChevronRight,
  User,
  Briefcase,
  Building2,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export type DetailType = 
  | 'total_shifts'
  | 'pending'
  | 'approved'
  | 'flagged'
  | 'no_shows'
  | 'variance'
  | 'scheduled_hours'
  | 'actual_hours';

interface ShiftDetail {
  id: string;
  employeeId: string | null;
  employeeName: string;
  employeeEmail: string | null;
  profileImageUrl: string | null;
  role: string | null;
  department: string | null;
  startTime: string;
  endTime: string | null;
  scheduledHours: number;
  actualHours: number | null;
  varianceMinutes: number | null;
  varianceType: string | null;
  reconciliationStatus: string;
  hasClockEntry: boolean;
  hasTimesheetEntry: boolean;
  clockInTime: string | null;
  clockOutTime: string | null;
}

interface StatsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: DetailType;
  startDate: Date;
  endDate: Date;
  onShiftClick?: (shiftId: string, date: Date) => void;
}

const typeConfig: Record<DetailType, {
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
}> = {
  total_shifts: {
    title: 'Total Shifts',
    icon: Calendar,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'All scheduled shifts for the selected period',
  },
  pending: {
    title: 'Pending Review',
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    description: 'Shifts awaiting reconciliation approval',
  },
  approved: {
    title: 'Approved Entries',
    icon: CheckCircle,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    description: 'Reconciled and ready for payroll',
  },
  flagged: {
    title: 'Flagged Entries',
    icon: Flag,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    description: 'Entries requiring attention',
  },
  no_shows: {
    title: 'No Shows',
    icon: XCircle,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    description: 'Scheduled shifts with no clock data',
  },
  variance: {
    title: 'Time Variance',
    icon: TrendingUp,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    description: 'Shifts with time differences from schedule',
  },
  scheduled_hours: {
    title: 'Scheduled Hours',
    icon: Users,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'Total planned work hours',
  },
  actual_hours: {
    title: 'Actual Hours',
    icon: Clock,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    description: 'Total recorded work hours',
  },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatVariance(minutes: number | null): { text: string; color: string } {
  if (minutes === null) return { text: '-', color: 'text-muted-foreground' };
  if (Math.abs(minutes) <= 5) return { text: 'On time', color: 'text-emerald-500' };
  const sign = minutes > 0 ? '+' : '';
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  const text = hours > 0 ? `${sign}${hours}h ${mins}m` : `${sign}${minutes}m`;
  return { 
    text, 
    color: minutes > 0 ? 'text-amber-500' : 'text-rose-500' 
  };
}

function getStatusBadge(status: string) {
  const configs: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    PENDING: { label: 'Pending', variant: 'secondary' },
    AUTO_MATCHED: { label: 'Auto-matched', variant: 'secondary' },
    APPROVED: { label: 'Approved', variant: 'default' },
    FLAGGED: { label: 'Flagged', variant: 'destructive' },
    ADJUSTED: { label: 'Adjusted', variant: 'outline' },
    NO_SHOW: { label: 'No Show', variant: 'destructive' },
  };
  const config = configs[status] || { label: status, variant: 'secondary' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function StatsDetailModal({
  isOpen,
  onClose,
  type,
  startDate,
  endDate,
  onShiftClick,
}: StatsDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ShiftDetail[]>([]);
  const [summary, setSummary] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const config = typeConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (isOpen) {
      fetchDetails();
    }
  }, [isOpen, type, startDate, endDate]);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/reconciliation/details?type=${type}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch details');
      const data = await response.json();
      setDetails(data.details);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const filteredDetails = details.filter(detail => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      detail.employeeName.toLowerCase().includes(query) ||
      detail.role?.toLowerCase().includes(query) ||
      detail.department?.toLowerCase().includes(query)
    );
  });

  const handleExport = () => {
    const csvContent = [
      ['Employee', 'Role', 'Department', 'Date', 'Scheduled', 'Actual', 'Variance', 'Status'].join(','),
      ...filteredDetails.map(d => [
        `"${d.employeeName}"`,
        `"${d.role || ''}"`,
        `"${d.department || ''}"`,
        format(parseISO(d.startTime), 'yyyy-MM-dd'),
        d.startTime && d.endTime
          ? `${format(parseISO(d.startTime), 'HH:mm')}-${format(parseISO(d.endTime), 'HH:mm')}`
          : '-',
        d.clockInTime && d.clockOutTime 
          ? `${format(parseISO(d.clockInTime), 'HH:mm')}-${format(parseISO(d.clockOutTime), 'HH:mm')}`
          : '-',
        d.varianceMinutes !== null ? `${d.varianceMinutes}m` : '-',
        d.reconciliationStatus,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation-${type}-${format(startDate, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl', config.bgColor)}>
              <Icon className={cn('w-6 h-6', config.color)} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">{config.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {config.description}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Period Badge */}
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="rounded-xl"
            disabled={loading || details.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Summary Cards */}
        {!loading && !error && (
          <div className="flex-shrink-0 py-3">
            {renderSummary(type, summary)}
          </div>
        )}

        {/* Search */}
        <div className="flex-shrink-0 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, role, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={fetchDetails} className="mt-4 rounded-xl">
                Try Again
              </Button>
            </div>
          ) : filteredDetails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className={cn('p-4 rounded-2xl mb-4', config.bgColor)}>
                <Icon className={cn('h-8 w-8', config.color)} />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No entries found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {searchQuery ? 'Try adjusting your search' : 'No data for this period'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              <AnimatePresence mode="popLayout">
                {filteredDetails.map((detail, index) => (
                  <motion.div
                    key={detail.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => onShiftClick?.(detail.id, parseISO(detail.startTime))}
                    className={cn(
                      'p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors',
                      onShiftClick && 'cursor-pointer'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <Avatar className="h-10 w-10 border-2 border-border">
                        <AvatarImage src={detail.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {getInitials(detail.employeeName)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground truncate">
                              {detail.employeeName}
                            </h4>
                            {getStatusBadge(detail.reconciliationStatus)}
                          </div>
                          {onShiftClick && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                          {detail.role && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" />
                              {detail.role}
                            </span>
                          )}
                          {detail.department && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {detail.department}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(parseISO(detail.startTime), 'EEE, MMM d')}
                          </span>
                        </div>

                        {/* Time Details */}
                        <div className="flex flex-wrap items-center gap-4 mt-3">
                          {/* Scheduled */}
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-blue-500/10">
                              <Clock className="h-3.5 w-3.5 text-blue-500" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Scheduled</p>
                              <p className="text-sm font-medium">
                                {detail.startTime && detail.endTime
                                  ? `${format(parseISO(detail.startTime), 'HH:mm')} - ${format(parseISO(detail.endTime), 'HH:mm')}`
                                  : '-'}
                              </p>
                            </div>
                          </div>

                          {/* Actual */}
                          {(detail.clockInTime || detail.hasTimesheetEntry) && (
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                                <Timer className="h-3.5 w-3.5 text-emerald-500" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Actual</p>
                                <p className="text-sm font-medium">
                                  {detail.clockInTime && detail.clockOutTime
                                    ? `${format(parseISO(detail.clockInTime), 'HH:mm')} - ${format(parseISO(detail.clockOutTime), 'HH:mm')}`
                                    : detail.actualHours !== null
                                    ? `${detail.actualHours}h`
                                    : '-'}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Variance */}
                          {detail.varianceMinutes !== null && (
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                'p-1.5 rounded-lg',
                                detail.varianceMinutes > 0 ? 'bg-amber-500/10' : 'bg-rose-500/10'
                              )}>
                                {detail.varianceMinutes > 0 
                                  ? <ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />
                                  : <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
                                }
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Variance</p>
                                <p className={cn('text-sm font-medium', formatVariance(detail.varianceMinutes).color)}>
                                  {formatVariance(detail.varianceMinutes).text}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Hours */}
                          <div className="flex items-center gap-2 ml-auto">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Hours</p>
                              <p className="text-sm font-medium">
                                {detail.actualHours !== null 
                                  ? `${detail.actualHours}h`
                                  : `${detail.scheduledHours}h (scheduled)`
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {!loading && !error && filteredDetails.length > 0 && (
          <div className="flex-shrink-0 pt-3 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              Showing {filteredDetails.length} of {details.length} entries
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function renderSummary(type: DetailType, summary: Record<string, any>) {
  const summaryCards: { label: string; value: string | number; icon: React.ElementType; color: string }[] = [];

  switch (type) {
    case 'total_shifts':
      summaryCards.push(
        { label: 'Total', value: summary.total || 0, icon: Calendar, color: 'text-blue-500' },
        { label: 'Matched', value: summary.matched || 0, icon: CheckCircle, color: 'text-emerald-500' },
        { label: 'Unmatched', value: summary.unmatched || 0, icon: AlertTriangle, color: 'text-amber-500' },
      );
      break;
    case 'pending':
      summaryCards.push(
        { label: 'Total Pending', value: summary.total || 0, icon: Clock, color: 'text-amber-500' },
        { label: 'With Clock Data', value: summary.withClockData || 0, icon: Timer, color: 'text-blue-500' },
        { label: 'With Timesheet', value: summary.withTimesheetData || 0, icon: Calendar, color: 'text-violet-500' },
      );
      break;
    case 'approved':
      summaryCards.push(
        { label: 'Approved', value: summary.total || 0, icon: CheckCircle, color: 'text-emerald-500' },
        { label: 'Total Hours', value: `${(summary.totalHours || 0).toFixed(1)}h`, icon: Clock, color: 'text-blue-500' },
      );
      break;
    case 'flagged':
      summaryCards.push(
        { label: 'Flagged', value: summary.total || 0, icon: Flag, color: 'text-rose-500' },
        { label: 'Avg Variance', value: `${summary.avgVariance || 0}m`, icon: TrendingUp, color: 'text-amber-500' },
      );
      break;
    case 'no_shows':
      summaryCards.push(
        { label: 'No Shows', value: summary.total || 0, icon: XCircle, color: 'text-rose-500' },
        { label: 'Lost Hours', value: `${(summary.lostHours || 0).toFixed(1)}h`, icon: Clock, color: 'text-amber-500' },
      );
      break;
    case 'variance':
      summaryCards.push(
        { label: 'With Variance', value: summary.total || 0, icon: TrendingUp, color: 'text-violet-500' },
        { label: 'Avg Variance', value: `${summary.avgVariance || 0}m`, icon: Clock, color: 'text-amber-500' },
        { label: 'Overtime', value: summary.overtime || 0, icon: ArrowUpRight, color: 'text-amber-500' },
        { label: 'Undertime', value: summary.undertime || 0, icon: ArrowDownRight, color: 'text-rose-500' },
      );
      break;
    case 'scheduled_hours':
      summaryCards.push(
        { label: 'Total Hours', value: `${summary.totalHours || 0}h`, icon: Clock, color: 'text-blue-500' },
        { label: 'Avg per Shift', value: `${summary.avgPerShift || 0}h`, icon: Timer, color: 'text-violet-500' },
      );
      break;
    case 'actual_hours':
      summaryCards.push(
        { label: 'Actual', value: `${summary.totalHours || 0}h`, icon: Clock, color: 'text-emerald-500' },
        { label: 'Scheduled', value: `${summary.scheduledHours || 0}h`, icon: Calendar, color: 'text-blue-500' },
        { 
          label: 'Difference', 
          value: `${(summary.difference || 0) >= 0 ? '+' : ''}${summary.difference || 0}h`, 
          icon: (summary.difference || 0) >= 0 ? TrendingUp : TrendingDown, 
          color: (summary.difference || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500' 
        },
      );
      break;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {summaryCards.map((card, index) => {
        const CardIcon = card.icon;
        return (
          <div
            key={index}
            className="p-3 rounded-xl bg-muted/50 border border-border"
          >
            <div className="flex items-center gap-2 mb-1">
              <CardIcon className={cn('h-4 w-4', card.color)} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}
