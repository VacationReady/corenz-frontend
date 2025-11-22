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

interface WorkingPatternDay {
  day: string;
  type: string;
  startTime?: string | null;
  endTime?: string | null;
  hoursPerDay?: number | null;
}

interface WorkingPattern {
  id: string;
  name: string;
  description?: string | null;
  days: WorkingPatternDay[];
}

interface AvailabilityGridProps {
  employeeId: string;
  patterns: AvailabilityPattern[];
  exceptions: AvailabilityException[];
  onUpdate: (patterns: AvailabilityPattern[]) => Promise<void>;
  readOnly?: boolean;
  workingPattern?: WorkingPattern | null;
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
  workingPattern,
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

  // Helper function to map day names to day of week numbers
  const getDayOfWeekFromName = (dayName: string): number => {
    const dayMap: Record<string, number> = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
    };
    return dayMap[dayName] ?? -1;
  };

  // Helper function to get working pattern for a specific day
  const getWorkingPatternForDay = (dayOfWeek: number): WorkingPatternDay | null => {
    if (!workingPattern?.days) return null;
    
    const dayName = DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label;
    if (!dayName) return null;

    return workingPattern.days.find(
      d => d.day.toUpperCase() === dayName.toUpperCase()
    ) || null;
  };

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
    const availPattern = localPatterns.find((p) => p.dayOfWeek === dayOfWeek);
    const workPattern = getWorkingPatternForDay(dayOfWeek);

    // Priority 1: Working Pattern (shows as unavailable - already working)
    if (workPattern && workPattern.type !== 'NON_WORKING_DAY') {
      const startTime = workPattern.startTime || '09:00';
      const endTime = workPattern.endTime || '17:00';
      let label = '';
      
      switch (workPattern.type) {
        case 'FULL_DAY':
          label = `Working ${startTime}-${endTime}`;
          break;
        case 'HALF_DAY_AM':
          label = `Working ${startTime}-${endTime} (Morning)`;
          break;
        case 'HALF_DAY_PM':
          label = `Working ${startTime}-${endTime} (Afternoon)`;
          break;
        default:
          label = `Working ${startTime}-${endTime}`;
      }

      return {
        available: false,
        label,
        color: 'blue',
        isWorkingPattern: true,
        workingHours: { startTime, endTime },
      };
    }

    // Priority 2: Availability Pattern (employee-set preferences/constraints)
    if (availPattern) {
      if (availPattern.isAvailable) {
        return {
          available: true,
          label: `Available ${availPattern.startTime}-${availPattern.endTime}`,
          color: 'green',
          isWorkingPattern: false,
        };
      } else {
        return {
          available: false,
          label: `Unavailable ${availPattern.startTime}-${availPattern.endTime}`,
          color: 'red',
          isWorkingPattern: false,
        };
      }
    }

    // Priority 3: Default (available, no constraints)
    return { 
      available: true, 
      label: 'Available (no restrictions)', 
      color: 'gray',
      isWorkingPattern: false,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-lg border border-purple-500">
            <Calendar className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Weekly Availability</h3>
            <p className="text-sm text-gray-400">
              {workingPattern 
                ? `Your working pattern: ${workingPattern.name}` 
                : 'Manage your availability preferences and constraints'}
            </p>
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
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-md"
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
      <div className="bg-gray-900 backdrop-blur-md border border-gray-700 rounded-xl overflow-hidden shadow-lg">
        <div className="divide-y divide-gray-700">
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
                      disabled={!editMode || readOnly || status.isWorkingPattern}
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                        status.isWorkingPattern
                          ? 'bg-blue-700 text-white border-2 border-blue-400'
                          : status.available
                          ? 'bg-green-700 text-white border border-green-500'
                          : 'bg-red-700 text-white border border-red-500'
                      } ${editMode && !readOnly && !status.isWorkingPattern ? 'cursor-pointer hover:scale-105' : 'cursor-default opacity-90'}`}
                      title={status.isWorkingPattern ? 'Working pattern - cannot be edited here' : ''}
                    >
                      {day.short}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold">{day.label}</p>
                        {status.isWorkingPattern && (
                          <span className="px-2 py-0.5 bg-blue-500/30 text-blue-300 text-xs font-medium rounded-full border border-blue-500/50">
                            Work Day
                          </span>
                        )}
                      </div>
                      <p className={`text-xs font-medium ${
                        status.isWorkingPattern 
                          ? 'text-blue-400' 
                          : status.available 
                          ? 'text-green-400' 
                          : 'text-red-400'
                      }`}>
                        {status.label}
                      </p>
                    </div>
                  </div>

                  {/* Time Selection - Only show for availability patterns, not working patterns */}
                  {!status.isWorkingPattern && pattern && pattern.isAvailable && (
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
                  
                  {/* Show working pattern info (read-only) */}
                  {status.isWorkingPattern && status.workingHours && (
                    <div className="flex items-center gap-3 text-blue-300 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{status.workingHours.startTime} - {status.workingHours.endTime}</span>
                      <span className="text-blue-400/70 text-xs italic">
                        (Standard work schedule)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/40 border border-blue-600 rounded-xl p-4 flex gap-3 shadow-md">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-blue-300 text-sm font-semibold">How Availability Works</p>
          <ul className="text-gray-200 text-xs space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">🔵</span>
              <span><strong className="text-blue-300">Working Days (Blue):</strong> Your standard work schedule from your working pattern. You're already working these hours, so you're unavailable for additional shifts.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 font-bold">🔴</span>
              <span><strong className="text-red-300">Unavailable (Red):</strong> Times you cannot work due to personal constraints (e.g., "Can't work evenings" or "Doctor appointment").</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold">🟢</span>
              <span><strong className="text-green-300">Available (Green):</strong> Times outside your standard schedule when you're available for additional work or overtime.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 font-bold">⚪</span>
              <span><strong className="text-gray-300">Default Available:</strong> Days with no working pattern or constraints - available for scheduling.</span>
            </li>
            <li className="mt-2 text-gray-300 italic">💡 Tip: Use "Exceptions" below for one-time changes like vacations or appointments.</li>
          </ul>
        </div>
      </div>

      {/* Upcoming Exceptions */}
      {exceptions.length > 0 && (
        <div className="bg-gray-900 backdrop-blur-md border border-gray-700 rounded-xl p-5 shadow-lg">
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
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 ${
                      exception.isAvailable
                        ? 'bg-green-700 text-white border-green-500'
                        : 'bg-red-700 text-white border-red-500'
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
