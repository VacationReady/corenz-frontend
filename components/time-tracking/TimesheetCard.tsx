'use client';

import React from 'react';
import { format } from 'date-fns';
import { Clock, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
      User: {
        name: string | null;
        profileImageUrl?: string | null;
      };
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

  const statusConfig = {
    PENDING: {
      label: 'Draft',
      color: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
      icon: AlertCircle,
    },
    APPROVED: {
      label: 'Approved',
      color: 'bg-green-500/20 text-green-600 border-green-500/30',
      icon: CheckCircle,
    },
    DECLINED: {
      label: 'Rejected',
      color: 'bg-red-500/20 text-red-600 border-red-500/30',
      icon: XCircle,
    },
  };

  const status = statusConfig[timesheet.approvalStatus as keyof typeof statusConfig] || statusConfig.PENDING;
  const StatusIcon = status.icon;

  const totalHours = typeof timesheet.totalHours === 'string' 
    ? parseFloat(timesheet.totalHours) 
    : timesheet.totalHours;
  const overtimeHours = typeof timesheet.overtimeHours === 'string' 
    ? parseFloat(timesheet.overtimeHours) 
    : timesheet.overtimeHours;

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-white/20 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:bg-white/15 transition-all shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">
              {format(periodStart, 'MMM d')} - {format(periodEnd, 'MMM d, yyyy')}
            </h3>
          </div>
          
          {showEmployee && timesheet.employee && (
            <div className="flex items-center gap-2 mt-2">
              {timesheet.employee.User.profileImageUrl ? (
                <img
                  src={timesheet.employee.User.profileImageUrl}
                  alt={timesheet.employee.User.name || 'Employee'}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {timesheet.employee.User.name?.charAt(0) || 'E'}
                </div>
              )}
              <span className="text-sm text-gray-300">
                {timesheet.employee.User.name}
              </span>
              {timesheet.employee.Department && (
                <span className="text-xs text-gray-400">
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
        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Total Hours</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalHours.toFixed(2)}</p>
        </div>

        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Regular</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {(typeof timesheet.regularHours === 'string' 
              ? parseFloat(timesheet.regularHours) 
              : timesheet.regularHours).toFixed(2)}
          </p>
        </div>

        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-gray-400">Overtime</span>
          </div>
          <p className="text-2xl font-bold text-white">{overtimeHours.toFixed(2)}</p>
        </div>
      </div>

      {/* Submission Info */}
      {timesheet.submittedAt && (
        <div className="text-xs text-gray-400 mb-4">
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
            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium border border-white/20"
          >
            Edit
          </button>
        )}
        
        {onSubmit && timesheet.approvalStatus === 'PENDING' && !timesheet.submittedAt && (
          <button
            onClick={onSubmit}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Submit
          </button>
        )}
      </div>
    </div>
  );
}
