'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Send, X, Check, AlertCircle, TrendingUp, Edit3 } from 'lucide-react';
import TimesheetTable from './TimesheetTable';
import ApprovalTimeline from './ApprovalTimeline';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface TimesheetDetailViewProps {
  timesheet: any;
  onBack: () => void;
  onSubmit?: () => Promise<void>;
  onApprove?: (comments?: string) => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onAmendOvertime?: (entryId: string) => void;
  canEdit?: boolean;
  canSubmit?: boolean;
  canApprove?: boolean;
  isLoading?: boolean;
  user?: { role: string };
  settings?: { enableOvertimeBreakdown?: boolean };
}

export default function TimesheetDetailView({
  timesheet,
  onBack,
  onSubmit,
  onApprove,
  onReject,
  onDelete,
  onAmendOvertime,
  canEdit = false,
  canSubmit = false,
  canApprove = false,
  isLoading = false,
  user,
  settings,
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

  const resolvedEntries = (timesheet.TimesheetEntries && timesheet.TimesheetEntries.length > 0
    ? timesheet.TimesheetEntries
    : (timesheet.ClockEntries || []).map((entry: any, index: number) => ({
        id: entry.id || `clock-entry-${index}`,
        date: entry.clockInTime,
        startTime: entry.clockInTime,
        endTime: entry.clockOutTime || entry.clockInTime,
        breakMinutes: entry.breakMinutes ?? 0,
        hours: entry.clockOutTime
          ? (typeof entry.totalHours === 'number'
              ? entry.totalHours
              : entry.totalHours
              ?? 0)
          : 0,
        isOvertime: false,
        notes: entry.notes,
        entryType: 'CLOCK',
        clockInLocation: entry.clockInLocation,
        clockOutLocation: entry.clockOutLocation,
      }))
  );

  // Filter overtime entries for breakdown
  const overtimeEntries = resolvedEntries.filter((entry: any) => 
    (entry.overtimeHours && parseFloat(entry.overtimeHours.toString()) > 0) || entry.isOvertime
  );

  // Check if user can amend overtime (admin or manager)
  const canAmendOvertime = user && ['ADMIN', 'MANAGER'].includes(user.role);

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
        entries={resolvedEntries}
        editable={canEdit}
        isLoading={isLoading}
      />

      {/* Overtime Breakdown */}
      {settings?.enableOvertimeBreakdown && overtimeEntries.length > 0 && (
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              Overtime Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Time</TableHead>
                    <TableHead className="font-semibold">Total</TableHead>
                    <TableHead className="font-semibold">Regular</TableHead>
                    <TableHead className="font-semibold text-amber-700">Overtime</TableHead>
                    <TableHead className="font-semibold">Rate</TableHead>
                    <TableHead className="font-semibold">Reason</TableHead>
                    {canAmendOvertime && <TableHead className="font-semibold text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overtimeEntries.map((entry: any) => {
                    const entryDate = typeof entry.date === 'string' ? new Date(entry.date) : entry.date;
                    const entryStart = typeof entry.startTime === 'string' ? new Date(entry.startTime) : entry.startTime;
                    const entryEnd = typeof entry.endTime === 'string' ? new Date(entry.endTime) : entry.endTime;
                    const totalHours = typeof entry.hours === 'string' ? parseFloat(entry.hours) : entry.hours;
                    const regularHours = entry.regularHours 
                      ? (typeof entry.regularHours === 'string' ? parseFloat(entry.regularHours) : entry.regularHours)
                      : totalHours;
                    const overtimeHours = entry.overtimeHours
                      ? (typeof entry.overtimeHours === 'string' ? parseFloat(entry.overtimeHours) : entry.overtimeHours)
                      : 0;
                    const multiplier = entry.overtimeMultiplier || 1.5;

                    return (
                      <TableRow key={entry.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">
                          {format(entryDate, 'EEE, d MMM')}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {format(entryStart, 'HH:mm')} - {format(entryEnd, 'HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium">{totalHours.toFixed(2)}h</TableCell>
                        <TableCell>{regularHours.toFixed(2)}h</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-600">{overtimeHours.toFixed(2)}h</span>
                            {entry.managerAdjusted && (
                              <Badge variant="outline" className="text-xs border-blue-400 text-blue-700">
                                Adjusted
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                            {multiplier.toFixed(1)}×
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate" title={entry.overtimeReason}>
                          {entry.overtimeReason || '-'}
                        </TableCell>
                        {canAmendOvertime && (
                          <TableCell className="text-right">
                            {onAmendOvertime && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onAmendOvertime(entry.id)}
                                className="text-xs"
                              >
                                <Edit3 className="w-3 h-3 mr-1" />
                                Amend
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {overtimeEntries.map((entry: any) => {
                const entryDate = typeof entry.date === 'string' ? new Date(entry.date) : entry.date;
                const entryStart = typeof entry.startTime === 'string' ? new Date(entry.startTime) : entry.startTime;
                const entryEnd = typeof entry.endTime === 'string' ? new Date(entry.endTime) : entry.endTime;
                const totalHours = typeof entry.hours === 'string' ? parseFloat(entry.hours) : entry.hours;
                const regularHours = entry.regularHours 
                  ? (typeof entry.regularHours === 'string' ? parseFloat(entry.regularHours) : entry.regularHours)
                  : totalHours;
                const overtimeHours = entry.overtimeHours
                  ? (typeof entry.overtimeHours === 'string' ? parseFloat(entry.overtimeHours) : entry.overtimeHours)
                  : 0;
                const multiplier = entry.overtimeMultiplier || 1.5;

                return (
                  <div key={entry.id} className="p-4 border border-slate-200 rounded-lg bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {format(entryDate, 'EEE, d MMM')}
                        </div>
                        <div className="text-sm text-slate-600">
                          {format(entryStart, 'HH:mm')} - {format(entryEnd, 'HH:mm')}
                        </div>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                        {multiplier.toFixed(1)}×
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                      <div>
                        <div className="text-xs text-slate-500">Total</div>
                        <div className="font-medium">{totalHours.toFixed(2)}h</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Regular</div>
                        <div className="font-medium">{regularHours.toFixed(2)}h</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Overtime</div>
                        <div className="font-bold text-amber-600">{overtimeHours.toFixed(2)}h</div>
                      </div>
                    </div>
                    {entry.overtimeReason && (
                      <div className="text-xs text-slate-600 mb-2">
                        {entry.overtimeReason}
                      </div>
                    )}
                    {entry.managerAdjusted && (
                      <Badge variant="outline" className="text-xs border-blue-400 text-blue-700 mb-2">
                        Adjusted
                      </Badge>
                    )}
                    {canAmendOvertime && onAmendOvertime && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAmendOvertime(entry.id)}
                        className="w-full text-xs mt-2"
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Amend Overtime
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
