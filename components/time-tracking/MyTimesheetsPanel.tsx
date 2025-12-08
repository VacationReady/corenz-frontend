'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Calendar, PlusCircle, CheckCircle2 } from 'lucide-react';
import ClockWidget from './ClockWidget';
import TimesheetCard from './TimesheetCard';
import TimesheetDetailView from './TimesheetDetailView';
import AddManualEntryDialog from './AddManualEntryDialog';
import CurrentPeriodEntries from './CurrentPeriodEntries';

type TimesheetListItem = {
  id: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  totalHours: string | number;
  regularHours: string | number;
  overtimeHours: string | number;
  approvalStatus: string;
  submittedAt?: string | Date | null;
  approvedAt?: string | Date | null;
  employee?: {
    User: {
      name: string | null;
      profileImageUrl?: string | null;
    };
    Department?: {
      name: string;
    } | null;
  };
  [key: string]: any;
};

interface MyTimesheetsPanelProps {
  variant?: 'page' | 'embedded';
}

export default function MyTimesheetsPanel({ variant = 'page' }: MyTimesheetsPanelProps) {
  const { status } = useSession();

  const [timesheets, setTimesheets] = useState<TimesheetListItem[]>([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntryDialog, setShowManualEntryDialog] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      void fetchTimesheets();
    }
  }, [status]);

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/timesheets');
      if (!response.ok) {
        throw new Error('Failed to fetch timesheets');
      }

      const data = await response.json();
      setTimesheets(data.timesheets || []);
    } catch (err) {
      console.error('Error fetching timesheets:', err);
      setError('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimesheetDetails = async (id: string) => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch(`/api/timesheets/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch timesheet details');
      }

      const data = await response.json();
      setSelectedTimesheet(data.timesheet);
    } catch (err) {
      console.error('Error fetching timesheet details:', err);
      setError('Failed to load timesheet details');
    } finally {
      setActionLoading(false);
    }
  };


  const handleSubmitTimesheet = async () => {
    if (!selectedTimesheet) return;

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch(`/api/timesheets/${selectedTimesheet.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit timesheet');
      }

      const data = await response.json();
      setSelectedTimesheet(data.timesheet);

      await fetchTimesheets();
    } catch (err: any) {
      console.error('Error submitting timesheet:', err);
      setError(err.message || 'Failed to submit timesheet');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewTimesheet = (timesheet: TimesheetListItem) => {
    void fetchTimesheetDetails(timesheet.id);
  };

  const handleBack = () => {
    setSelectedTimesheet(null);
    void fetchTimesheets();
  };

  const renderHero = () => (
    <div className="rounded-3xl bg-gradient-to-br from-blue-600/30 via-indigo-500/20 to-purple-600/30 border border-white/10 shadow-xl p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs uppercase tracking-wider text-white/80">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Up to date
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
              {variant === 'page' ? 'My Timesheets' : 'Manage your timesheets'}
            </h1>
            <p className="mt-2 text-base lg:text-lg text-white/80">
              Track your hours and view your timesheet history. Timesheets are automatically submitted for approval.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowManualEntryDialog(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition px-4 py-3 font-semibold shadow-lg shadow-emerald-500/30"
        >
          <PlusCircle className="w-5 h-5" />
          Add Time Entry
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-black/30 border border-white/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <p className="text-sm text-emerald-400 font-medium">Auto-Submit</p>
          </div>
          <p className="text-white/90 text-sm">
            Timesheets are automatically submitted for approval when you clock out.
          </p>
        </div>
        <div className="rounded-2xl bg-black/30 border border-white/10 p-4">
          <p className="text-sm text-white/60">Fast Approvals</p>
          <p className="mt-2 text-white/90 text-sm">
            We route your timesheet to the right approvers instantly.
          </p>
        </div>
        <div className="rounded-2xl bg-black/30 border border-white/10 p-4">
          <p className="text-sm text-white/60">Stay Compliant</p>
          <p className="mt-2 text-white/90 text-sm">
            All submissions are tracked in audit logs and surfaced for approvers automatically.
          </p>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    error && (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
        {error}
      </div>
    )
  );

  if (status === 'loading' || loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-white/5 border border-white/10 h-52 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-white/5 border border-white/10 h-48 animate-pulse" />
          <div className="rounded-2xl bg-white/5 border border-white/10 h-48 animate-pulse" />
          <div className="rounded-2xl bg-white/5 border border-white/10 h-48 animate-pulse" />
        </div>
      </div>
    );
  }

  if (selectedTimesheet) {
    return (
      <div className="space-y-6">
        {renderError()}
        <TimesheetDetailView
          timesheet={selectedTimesheet}
          onBack={handleBack}
          onSubmit={
            selectedTimesheet.approvalStatus === 'PENDING' && !selectedTimesheet.submittedAt
              ? handleSubmitTimesheet
              : undefined
          }
          canSubmit={
            selectedTimesheet.approvalStatus === 'PENDING' && !selectedTimesheet.submittedAt
          }
          isLoading={actionLoading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderHero()}

      {renderError()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-blue-950/60 via-blue-900/40 to-purple-900/40 border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-blue-300" />
              <div>
                <h2 className="text-lg font-semibold text-white">Current Period</h2>
                <p className="text-sm text-white/70">
                  Your hours for the current pay period are shown below.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-6">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-emerald-300 text-sm">
                Timesheets are automatically submitted for approval when you clock out or add a time entry.
              </p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <CurrentPeriodEntries onRefresh={fetchTimesheets} />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Past Timesheets</h2>
            {timesheets.length === 0 ? (
              <div className="rounded-3xl bg-white/5 border border-white/10 p-12 text-center space-y-4">
                <Calendar className="w-14 h-14 text-white/30 mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">No Timesheets Yet</h3>
                  <p className="text-sm text-white/70 max-w-sm mx-auto">
                    Clock in to start tracking your hours. Your timesheet will be automatically created and submitted for approval when you clock out.
                  </p>
                </div>
                <button
                  onClick={() => setShowManualEntryDialog(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-medium transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Manual Entry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {timesheets.map((timesheet) => (
                  <TimesheetCard
                    key={timesheet.id}
                    timesheet={timesheet}
                    onView={() => handleViewTimesheet(timesheet)}
                    onSubmit={
                      timesheet.approvalStatus === 'PENDING' && !timesheet.submittedAt
                        ? () => {
                            setSelectedTimesheet(timesheet);
                            void handleSubmitTimesheet();
                          }
                        : undefined
                    }
                    isLoading={actionLoading}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <ClockWidget />
        </div>
      </div>

      <AddManualEntryDialog
        open={showManualEntryDialog}
        onClose={() => setShowManualEntryDialog(false)}
        onSuccess={fetchTimesheets}
      />
    </div>
  );
}
