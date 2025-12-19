'use client';

import { motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle,
  Clock,
  Flag,
  Users,
  TrendingUp,
  AlertTriangle,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DetailType } from './StatsDetailModal';

interface ReconciliationStatsProps {
  stats: {
    totalShifts: number;
    matchedShifts: number;
    pendingReconciliation: number;
    approvedCount: number;
    flaggedCount: number;
    noShowCount: number;
    averageVarianceMinutes: number;
    totalScheduledHours: number;
    totalActualHours: number;
  };
  className?: string;
  onCardClick?: (type: DetailType) => void;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color: 'primary' | 'emerald' | 'amber' | 'rose' | 'violet' | 'blue';
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
  interactive?: boolean;
}

function StatCard({ icon: Icon, label, value, subValue, color, trend, onClick, interactive = true }: StatCardProps) {
  const colorClasses = {
    primary: 'from-primary/20 to-primary/5 border-primary/30',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/30',
    violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/30',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
  };

  const hoverClasses = {
    primary: 'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
    emerald: 'hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10',
    amber: 'hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10',
    rose: 'hover:border-rose-500/50 hover:shadow-lg hover:shadow-rose-500/10',
    violet: 'hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10',
    blue: 'hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10',
  };

  const iconColors = {
    primary: 'text-primary',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
    violet: 'text-violet-500',
    blue: 'text-blue-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={interactive && onClick ? { scale: 1.02 } : undefined}
      whileTap={interactive && onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl p-4 border bg-gradient-to-br transition-all duration-200',
        colorClasses[color],
        interactive && onClick && [
          'cursor-pointer',
          hoverClasses[color],
        ]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subValue && (
            <p className="text-xs text-muted-foreground">{subValue}</p>
          )}
        </div>
        <div className={cn('p-2 rounded-xl bg-background/50', iconColors[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      {trend && (
        <div className={cn(
          'absolute bottom-2 right-2 flex items-center gap-1 text-xs',
          trend === 'up' ? 'text-emerald-500' :
          trend === 'down' ? 'text-rose-500' :
          'text-muted-foreground'
        )}>
          <TrendingUp className={cn(
            'w-3 h-3',
            trend === 'down' && 'rotate-180'
          )} />
        </div>
      )}

      {/* Click indicator */}
      {interactive && onClick && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
}

export default function ReconciliationStats({ stats, className, onCardClick }: ReconciliationStatsProps) {
  const matchRate = stats.totalShifts > 0 
    ? Math.round((stats.matchedShifts / stats.totalShifts) * 100) 
    : 0;
  
  const hoursDiff = stats.totalActualHours - stats.totalScheduledHours;
  const hoursDiffDisplay = hoursDiff >= 0 ? `+${hoursDiff.toFixed(1)}h` : `${hoursDiff.toFixed(1)}h`;

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      <StatCard
        icon={Calendar}
        label="Total Shifts"
        value={stats.totalShifts}
        subValue={`${matchRate}% matched`}
        color="blue"
        onClick={() => onCardClick?.('total_shifts')}
      />
      
      <StatCard
        icon={Clock}
        label="Pending"
        value={stats.pendingReconciliation}
        subValue="Need review"
        color="blue"
        onClick={() => onCardClick?.('pending')}
      />
      
      <StatCard
        icon={CheckCircle}
        label="Approved"
        value={stats.approvedCount}
        subValue="Ready for payroll"
        color="blue"
        onClick={() => onCardClick?.('approved')}
      />
      
      <StatCard
        icon={Flag}
        label="Flagged"
        value={stats.flaggedCount}
        subValue="Require attention"
        color="blue"
        onClick={() => onCardClick?.('flagged')}
      />
      
      <StatCard
        icon={XCircle}
        label="No Shows"
        value={stats.noShowCount}
        color="blue"
        onClick={() => onCardClick?.('no_shows')}
      />
      
      <StatCard
        icon={TrendingUp}
        label="Avg Variance"
        value={`${stats.averageVarianceMinutes}m`}
        color="blue"
        onClick={() => onCardClick?.('variance')}
      />
      
      <StatCard
        icon={Users}
        label="Scheduled Hours"
        value={stats.totalScheduledHours.toFixed(1)}
        subValue="Total for period"
        color="blue"
        onClick={() => onCardClick?.('scheduled_hours')}
      />
      
      <StatCard
        icon={Clock}
        label="Actual Hours"
        value={stats.totalActualHours.toFixed(1)}
        subValue={hoursDiffDisplay}
        color="blue"
        trend={hoursDiff >= 0 ? 'up' : 'down'}
        onClick={() => onCardClick?.('actual_hours')}
      />
    </div>
  );
}







