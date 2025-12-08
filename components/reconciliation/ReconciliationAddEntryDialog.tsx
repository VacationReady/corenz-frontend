'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
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
import Button from '@/components/ui/Button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, AlertCircle, Plus, Coffee } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface ReconciliationAddEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: {
    id: string;
    employeeId: string | null;
    startTime: Date;
    endTime: Date;
    breakDuration: number;
    role?: string | null;
  };
  date: Date;
  onSuccess?: () => void;
}

export default function ReconciliationAddEntryDialog({
  open,
  onOpenChange,
  shift,
  date,
  onSuccess,
}: ReconciliationAddEntryDialogProps) {
  const { toast } = useToast();
  const [entryDate, setEntryDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoDeductBreak, setAutoDeductBreak] = useState(true);

  const shiftDateString = format(shift.startTime, 'yyyy-MM-dd');
  const shiftDateLabel = format(shift.startTime, 'EEE, MMM d');
  const selectedDateString = format(date, 'yyyy-MM-dd');
  const isSameDayAsSelected = shiftDateString === selectedDateString;

  useEffect(() => {
    if (open) {
      setEntryDate(shiftDateString);
      setStartTime(format(shift.startTime, 'HH:mm'));
      setEndTime(format(shift.endTime, 'HH:mm'));
      setNotes('');
      setError(null);
      setAutoDeductBreak(true);
    }
  }, [open, shiftDateString, shift.startTime, shift.endTime]);

  const calculateHours = (includeBreakDeduction: boolean = true) => {
    if (!entryDate || !startTime || !endTime) return 0;

    const start = new Date(`${entryDate}T${startTime}`);
    const end = new Date(`${entryDate}T${endTime}`);

    if (end <= start) return 0;

    const diffMs = end.getTime() - start.getTime();
    const rawHours = diffMs / (1000 * 60 * 60);
    
    // Auto-deduct break time from shift if enabled
    if (includeBreakDeduction && autoDeductBreak && shift.breakDuration > 0) {
      return Math.max(0, rawHours - (shift.breakDuration / 60));
    }
    
    return Math.max(0, rawHours);
  };
  
  const rawHours = calculateHours(false);
  const hours = calculateHours(true);
  const breakHours = shift.breakDuration / 60;

  const scheduledHours = (() => {
    const diffMs = shift.endTime.getTime() - shift.startTime.getTime();
    const rawHours = diffMs / (1000 * 60 * 60);
    const workHours = rawHours - shift.breakDuration / 60;
    return Math.max(0, workHours);
  })();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!entryDate || !startTime || !endTime) {
      setError('Please fill in date, start time, and end time');
      return;
    }

    if (!shift.employeeId) {
      setError('Cannot add entry because this shift has no assigned employee');
      return;
    }

    if (entryDate !== shiftDateString) {
      setError(
        `Manual entries must be recorded on the shift's scheduled day (${shiftDateLabel}). You cannot add an entry on a different date.`
      );
      return;
    }

    const clockIn = new Date(`${entryDate}T${startTime}`);
    const clockOut = new Date(`${entryDate}T${endTime}`);

    if (clockOut <= clockIn) {
      setError('End time must be after start time');
      return;
    }

    // Disallow future dates
    const selectedDate = new Date(entryDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selectedDate > today) {
      setError('Cannot add entries for future dates');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/time-tracking/manual-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: shift.employeeId,
          clockInTime: clockIn.toISOString(),
          clockOutTime: clockOut.toISOString(),
          notes: notes.trim() || undefined,
          shiftId: shift.id,
          breakMinutes: autoDeductBreak ? shift.breakDuration : 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create manual entry');
      }

      toast({
        title: 'Entry added',
        description: `${hours.toFixed(2)} hours added for this shift`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      const message = err?.message || 'Failed to create manual entry';
      setError(message);
      toast({
        title: 'Failed to add entry',
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
            <div className="p-2 rounded-xl bg-primary/10">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold">Add Time Entry</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Scheduled reference */}
          <div className="p-3 rounded-xl bg-muted/50 border border-border text-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-medium">Scheduled</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {scheduledHours.toFixed(2)}h
              </span>
            </div>
            <p className="text-muted-foreground">
              {format(shift.startTime, 'EEE, MMM d')} • {format(shift.startTime, 'HH:mm')} - {format(shift.endTime, 'HH:mm')}
            </p>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="w-4 h-4 text-primary" />
              Date
            </Label>
            <Input
              type="date"
              value={entryDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEntryDate(e.target.value)}
              min={shiftDateString}
              max={shiftDateString}
              required
              className="h-11 rounded-xl"
            />
            {!isSameDayAsSelected && (
              <p className="text-xs text-muted-foreground">
                This shift is scheduled for {shiftDateLabel}. Manual entries will be created for that day, even if you're viewing a different reconciliation date.
              </p>
            )}
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4 text-emerald-600" />
                Start time
              </Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4 text-rose-600" />
                End time
              </Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {/* Break deduction toggle */}
          {shift.breakDuration > 0 && (
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
              <Switch
                checked={autoDeductBreak}
                onCheckedChange={setAutoDeductBreak}
              />
            </div>
          )}

          {/* Hours preview */}
          {rawHours > 0 && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Total time</span>
                <span className="text-lg font-semibold text-muted-foreground">{rawHours.toFixed(2)}h</span>
              </div>
              {autoDeductBreak && shift.breakDuration > 0 && (
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
                  <span className="text-xs text-muted-foreground">
                    Scheduled: {scheduledHours.toFixed(2)}h
                  </span>
                </div>
                <span className="text-2xl font-bold text-primary">{hours.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain why this manual entry is being added..."
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
              disabled={loading || hours <= 0}
              className="rounded-xl"
            >
              {loading ? 'Adding...' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
