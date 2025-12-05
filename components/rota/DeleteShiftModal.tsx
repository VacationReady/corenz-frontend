'use client';

import { useState } from 'react';
import { X, Trash2, Loader2, Mail, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface Shift {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  isPublished: boolean;
  employee?: {
    id: string;
    User?: {
      name?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    } | null;
  } | null;
}

interface DeleteShiftModalProps {
  isOpen: boolean;
  shift: Shift | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteShiftModal({
  isOpen,
  shift,
  onClose,
  onSuccess,
}: DeleteShiftModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [notifyEmployee, setNotifyEmployee] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine if employee can be notified (published + has employee with email)
  const canNotifyEmployee =
    shift?.isPublished &&
    shift?.employee?.User?.email;

  const employeeName = shift?.employee?.User?.name ||
    [shift?.employee?.User?.firstName, shift?.employee?.User?.lastName].filter(Boolean).join(' ') ||
    shift?.employee?.User?.email ||
    'the employee';

  const handleDelete = async () => {
    if (!shift) return;

    // Reason is required for published shifts
    if (shift.isPublished && !reason.trim()) {
      setError('Please provide a reason for deleting this published shift.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/shifts/${shift.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim() || undefined,
          notifyEmployee: canNotifyEmployee && notifyEmployee,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to delete shift');
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setNotifyEmployee(true);
    setError(null);
    onClose();
  };

  if (!isOpen || !shift) return null;

  const startTime = new Date(shift.startTime);
  const endTime = new Date(shift.endTime);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Delete Shift</h2>
                <p className="text-sm text-gray-400">
                  {format(startTime, 'EEEE, MMM d, yyyy')}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Shift Summary */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Time</span>
              <span className="text-white font-medium">
                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
              </span>
            </div>
            {shift.employee && (
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-gray-400">Employee</span>
                <span className="text-white font-medium">{employeeName}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-gray-400">Status</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                shift.isPublished
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
              }`}>
                {shift.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>

          {/* Warning for published shifts */}
          {shift.isPublished && (
            <div className="bg-amber-900/30 border border-amber-600/40 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-400 text-sm">Published Shift</h4>
                  <p className="text-sm text-amber-200/80 mt-1">
                    This shift has already been published to the employee. Deleting it will remove it from their schedule.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reason Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason for deletion {shift.isPublished && <span className="text-red-400">*</span>}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={shift.isPublished 
                ? "e.g., Shift cancelled due to low demand, Employee requested time off..."
                : "Optional reason for deleting this draft shift..."
              }
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 text-sm"
            />
          </div>

          {/* Notify Employee Toggle - Only for published shifts with employee email */}
          {canNotifyEmployee && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-start gap-3">
                <div className="flex items-center h-6">
                  <input
                    type="checkbox"
                    id="notifyEmployee"
                    checked={notifyEmployee}
                    onChange={(e) => setNotifyEmployee(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="notifyEmployee" className="flex items-center gap-2 text-sm font-medium text-gray-200 cursor-pointer">
                    <Mail className="w-4 h-4 text-blue-400" />
                    Notify {employeeName}
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    Send an email to inform the employee that their shift has been cancelled.
                    {reason.trim() && ' The reason you provided will be included in the email.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Shift
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

