'use client';

import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Calendar, 
  ArrowRight, 
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import VarianceBadge, { VarianceType } from './VarianceBadge';

interface ShiftActualComparisonProps {
  shift: {
    id: string;
    startTime: Date;
    endTime: Date;
    breakDuration: number;
    role?: string | null;
    employee?: {
      id: string;
      User?: {
        name?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        profileImageUrl?: string | null;
      } | null;
    } | null;
  };
  actual?: {
    startTime: Date;
    endTime: Date | null;
    hours?: number;
  } | null;
  variance: {
    minutes: number;
    type: VarianceType;
    startVarianceMinutes: number;
    endVarianceMinutes: number;
  };
  reconciliationStatus: string;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

function getEmployeeDisplayName(user?: { name?: string | null; firstName?: string | null; lastName?: string | null } | null): string {
  if (!user) return 'Unassigned';
  if (user.name) return user.name;
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ');
  }
  return 'Unassigned';
}

function formatTimeRange(start: Date, end: Date | null): string {
  if (!end) return `${format(start, 'HH:mm')} - ?`;
  return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
}

function calculateHours(start: Date, end: Date | null, breakMinutes: number = 0): string {
  if (!end) return '—';
  const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  const workMinutes = totalMinutes - breakMinutes;
  const hours = Math.max(0, workMinutes / 60);
  return `${hours.toFixed(1)}h`;
}

export default function ShiftActualComparison({
  shift,
  actual,
  variance,
  reconciliationStatus,
  isSelected = false,
  onClick,
  className,
}: ShiftActualComparisonProps) {
  const hasActual = !!actual;
  const employeeName = getEmployeeDisplayName(shift.employee?.User);
  
  const statusConfig = {
    PENDING: { icon: Clock, color: 'amber', label: 'Pending' },
    AUTO_MATCHED: { icon: CheckCircle, color: 'blue', label: 'Auto-matched' },
    MANUALLY_MATCHED: { icon: CheckCircle, color: 'blue', label: 'Matched' },
    APPROVED: { icon: CheckCircle, color: 'emerald', label: 'Approved' },
    ADJUSTED: { icon: CheckCircle, color: 'violet', label: 'Adjusted' },
    FLAGGED: { icon: AlertTriangle, color: 'rose', label: 'Flagged' },
  };
  
  const status = statusConfig[reconciliationStatus as keyof typeof statusConfig] || statusConfig.PENDING;
  const StatusIcon = status.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={cn(
        'group relative rounded-2xl border-2 transition-all duration-200',
        onClick ? 'cursor-pointer' : '',
        isSelected
          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
          : 'border-border bg-card hover:border-primary/30 hover:shadow-md',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          {/* Employee Avatar */}
          <Avatar
            src={shift.employee?.User?.profileImageUrl ?? undefined}
            name={employeeName !== 'Unassigned' ? employeeName : undefined}
            size={40}
            className="border-2 border-border"
          />
          
          <div>
            <h4 className="font-semibold text-foreground">{employeeName}</h4>
            {shift.role && (
              <p className="text-xs text-muted-foreground">{shift.role}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <VarianceBadge 
            varianceMinutes={variance.minutes} 
            varianceType={variance.type}
          />
          <span className={cn(
            'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full',
            `bg-${status.color}-100 dark:bg-${status.color}-500/20`,
            `text-${status.color}-700 dark:text-${status.color}-400`
          )}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
        </div>
      </div>
      
      {/* Comparison Grid */}
      <div className="grid grid-cols-2 divide-x divide-border">
        {/* Scheduled */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Scheduled</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-foreground">
                {format(shift.startTime, 'HH:mm')}
              </span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-2xl font-bold text-foreground">
                {format(shift.endTime, 'HH:mm')}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{format(shift.startTime, 'EEE, MMM d')}</span>
              <span className="font-medium">
                {calculateHours(shift.startTime, shift.endTime, shift.breakDuration)}
              </span>
            </div>
            
            {shift.breakDuration > 0 && (
              <p className="text-xs text-muted-foreground">
                {shift.breakDuration} min break
              </p>
            )}
          </div>
        </div>
        
        {/* Actual */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              'p-1.5 rounded-lg',
              hasActual ? 'bg-emerald-500/10' : 'bg-rose-500/10'
            )}>
              <Clock className={cn(
                'w-4 h-4',
                hasActual ? 'text-emerald-500' : 'text-rose-500'
              )} />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Actual</span>
          </div>
          
          {hasActual ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn(
                  'text-2xl font-bold',
                  Math.abs(variance.startVarianceMinutes) > 5 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : 'text-foreground'
                )}>
                  {format(actual.startTime, 'HH:mm')}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className={cn(
                  'text-2xl font-bold',
                  actual.endTime && Math.abs(variance.endVarianceMinutes) > 5 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : 'text-foreground'
                )}>
                  {actual.endTime ? format(actual.endTime, 'HH:mm') : '—'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{format(actual.startTime, 'EEE, MMM d')}</span>
                <span className="font-medium">
                  {actual.hours ? `${actual.hours.toFixed(1)}h` : calculateHours(actual.startTime, actual.endTime, 0)}
                </span>
              </div>
              
              {/* Variance details */}
              <div className="flex gap-4 text-xs">
                {variance.startVarianceMinutes !== 0 && (
                  <span className={cn(
                    variance.startVarianceMinutes > 0 ? 'text-amber-600' : 'text-emerald-600'
                  )}>
                    Start: {variance.startVarianceMinutes > 0 ? '+' : ''}{variance.startVarianceMinutes}m
                  </span>
                )}
                {variance.endVarianceMinutes !== 0 && (
                  <span className={cn(
                    variance.endVarianceMinutes > 0 ? 'text-emerald-600' : 'text-amber-600'
                  )}>
                    End: {variance.endVarianceMinutes > 0 ? '+' : ''}{variance.endVarianceMinutes}m
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-center">
              <XCircle className="w-8 h-8 text-rose-400 mb-2" />
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">No clock entry</p>
              <p className="text-xs text-muted-foreground">Employee did not clock in</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

