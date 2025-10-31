'use client';

import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';

interface ApprovalDecision {
  id: string;
  approverId: string;
  status: string;
  comments?: string | null;
  respondedAt?: Date | string | null;
  order: number;
}

interface ApprovalStage {
  id: string;
  name?: string | null;
  order: number;
  mode: string;
  status: string;
  isActive: boolean;
  completedAt?: Date | string | null;
  Decisions: ApprovalDecision[];
}

interface ApprovalTimelineProps {
  stages: ApprovalStage[];
  approvers?: Record<string, { name: string; profileImageUrl?: string | null }>;
}

export default function ApprovalTimeline({ stages, approvers = {} }: ApprovalTimelineProps) {
  if (!stages || stages.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <p className="text-gray-400 text-center">No approval workflow assigned</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">Approval Timeline</h3>

      <div className="space-y-6">
        {stages.map((stage, index) => {
          const isComplete = stage.status === 'APPROVED' || stage.status === 'DECLINED';
          const isActive = stage.isActive;
          const isPending = !isComplete && !isActive;

          return (
            <div key={stage.id} className="relative">
              {/* Connector Line */}
              {index < stages.length - 1 && (
                <div
                  className={`absolute left-6 top-12 w-0.5 h-full ${
                    isComplete ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                ></div>
              )}

              {/* Stage Container */}
              <div className="relative">
                {/* Stage Header */}
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      stage.status === 'APPROVED'
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-600'
                        : stage.status === 'DECLINED'
                        ? 'bg-rose-100 border-rose-300 text-rose-600'
                        : isActive
                        ? 'bg-blue-100 border-blue-300 text-blue-600 animate-pulse'
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                  >
                    {stage.status === 'APPROVED' ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : stage.status === 'DECLINED' ? (
                      <XCircle className="w-6 h-6" />
                    ) : (
                      <Clock className="w-6 h-6" />
                    )}
                  </div>

                  {/* Stage Info */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-base font-semibold text-slate-900">
                        {stage.name || `Stage ${stage.order}`}
                      </h4>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          stage.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : stage.status === 'DECLINED'
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : isActive
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {stage.status === 'PENDING' && isActive
                          ? 'In Progress'
                          : stage.status === 'PENDING'
                          ? 'Pending'
                          : stage.status === 'APPROVED'
                          ? 'Approved'
                          : 'Declined'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 mb-3">
                      {stage.mode === 'SEQUENTIAL'
                        ? 'Sequential approval required'
                        : stage.mode === 'UNANIMOUS'
                        ? 'All approvers must approve'
                        : 'First responder decides'}
                    </p>

                    {stage.completedAt && (
                      <p className="text-xs text-slate-500 mb-3">
                        Completed {format(
                          typeof stage.completedAt === 'string'
                            ? new Date(stage.completedAt)
                            : stage.completedAt,
                          'MMM d, yyyy h:mm a'
                        )}
                      </p>
                    )}

                    {/* Approvers */}
                    <div className="space-y-2">
                      {stage.Decisions.map((decision) => {
                        const approver = approvers[decision.approverId];
                        
                        return (
                          <div
                            key={decision.id}
                            className={`flex items-start gap-3 p-3 rounded-lg ${
                              decision.status === 'APPROVED'
                                ? 'bg-emerald-50 border border-emerald-200'
                                : decision.status === 'DECLINED'
                                ? 'bg-rose-50 border border-rose-200'
                                : 'bg-slate-50 border border-slate-200'
                            }`}
                          >
                            {/* Approver Avatar */}
                            {approver?.profileImageUrl ? (
                              <img
                                src={approver.profileImageUrl}
                                alt={approver.name}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                                <User className="w-4 h-4" />
                              </div>
                            )}

                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-slate-900">
                                  {approver?.name || 'Unknown Approver'}
                                </span>
                                {decision.status !== 'PENDING' && (
                                  <span
                                    className={`text-xs font-medium ${
                                      decision.status === 'APPROVED'
                                        ? 'text-emerald-600'
                                        : 'text-rose-600'
                                    }`}
                                  >
                                    {decision.status === 'APPROVED' ? 'Approved' : 'Declined'}
                                  </span>
                                )}
                              </div>

                              {decision.respondedAt && (
                                <p className="text-xs text-slate-500 mb-1">
                                  {format(
                                    typeof decision.respondedAt === 'string'
                                      ? new Date(decision.respondedAt)
                                      : decision.respondedAt,
                                    'MMM d, yyyy h:mm a'
                                  )}
                                </p>
                              )}

                              {decision.comments && (
                                <p className="text-sm text-slate-600 mt-2 italic">
                                  "{decision.comments}"
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
