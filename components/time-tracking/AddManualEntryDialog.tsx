'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, X, Plus, AlertCircle, TrendingUp, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddManualEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddManualEntryDialog({
  open,
  onClose,
  onSuccess,
}: AddManualEntryDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timeIn, setTimeIn] = useState('09:00');
  const [timeOut, setTimeOut] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isOvertime, setIsOvertime] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<{ start: string; end: string } | null>(null);

  const calculateHours = () => {
    if (!date || !timeIn || !timeOut) return 0;
    
    const startTime = new Date(`${date}T${timeIn}`);
    const endTime = new Date(`${date}T${timeOut}`);
    
    if (endTime <= startTime) return 0;
    
    const diffMs = endTime.getTime() - startTime.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return Math.max(0, hours);
  };

  // Validate overtime entry against working hours
  const validateOvertimeEntry = async () => {
    if (!isOvertime || !date || !timeIn || !timeOut) return;

    setValidating(true);
    setValidationWarning(null);

    try {
      const response = await fetch('/api/timesheets/entries/validate-overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(date).toISOString(),
          startTime: `${date}T${timeIn}`,
          endTime: `${date}T${timeOut}`,
          isOvertime: true,
        }),
      });

      const result = await response.json();

      if (!result.isValid) {
        setValidationWarning(result.errors[0]?.message || 'Invalid overtime entry');
      } else {
        setValidationWarning(null);
      }

      // Store working hours for display
      if (result.workingHours) {
        setWorkingHours(result.workingHours);
      }
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setValidating(false);
    }
  };

  // Validate when overtime is toggled or times change
  React.useEffect(() => {
    if (isOvertime) {
      const timer = setTimeout(() => {
        validateOvertimeEntry();
      }, 500); // Debounce
      return () => clearTimeout(timer);
    } else {
      setValidationWarning(null);
      setWorkingHours(null);
    }
  }, [isOvertime, date, timeIn, timeOut]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!date || !timeIn || !timeOut) {
      setError('Please fill in all required fields');
      return;
    }

    const startTime = new Date(`${date}T${timeIn}`);
    const endTime = new Date(`${date}T${timeOut}`);

    if (endTime <= startTime) {
      setError('End time must be after start time');
      return;
    }

    // Check if date is not in the future
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (selectedDate > today) {
      setError('Cannot add entries for future dates');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/time-tracking/employee-manual-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clockInTime: startTime.toISOString(),
          clockOutTime: endTime.toISOString(),
          notes: notes.trim() || undefined,
          isOvertime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add entry');
      }

      toast({
        title: 'Entry added successfully',
        description: `${calculateHours().toFixed(2)} hours added to your timesheet`,
      });

      // Reset form
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setTimeIn('09:00');
      setTimeOut('17:00');
      setNotes('');
      setIsOvertime(false);
      setValidationWarning(null);
      setWorkingHours(null);
      
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error adding manual entry:', err);
      setError(err.message || 'Failed to add entry');
      toast({
        title: 'Failed to add entry',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  if (!open) return null;

  const hours = calculateHours();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-blue-600 px-6 py-5 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Add Time Entry</h2>
                <p className="text-blue-100 text-sm mt-0.5">Manually log hours you missed</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl animate-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 text-sm">Error</h4>
                <p className="text-red-700 text-sm mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Entry Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">Entry Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsOvertime(false)}
                disabled={loading}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  !isOvertime
                    ? 'border-blue-600 bg-blue-50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Clock className={`w-5 h-5 ${!isOvertime ? 'text-blue-600' : 'text-slate-400'}`} />
                <div className="text-left">
                  <div className={`font-semibold text-sm ${!isOvertime ? 'text-blue-900' : 'text-slate-700'}`}>
                    Regular Time
                  </div>
                  <div className="text-xs text-slate-500">Standard hours</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setIsOvertime(true)}
                disabled={loading}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  isOvertime
                    ? 'border-amber-500 bg-amber-50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <TrendingUp className={`w-5 h-5 ${isOvertime ? 'text-amber-600' : 'text-slate-400'}`} />
                <div className="text-left">
                  <div className={`font-semibold text-sm ${isOvertime ? 'text-amber-900' : 'text-slate-700'}`}>
                    Overtime
                  </div>
                  <div className="text-xs text-slate-500">Extra hours</div>
                </div>
              </button>
            </div>
          </div>

          {/* Working Hours Info */}
          {isOvertime && workingHours && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900 mb-1">Your Regular Hours</p>
                <p className="text-blue-700">
                  {workingHours.start} - {workingHours.end}
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  Overtime must be outside these hours.
                </p>
              </div>
            </div>
          )}

          {/* Validation Warning */}
          {validationWarning && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 text-sm">Validation Warning</h4>
                <p className="text-amber-700 text-sm mt-0.5">{validationWarning}</p>
              </div>
            </div>
          )}

          {/* Date Picker */}
          <div className="space-y-2">
            <label htmlFor="entry-date" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Calendar className="w-4 h-4 text-blue-600" />
              Date *
            </label>
            <input
              id="entry-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
          </div>

          {/* Time In/Out */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="time-in" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock className="w-4 h-4 text-emerald-600" />
                Time In *
              </label>
              <input
                id="time-in"
                type="time"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="time-out" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock className="w-4 h-4 text-rose-600" />
                Time Out *
              </label>
              <input
                id="time-out"
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
            </div>
          </div>

          {/* Hours Preview */}
          {hours > 0 && (
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
              <span className="text-sm font-medium text-slate-700">Total Hours</span>
              <span className="text-2xl font-bold text-blue-700">{hours.toFixed(2)}</span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="entry-notes" className="text-sm font-semibold text-slate-700">
              Notes <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              id="entry-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Forgot to clock in, worked from home..."
              rows={3}
              disabled={loading}
              maxLength={500}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-all"
            />
            <p className="text-xs text-slate-500">{notes.length}/500 characters</p>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">Important</p>
              <ul className="space-y-1 text-amber-800 list-disc list-inside">
                <li>Manual entries will be included in your timesheet</li>
                <li>Cannot overlap with existing clock entries</li>
                {isOvertime && <li>Overtime must be outside regular working hours</li>}
                <li>Subject to manager approval</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || hours <= 0 || (isOvertime && validating) || (isOvertime && !!validationWarning)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white rounded-xl font-medium shadow-lg shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Adding...
                </span>
              ) : (
                'Add Entry'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
