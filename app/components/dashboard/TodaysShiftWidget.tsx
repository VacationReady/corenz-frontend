'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { DashboardWidget } from '@/components/ui/DashboardWidget';
import { Clock, MapPin, PlayCircle, StopCircle, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { format, formatDistance } from 'date-fns';
import { WidgetLoading, WidgetError } from '@/components/ui/WidgetStates';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TodaysShiftWidget({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [isClocking, setIsClocking] = useState(false);
  
  const { data, error, isLoading, mutate } = useSWR(
    employeeId ? `/api/shifts/today?employeeId=${employeeId}` : null,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  const handleClockIn = async () => {
    setIsClocking(true);
    try {
      const response = await fetch('/api/time-tracking/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to clock in');
      }

      toast.success('Clocked in successfully!');
      mutate(); // Refresh data
    } catch (err: any) {
      toast.error(err.message || 'Failed to clock in');
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    setIsClocking(true);
    try {
      const response = await fetch('/api/time-tracking/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to clock out');
      }

      toast.success(`Clocked out successfully! Hours worked: ${result.hoursWorked}`);
      mutate(); // Refresh data
    } catch (err: any) {
      toast.error(err.message || 'Failed to clock out');
    } finally {
      setIsClocking(false);
    }
  };

  return (
    <DashboardWidget
      title="Today's Shift"
      icon={Clock}
      action={
        <button 
          onClick={() => router.push('/employee/schedule')}
          className="text-sm text-primary hover:underline"
        >
          View all shifts
        </button>
      }
    >
      {isLoading ? (
        <WidgetLoading lines={3} />
      ) : error ? (
        <WidgetError message="Failed to load shift" />
      ) : !data?.isWorkingDay ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No shift scheduled today</p>
          <p className="text-xs text-muted-foreground mt-1">Enjoy your day off! 🌟</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Show shift times or working pattern */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-100 dark:border-blue-900">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {data.shift 
                  ? format(new Date(data.shift.startTime), 'h:mm a')
                  : data.workingPattern?.startTime || '9:00 AM'
                }
              </span>
              <span className="text-gray-400 font-medium">to</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {data.shift
                  ? format(new Date(data.shift.endTime), 'h:mm a')
                  : data.workingPattern?.endTime || '5:00 PM'
                }
              </span>
            </div>
            
            {data.shift?.location && (
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <MapPin className="w-4 h-4 mr-1" />
                {data.shift.location.name}
              </div>
            )}
            
            {data.shift?.role ? (
              <div className="text-sm mt-2">
                <span className="text-muted-foreground">Role:</span>{' '}
                <span className="font-medium">{data.shift.role}</span>
              </div>
            ) : data.workingPattern ? (
              <div className="text-sm mt-2 text-muted-foreground">
                Standard working hours ({data.workingPattern.name})
              </div>
            ) : null}
          </div>

          {/* Active Clock Entry Display */}
          {data.activeClockEntry && (
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Currently clocked in
                  </span>
                </div>
                <span className="text-xs text-green-600 dark:text-green-400">
                  {formatDistance(new Date(data.activeClockEntry.clockInTime), new Date(), { addSuffix: true })}
                </span>
              </div>
            </div>
          )}

          {/* Clock In/Out Buttons */}
          <div className="flex gap-2">
            {data.activeClockEntry ? (
              <Button
                onClick={handleClockOut}
                variant="default"
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={isClocking}
                icon={isClocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
              >
                Clock Out
              </Button>
            ) : (
              <Button
                onClick={handleClockIn}
                variant="default"
                size="sm"
                className="flex-1"
                disabled={isClocking}
                icon={isClocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              >
                Clock In
              </Button>
            )}
            <Button
              onClick={() => router.push('/my-timesheet')}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              My Timesheet
            </Button>
          </div>
        </div>
      )}
    </DashboardWidget>
  );
}
