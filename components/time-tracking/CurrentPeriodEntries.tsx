'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Calendar, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import TimesheetTable from './TimesheetTable';
import TimesheetCard from './TimesheetCard';

interface CurrentPeriodEntriesProps {
  onRefresh?: () => void;
  onViewTimesheet?: (timesheet: any) => void;
}

interface Entry {
  id: string;
  date: Date | string;
  startTime: Date | string;
  endTime: Date | string;
  breakMinutes: number;
  hours: number;
  isOvertime: boolean;
  notes?: string | null;
  entryType: string;
  clockInLocation?: { lat: number; lng: number; accuracy?: number } | null;
  clockOutLocation?: { lat: number; lng: number; accuracy?: number } | null;
  locationName?: string | null;
}

interface Summary {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  entryCount: number;
  clockEntryCount: number;
  manualEntryCount: number;
}

interface Timesheet {
  id: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  totalHours: number | string;
  regularHours: number | string;
  overtimeHours: number | string;
  approvalStatus: string;
  submittedAt?: Date | string | null;
  approvedAt?: Date | string | null;
}

export default function CurrentPeriodEntries({ onRefresh, onViewTimesheet }: CurrentPeriodEntriesProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [periodEnd, setPeriodEnd] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentPeriod = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/timesheets/current-period');
      if (!response.ok) {
        throw new Error('Failed to fetch current period entries');
      }

      const data = await response.json();
      setEntries(data.entries || []);
      setTimesheets(data.timesheets || []);
      setSummary(data.summary || null);
      setPeriodStart(data.periodStart ? new Date(data.periodStart) : null);
      setPeriodEnd(data.periodEnd ? new Date(data.periodEnd) : null);
    } catch (err) {
      console.error('Error fetching current period:', err);
      setError('Failed to load current period entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentPeriod();
  }, []);

  const handleRefresh = () => {
    fetchCurrentPeriod();
    if (onRefresh) {
      onRefresh();
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl p-6 animate-pulse">
        <div className="h-8 bg-white/10 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-white/10 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-6">
        <p className="text-red-300">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            {periodStart && periodEnd && (
              <p className="text-sm text-slate-400">
                {format(periodStart, 'MMM d')} - {format(periodEnd, 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-slate-400 hover:text-slate-200" />
        </button>
      </div>

      {/* Summary Cards */}
      {summary && summary.entryCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-4">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Total Hours
            </h4>
            <p className="text-2xl font-bold text-slate-900">{summary.totalHours.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {summary.entryCount} {summary.entryCount === 1 ? 'entry' : 'entries'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-green-50 to-white p-4">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Regular Hours
            </h4>
            <p className="text-2xl font-bold text-slate-900">{summary.regularHours.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {summary.clockEntryCount} clock {summary.clockEntryCount === 1 ? 'entry' : 'entries'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-4">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Overtime Hours
            </h4>
            <p className="text-2xl font-bold text-amber-600">{summary.overtimeHours.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {summary.manualEntryCount} manual {summary.manualEntryCount === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        </div>
      )}

      {/* Current Period Timesheets */}
      {timesheets.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-600">Submitted Timesheets</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {timesheets.map((timesheet) => (
              <TimesheetCard
                key={timesheet.id}
                timesheet={timesheet}
                onView={onViewTimesheet ? () => onViewTimesheet(timesheet) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Entries Table */}
      {entries.length > 0 ? (
        <TimesheetTable entries={entries} editable={false} isLoading={false} />
      ) : timesheets.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Entries Yet</h3>
          <p className="text-slate-500 text-sm">
            Clock in/out or add manual entries to see them here. Once you generate a timesheet, these entries will be included.
          </p>
        </div>
      ) : null}
    </div>
  );
}
