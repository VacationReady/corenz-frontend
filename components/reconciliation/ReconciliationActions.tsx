'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  Flag,
  Edit2,
  Link2,
  Unlink,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ReconciliationActionsProps {
  entryId: string;
  entryType: 'clock' | 'timesheet';
  currentStatus: string;
  hasShiftLink: boolean;
  varianceMinutes: number;
  onApprove?: () => void;
  onAdjust?: () => void;
  onFlag?: () => void;
  onMatch?: () => void;
  onUnmatch?: () => void;
  onRefresh?: () => void;
  compact?: boolean;
  className?: string;
}

export default function ReconciliationActions({
  entryId,
  entryType,
  currentStatus,
  hasShiftLink,
  varianceMinutes,
  onApprove,
  onAdjust,
  onFlag,
  onMatch,
  onUnmatch,
  onRefresh,
  compact = false,
  className,
}: ReconciliationActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAction = async (action: string, apiCall: () => Promise<void>) => {
    setLoading(action);
    try {
      await apiCall();
      toast({
        title: 'Success',
        description: `Entry ${action}ed successfully`,
      });
      onRefresh?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${action} entry`,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleApprove = async () => {
    await handleAction('approve', async () => {
      const response = await fetch('/api/reconciliation/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId }),
      });
      if (!response.ok) throw new Error('Failed to approve');
      onApprove?.();
    });
  };

  const handleFlag = async (notes: string) => {
    await handleAction('flag', async () => {
      const response = await fetch('/api/reconciliation/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, notes }),
      });
      if (!response.ok) throw new Error('Failed to flag');
      onFlag?.();
    });
  };

  const handleUnmatch = async () => {
    await handleAction('unmatch', async () => {
      const response = await fetch('/api/reconciliation/unmatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryType, entryId }),
      });
      if (!response.ok) throw new Error('Failed to unmatch');
      onUnmatch?.();
    });
  };

  const handleAdjustToScheduled = async () => {
    await handleAction('adjust', async () => {
      const response = await fetch('/api/reconciliation/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId,
          adjustmentType: 'TO_SCHEDULED',
        }),
      });
      if (!response.ok) throw new Error('Failed to adjust');
      onAdjust?.();
    });
  };

  const isApproved = currentStatus === 'APPROVED';
  const isFlagged = currentStatus === 'FLAGGED';
  const canApprove = !isApproved && entryType === 'timesheet';
  const canAdjust = hasShiftLink && !isApproved && entryType === 'timesheet';
  const canFlag = !isFlagged && entryType === 'timesheet';
  const canUnmatch = hasShiftLink;

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {canApprove && (
            <DropdownMenuItem onClick={handleApprove} disabled={loading === 'approve'}>
              {loading === 'approve' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
              )}
              Approve as-is
            </DropdownMenuItem>
          )}
          {canAdjust && (
            <DropdownMenuItem onClick={handleAdjustToScheduled} disabled={loading === 'adjust'}>
              {loading === 'adjust' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Clock className="mr-2 h-4 w-4 text-violet-500" />
              )}
              Adjust to scheduled
            </DropdownMenuItem>
          )}
          {onAdjust && (
            <DropdownMenuItem onClick={onAdjust}>
              <Edit2 className="mr-2 h-4 w-4 text-blue-500" />
              Custom adjustment
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {canFlag && (
            <DropdownMenuItem 
              onClick={() => {
                const notes = window.prompt('Enter reason for flagging:');
                if (notes) handleFlag(notes);
              }}
              disabled={loading === 'flag'}
            >
              {loading === 'flag' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Flag className="mr-2 h-4 w-4 text-amber-500" />
              )}
              Flag for review
            </DropdownMenuItem>
          )}
          {onMatch && !hasShiftLink && (
            <DropdownMenuItem onClick={onMatch}>
              <Link2 className="mr-2 h-4 w-4 text-primary" />
              Link to shift
            </DropdownMenuItem>
          )}
          {canUnmatch && (
            <DropdownMenuItem 
              onClick={handleUnmatch}
              disabled={loading === 'unmatch'}
              className="text-rose-600"
            >
              {loading === 'unmatch' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="mr-2 h-4 w-4" />
              )}
              Remove link
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <AnimatePresence mode="wait">
        {canApprove && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Button
              size="sm"
              variant="outline"
              onClick={handleApprove}
              disabled={loading === 'approve'}
              className="h-9 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
            >
              {loading === 'approve' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
          </motion.div>
        )}

        {canAdjust && Math.abs(varianceMinutes) > 5 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Button
              size="sm"
              variant="outline"
              onClick={handleAdjustToScheduled}
              disabled={loading === 'adjust'}
              className="h-9 border-violet-500/30 text-violet-600 hover:bg-violet-500/10"
            >
              {loading === 'adjust' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Clock className="mr-2 h-4 w-4" />
              )}
              Adjust to Scheduled
            </Button>
          </motion.div>
        )}

        {canFlag && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const notes = window.prompt('Enter reason for flagging:');
                if (notes) handleFlag(notes);
              }}
              disabled={loading === 'flag'}
              className="h-9 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
            >
              {loading === 'flag' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Flag className="mr-2 h-4 w-4" />
              )}
              Flag
            </Button>
          </motion.div>
        )}

        {onAdjust && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={onAdjust}
              className="h-9"
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}








