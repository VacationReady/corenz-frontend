'use client';

import useSWR from 'swr';
import { DashboardWidget } from '@/components/ui/DashboardWidget';
import { Clock, MapPin } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { WidgetLoading, WidgetError } from '@/components/ui/WidgetStates';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TodaysShiftWidget({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  
  const { data, error, isLoading } = useSWR(
    employeeId ? `/api/shifts/today?employeeId=${employeeId}` : null,
    fetcher,
    { refreshInterval: 60000 } // Refresh every minute
  );

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
      ) : !data?.shift ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No shift scheduled today</p>
          <p className="text-xs text-muted-foreground mt-1">Enjoy your day off! 🌟</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-100 dark:border-blue-900">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {format(new Date(data.shift.startTime), 'h:mm a')}
              </span>
              <span className="text-gray-400 font-medium">to</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {format(new Date(data.shift.endTime), 'h:mm a')}
              </span>
            </div>
            
            {data.shift.location && (
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <MapPin className="w-4 h-4 mr-1" />
                {data.shift.location.name}
              </div>
            )}
            
            {data.shift.role && (
              <div className="text-sm mt-2">
                <span className="text-muted-foreground">Role:</span>{' '}
                <span className="font-medium">{data.shift.role}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/employee/clock')}
              variant="default"
              size="sm"
              className="flex-1"
            >
              Clock In
            </Button>
            <Button
              onClick={() => router.push('/employee/schedule')}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              View Details
            </Button>
          </div>
        </div>
      )}
    </DashboardWidget>
  );
}
