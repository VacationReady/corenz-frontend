'use client';

import ClockWidget from "@/components/time-tracking/ClockWidget";
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { DashboardWidget } from '@/components/ui/DashboardWidget';
import { Clock, MapPin } from 'lucide-react';
import { WidgetLoading, WidgetError } from '@/components/ui/WidgetStates';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TodaysShiftWidget({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  
  const { data, error, isLoading, mutate } = useSWR(
    employeeId ? `/api/shifts/today?employeeId=${employeeId}` : null,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  // Fetch time tracking settings to check for GPS requirement
  const { data: settingsData } = useSWR(
    '/api/settings/time-tracking',
    fetcher
  );

  const settings = settingsData?.settings;

  // Temporary debugging
  console.log('[TodaysShift] API Response:', data);

  const handleClockUpdate = async () => {
    mutate();
    toast.success('Clock status updated');
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
          {/* Temporary debugging */}
          <details className="mt-4 text-left">
            <summary className="text-xs cursor-pointer text-gray-500">Debug Info</summary>
            <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
          <div className="mt-6 pt-4 border-t border-gray-100">
             <ClockWidget 
               requireGpsLocation={settings?.requireGpsLocation}
               photoRequirement={settings?.photoRequirement}
               onClockIn={async (data) => {
                 const response = await fetch('/api/time-tracking/clock-in', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                 });
                 if (!response.ok) throw new Error(await response.text());
                 handleClockUpdate();
               }}
               onClockOut={async (data) => {
                 const response = await fetch('/api/time-tracking/clock-out', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                 });
                 if (!response.ok) throw new Error(await response.text());
                 handleClockUpdate();
               }}
             />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.hasWorkedToday && !data?.activeClockEntry && data?.completedClockEntry && (
            <div className="text-sm font-medium text-green-600 dark:text-green-400">
              Shift completed
            </div>
          )}
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

          {/* Clock Widget replaces simple buttons */}
          <ClockWidget 
             requireGpsLocation={settings?.requireGpsLocation}
             photoRequirement={settings?.photoRequirement}
             onClockIn={async (data) => {
               const response = await fetch('/api/time-tracking/clock-in', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
               });
               const result = await response.json();
               if (!response.ok) throw new Error(result.error || 'Failed to clock in');
               handleClockUpdate();
             }}
             onClockOut={async (data) => {
               const response = await fetch('/api/time-tracking/clock-out', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
               });
               const result = await response.json();
               if (!response.ok) throw new Error(result.error || 'Failed to clock out');
               handleClockUpdate();
             }}
           />

           <div className="mt-4">
            <Button
              onClick={() => router.push('/employee/timesheet')}
              variant="outline"
              size="sm"
              className="w-full"
            >
              My Timesheet
            </Button>
           </div>
        </div>
      )}
    </DashboardWidget>
  );
}
