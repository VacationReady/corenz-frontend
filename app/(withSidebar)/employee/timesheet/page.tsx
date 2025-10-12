'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Calendar, Plus } from 'lucide-react';
import ClockWidget from '@/components/time-tracking/ClockWidget';
import TimesheetCard from '@/components/time-tracking/TimesheetCard';
import TimesheetDetailView from '@/components/time-tracking/TimesheetDetailView';

export default function EmployeeTimesheetPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      
      // Show the new timesheet
      if (data.timesheet) {
        setSelectedTimesheet(data.timesheet);
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
      
      // Refresh timesheets list
      await fetchTimesheets();
    } catch (err: any) {
      console.error('Error submitting timesheet:', err);
      setError(err.message || 'Failed to submit timesheet');
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
    );
  }

  // Show detail view if a timesheet is selected
  if (selectedTimesheet) {
    return (
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
    );
  }

  // Show main timesheet list view
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Timesheets</h1>
          <p className="text-gray-400">Track your hours and submit timesheets for approval</p>
        </div>
        
        <button
          onClick={handleGenerateTimesheet}
          disabled={actionLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Generate Timesheet
        </button>
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
      <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Current Period</h2>
        </div>
        <p className="text-gray-400 mb-4">
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
        <h2 className="text-2xl font-bold text-white mb-4">Past Timesheets</h2>
        
        {timesheets.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Timesheets Yet</h3>
            <p className="text-gray-400 mb-6">
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
    </div>
  );
}
