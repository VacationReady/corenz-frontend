'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  X,
  Clock,
  MapPin,
  Calendar,
  User,
  MessageSquare,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface Employee {
  id: string;
  User: {
    name: string;
    email: string;
    profileImageUrl?: string | null;
  };
  Department?: {
    name: string;
  } | null;
}

interface Shift {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  breakDuration: number;
  notes?: string | null;
  role?: string | null;
  location?: {
    id: string;
    name: string;
    address?: string | null;
  } | null;
}

interface ShiftSwapModalProps {
  shift: Shift;
  employees: Employee[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ShiftSwapModal({
  shift,
  employees,
  onClose,
  onSuccess,
}: ShiftSwapModalProps) {
  const [targetEmployeeId, setTargetEmployeeId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const startTime = new Date(shift.startTime);
  const endTime = new Date(shift.endTime);
  const durationHours = (
    (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) -
    shift.breakDuration / 60
  ).toFixed(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/shift-swaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shiftId: shift.id,
          targetEmployeeId,
          requestMessage: requestMessage.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create swap request');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create swap request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-gradient-to-br from-purple-900/90 via-indigo-900/90 to-blue-900/90 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/10 backdrop-blur-md border-b border-white/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <ArrowRightLeft className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Request Shift Swap</h2>
              <p className="text-sm text-gray-300">Find someone to cover your shift</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mx-6 mt-6 bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-green-200 font-semibold">Swap request sent successfully!</p>
              <p className="text-green-300/70 text-sm">Closing...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Shift Details */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5 space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Shift Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Date</p>
                  <p className="text-white font-semibold">
                    {format(startTime, 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                  <Clock className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Time</p>
                  <p className="text-white font-semibold">
                    {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                  </p>
                  <p className="text-gray-400 text-sm">{durationHours} hours</p>
                </div>
              </div>

              {shift.location && (
                <div className="flex items-start gap-3">
                  <div className="bg-green-500/20 p-2 rounded-lg">
                    <MapPin className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Location</p>
                    <p className="text-white font-semibold">{shift.location.name}</p>
                    {shift.location.address && (
                      <p className="text-gray-400 text-sm">{shift.location.address}</p>
                    )}
                  </div>
                </div>
              )}

              {shift.role && (
                <div className="flex items-start gap-3">
                  <div className="bg-amber-500/20 p-2 rounded-lg">
                    <User className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Role</p>
                    <p className="text-white font-semibold">{shift.role}</p>
                  </div>
                </div>
              )}
            </div>

            {shift.notes && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-gray-300 text-sm">{shift.notes}</p>
              </div>
            )}
          </div>

          {/* Target Employee Selection */}
          <div className="space-y-3">
            <label className="block">
              <span className="text-white font-semibold text-sm mb-2 block">
                Who would you like to swap with? *
              </span>
              <select
                value={targetEmployeeId || ''}
                onChange={(e) => setTargetEmployeeId(e.target.value || null)}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                required
              >
                <option value="" className="bg-gray-900">
                  Anyone can take it (open swap)
                </option>
                <optgroup label="Team Members" className="bg-gray-900">
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-gray-900">
                      {emp.User.name} {emp.Department && `- ${emp.Department.name}`}
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Select a specific person or leave open for anyone to accept
              </p>
            </label>
          </div>

          {/* Message */}
          <div className="space-y-3">
            <label className="block">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span className="text-white font-semibold text-sm">
                  Message (Optional)
                </span>
              </div>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Add a reason or note about this swap request..."
                rows={4}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {requestMessage.length}/500 characters
              </p>
            </label>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-blue-200 text-sm font-semibold">What happens next?</p>
              <ul className="text-blue-300/80 text-xs space-y-1">
                <li>• The selected employee (or all team members) will be notified</li>
                <li>• They can accept or decline your request</li>
                <li>• If accepted and manager approval is required, your manager will review it</li>
                <li>• You'll receive email updates on the status</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || success}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Sending...
                </span>
              ) : (
                'Request Swap'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
