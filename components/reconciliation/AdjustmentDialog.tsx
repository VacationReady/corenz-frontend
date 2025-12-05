'use client';

import { useState, useEffect } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Clock,
  Calendar,
  Edit2,
  CheckCircle,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface AdjustmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: string;
  currentStartTime: Date;
  currentEndTime: Date;
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
  onSuccess?: () => void;
}

export default function AdjustmentDialog({
  isOpen,
  onClose,
  entryId,
  currentStartTime,
  currentEndTime,
  scheduledStartTime,
  scheduledEndTime,
  onSuccess,
}: AdjustmentDialogProps) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Pre-fill with current values
      setStartTime(format(currentStartTime, "yyyy-MM-dd'T'HH:mm"));
      setEndTime(format(currentEndTime, "yyyy-MM-dd'T'HH:mm"));
      setNotes('');
      setError(null);
    }
  }, [isOpen, currentStartTime, currentEndTime]);

  const handleSubmit = async () => {
    setError(null);
    
    const newStart = parseISO(startTime);
    const newEnd = parseISO(endTime);
    
    if (!isValid(newStart) || !isValid(newEnd)) {
      setError('Invalid date/time format');
      return;
    }
    
    if (newEnd <= newStart) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/reconciliation/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId,
          adjustmentType: 'CUSTOM',
          customStartTime: newStart.toISOString(),
          customEndTime: newEnd.toISOString(),
          notes: notes || 'Custom time adjustment',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to adjust entry');
      }

      toast({
        title: 'Entry Adjusted',
        description: 'The timesheet entry has been updated',
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust entry');
    } finally {
      setLoading(false);
    }
  };

  const handleUseScheduled = () => {
    if (scheduledStartTime && scheduledEndTime) {
      setStartTime(format(scheduledStartTime, "yyyy-MM-dd'T'HH:mm"));
      setEndTime(format(scheduledEndTime, "yyyy-MM-dd'T'HH:mm"));
      setNotes('Adjusted to scheduled time');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-violet-500/10">
              <Edit2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <DialogTitle className="text-xl font-bold">Adjust Time Entry</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm">{error}</p>
            </motion.div>
          )}

          {/* Reference: Scheduled Time */}
          {scheduledStartTime && scheduledEndTime && (
            <div className="p-3 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Scheduled</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleUseScheduled}
                  className="text-xs text-primary hover:text-primary"
                >
                  Use scheduled time
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {format(scheduledStartTime, 'HH:mm')} - {format(scheduledEndTime, 'HH:mm')}
              </p>
            </div>
          )}

          {/* Start Time */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              Start Time
            </Label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5"
            />
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-500" />
              End Time
            </Label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-11 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Adjustment Reason</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: Explain why this adjustment is needed..."
              className="min-h-[80px] rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Adjustment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

