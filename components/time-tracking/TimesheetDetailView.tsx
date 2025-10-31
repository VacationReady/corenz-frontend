'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Send, X, Check, AlertCircle } from 'lucide-react';
import TimesheetTable from './TimesheetTable';
import ApprovalTimeline from './ApprovalTimeline';

interface TimesheetDetailViewProps {
  timesheet: any;
  onBack: () => void;
  onSubmit?: () => Promise<void>;
  onApprove?: (comments?: string) => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  canEdit?: boolean;
  canSubmit?: boolean;
  canApprove?: boolean;
  isLoading?: boolean;
}

export default function TimesheetDetailView({
  timesheet,
  onBack,
  onSubmit,
  onApprove,
  onReject,
  onDelete,
  canEdit = false,
  canSubmit = false,
  canApprove = false,
  isLoading = false,
}: TimesheetDetailViewProps) {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [comments, setComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const periodStart = typeof timesheet.periodStart === 'string' 
    ? new Date(timesheet.periodStart) 
    : timesheet.periodStart;
  const periodEnd = typeof timesheet.periodEnd === 'string' 
    ? new Date(timesheet.periodEnd) 
    : timesheet.periodEnd;

  const handleSubmit = async () => {
    if (!onSubmit) return;
    setActionLoading(true);
    try {
      await onSubmit();
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!onApprove) return;
    setActionLoading(true);
    try {
      await onApprove(comments);
      setShowApproveModal(false);
      setComments('');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!onReject || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await onReject(rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
    } finally {
      setActionLoading(false);
    }
  };

  const totalHours = typeof timesheet.totalHours === 'string' 
    ? parseFloat(timesheet.totalHours) 
    : timesheet.totalHours;
  const regularHours = typeof timesheet.regularHours === 'string' 
    ? parseFloat(timesheet.regularHours) 
    : timesheet.regularHours;
  const overtimeHours = typeof timesheet.overtimeHours === 'string' 
    ? parseFloat(timesheet.overtimeHours) 
    : timesheet.overtimeHours;

  // Get approver info
  const approvers: Record<string, any> = {};
  if (timesheet.ApprovalStages) {
    timesheet.ApprovalStages.forEach((stage: any) => {
      stage.Decisions?.forEach((decision: any) => {
        // This would be populated from API if available
        approvers[decision.approverId] = {
          name: 'Approver',
          profileImageUrl: null,
        };
      });
    });
  }

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Timesheet Details</h1>
            <p className="text-slate-600">
              {format(periodStart, 'MMM d')} - {format(periodEnd, 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Submit Button */}
          {canSubmit && !timesheet.submittedAt && (
            <button
              onClick={handleSubmit}
              disabled={actionLoading || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              <Send className="w-4 h-4" />
              Submit for Approval
            </button>
          )}

          {/* Approve/Reject Buttons */}
          {canApprove && timesheet.approvalStatus === 'PENDING' && timesheet.submittedAt && (
            <>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={() => setShowApproveModal(true)}
                disabled={actionLoading || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {timesheet.approvalStatus === 'DECLINED' && timesheet.rejectedReason && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-400 mb-1">Timesheet Rejected</h4>
              <p className="text-sm text-red-300">{timesheet.rejectedReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Total Hours</h3>
          <p className="text-3xl font-bold text-slate-900">{totalHours.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Regular Hours</h3>
          <p className="text-3xl font-bold text-slate-900">{regularHours.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Overtime Hours</h3>
          <p className="text-3xl font-bold text-amber-600">{overtimeHours.toFixed(2)}</p>
        </div>
      </div>

      {/* Timesheet Entries */}
      <TimesheetTable
        entries={timesheet.TimesheetEntries || []}
        editable={canEdit}
        isLoading={isLoading}
      />

      {/* Approval Timeline */}
      {timesheet.ApprovalStages && timesheet.ApprovalStages.length > 0 && (
        <ApprovalTimeline
          stages={timesheet.ApprovalStages}
          approvers={approvers}
        />
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Approve Timesheet</h3>
            <p className="text-gray-400 mb-4">
              Are you sure you want to approve this timesheet?
            </p>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add comments (optional)"
              className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {actionLoading ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Reject Timesheet</h3>
            <p className="text-gray-400 mb-4">
              Please provide a reason for rejecting this timesheet.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (required)"
              className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 mb-4"
              rows={3}
              required
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
