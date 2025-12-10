'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { DashboardWidget } from '@/components/ui/DashboardWidget';
import { Clock, Loader2 } from 'lucide-react';
import { WidgetLoading, WidgetError } from '@/components/ui/WidgetStates';
import { format } from 'date-fns';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ClockStatus {
  isClockedIn: boolean;
  activeEntry: {
    id: string;
    clockInTime: string;
  } | null;
  duration?: {
    hours: number;
    minutes: number;
  };
}

export function TodaysShiftWidgetCompact({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    employeeId ? `/api/shifts/today?employeeId=${employeeId}` : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const { data: settingsData } = useSWR('/api/settings/time-tracking', fetcher);

  // Fetch clock status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/time-tracking/status');
        const data = await response.json();
        setClockStatus(data);
      } catch (error) {
        console.error('Failed to fetch clock status:', error);
      }
    };
    fetchStatus();
  }, []);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClock = async () => {
    setActionLoading(true);
    const endpoint = clockStatus?.isClockedIn ? '/api/time-tracking/clock-out' : '/api/time-tracking/clock-in';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed');
      }
      
      // Refresh status
      const statusRes = await fetch('/api/time-tracking/status');
      setClockStatus(await statusRes.json());
      mutate();
      toast.success(clockStatus?.isClockedIn ? 'Clocked out' : 'Clocked in');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update clock status');
    } finally {
      setActionLoading(false);
    }
  };

  const isClockedIn = clockStatus?.isClockedIn || false;

  return (
    <DashboardWidget
      title="Today's Shift"
      icon={Clock}
      action={
        <button 
          onClick={() => router.push('/employee/schedule')}
          className="text-xs text-primary hover:underline"
        >
          View all
        </button>
      }
    >
      {isLoading ? (
        <WidgetLoading lines={2} />
      ) : error ? (
        <WidgetError message="Failed to load" />
      ) : !data?.isWorkingDay ? (
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">No shift today</p>
          <p className="text-xs text-muted-foreground">Enjoy your day off! 🌟</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Shift times */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-primary">
              {data.shift 
                ? format(new Date(data.shift.startTime), 'h:mm a')
                : data.workingPattern?.startTime || '9:00 AM'
              }
            </span>
            <span className="text-muted-foreground text-xs">to</span>
            <span className="font-semibold text-primary">
              {data.shift
                ? format(new Date(data.shift.endTime), 'h:mm a')
                : data.workingPattern?.endTime || '5:00 PM'
              }
            </span>
          </div>
        </div>
      )}

      {/* Compact Clock Section */}
      <div className="mt-3 pt-3 border-t border-border/40">
        <div className="text-center mb-2">
          <div className="text-2xl font-bold text-foreground">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(currentTime, 'EEEE, MMM d')}
          </div>
        </div>

        {/* Status indicator */}
        {isClockedIn && clockStatus?.duration && (
          <div className="text-center text-xs text-muted-foreground mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              {clockStatus.duration.hours}h {clockStatus.duration.minutes}m
            </span>
          </div>
        )}

        {/* Clock button */}
        <button
          onClick={handleClock}
          disabled={actionLoading}
          className={`w-full py-2 rounded-lg font-medium text-sm transition-all ${
            isClockedIn
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          } disabled:opacity-50`}
        >
          {actionLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {isClockedIn ? 'Clock Out' : 'Clock In'}
            </span>
          )}
        </button>
      </div>
    </DashboardWidget>
  );
}
