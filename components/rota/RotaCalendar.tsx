'use client';

import { useState } from 'react';
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameDay,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  addMonths,
  subMonths,
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  AlertTriangle,
} from 'lucide-react';
import ShiftCard from './ShiftCard';

interface Shift {
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
    User: {
      name: string;
      email: string;
      profileImageUrl?: string | null;
    };
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
    address?: string | null;
  } | null;
}

interface Conflict {
  type: 'DOUBLE_BOOKING' | 'REST_PERIOD' | 'OVERTIME' | 'UNAVAILABLE' | 'SKILL_MISMATCH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  shift1Id?: string;
  shift2Id?: string;
  employeeId: string;
}

interface RotaCalendarProps {
  shifts: Shift[];
  conflicts?: Conflict[];
  view?: 'week' | 'month';
  onShiftClick?: (shift: Shift) => void;
  onDateClick?: (date: Date) => void;
  onShiftEdit?: (shift: Shift) => void;
  onShiftDelete?: (shiftId: string) => void;
  showActions?: boolean;
}

export default function RotaCalendar({
  shifts,
  conflicts = [],
  view = 'week',
  onShiftClick,
  onDateClick,
  onShiftEdit,
  onShiftDelete,
  showActions = true,
}: RotaCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'week' | 'month'>(view);

  // Get date range based on view
  const getDateRange = () => {
    if (currentView === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      };
    }
  };

  const dateRange = getDateRange();
  const days = eachDayOfInterval(dateRange);

  // Navigate dates
  const goToPrevious = () => {
    if (currentView === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const goToNext = () => {
    if (currentView === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get shifts for a specific date
  const getShiftsForDate = (date: Date): Shift[] => {
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.startTime);
      return isSameDay(shiftDate, date);
    });
  };

  // Get conflicts for a specific shift
  const getShiftConflicts = (shiftId: string): Conflict[] => {
    return conflicts.filter(
      c => c.shift1Id === shiftId || c.shift2Id === shiftId
    );
  };

  // Get conflicts for a specific date
  const getConflictsForDate = (date: Date): Conflict[] => {
    const dateShifts = getShiftsForDate(date);
    const shiftIds = dateShifts.map(s => s.id);
    return conflicts.filter(
      c => (c.shift1Id && shiftIds.includes(c.shift1Id)) || 
           (c.shift2Id && shiftIds.includes(c.shift2Id))
    );
  };

  return (
    <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl overflow-hidden shadow-xl">
      {/* Header Controls */}
      <div className="p-6 border-b border-gray-700 bg-gray-800/50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-600 border border-blue-500">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {currentView === 'week' 
                  ? `Week of ${format(dateRange.start, 'MMM d, yyyy')}`
                  : format(currentDate, 'MMMM yyyy')
                }
              </h2>
              <p className="text-sm text-gray-400">
                {shifts.length} shift{shifts.length !== 1 ? 's' : ''} scheduled
                {conflicts.length > 0 && (
                  <span className="ml-2 text-amber-400">
                    · {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex rounded-lg bg-gray-800 border border-gray-600 p-1">
              <button
                onClick={() => setCurrentView('week')}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  currentView === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setCurrentView('month')}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  currentView === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                Month
              </button>
            </div>

            {/* Navigation */}
            <button
              onClick={goToPrevious}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm font-medium transition-all"
            >
              Today
            </button>
            <button
              onClick={goToNext}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {currentView === 'week' ? (
          // Week View
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {days.map((day) => {
              const dayShifts = getShiftsForDate(day);
              const dayConflicts = getConflictsForDate(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div 
                  key={day.toISOString()} 
                  className={`bg-gray-800 rounded-lg p-4 min-h-[200px] border-2 transition-all ${
                    isToday 
                      ? 'border-blue-500 bg-blue-900/30' 
                      : 'border-gray-700 hover:border-gray-600'
                  } ${onDateClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onDateClick && onDateClick(day)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-gray-300 uppercase font-semibold">
                        {format(day, 'EEE')}
                      </div>
                      <div className={`text-lg font-semibold ${
                        isToday ? 'text-blue-400' : 'text-white'
                      }`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                    {dayConflicts.length > 0 && (
                      <div className="p-1 rounded bg-amber-600 border border-amber-500">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {dayShifts.length === 0 ? (
                      <div className="text-center py-8 text-gray-300 text-sm font-medium">
                        No shifts
                      </div>
                    ) : (
                      dayShifts.map((shift) => {
                        const shiftConflicts = getShiftConflicts(shift.id);
                        return (
                          <div 
                            key={shift.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onShiftClick && onShiftClick(shift);
                            }}
                            className={`p-2 rounded-lg border cursor-pointer transition-all ${
                              shiftConflicts.length > 0
                                ? 'bg-amber-900/50 border-amber-600 hover:bg-amber-900/70'
                                : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                            }`}
                          >
                            <div className="text-xs font-semibold text-white mb-1">
                              {format(new Date(shift.startTime), 'h:mm a')}
                            </div>
                            {shift.employee && (
                              <div className="text-xs text-gray-200 truncate font-medium">
                                {shift.employee.User.name}
                              </div>
                            )}
                            {shiftConflicts.length > 0 && (
                              <div className="text-xs text-amber-400 mt-1">
                                ⚠ {shiftConflicts.length} conflict{shiftConflicts.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Month View - Simplified list
          <div className="space-y-4">
            {eachWeekOfInterval(dateRange, { weekStartsOn: 1 }).map((weekStart) => {
              const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
              const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
              const weekShifts = weekDays.flatMap(day => getShiftsForDate(day));

              if (weekShifts.length === 0) return null;

              return (
                <div key={weekStart.toISOString()} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-sm font-semibold text-white mb-3">
                    Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {weekShifts.map((shift) => (
                      <ShiftCard
                        key={shift.id}
                        shift={shift}
                        compact
                        onEdit={() => onShiftEdit && onShiftEdit(shift)}
                        onDelete={() => onShiftDelete && onShiftDelete(shift.id)}
                        showActions={showActions}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty State */}
      {shifts.length === 0 && (
        <div className="p-12 text-center">
          <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Shifts Scheduled</h3>
          <p className="text-gray-200">
            {onDateClick 
              ? 'Click on a date to create a new shift'
              : 'There are no shifts scheduled for this period'
            }
          </p>
        </div>
      )}
    </div>
  );
}
