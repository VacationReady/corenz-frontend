'use client';

import React from 'react';
import { format } from 'date-fns';
import { Clock, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// Helper function to get display name from User object
function getEmployeeDisplayName(user: { name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null } | null | undefined): string {
  if (!user) return 'Unknown Employee';
  if (user.name) return user.name;
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ');
  }
  if (user.email) return user.email;
  return 'Unknown Employee';
}

interface TimesheetCardProps {
  timesheet: {
    id: string;
    periodStart: Date | string;
    periodEnd: Date | string;
    totalHours: number | string;
    regularHours: number | string;
    overtimeHours: number | string;
    approvalStatus: string;
    submittedAt?: Date | string | null;
    approvedAt?: Date | string | null;
    employee?: {
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
    };
  };
  onView?: () => void;
  onSubmit?: () => void;
  onEdit?: () => void;
  isLoading?: boolean;
  showEmployee?: boolean;
}

export default function TimesheetCard({
  timesheet,
  onView,
  onSubmit,
  onEdit,
  isLoading = false,
  showEmployee = false,
}: TimesheetCardProps) {
  const periodStart = typeof timesheet.periodStart === 'string' 
    ? new Date(timesheet.periodStart) 
    : timesheet.periodStart;
  const periodEnd = typeof timesheet.periodEnd === 'string' 
    ? new Date(timesheet.periodEnd) 
    : timesheet.periodEnd;

  const baseStatusConfig = {
    APPROVED: {
      label: 'Approved',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: CheckCircle,
    },
    DECLINED: {
      label: 'Rejected',
      color: 'bg-rose-100 text-rose-700 border-rose-200',
      icon: XCircle,
    },
  } as const;

  const status = (() => {
    if (timesheet.approvalStatus === 'PENDING') {
      if (timesheet.submittedAt) {
        return {
          label: 'Pending Approval',
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          icon: Clock,
        } as const;
      }

      return {
        label: 'Draft',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: AlertCircle,
      } as const;
    }

    return (
      baseStatusConfig[timesheet.approvalStatus as keyof typeof baseStatusConfig] ?? {
        label: 'Draft',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: AlertCircle,
      }
    );
  })();
  const StatusIcon = status.icon;

  const totalHours = typeof timesheet.totalHours === 'string' 
    ? parseFloat(timesheet.totalHours) || 0
    : (timesheet.totalHours ?? 0);
  const overtimeHours = typeof timesheet.overtimeHours === 'string' 
    ? parseFloat(timesheet.overtimeHours) || 0
    : (timesheet.overtimeHours ?? 0);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse shadow-sm">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              {format(periodStart, 'MMM d')} - {format(periodEnd, 'MMM d, yyyy')}
            </h3>
          </div>
          
          {showEmployee && timesheet.employee && (
            <div className="flex items-center gap-2 mt-2">
              {timesheet.employee.User?.profileImageUrl ? (
                <img
                  src={timesheet.employee.User.profileImageUrl}
                  alt={getEmployeeDisplayName(timesheet.employee.User)}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-700 flex items-center justify-center text-xs font-bold">
                  {getEmployeeDisplayName(timesheet.employee.User).charAt(0)}
                </div>
              )}
              <span className="text-sm text-slate-600">
                {getEmployeeDisplayName(timesheet.employee.User)}
              </span>
              {timesheet.employee.Department && (
                <span className="text-xs text-slate-500">
                  • {timesheet.employee.Department.name}
                </span>
              )}
            </div>
          )}
        </div>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${status.color}`}>
          <StatusIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{status.label}</span>
        </div>
      </div>

      {/* Hours Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 h-5 mb-1">
            <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-xs text-slate-500 whitespace-nowrap">Total</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalHours.toFixed(2)}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 h-5 mb-1">
            <Clock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-xs text-slate-500 whitespace-nowrap">Regular</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {(typeof timesheet.regularHours === 'string' 
              ? parseFloat(timesheet.regularHours) || 0
              : (timesheet.regularHours ?? 0)).toFixed(2)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 h-5 mb-1">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-xs text-slate-500 whitespace-nowrap">Overtime</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{overtimeHours.toFixed(2)}</p>
        </div>
      </div>

      {/* Submission Info */}
      {timesheet.submittedAt && (
        <div className="text-xs text-slate-500 mb-4">
          Submitted {format(
            typeof timesheet.submittedAt === 'string' 
              ? new Date(timesheet.submittedAt) 
              : timesheet.submittedAt, 
            'MMM d, yyyy h:mm a'
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {onView && (
          <button
            onClick={onView}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            View Details
          </button>
        )}
        
        {onEdit && timesheet.approvalStatus === 'PENDING' && !timesheet.submittedAt && (
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-sm font-medium"
          >
            Edit
          </button>
        )}
        
        {onSubmit && timesheet.approvalStatus === 'PENDING' && !timesheet.submittedAt && (
          <button
            onClick={onSubmit}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Submit
          </button>
        )}
      </div>
    </div>
  );
}
