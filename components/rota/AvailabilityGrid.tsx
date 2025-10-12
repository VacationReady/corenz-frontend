'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Save,
  X,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface AvailabilityPattern {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface AvailabilityException {
  id: string;
  date: string | Date;
  startTime?: string | null;
  endTime?: string | null;
  isAvailable: boolean;
  reason?: string | null;
}

interface AvailabilityGridProps {
  employeeId: string;
  patterns: AvailabilityPattern[];
  exceptions: AvailabilityException[];
  onUpdate: (patterns: AvailabilityPattern[]) => Promise<void>;
  readOnly?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export default function AvailabilityGrid({
  employeeId,
  patterns,
  exceptions,
  onUpdate,
  readOnly = false,
}: AvailabilityGridProps) {
  const [editMode, setEditMode] = useState(false);
  const [localPatterns, setLocalPatterns] = useState<AvailabilityPattern[]>(patterns);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);

  useEffect(() => {
    setLocalPatterns(patterns);
  }, [patterns]);

  const handleDayToggle = (dayOfWeek: number) => {
    if (readOnly || !editMode) return;

    const existingPattern = localPatterns.find((p) => p.dayOfWeek === dayOfWeek);

    if (existingPattern) {
      // Toggle availability
      setLocalPatterns(
        localPatterns.map((p) =>
          p.dayOfWeek === dayOfWeek ? { ...p, isAvailable: !p.isAvailable } : p
        )
      );
    } else {
      // Add new pattern (default to full day available)
      setLocalPatterns([
        ...localPatterns,
        {
          dayOfWeek,
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true,
        },
      ]);
    }
  };

  const handleTimeChange = (
    dayOfWeek: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    if (readOnly || !editMode) return;

    setLocalPatterns(
      localPatterns.map((p) =>
        p.dayOfWeek === dayOfWeek ? { ...p, [field]: value } : p
      )
    );
  };

  const handleRemovePattern = (dayOfWeek: number) => {
    if (readOnly || !editMode) return;
    setLocalPatterns(localPatterns.filter((p) => p.dayOfWeek !== dayOfWeek));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await onUpdate(localPatterns);
      setSuccess(true);
      setEditMode(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save availability');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalPatterns(patterns);
    setEditMode(false);
    setError(null);
  };

  const getDayStatus = (dayOfWeek: number) => {
    const pattern = localPatterns.find((p) => p.dayOfWeek === dayOfWeek);
    if (!pattern) return { available: true, label: 'Available (default)', color: 'gray' };

    if (pattern.isAvailable) {
      return {
        available: true,
        label: `Available ${pattern.startTime}-${pattern.endTime}`,
        color: 'green',
      };
    } else {
      return {
        available: false,
        label: 'Unavailable',
        color: 'red',
      };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/20 p-2 rounded-lg">
            <Calendar className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Weekly Availability</h3>
            <p className="text-sm text-gray-400">Set your regular weekly schedule</p>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Edit Availability
              </button>
            )}
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="text-green-200">Availability updated successfully!</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Availability Grid */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden">
        <div className="divide-y divide-white/10">
          {DAYS_OF_WEEK.map((day) => {
            const status = getDayStatus(day.value);
            const pattern = localPatterns.find((p) => p.dayOfWeek === day.value);

            return (
              <div
                key={day.value}
                className={`p-4 transition-colors ${
                  editMode && !readOnly ? 'hover:bg-white/5' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Day Label */}
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <button
                      onClick={() => handleDayToggle(day.value)}
                      disabled={!editMode || readOnly}
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                        status.available
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      } ${editMode && !readOnly ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                    >
                      {day.short}
                    </button>
                    <div>
                      <p className="text-white font-semibold">{day.label}</p>
                      <p className={`text-xs ${status.available ? 'text-green-400' : 'text-red-400'}`}>
                        {status.label}
                      </p>
                    </div>
                  </div>

                  {/* Time Selection */}
                  {pattern && pattern.isAvailable && (
                    <div className="flex items-center gap-3">
                      <select
                        value={pattern.startTime}
                        onChange={(e) =>
                          handleTimeChange(day.value, 'startTime', e.target.value)
                        }
                        disabled={!editMode || readOnly}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                      >
                        {TIME_SLOTS.map((time) => (
                          <option key={time} value={time} className="bg-gray-900">
                            {time}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-400">to</span>
                      <select
                        value={pattern.endTime}
                        onChange={(e) =>
                          handleTimeChange(day.value, 'endTime', e.target.value)
                        }
                        disabled={!editMode || readOnly}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                      >
                        {TIME_SLOTS.map((time) => (
                          <option key={time} value={time} className="bg-gray-900">
                            {time}
                          </option>
                        ))}
                      </select>
                      {editMode && !readOnly && (
                        <button
                          onClick={() => handleRemovePattern(day.value)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Reset to default"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-blue-200 text-sm font-semibold">How it works</p>
          <ul className="text-blue-300/80 text-xs space-y-1">
            <li>• Click a day to toggle between available and unavailable</li>
            <li>• Set specific time ranges when you're available</li>
            <li>• Gray days default to available unless specified</li>
            <li>• These patterns repeat every week</li>
            <li>• Use exceptions below for one-time unavailability (vacations, appointments, etc.)</li>
          </ul>
        </div>
      </div>

      {/* Upcoming Exceptions */}
      {exceptions.length > 0 && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            Upcoming Exceptions
          </h4>
          <div className="space-y-2">
            {exceptions.map((exception) => {
              const exceptionDate = typeof exception.date === 'string' ? parseISO(exception.date) : exception.date;
              return (
                <div
                  key={exception.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      exception.isAvailable
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {format(exceptionDate, 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-400">
                        {exception.isAvailable ? 'Available' : 'Unavailable'}
                        {exception.startTime && exception.endTime && ` (${exception.startTime}-${exception.endTime})`}
                      </p>
                      {exception.reason && (
                        <p className="text-xs text-gray-500 mt-1">{exception.reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
