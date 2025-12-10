'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Button from '@/components/ui/Button';
import { 
  Link2, 
  Calendar, 
  Clock, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Shift {
  id: string;
  startTime: Date;
  endTime: Date;
  role?: string | null;
  employee?: {
    id: string;
    User?: {
      name?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  } | null;
}

interface LinkToShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryType: 'clock' | 'timesheet';
  entryId: string;
  entryStartTime: Date;
  entryEndTime: Date;
  employeeId: string;
  employeeName: string;
  date: Date;
  onSuccess: () => void;
}

export default function LinkToShiftDialog({
  open,
  onOpenChange,
  entryType,
  entryId,
  entryStartTime,
  entryEndTime,
  employeeId,
  employeeName,
  date,
  onSuccess,
}: LinkToShiftDialogProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch available shifts for this employee on this date
  useEffect(() => {
    if (!open) return;

    const fetchShifts = async () => {
      setLoading(true);
      try {
        const dateStr = format(date, 'yyyy-MM-dd');
        const response = await fetch(
          `/api/reconciliation/day/${dateStr}?employeeId=${employeeId}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch shifts');
        }
        
        const data = await response.json();
        
        // Extract all shifts for this employee
        // Include shifts that don't have directly linked entries (shiftId on the entry)
        // This allows linking unmatched entries to their intended shifts
        const availableShifts = data.shifts
          .filter((s: any) => {
            // Include if no timesheet entry, or if timesheet entry has no shiftId
            const hasLinkedTimesheetEntry = s.timesheetEntry?.shiftId;
            const hasLinkedClockEntry = s.clockEntry?.shiftId;
            return !hasLinkedTimesheetEntry && !hasLinkedClockEntry;
          })
          .map((s: any) => ({
            id: s.shift.id,
            startTime: new Date(s.shift.startTime),
            endTime: new Date(s.shift.endTime),
            role: s.shift.role,
            employee: s.shift.employee,
          }));
        
        setShifts(availableShifts);
      } catch (error) {
        console.error('Error fetching shifts:', error);
        toast({
          title: 'Error',
          description: 'Failed to load available shifts',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchShifts();
  }, [open, date, employeeId, toast]);

  const handleLink = async () => {
    if (!selectedShiftId) return;

    setLinking(true);
    try {
      const response = await fetch('/api/reconciliation/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryType,
          entryId,
          shiftId: selectedShiftId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link entry');
      }

      toast({
        title: 'Entry Linked',
        description: 'The entry has been linked to the selected shift',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link entry to shift',
        variant: 'destructive',
      });
    } finally {
      setLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Link2 className="h-5 w-5 text-blue-500" />
            </div>
            Link to Shift
          </DialogTitle>
          <DialogDescription>
            Link this time entry to a scheduled shift for reconciliation tracking.
          </DialogDescription>
        </DialogHeader>

        {/* Info tooltip */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Why link to a shift?</p>
            <p className="text-blue-600 dark:text-blue-400">
              Linking connects your time entry to the scheduled shift, enabling variance tracking, 
              approval workflows, and accurate payroll reconciliation.
            </p>
          </div>
        </div>

        {/* Current entry info */}
        <div className="p-4 rounded-xl bg-muted/50 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Time Entry</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">{employeeName}</p>
              <p className="text-sm text-muted-foreground">
                {format(entryStartTime, 'HH:mm')} - {format(entryEndTime, 'HH:mm')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{format(date, 'EEE, MMM d')}</p>
              <p className="text-xs text-muted-foreground capitalize">{entryType} entry</p>
            </div>
          </div>
        </div>

        {/* Available shifts */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Available Shifts
          </h4>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No unlinked shifts found for this employee on this date.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                All shifts may already be linked to entries.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {shifts.map((shift) => (
                <button
                  key={shift.id}
                  onClick={() => setSelectedShiftId(shift.id)}
                  className={cn(
                    'w-full p-3 rounded-xl border-2 text-left transition-all',
                    selectedShiftId === shift.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:border-primary/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        selectedShiftId === shift.id ? 'bg-primary/10' : 'bg-muted'
                      )}>
                        <Calendar className={cn(
                          'h-4 w-4',
                          selectedShiftId === shift.id ? 'text-primary' : 'text-muted-foreground'
                        )} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {format(shift.startTime, 'HH:mm')} - {format(shift.endTime, 'HH:mm')}
                        </p>
                        {shift.role && (
                          <p className="text-xs text-muted-foreground">{shift.role}</p>
                        )}
                      </div>
                    </div>
                    {selectedShiftId === shift.id && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={linking}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedShiftId || linking}
            className="rounded-xl bg-blue-500 hover:bg-blue-600"
          >
            {linking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Link to Shift
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
