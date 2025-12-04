'use client';

import { useState } from 'react';
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
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!onDelete) return;

    const confirmed = window.confirm('Are you sure you want to delete this shift?');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
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
      className={`bg-gray-900 backdrop-blur-md border ${
        selected ? 'border-primary/60' : 'border-gray-700'
      } rounded-xl p-6 hover:bg-gray-800 transition-all shadow-lg ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={handleCardClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : -1}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white">
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
                className={`p-2 rounded-lg border transition-all ${
                  selected
                    ? 'bg-primary/20 border-primary/40 text-primary-foreground'
                    : 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700'
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
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white transition-all"
                title="Edit shift"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && !shift.isPublished && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 transition-all disabled:opacity-50"
                title="Delete shift"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Time & Duration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2 text-gray-200">
          <Clock className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-sm text-gray-300">Time</div>
            <div className="font-semibold text-white">
              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-gray-200">
          <Clock className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-sm text-gray-300">Duration</div>
            <div className="font-semibold text-white">
              {durationHours.toFixed(1)} hours
              {shift.breakDuration > 0 && (
                <span className="text-sm text-gray-400 ml-2">
                  ({shift.breakDuration} min break)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Employee & Department */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {shift.employee ? (
          <div className="flex items-center gap-3">
            {shift.employee.User?.profileImageUrl ? (
              <img
                src={shift.employee.User.profileImageUrl}
                alt={getEmployeeDisplayName(shift.employee.User)}
                className="w-10 h-10 rounded-full border-2 border-blue-500"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-blue-500 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <div className="text-sm text-gray-300">Employee</div>
              <div className="font-medium text-white">
                {getEmployeeDisplayName(shift.employee.User)}
              </div>
              {shift.employee.Department && (
                <div className="text-xs text-gray-400">{shift.employee.Department.name}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-300">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm">Employee</div>
              <div className="font-medium text-white">Unassigned</div>
            </div>
          </div>
        )}

        {shift.department && (
          <div className="flex items-center gap-2 text-gray-200">
            <Building2 className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-sm text-gray-300">Department</div>
              <div className="font-semibold text-white">{shift.department.name}</div>
            </div>
          </div>
        )}
      </div>

      {/* Location & Cost */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {shift.location && (
          <div className="flex items-center gap-2 text-gray-200">
            <MapPin className="w-5 h-5 text-green-400" />
            <div>
              <div className="text-sm text-gray-300">Location</div>
              <div className="font-semibold text-white">{shift.location.name}</div>
            </div>
          </div>
        )}

        {shift.cost !== null && shift.cost !== undefined && (
          <div className="flex items-center gap-2 text-gray-200">
            <DollarSign className="w-5 h-5 text-green-400" />
            <div>
              <div className="text-sm text-gray-300">Labor Cost</div>
              <div className="font-medium text-green-400">
                ${typeof shift.cost === 'number' ? shift.cost.toFixed(2) : parseFloat(String(shift.cost)).toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Role & Notes */}
      {(shift.role || shift.notes) && (
        <div className="border-t border-gray-700 pt-4 mt-4 space-y-2">
          {shift.role && (
            <div>
              <span className="text-sm text-gray-300 font-semibold">Role:</span>
              <span className="ml-2 text-white">{shift.role}</span>
            </div>
          )}
          {shift.notes && (
            <div>
              <span className="text-sm text-gray-300 font-semibold">Notes:</span>
              <p className="mt-1 text-gray-200 text-sm">{shift.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {showActions && (onPublish || onConfirm) && (
        <div className="border-t border-gray-700 pt-4 mt-4 flex gap-2">
          {onPublish && !shift.isPublished && (
            <button
              onClick={handlePublish}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
            >
              Publish Shift
            </button>
          )}
          {onConfirm && shift.requiresConfirmation && !shift.confirmedAt && (
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-all"
            >
              Confirm Attendance
            </button>
          )}
        </div>
      )}
    </div>
  );
}
