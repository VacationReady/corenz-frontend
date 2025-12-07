'use client';

import React, { useEffect, useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import Button from '@/components/ui/Button';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Clock,
  AlertCircle,
  Edit2,
  Coffee,
  CheckCircle,
  Loader2,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditClockEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clockEntry: {
    id: string;
    clockInTime: Date;
    clockOutTime: Date | null;
  };
  shift?: {
    id: string;
    startTime: Date;
    endTime: Date;
    breakDuration: number;
  } | null;
  employeeName?: string;
  onSuccess?: () => void;
}

export default function EditClockEntryDialog({
  open,
  onOpenChange,
  clockEntry,
  shift,
  employeeName,
  onSuccess,
}: EditClockEntryDialogProps) {
  const { toast } = useToast();
  const [clockInTime, setClockInTime] = useState('');
  const [clockOutTime, setClockOutTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoDeductBreak, setAutoDeductBreak] = useState(true);

  useEffect(() => {
    if (open && clockEntry) {
      setClockInTime(format(clockEntry.clockInTime, "yyyy-MM-dd'T'HH:mm"));
      setClockOutTime(
        clockEntry.clockOutTime
          ? format(clockEntry.clockOutTime, "yyyy-MM-dd'T'HH:mm")
          : ''
      );
      setNotes('');
      setError(null);
      setAutoDeductBreak(true);
    }
  }, [open, clockEntry]);

  const calculateHours = (includeBreakDeduction: boolean = true) => {
    if (!clockInTime || !clockOutTime) return 0;

    const start = parseISO(clockInTime);
    const end = parseISO(clockOutTime);

    if (!isValid(start) || !isValid(end) || end <= start) return 0;

    const diffMs = end.getTime() - start.getTime();
    const rawHours = diffMs / (1000 * 60 * 60);

    // Auto-deduct break time from shift if enabled
    if (includeBreakDeduction && autoDeductBreak && shift?.breakDuration && shift.breakDuration > 0) {
      return Math.max(0, rawHours - shift.breakDuration / 60);
    }

    return Math.max(0, rawHours);
  };

  const rawHours = calculateHours(false);
  const hours = calculateHours(true);
  const breakHours = shift?.breakDuration ? shift.breakDuration / 60 : 0;

  const scheduledHours = shift
    ? (() => {
        const diffMs = shift.endTime.getTime() - shift.startTime.getTime();
        const rawHours = diffMs / (1000 * 60 * 60);
        return Math.max(0, rawHours - (shift.breakDuration || 0) / 60);
      })()
    : 0;

  const handleUseScheduled = () => {
    if (shift) {
      const shiftDate = format(shift.startTime, 'yyyy-MM-dd');
      setClockInTime(`${shiftDate}T${format(shift.startTime, 'HH:mm')}`);
      setClockOutTime(`${shiftDate}T${format(shift.endTime, 'HH:mm')}`);
      setNotes('Adjusted to scheduled time');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clockInTime) {
      setError('Please provide a clock in time');
      return;
    }

    const newClockIn = parseISO(clockInTime);
    const newClockOut = clockOutTime ? parseISO(clockOutTime) : null;

    if (!isValid(newClockIn)) {
      setError('Invalid clock in time');
      return;
    }

    if (newClockOut && !isValid(newClockOut)) {
      setError('Invalid clock out time');
      return;
    }

    if (newClockOut && newClockOut <= newClockIn) {
      setError('Clock out time must be after clock in time');
      return;
    }

    // Disallow future dates
    const now = new Date();
    if (newClockIn > now) {
      setError('Cannot set clock in time in the future');
      return;
    }

    if (newClockOut && newClockOut > now) {
      setError('Cannot set clock out time in the future');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/reconciliation/edit-clock-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clockEntryId: clockEntry.id,
          clockInTime: newClockIn.toISOString(),
          clockOutTime: newClockOut?.toISOString() || null,
          notes: notes.trim() || undefined,
          breakMinutes: autoDeductBreak && shift ? shift.breakDuration : 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update clock entry');
      }

      toast({
        title: 'Clock entry updated',
        description: `Entry updated successfully${hours > 0 ? ` (${hours.toFixed(2)} payable hours)` : ''}`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      const message = err?.message || 'Failed to update clock entry';
      setError(message);
      toast({
        title: 'Failed to update entry',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30">
              <Edit2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Edit Clock Entry</DialogTitle>
              {employeeName && (
                <p className="text-sm text-muted-foreground mt-0.5">{employeeName}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          {/* Original entry reference */}
          <div className="p-3 rounded-xl bg-muted/50 border border-border text-sm">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">Original Entry</span>
            </div>
            <p className="text-foreground">
              {format(clockEntry.clockInTime, 'EEE, MMM d')} •{' '}
              {format(clockEntry.clockInTime, 'HH:mm')} -{' '}
              {clockEntry.clockOutTime ? format(clockEntry.clockOutTime, 'HH:mm') : 'Active'}
            </p>
          </div>

          {/* Scheduled reference */}
          {shift && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-medium">Scheduled Shift</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleUseScheduled}
                  className="text-xs text-primary hover:text-primary h-7 px-2"
                >
                  Use scheduled time
                </Button>
              </div>
              <p className="text-muted-foreground">
                {format(shift.startTime, 'EEE, MMM d')} •{' '}
                {format(shift.startTime, 'HH:mm')} - {format(shift.endTime, 'HH:mm')}
                {shift.breakDuration > 0 && (
                  <span className="ml-2 text-xs">({shift.breakDuration} min break)</span>
                )}
              </p>
            </div>
          )}

          {/* Clock In Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4 text-emerald-600" />
              Clock In Time
            </Label>
            <Input
              type="datetime-local"
              value={clockInTime}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClockInTime(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
          </div>

          {/* Clock Out Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4 text-rose-600" />
              Clock Out Time
            </Label>
            <Input
              type="datetime-local"
              value={clockOutTime}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClockOutTime(e.target.value)}
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty if the employee is still clocked in
            </p>
          </div>

          {/* Break deduction toggle */}
          {shift && shift.breakDuration > 0 && clockOutTime && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Coffee className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Auto-deduct break</span>
                  <span className="text-xs text-muted-foreground">
                    {shift.breakDuration} min break from shift schedule
                  </span>
                </div>
              </div>
              <Switch checked={autoDeductBreak} onCheckedChange={setAutoDeductBreak} />
            </div>
          )}

          {/* Hours preview */}
          {rawHours > 0 && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Total time</span>
                <span className="text-lg font-semibold text-muted-foreground">
                  {rawHours.toFixed(2)}h
                </span>
              </div>
              {autoDeductBreak && shift && shift.breakDuration > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Coffee className="w-3 h-3" />
                    Break deduction
                  </span>
                  <span className="text-amber-600">-{breakHours.toFixed(2)}h</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">Payable hours</span>
                  {shift && (
                    <span className="text-xs text-muted-foreground">
                      Scheduled: {scheduledHours.toFixed(2)}h
                    </span>
                  )}
                </div>
                <span className="text-2xl font-bold text-primary">{hours.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Reason for Edit (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain why this entry is being edited (e.g., missed clock, time challenge)..."
              rows={3}
              className="rounded-xl resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{notes.length}/500 characters</p>
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
