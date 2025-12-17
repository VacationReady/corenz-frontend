'use client';

import { cn } from '@/lib/utils';
import { Clock, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';

export type VarianceType = 
  | 'ON_TIME'
  | 'EARLY_START'
  | 'LATE_START'
  | 'EARLY_END'
  | 'LATE_END'
  | 'OVERTIME'
  | 'UNDERTIME'
  | 'NO_SHOW'
  | 'UNSCHEDULED';

interface VarianceBadgeProps {
  varianceMinutes: number;
  varianceType?: VarianceType;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getVarianceConfig(varianceMinutes: number, varianceType?: VarianceType) {
  const absVariance = Math.abs(varianceMinutes);
  
  // No-show or unscheduled
  if (varianceType === 'NO_SHOW') {
    return {
      severity: 'critical' as const,
      color: 'rose',
      bgClass: 'bg-rose-100 dark:bg-rose-500/20',
      textClass: 'text-rose-700 dark:text-rose-400',
      borderClass: 'border-rose-300 dark:border-rose-500/40',
      icon: XCircle,
      label: 'No Show',
    };
  }
  
  if (varianceType === 'UNSCHEDULED') {
    return {
      severity: 'warning' as const,
      color: 'amber',
      bgClass: 'bg-amber-100 dark:bg-amber-500/20',
      textClass: 'text-amber-700 dark:text-amber-400',
      borderClass: 'border-amber-300 dark:border-amber-500/40',
      icon: AlertTriangle,
      label: 'Unscheduled',
    };
  }
  
  // On time (within ±5 min)
  if (absVariance <= 5) {
    return {
      severity: 'on_time' as const,
      color: 'emerald',
      bgClass: 'bg-emerald-100 dark:bg-emerald-500/20',
      textClass: 'text-emerald-700 dark:text-emerald-400',
      borderClass: 'border-emerald-300 dark:border-emerald-500/40',
      icon: CheckCircle,
      label: 'On Time',
    };
  }
  
  // Minor variance (±6-15 min)
  if (absVariance <= 15) {
    const sign = varianceMinutes > 0 ? '+' : '';
    return {
      severity: 'minor' as const,
      color: 'amber',
      bgClass: 'bg-amber-100 dark:bg-amber-500/20',
      textClass: 'text-amber-700 dark:text-amber-400',
      borderClass: 'border-amber-300 dark:border-amber-500/40',
      icon: Clock,
      label: `${sign}${varianceMinutes} min`,
    };
  }
  
  // Significant variance (>15 min)
  const sign = varianceMinutes > 0 ? '+' : '';
  const icon = varianceMinutes > 0 ? TrendingUp : TrendingDown;
  return {
    severity: 'significant' as const,
    color: 'rose',
    bgClass: 'bg-rose-100 dark:bg-rose-500/20',
    textClass: 'text-rose-700 dark:text-rose-400',
    borderClass: 'border-rose-300 dark:border-rose-500/40',
    icon,
    label: `${sign}${varianceMinutes} min`,
  };
}

export default function VarianceBadge({
  varianceMinutes,
  varianceType,
  showIcon = true,
  size = 'md',
  className,
}: VarianceBadgeProps) {
  const config = getVarianceConfig(varianceMinutes, varianceType);
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium border',
        config.bgClass,
        config.textClass,
        config.borderClass,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </span>
  );
}

// Export helper for programmatic use
export function getVarianceSeverity(varianceMinutes: number): 'on_time' | 'minor' | 'significant' | 'critical' {
  const absVariance = Math.abs(varianceMinutes);
  if (absVariance <= 5) return 'on_time';
  if (absVariance <= 15) return 'minor';
  return 'significant';
}






