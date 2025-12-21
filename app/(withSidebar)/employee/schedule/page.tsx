'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import {
  Calendar,
  Clock,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Ban,
  User,
  MapPin,
} from 'lucide-react';
import ShiftSwapModal from '@/components/rota/ShiftSwapModal';
import AvailabilityGrid from '@/components/rota/AvailabilityGrid';
import { Dialog, DialogAction, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Shift {
  id: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  notes?: string | null;
  role?: string | null;
  attendanceStatus: string;
  isPublished: boolean;
  isVirtualShift?: boolean;
  location?: {
    id: string;
    name: string;
    address?: string | null;
  } | null;
}

interface SwapRequest {
  id: string;
  status: string;
  requestMessage?: string | null;
  responseMessage?: string | null;
  createdAt: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  Shift: Shift;
  requester?: {
    id: string;
    User: {
      name: string;
      email: string;
      profileImageUrl?: string | null;
    };
    Department?: {
      name: string;
    } | null;
  };
  targetEmployee?: {
    id: string;
    User: {
      name: string;
      email: string;
    };
  } | null;
}

interface AvailabilityPattern {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface AvailabilityException {
  id: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  isAvailable: boolean;
  reason?: string | null;
}

export default function EmployeeSchedulePage() {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [incomingSwaps, setIncomingSwaps] = useState<SwapRequest[]>([]);
  const [outgoingSwaps, setOutgoingSwaps] = useState<SwapRequest[]>([]);
  const [patterns, setPatterns] = useState<AvailabilityPattern[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [workingPattern, setWorkingPattern] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoadedSchedule, setHasLoadedSchedule] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [activeTab, setActiveTab] = useState<'shifts' | 'swaps' | 'availability'>('shifts');
  const [swapTab, setSwapTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [swapDecisionOpen, setSwapDecisionOpen] = useState(false);
  const [swapDecisionAction, setSwapDecisionAction] = useState<'accept' | 'reject' | 'cancel'>('accept');
  const [swapDecisionSwap, setSwapDecisionSwap] = useState<SwapRequest | null>(null);
  const [swapDecisionReason, setSwapDecisionReason] = useState('');
  const [swapDecisionSubmitting, setSwapDecisionSubmitting] = useState(false);
  const [swapDecisionError, setSwapDecisionError] = useState<string | null>(null);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });

  useEffect(() => {
    if (session?.user) {
      loadData();
    }
  }, [session, selectedDate]);

  const readApiErrorMessage = async (response: Response) => {
    try {
      const data = await response.json();
      return data?.error || 'Request failed';
    } catch {
      return 'Request failed';
    }
  };

  const loadData = async () => {
    setLoadError(null);
    if (hasLoadedSchedule) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    const errors: string[] = [];
    try {
      // Get current employee ID
      const employeeRes = await fetch('/api/employees/me');
      if (!employeeRes.ok) {
        errors.push(`Could not load your profile (${await readApiErrorMessage(employeeRes)})`);
        return;
      }

      const employeeData = await employeeRes.json();
      const empId = employeeData.employee?.id;
      if (!empId) {
        errors.push('Could not load your profile (missing employee id)');
        return;
      }

      setCurrentEmployeeId(empId);

      // Fetch shifts
      const shiftsRes = await fetch(
        `/api/shifts?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}&employeeId=${empId}`
      );
      if (shiftsRes.ok) {
        const shiftsData = await shiftsRes.json();
        setShifts(shiftsData.shifts || []);
        setHasLoadedSchedule(true);
      } else {
        errors.push(`Could not load shifts (${await readApiErrorMessage(shiftsRes)})`);
      }

      // Fetch swap requests
      const swapsRes = await fetch('/api/shift-swaps');
      if (swapsRes.ok) {
        const swapsData = await swapsRes.json();
        const allSwaps = swapsData.swapRequests || [];
        
        setIncomingSwaps(
          allSwaps.filter(
            (swap: SwapRequest) =>
              swap.status === 'PENDING' &&
              (swap.targetEmployee?.id === empId || !swap.targetEmployee)
          )
        );
        
        setOutgoingSwaps(
          allSwaps.filter((swap: SwapRequest) => swap.requester?.id === empId)
        );
      } else {
        errors.push(`Could not load swap requests (${await readApiErrorMessage(swapsRes)})`);
      }

      // Fetch availability
      if (empId) {
        const availRes = await fetch(`/api/availability/${empId}`);
        if (availRes.ok) {
          const availData = await availRes.json();
          setPatterns(availData.patterns || []);
          setExceptions(availData.exceptions || []);
          setWorkingPattern(availData.workingPattern || null);
        } else {
          errors.push(`Could not load availability (${await readApiErrorMessage(availRes)})`);
        }
      }

      // Fetch team members for swap requests
      const teamRes = await fetch('/api/employees');
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        // API returns { data: [...], pagination: {...} }
        setEmployees((teamData.data || []).filter((e: any) => e.id !== empId));
      } else {
        errors.push(`Could not load team members (${await readApiErrorMessage(teamRes)})`);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      const message = error instanceof Error ? error.message : 'Failed to load schedule data';
      errors.push(message);
    } finally {
      if (errors.length > 0) {
        setLoadError(errors[0]);
      }
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const openSwapDecision = (swap: SwapRequest, action: 'accept' | 'reject' | 'cancel') => {
    setSwapDecisionSwap(swap);
    setSwapDecisionAction(action);
    setSwapDecisionError(null);
    setSwapDecisionReason('');
    setSwapDecisionOpen(true);
  };

  const closeSwapDecision = () => {
    if (swapDecisionSubmitting) return;
    setSwapDecisionOpen(false);
    setSwapDecisionSwap(null);
    setSwapDecisionError(null);
    setSwapDecisionReason('');
  };

  const submitSwapDecision = async () => {
    if (!swapDecisionSwap) return;
    setSwapDecisionSubmitting(true);
    setSwapDecisionError(null);

    const swap = swapDecisionSwap;

    try {
      if (swapDecisionAction === 'accept') {
        const response = await fetch(`/api/shift-swaps/${swap.id}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          throw new Error(await readApiErrorMessage(response));
        }

        toast.success('Swap accepted', {
          description: `${format(new Date(swap.Shift.startTime), 'EEE, MMM d')} • ${format(new Date(swap.Shift.startTime), 'h:mm a')} - ${format(new Date(swap.Shift.endTime), 'h:mm a')}`,
        });
      }

      if (swapDecisionAction === 'reject') {
        const response = await fetch(`/api/shift-swaps/${swap.id}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: swapDecisionReason || null }),
        });

        if (!response.ok) {
          throw new Error(await readApiErrorMessage(response));
        }

        toast.success('Swap declined', {
          description: `${format(new Date(swap.Shift.startTime), 'EEE, MMM d')} • ${format(new Date(swap.Shift.startTime), 'h:mm a')} - ${format(new Date(swap.Shift.endTime), 'h:mm a')}`,
        });
      }

      if (swapDecisionAction === 'cancel') {
        const response = await fetch(`/api/shift-swaps/${swap.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(await readApiErrorMessage(response));
        }

        toast.success('Swap request cancelled', {
          description: `${format(new Date(swap.Shift.startTime), 'EEE, MMM d')} • ${format(new Date(swap.Shift.startTime), 'h:mm a')} - ${format(new Date(swap.Shift.endTime), 'h:mm a')}`,
        });
      }

      closeSwapDecision();
      await loadData();
    } catch (error: any) {
      const message = error?.message || 'Request failed';
      setSwapDecisionError(message);
      toast.error('Could not update swap', {
        description: message,
      });
    } finally {
      setSwapDecisionSubmitting(false);
    }
  };

  const handleUpdateAvailability = async (newPatterns: AvailabilityPattern[]) => {
    if (!currentEmployeeId) return;

    const response = await fetch(`/api/availability/${currentEmployeeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patterns: newPatterns }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update availability');
    }

    await loadData();
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      PENDING: {
        bg: 'bg-amber-500/20',
        text: 'text-amber-400',
        icon: Clock,
        label: 'Pending',
      },
      MANAGER_PENDING: {
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
        icon: AlertCircle,
        label: 'Awaiting Manager',
      },
      APPROVED: {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        icon: CheckCircle,
        label: 'Approved',
      },
      COMPLETED: {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        icon: CheckCircle,
        label: 'Completed',
      },
      REJECTED: {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        icon: XCircle,
        label: 'Rejected',
      },
      CANCELLED: {
        bg: 'bg-gray-500/20',
        text: 'text-gray-400',
        icon: Ban,
        label: 'Cancelled',
      },
    };

    const config = configs[status] || configs.PENDING;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} border-${config.text.replace('text-', '')}/30`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (isLoading && !hasLoadedSchedule) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  const now = new Date();

  const swapDecisionTitle =
    swapDecisionAction === 'accept'
      ? 'Accept swap request'
      : swapDecisionAction === 'reject'
        ? 'Decline swap request'
        : 'Cancel swap request';

  const swapDecisionPrimaryLabel =
    swapDecisionAction === 'accept'
      ? 'Accept'
      : swapDecisionAction === 'reject'
        ? 'Decline'
        : 'Cancel request';

  const swapDecisionPrimaryVariant =
    swapDecisionAction === 'accept' ? 'primary' : swapDecisionAction === 'reject' ? 'danger' : 'danger';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Schedule</h1>
              <p className="text-gray-300">Manage your shifts, swaps, and availability</p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setSelectedDate(subWeeks(selectedDate, 1))}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="px-4 py-2 text-white font-semibold min-w-[200px] text-center">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </div>
              <button
                onClick={() => setSelectedDate(addWeeks(selectedDate, 1))}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('shifts')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'shifts'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <Calendar className="w-5 h-5 inline mr-2" />
              My Shifts
            </button>
            <button
              onClick={() => setActiveTab('swaps')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all relative ${
                activeTab === 'swaps'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <ArrowRightLeft className="w-5 h-5 inline mr-2" />
              Swap Requests
              {incomingSwaps.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {incomingSwaps.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('availability')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'availability'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <Clock className="w-5 h-5 inline mr-2" />
              My Availability
            </button>
          </div>
        </div>

        {loadError && (
          <div className="bg-red-500/15 backdrop-blur-md border border-red-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-200 mt-0.5" />
              <div className="flex-1">
                <div className="text-white font-semibold">We couldn’t load your schedule</div>
                <div className="text-red-100/80 text-sm">{loadError}{hasLoadedSchedule ? ' (showing the last loaded data)' : ''}</div>
              </div>
              <button
                onClick={loadData}
                disabled={isRefreshing}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  isRefreshing
                    ? 'bg-white/10 text-gray-300 cursor-not-allowed'
                    : 'bg-red-500/30 text-white hover:bg-red-500/40'
                }`}
              >
                {isRefreshing ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Retrying…
                  </span>
                ) : (
                  'Retry'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {activeTab === 'shifts' && (
          <div className="space-y-4">
            {shifts.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {loadError && !hasLoadedSchedule ? 'Schedule Unavailable' : 'No Shifts This Week'}
                </h3>
                <p className="text-gray-400">
                  {loadError && !hasLoadedSchedule
                    ? 'We couldn’t load your shifts right now. Please try again.'
                    : 'You have no scheduled shifts for this week.'}
                </p>
              </div>
            ) : (
              shifts.map((shift) => {
                const hasShiftStarted = new Date(shift.startTime) <= now;

                return (
                  <div
                    key={shift.id}
                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5 hover:bg-white/15 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-4">
                          <div className={`${shift.isVirtualShift ? 'bg-purple-500/20' : 'bg-blue-500/20'} p-3 rounded-lg`}>
                            <Clock className="w-6 h-6 text-blue-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-white font-semibold text-lg">
                                {format(new Date(shift.startTime), 'EEEE, MMMM d')}
                              </h3>
                              {shift.isVirtualShift && (
                                <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs font-medium rounded-full border border-purple-500/50">
                                  Working Pattern
                                </span>
                              )}
                            </div>
                            <p className="text-gray-300">
                              {format(new Date(shift.startTime), 'h:mm a')} -{' '}
                              {format(new Date(shift.endTime), 'h:mm a')}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pl-14">
                          {shift.role && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-purple-400" />
                              <span className="text-gray-300 text-sm">{shift.role}</span>
                            </div>
                          )}
                          {shift.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-green-400" />
                              <span className="text-gray-300 text-sm">{shift.location.name}</span>
                            </div>
                          )}
                        </div>

                        {shift.notes && (
                          <div className="pl-14">
                            <p className="text-gray-400 text-sm italic">"{shift.notes}"</p>
                          </div>
                        )}
                      </div>

                      {!shift.isVirtualShift && !hasShiftStarted && (
                        <button
                          onClick={() => setSelectedShift(shift)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                          Request Swap
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'swaps' && (
          <div className="space-y-6">
            {/* Swap Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setSwapTab('incoming')}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all relative ${
                  swapTab === 'incoming'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                Incoming Requests
                {incomingSwaps.length > 0 && (
                  <span className="ml-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {incomingSwaps.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setSwapTab('outgoing')}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                  swapTab === 'outgoing'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                My Requests
                {outgoingSwaps.length > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {outgoingSwaps.length}
                  </span>
                )}
              </button>
            </div>

            {/* Swap Requests List */}
            <div className="space-y-4">
              {swapTab === 'incoming' ? (
                incomingSwaps.length === 0 ? (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
                    <ArrowRightLeft className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Incoming Requests</h3>
                    <p className="text-gray-400">You have no pending swap requests to review.</p>
                  </div>
                ) : (
                  incomingSwaps.map((swap) => (
                    <div
                      key={swap.id}
                      className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-white font-semibold text-lg mb-1">
                            {swap.requester?.User.name} wants to swap
                          </h3>
                          <p className="text-gray-300 text-sm">
                            {format(new Date(swap.Shift.startTime), 'EEEE, MMMM d, yyyy')} •{' '}
                            {format(new Date(swap.Shift.startTime), 'h:mm a')} -{' '}
                            {format(new Date(swap.Shift.endTime), 'h:mm a')}
                          </p>
                        </div>
                        {getStatusBadge(swap.status)}
                      </div>

                      {swap.requestMessage && (
                        <div className="bg-white/5 rounded-lg p-3 mb-4">
                          <p className="text-gray-300 text-sm italic">"{swap.requestMessage}"</p>
                        </div>
                      )}

                      {swap.status === 'PENDING' && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => openSwapDecision(swap, 'accept')}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold transition-all"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => openSwapDecision(swap, 'reject')}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-lg font-semibold transition-all"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )
              ) : outgoingSwaps.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
                  <ArrowRightLeft className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Outgoing Requests</h3>
                  <p className="text-gray-400">You haven't requested any shift swaps yet.</p>
                </div>
              ) : (
                outgoingSwaps.map((swap) => (
                  <div
                    key={swap.id}
                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-semibold text-lg mb-1">
                          Swap request to{' '}
                          {swap.targetEmployee ? swap.targetEmployee.User.name : 'Anyone'}
                        </h3>
                        <p className="text-gray-300 text-sm">
                          {format(new Date(swap.Shift.startTime), 'EEEE, MMMM d, yyyy')} •{' '}
                          {format(new Date(swap.Shift.startTime), 'h:mm a')} -{' '}
                          {format(new Date(swap.Shift.endTime), 'h:mm a')}
                        </p>
                      </div>
                      {getStatusBadge(swap.status)}
                    </div>

                    {swap.responseMessage && (
                      <div className="bg-white/5 rounded-lg p-3 mb-4">
                        <p className="text-gray-300 text-sm">
                          <strong>Response:</strong> {swap.responseMessage}
                        </p>
                      </div>
                    )}

                    {swap.status === 'PENDING' && (
                      <button
                        onClick={() => openSwapDecision(swap, 'cancel')}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-semibold transition-all border border-red-500/30"
                      >
                        Cancel Request
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'availability' && currentEmployeeId && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <AvailabilityGrid
              employeeId={currentEmployeeId}
              patterns={patterns}
              exceptions={exceptions}
              workingPattern={workingPattern}
              onUpdate={handleUpdateAvailability}
            />
          </div>
        )}
      </div>

      <Dialog open={swapDecisionOpen} onOpenChange={(open) => (open ? setSwapDecisionOpen(true) : closeSwapDecision())}>
        <DialogContent
          title={swapDecisionTitle}
          description={
            swapDecisionSwap
              ? `${format(new Date(swapDecisionSwap.Shift.startTime), 'EEEE, MMMM d, yyyy')} • ${format(new Date(swapDecisionSwap.Shift.startTime), 'h:mm a')} - ${format(new Date(swapDecisionSwap.Shift.endTime), 'h:mm a')}`
              : undefined
          }
          size="md"
          actions={
            <>
              <DialogAction variant="secondary" onClick={closeSwapDecision} disabled={swapDecisionSubmitting}>
                Close
              </DialogAction>
              <DialogAction
                variant={swapDecisionPrimaryVariant}
                onClick={submitSwapDecision}
                disabled={swapDecisionSubmitting || !swapDecisionSwap}
              >
                {swapDecisionSubmitting ? 'Working…' : swapDecisionPrimaryLabel}
              </DialogAction>
            </>
          }
        >
          {swapDecisionSwap && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-gray-200">
                  <div className="font-semibold text-white">Shift details</div>
                  {swapDecisionSwap.Shift.role && (
                    <div className="mt-2">
                      <span className="text-gray-300">Role:</span> {swapDecisionSwap.Shift.role}
                    </div>
                  )}
                  {swapDecisionSwap.Shift.location?.name && (
                    <div className="mt-1">
                      <span className="text-gray-300">Location:</span> {swapDecisionSwap.Shift.location.name}
                    </div>
                  )}
                  {swapDecisionSwap.requester?.User?.name && (
                    <div className="mt-1">
                      <span className="text-gray-300">Requested by:</span> {swapDecisionSwap.requester.User.name}
                    </div>
                  )}
                </div>
              </div>

              {swapDecisionAction === 'reject' && (
                <div className="space-y-2">
                  <Label htmlFor="swap-reason" className="text-sm font-medium text-white">
                    Reason (optional)
                  </Label>
                  <Textarea
                    id="swap-reason"
                    value={swapDecisionReason}
                    onChange={(e) => setSwapDecisionReason(e.target.value)}
                    placeholder="Add a reason to help the requester understand your decision…"
                    className="bg-white/5 text-white placeholder:text-gray-400"
                  />
                </div>
              )}

              {swapDecisionError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200" role="alert">
                  {swapDecisionError}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Shift Swap Modal */}
      {selectedShift && (
        <ShiftSwapModal
          shift={selectedShift}
          employees={employees}
          onClose={() => setSelectedShift(null)}
          onSuccess={() => {
            setSelectedShift(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
