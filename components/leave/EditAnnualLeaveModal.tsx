'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Calendar,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import Button from '@/components/ui/Button';
import { useToast } from '@/hooks/use-toast';
import { useTenantFetch } from '@/hooks/useTenantFetch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatLeaveBalance } from '@/lib/decimalPrecision';

interface EditAnnualLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  currentBalance: number; // in days
  onSuccess?: () => void;
}

export default function EditAnnualLeaveModal({
  isOpen,
  onClose,
  employeeId,
  currentBalance,
  onSuccess,
}: EditAnnualLeaveModalProps) {
  const [balanceDays, setBalanceDays] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const tenantFetch = useTenantFetch();

  // Initialize balance when modal opens
  useEffect(() => {
    if (isOpen) {
      setBalanceDays(currentBalance?.toString() || '0');
      setReason('');
      setError(null);
    }
  }, [isOpen, currentBalance]);

  const handleSave = async () => {
    setError(null);

    // Validation
    const balanceNum = parseFloat(balanceDays);
    if (isNaN(balanceNum)) {
      setError('Please enter a valid number');
      return;
    }

    if (balanceNum < 0) {
      setError('Balance cannot be negative');
      return;
    }

    if (balanceNum > 200) {
      setError('Balance seems unusually high. Please verify the value.');
      return;
    }

    // Validate 0.25 day increments (quarter days)
    const remainder = (balanceNum * 4) % 1;
    if (remainder !== 0) {
      setError('Balance must be in 0.25 day increments (e.g., 15.0, 15.25, 15.5, 15.75)');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for this adjustment');
      return;
    }

    setLoading(true);
    try {
      const res = await tenantFetch(`/api/employees/${employeeId}/annual-leave-balance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          balanceDays: balanceNum,
          reason: reason.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Success',
          description: 'Annual leave balance updated successfully',
        });
        onSuccess?.();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update balance');
      }
    } catch (err) {
      setError('Failed to update balance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onClose();
    }
  };

  const balanceChange = balanceDays ? parseFloat(balanceDays) - currentBalance : 0;
  const hasChanges = Math.abs(balanceChange) > 0.01;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Edit Annual Leave Balance</DialogTitle>
              <DialogDescription>
                Adjust the annual leave balance for this employee
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Balance Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Current balance: <strong>{currentBalance?.toFixed(2) || '0'} days</strong>
              {hasChanges && (
                <span className={balanceChange > 0 ? 'text-green-600' : 'text-red-600'}>
                  {' '}→ {balanceDays ? parseFloat(balanceDays).toFixed(2) : '0'} days
                  {' '}({balanceChange > 0 ? '+' : ''}{balanceChange.toFixed(2)} days)
                </span>
              )}
            </AlertDescription>
          </Alert>

          {/* Balance Input */}
          <div className="space-y-2">
            <Label htmlFor="balance">
              New Balance (days) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="balance"
              type="number"
              step="0.25"
              min="0"
              max="200"
              value={balanceDays}
              onChange={(e) => setBalanceDays(e.target.value)}
              placeholder="e.g., 15.0"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Enter the new balance in days (in 0.25 day increments)
            </p>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Adjustment <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Annual leave carryover from previous year, Manual correction, etc."
              disabled={loading}
              rows={3}
              required
              aria-required="true"
              className={`w-full px-3 py-2 text-sm rounded-md border bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                reason && !reason.trim() ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
              }`}
            />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Required:</span> This will be recorded in the audit log for compliance
            </p>
            {reason && !reason.trim() && (
              <p className="text-xs text-destructive">Reason cannot be empty or only whitespace</p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !hasChanges || !reason.trim()}
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
      </DialogContent>
    </Dialog>
  );
}
