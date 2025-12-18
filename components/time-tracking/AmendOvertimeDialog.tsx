'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, AlertCircle, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Button from '@/components/ui/Button';
import { Label } from '@/components/ui/label';

interface TimesheetEntry {
  id: string;
  date: Date | string;
  startTime?: Date | string;
  endTime?: Date | string;
  hours: number | string;
  regularHours?: number | string;
  overtimeHours?: number | string;
  overtimeMultiplier?: number;
  overtimeReason?: string;
}

interface AmendOvertimeDialogProps {
  entry: TimesheetEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAmend: () => void;
}

export default function AmendOvertimeDialog({
  entry,
  open,
  onOpenChange,
  onAmend,
}: AmendOvertimeDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [regularHours, setRegularHours] = useState(0);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [multiplier, setMultiplier] = useState(1.5);
  const [reason, setReason] = useState('');

  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      const totalHours = typeof entry.hours === 'string' ? parseFloat(entry.hours) : entry.hours;
      const regular = entry.regularHours 
        ? (typeof entry.regularHours === 'string' ? parseFloat(entry.regularHours) : entry.regularHours)
        : totalHours;
      const overtime = entry.overtimeHours
        ? (typeof entry.overtimeHours === 'string' ? parseFloat(entry.overtimeHours) : entry.overtimeHours)
        : 0;

      setRegularHours(regular);
      setOvertimeHours(overtime);
      setMultiplier(entry.overtimeMultiplier || 1.5);
      setReason('');
    }
  }, [entry]);

  if (!entry || !open) return null;

  const totalHours = typeof entry.hours === 'string' ? parseFloat(entry.hours) : entry.hours;
  const entryDate = typeof entry.date === 'string' ? new Date(entry.date) : entry.date;

  // Validation
  const hoursValid = Math.abs((regularHours + overtimeHours) - totalHours) < 0.01; // Allow for floating point precision
  const reasonValid = reason.trim().length >= 10;
  const isValid = hoursValid && reasonValid;

  const handleSubmit = async () => {
    if (!isValid) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/timesheets/entries/${entry.id}/overtime`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regularHours,
          overtimeHours,
          multiplier,
          reason: reason.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to amend overtime');
      }

      toast({
        title: 'Overtime Amended',
        description: 'Overtime classification has been successfully updated',
      });

      onAmend();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error amending overtime:', err);
      toast({
        title: 'Failed to amend overtime',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Amend Overtime Classification</h2>
                <p className="text-amber-100 text-sm mt-0.5">
                  {format(entryDate, 'EEEE, d MMMM yyyy')} • {totalHours.toFixed(2)}h total
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Entry Time Range */}
          {entry.startTime && entry.endTime && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="text-sm">
                <span className="text-slate-500">Time: </span>
                <span className="font-semibold text-slate-900">
                  {format(typeof entry.startTime === 'string' ? new Date(entry.startTime) : entry.startTime, 'HH:mm')}
                  {' - '}
                  {format(typeof entry.endTime === 'string' ? new Date(entry.endTime) : entry.endTime, 'HH:mm')}
                </span>
              </div>
            </div>
          )}

          {/* Hours Split */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Hours Classification</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regular-hours">Regular Hours</Label>
                <Input
                  id="regular-hours"
                  type="number"
                  min="0"
                  max={totalHours}
                  step="0.25"
                  value={regularHours}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = parseFloat(e.target.value) || 0;
                    setRegularHours(value);
                    setOvertimeHours(totalHours - value);
                  }}
                  disabled={loading}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overtime-hours">Overtime Hours</Label>
                <Input
                  id="overtime-hours"
                  type="number"
                  min="0"
                  max={totalHours}
                  step="0.25"
                  value={overtimeHours}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = parseFloat(e.target.value) || 0;
                    setOvertimeHours(value);
                    setRegularHours(totalHours - value);
                  }}
                  disabled={loading}
                  className="bg-white"
                />
              </div>
            </div>

            {/* Validation Error */}
            {!hoursValid && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  Regular + Overtime must equal {totalHours.toFixed(2)} hours
                </AlertDescription>
              </Alert>
            )}

            {/* Visual Split */}
            <div className="flex items-center gap-2 p-4 bg-gradient-to-r from-blue-50 to-amber-50 border border-slate-200 rounded-xl">
              <div className="flex-1">
                <div className="text-xs text-slate-600 mb-1">Split</div>
                <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 transition-all" 
                    style={{ width: `${(regularHours / totalHours) * 100}%` }}
                    title={`Regular: ${regularHours.toFixed(2)}h`}
                  />
                  <div 
                    className="bg-amber-500 transition-all" 
                    style={{ width: `${(overtimeHours / totalHours) * 100}%` }}
                    title={`Overtime: ${overtimeHours.toFixed(2)}h`}
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-600">Total</div>
                <div className="text-lg font-bold text-slate-900">{totalHours.toFixed(2)}h</div>
              </div>
            </div>
          </div>

          {/* Multiplier */}
          <div className="space-y-2">
            <Label htmlFor="multiplier">Overtime Rate Multiplier</Label>
            <Select 
              value={multiplier.toString()} 
              onValueChange={(value: string) => setMultiplier(parseFloat(value))}
              disabled={loading}
            >
              <SelectTrigger id="multiplier" className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1.0">1.0× Regular Rate</SelectItem>
                <SelectItem value="1.5">1.5× Time and a Half</SelectItem>
                <SelectItem value="2.0">2.0× Double Time</SelectItem>
                <SelectItem value="2.5">2.5× Double Time and a Half</SelectItem>
                <SelectItem value="3.0">3.0× Triple Time</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Selected: <span className="font-semibold text-amber-600">{multiplier.toFixed(1)}×</span>
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Amendment (Required)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this overtime classification is being changed..."
              rows={4}
              disabled={loading}
              maxLength={500}
              className="bg-white resize-none"
            />
            <div className="flex items-center justify-between text-xs">
              <p className={`${reasonValid ? 'text-green-600' : 'text-slate-500'}`}>
                {reason.length}/500 characters {reasonValid ? '✓' : `(minimum 10)`}
              </p>
            </div>
          </div>

          {/* Important Notice */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-900">
              <p className="font-semibold mb-1">Audit Trail</p>
              <p>
                This amendment will be recorded in the audit log with your name and reason.
                The employee will be notified of the change.
              </p>
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || loading}
              className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Saving...
                </span>
              ) : (
                'Save Amendment'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
