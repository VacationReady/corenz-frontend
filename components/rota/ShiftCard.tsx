'use client';

import type { MouseEvent } from 'react';
import { format } from 'date-fns';
import {
  Clock,
  MapPin,
  User,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Building2,
  Square,
  CheckSquare,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

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

interface ShiftCardProps {
  shift: {
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
    } | null;
  };
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPublish?: () => void;
  onConfirm?: () => void;
  showActions?: boolean;
  compact?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export default function ShiftCard({
  shift,
  onClick,
  onEdit,
  onDelete,
  onPublish,
  onConfirm,
  showActions = true,
  compact = false,
  selectable = false,
  selected = false,
  onToggleSelect,
}: ShiftCardProps) {
  const startTime = new Date(shift.startTime);
  const endTime = new Date(shift.endTime);
  const durationHours = ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)) - (shift.breakDuration / 60);

  const handleCardClick = () => {
    onClick?.();
  };

  const handleToggleSelect = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleSelect?.();
  };

  const getStatusBadge = () => {
    const statusConfig = {
      SCHEDULED: {
        className: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
        icon: <Clock className="w-3 h-3" />,
        label: 'Scheduled',
      },
      CONFIRMED: {
        className: 'bg-green-500/20 text-green-600 border-green-500/30',
        icon: <CheckCircle className="w-3 h-3" />,
        label: 'Confirmed',
      },
      COMPLETED: {
        className: 'bg-green-500/20 text-green-600 border-green-500/30',
        icon: <CheckCircle className="w-3 h-3" />,
        label: 'Completed',
      },
      NO_SHOW: {
        className: 'bg-red-500/20 text-red-600 border-red-500/30',
        icon: <XCircle className="w-3 h-3" />,
        label: 'No Show',
      },
      CANCELLED: {
        className: 'bg-red-500/20 text-red-600 border-red-500/30',
        icon: <XCircle className="w-3 h-3" />,
        label: 'Cancelled',
      },
    };

    const config = statusConfig[shift.attendanceStatus];

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.className}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const getPublishedBadge = () => {
    if (shift.isPublished) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-600 border border-blue-500/30">
          Published
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
          Draft
        </span>
      );
    }
  };

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!onDelete) return;
    // Call onDelete - the parent component will handle showing the delete modal
    onDelete();
  };

  const handleEdit = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onEdit?.();
  };

  const handlePublish = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onPublish?.();
  };

  const handleConfirm = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onConfirm?.();
  };

  if (compact) {
    return (
      <div
        className={`bg-gray-800 backdrop-blur-md border ${
          selected ? 'border-primary/60' : 'border-gray-700'
        } rounded-lg p-3 hover:bg-gray-700 transition-all shadow-md ${
          onClick ? 'cursor-pointer' : ''
        }`}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">
              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {selectable && (
              <button
                type="button"
                onClick={handleToggleSelect}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-all ${
                  selected
                    ? 'bg-primary/20 border-primary/40 text-primary-foreground'
                    : 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                }`}
                aria-pressed={selected}
              >
                {selected ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                {selected ? 'Selected' : 'Select'}
              </button>
            )}
          </div>
        </div>

        {shift.employee && (
          <div className="flex items-center gap-2 text-sm text-gray-200">
            <User className="w-4 h-4 text-blue-400" />
            <span>{getEmployeeDisplayName(shift.employee.User)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 backdrop-blur-md border ${
        selected ? 'border-primary/60 ring-2 ring-primary/20' : 'border-slate-700/50'
      } rounded-2xl p-6 hover:border-slate-600 transition-all duration-300 shadow-xl shadow-black/20 ${
        onClick ? 'cursor-pointer hover:shadow-2xl hover:shadow-primary/5' : ''
      }`}
      onClick={handleCardClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : -1}
    >
      {/* Decorative gradient accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl pointer-events-none" />
      {/* Header */}
      <div className="relative flex items-start justify-between mb-5">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-lg font-bold text-white tracking-tight">
              {format(startTime, 'EEEE, MMMM d, yyyy')}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge()}
            {getPublishedBadge()}
            {shift.requiresConfirmation && !shift.confirmedAt && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-600 border border-yellow-500/30">
                <AlertCircle className="w-3 h-3" />
                Needs Confirmation
              </span>
            )}
          </div>
        </div>
        
        {showActions && (
          <div className="flex items-center gap-2">
            {selectable && (
              <button
                type="button"
                onClick={handleToggleSelect}
                className={`p-2.5 rounded-xl border transition-all duration-200 ${
                  selected
                    ? 'bg-primary/20 border-primary/40 text-primary-foreground shadow-lg shadow-primary/20'
                    : 'bg-slate-800/80 border-slate-600/50 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
                }`}
                aria-pressed={selected}
                title={selected ? 'Deselect shift' : 'Select shift'}
              >
                {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              </button>
            )}
            {onEdit && (
              <button
                onClick={handleEdit}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-blue-500/20 border border-slate-600/50 hover:border-blue-500/40 text-slate-300 hover:text-blue-400 transition-all duration-200"
                title="Edit shift"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 transition-all duration-200"
                title="Delete shift"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Time & Duration */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">Time</div>
            <div className="font-semibold text-white">
              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="p-2 rounded-lg bg-sky-500/10">
            <Clock className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">Duration</div>
            <div className="font-semibold text-white">
              {durationHours.toFixed(1)} hours
              {shift.breakDuration > 0 && (
                <span className="text-sm text-slate-400 ml-2">
                  ({shift.breakDuration} min break)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Employee & Department */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {shift.employee ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <Avatar
              src={shift.employee.User?.profileImageUrl ?? undefined}
              name={getEmployeeDisplayName(shift.employee.User) !== 'Unknown Employee' ? getEmployeeDisplayName(shift.employee.User) : undefined}
              size={40}
              className="border-2 border-blue-500/50 ring-2 ring-blue-500/20"
            />
            <div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">Employee</div>
              <div className="font-semibold text-white">
                {getEmployeeDisplayName(shift.employee.User)}
              </div>
              {shift.employee.Department && (
                <div className="text-xs text-slate-400">{shift.employee.Department.name}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="p-2 rounded-lg bg-slate-700/50">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">Employee</div>
              <div className="font-semibold text-white">Unassigned</div>
            </div>
          </div>
        )}

        {shift.department && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Building2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">Department</div>
              <div className="font-semibold text-white">{shift.department.name}</div>
            </div>
          </div>
        )}
      </div>

      {/* Location & Cost */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {shift.location && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">Location</div>
              <div className="font-semibold text-white">{shift.location.name}</div>
            </div>
          </div>
        )}

        {shift.cost !== null && shift.cost !== undefined && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-medium text-emerald-400/80 uppercase tracking-wide">Labor Cost</div>
              <div className="text-lg font-bold text-emerald-400">
                ${typeof shift.cost === 'number' ? shift.cost.toFixed(2) : parseFloat(String(shift.cost)).toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Role & Notes */}
      {(shift.role || shift.notes) && (
        <div className="relative border-t border-slate-700/50 pt-4 mt-4 space-y-3">
          {shift.role && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Role:</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/50 text-sm font-medium text-white">{shift.role}</span>
            </div>
          )}
          {shift.notes && (
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Notes:</span>
              <p className="mt-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-200 text-sm">{shift.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {showActions && (onPublish || onConfirm) && (
        <div className="relative border-t border-slate-700/50 pt-4 mt-4 flex gap-3">
          {onPublish && !shift.isPublished && (
            <button
              onClick={handlePublish}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium shadow-lg shadow-blue-500/20 transition-all duration-200"
            >
              Publish Shift
            </button>
          )}
          {onConfirm && shift.requiresConfirmation && !shift.confirmedAt && (
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all duration-200"
            >
              Confirm Attendance
            </button>
          )}
        </div>
      )}
    </div>
  );
}
