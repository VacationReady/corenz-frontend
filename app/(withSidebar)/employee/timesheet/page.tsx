'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Calendar, Plus, PlusCircle } from 'lucide-react';
import ClockWidget from '@/components/time-tracking/ClockWidget';
import TimesheetCard from '@/components/time-tracking/TimesheetCard';
import TimesheetDetailView from '@/components/time-tracking/TimesheetDetailView';
import AddManualEntryDialog from '@/components/time-tracking/AddManualEntryDialog';
import { useToast } from '@/hooks/use-toast';
import TimesheetSubmissionSuccess from '@/components/time-tracking/TimesheetSubmissionSuccess';

export default function EmployeeTimesheetPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  type TimesheetSummary = React.ComponentProps<typeof TimesheetCard>['timesheet'];

  type Timesheet = TimesheetSummary & {
    TimesheetEntries?: unknown[];
    ClockEntries?: unknown[];
    [key: string]: unknown;
  };

  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntryDialog, setShowManualEntryDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch timesheets
  useEffect(() => {
    if (status === 'authenticated') {
      fetchTimesheets();
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

  const handleGenerateTimesheet = async () => {
    try {
      setActionLoading(true);
      setError(null);
      
      const response = await fetch('/api/timesheets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate timesheet');
      }
      
      const data = await response.json();
      
      // Refresh timesheets list
      await fetchTimesheets();

      // Immediately load full details so entries are visible
      if (data.timesheet?.id) {
        await fetchTimesheetDetails(data.timesheet.id);
      }
    } catch (err: any) {
      console.error('Error generating timesheet:', err);
      setError(err.message || 'Failed to generate timesheet');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitTimesheet = async () => {
    if (!selectedTimesheet) return;
    
    try {
      setActionLoading(true);
      setError(null);

      console.log('[Client] Submitting timesheet:', selectedTimesheet.id);

      const response = await fetch(`/api/timesheets/${selectedTimesheet.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('[Client] Submit response status:', response.status);

      const data = await response.json();

      console.log('[Client] Submit response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit timesheet');
      }

      setSelectedTimesheet((previous: Timesheet | null) => {
        if (!data?.timesheet) {
          return previous;
        }

        if (!previous) {
          return data.timesheet;
        }

        return {
          ...previous,
          ...data.timesheet,
          TimesheetEntries:
            data.timesheet.TimesheetEntries ?? previous.TimesheetEntries,
          ClockEntries: data.timesheet.ClockEntries ?? previous.ClockEntries,
        };
      });

      // Refresh timesheets list
      await fetchTimesheets();

      setShowSuccess(true);

      toast({
        title: 'Timesheet submitted',
        description: 'Nice work—approvers have been notified. We’ll let you know once it’s decided.',
      });
    } catch (err: any) {
      console.error('Error submitting timesheet:', err);
      const message = err?.message || 'Failed to submit timesheet';
      setError(message);
      setShowSuccess(false);
      toast({
        title: 'Submission failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewTimesheet = (timesheet: any) => {
    fetchTimesheetDetails(timesheet.id);
  };

  const handleBack = () => {
    setSelectedTimesheet(null);
    fetchTimesheets();
  };

  // Show loading state
  if (status === 'loading' || loading) {
    return (
      <>
        <TimesheetSubmissionSuccess
          open={showSuccess}
          onClose={() => setShowSuccess(false)}
        />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/10 rounded w-1/4"></div>
            <div className="h-64 bg-white/10 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-48 bg-white/10 rounded"></div>
              <div className="h-48 bg-white/10 rounded"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show detail view if a timesheet is selected
  if (selectedTimesheet) {
    return (
      <>
        <TimesheetSubmissionSuccess
          open={showSuccess}
          onClose={() => setShowSuccess(false)}
        />
        <div className="p-6 max-w-7xl mx-auto">
          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}
          
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
      </>
    );
  }

  // Show main timesheet list view
  return (
    <>
      <TimesheetSubmissionSuccess
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
      />
      <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">My Timesheets</h1>
            <p className="text-slate-600">Track your hours and submit timesheets for approval</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowManualEntryDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium shadow-sm"
            >
              <PlusCircle className="w-5 h-5" />
              Add Entry
            </button>
            <button
              onClick={handleGenerateTimesheet}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Generate Timesheet
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Clock Widget */}
        <ClockWidget />

        {/* Current Period Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">Current Period</h2>
          </div>
          <p className="text-slate-600 mb-4">
            Your hours for the current pay period will appear here once you clock in/out.
            Generate a timesheet when you're ready to submit for approval.
          </p>
          <button
            onClick={handleGenerateTimesheet}
            disabled={actionLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-sm"
          >
            {actionLoading ? 'Generating...' : 'Generate Current Timesheet'}
          </button>
        </div>

        {/* Past Timesheets */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Past Timesheets</h2>
          
          {timesheets.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <Calendar className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Timesheets Yet</h3>
              <p className="text-slate-600 mb-6">
                Start by clocking in/out, then generate your first timesheet.
              </p>
              <button
                onClick={handleGenerateTimesheet}
                disabled={actionLoading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              >
                {actionLoading ? 'Generating...' : 'Generate First Timesheet'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {timesheets.map((timesheet) => (
                <TimesheetCard
                  key={timesheet.id}
                  timesheet={timesheet}
                  onView={() => handleViewTimesheet(timesheet)}
                  onSubmit={
                    timesheet.approvalStatus === 'PENDING' && !timesheet.submittedAt
                      ? () => {
                          setSelectedTimesheet(timesheet);
                          handleSubmitTimesheet();
                        }
                      : undefined
                  }
                  isLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </div>

        {/* Manual Entry Dialog */}
        <AddManualEntryDialog
          open={showManualEntryDialog}
          onClose={() => setShowManualEntryDialog(false)}
          onSuccess={fetchTimesheets}
        />
      </div>
    </>
  );
}
