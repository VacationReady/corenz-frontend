"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Calendar, User, Users, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { useApi } from "@/hooks/useApi";

interface HolidayApprovalModalProps {
  decisionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
  onDecline: () => void;
}

interface ApprovalDetails {
  id: string;
  leaveRequestId: string;
  employee: {
    id: string;
    name: string;
    email: string;
    profileImageUrl?: string;
    department?: string;
  };
  leaveType: {
    id: string;
    name: string;
    color?: string;
  };
  dates: {
    start: string;
    end: string;
    requestedDays: number;
  };
  balance: {
    totalDays: number;
    usedDays: number;
    remainingDays: number;
    remainingAfterApproval: number;
  } | null;
  departmentColleagues: Array<{
    id: string;
    name: string;
    profileImageUrl?: string;
    startDate: string;
    endDate: string;
    leaveType: string;
    leaveColor?: string;
  }>;
  reason?: string;
  dayType?: string;
}

export function HolidayApprovalModal({
  decisionId,
  open,
  onOpenChange,
  onApprove,
  onDecline,
}: HolidayApprovalModalProps) {
  const [processing, setProcessing] = useState(false);

  // Fetch approval details using API hook
  const { data: response, error, isLoading: loading } = useApi<{ success: boolean; data: ApprovalDetails }>(
    decisionId && open ? `/api/approvals/${decisionId}/details` : null
  );

  const details = response?.success ? response.data : null;

  // Handle fetch errors
  useEffect(() => {
    if (error && open) {
      toast.error("Failed to load approval details");
      onOpenChange(false);
    }
  }, [error, open, onOpenChange]);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await onApprove();
      onOpenChange(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    setProcessing(true);
    try {
      await onDecline();
      onOpenChange(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NZ", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="py-12 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Loading details...</p>
          </div>
        ) : details ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">
                Holiday Approval Request
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Employee Section */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16 border-2 border-white shadow-lg">
                    <AvatarImage src={details.employee.profileImageUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-semibold">
                      {getInitials(details.employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {details.employee.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">{details.employee.email}</p>
                    {details.employee.department && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Users className="w-4 h-4" />
                        <span>{details.employee.department}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Leave Type & Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: details.leaveType.color || "#8b5cf6" }}
                    />
                    <h4 className="font-semibold text-gray-900">Leave Type</h4>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{details.leaveType.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {details.dates.requestedDays} {details.dates.requestedDays === 1 ? "day" : "days"}
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-green-700" />
                    <h4 className="font-semibold text-gray-900">Dates Requested</h4>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{formatDate(details.dates.start)}</p>
                  <p className="text-sm text-gray-600 my-1">to</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(details.dates.end)}</p>
                </div>
              </div>

              {/* Reason */}
              {details.reason && (
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Reason</h4>
                  <p className="text-sm text-gray-700">{details.reason}</p>
                </div>
              )}

              {/* Leave Balance */}
              {details.balance && (
                <div className="p-6 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-amber-700" />
                    Leave Balance Impact
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Total Allowance</p>
                      <p className="text-2xl font-bold text-gray-900">{details.balance.totalDays}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Already Used</p>
                      <p className="text-2xl font-bold text-orange-600">{details.balance.usedDays}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Current Balance</p>
                      <p className="text-2xl font-bold text-blue-600">{details.balance.remainingDays}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">After Approval</p>
                      <p className={`text-2xl font-bold ${details.balance.remainingAfterApproval >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {details.balance.remainingAfterApproval}
                      </p>
                    </div>
                  </div>
                  {details.balance.remainingAfterApproval < 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-red-100 border border-red-300 flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-800">
                        <strong>Warning:</strong> Approving this request will result in a negative balance of{" "}
                        {Math.abs(details.balance.remainingAfterApproval)} days.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Department Colleagues On Leave */}
              {details.departmentColleagues.length > 0 && (
                <div className="p-6 rounded-xl bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-rose-700" />
                    Department Colleagues Also Off ({details.departmentColleagues.length})
                  </h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {details.departmentColleagues.map((colleague) => (
                      <div
                        key={colleague.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white border border-rose-200 hover:border-rose-300 transition-colors"
                      >
                        <Avatar className="w-10 h-10 border border-gray-200">
                          <AvatarImage src={colleague.profileImageUrl} />
                          <AvatarFallback className="bg-gradient-to-br from-rose-400 to-red-500 text-white text-sm">
                            {getInitials(colleague.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{colleague.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: colleague.leaveColor || "#ef4444" }}
                            />
                            <p className="text-xs text-gray-600">{colleague.leaveType}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">
                            {new Date(colleague.startDate).toLocaleDateString("en-NZ", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-gray-500">to</p>
                          <p className="text-xs text-gray-600">
                            {new Date(colleague.endDate).toLocaleDateString("en-NZ", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {details.departmentColleagues.length === 0 && details.employee.department && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800">
                    No other team members from {details.employee.department} are scheduled to be off during these dates.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDecline}
                  disabled={processing}
                  className="min-w-[120px] border-2 hover:border-red-500 hover:bg-red-50 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
                <Button
                  size="lg"
                  onClick={handleApprove}
                  disabled={processing}
                  className="min-w-[120px] bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  {processing ? (
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Approve
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
