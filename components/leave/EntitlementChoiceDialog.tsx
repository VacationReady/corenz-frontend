'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  User,
  Gift,
  CheckCircle2,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Button from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type EntitlementChoice = 'company-wide' | 'employee-only' | null;

interface EntitlementChoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onChoice: (choice: EntitlementChoice) => void;
  employeeName?: string;
}

export default function EntitlementChoiceDialog({
  isOpen,
  onClose,
  onChoice,
  employeeName,
}: EntitlementChoiceDialogProps) {
  const [selected, setSelected] = useState<EntitlementChoice>(null);

  const handleContinue = () => {
    if (selected) {
      onChoice(selected);
      setSelected(null);
    }
  };

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-lg p-0 bg-white dark:bg-slate-900 border-none shadow-2xl rounded-2xl overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-purple-500/10">
                <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Add Leave Entitlement
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  How would you like to add this entitlement?
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Options */}
          <div className="px-6 pb-6 space-y-3">
            {/* Company-Wide Option */}
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  type="button"
                  onClick={() => setSelected('company-wide')}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`relative w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                    selected === 'company-wide'
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : 'border-muted/50 bg-white/30 dark:bg-white/5 hover:border-primary/30 hover:bg-primary/5'
                  }`}
                >
                  {selected === 'company-wide' && (
                    <motion.div
                      className="absolute top-3 right-3"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    </motion.div>
                  )}
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl ${
                        selected === 'company-wide' ? 'bg-primary/20' : 'bg-muted/50'
                      }`}
                    >
                      <Building2
                        className={`w-5 h-5 ${
                          selected === 'company-wide' ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`font-semibold ${
                            selected === 'company-wide' ? 'text-primary' : 'text-foreground'
                          }`}
                        >
                          Create Company-Wide Event Type
                        </h4>
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Recommended
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        All employees can book this leave type. Shows in calendars, integrates with approval workflows, and tracks balances automatically.
                      </p>
                    </div>
                  </div>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[300px]">
                <p>Creates a new event category in Event Manager that all employees can use for self-service leave booking.</p>
              </TooltipContent>
            </Tooltip>

            {/* Employee-Only Option */}
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  type="button"
                  onClick={() => setSelected('employee-only')}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`relative w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                    selected === 'employee-only'
                      ? 'border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/10'
                      : 'border-muted/50 bg-white/30 dark:bg-white/5 hover:border-amber-500/30 hover:bg-amber-500/5'
                  }`}
                >
                  {selected === 'employee-only' && (
                    <motion.div
                      className="absolute top-3 right-3"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    </motion.div>
                  )}
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl ${
                        selected === 'employee-only' ? 'bg-amber-500/20' : 'bg-muted/50'
                      }`}
                    >
                      <User
                        className={`w-5 h-5 ${
                          selected === 'employee-only' ? 'text-amber-600' : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <h4
                        className={`font-semibold ${
                          selected === 'employee-only'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-foreground'
                        }`}
                      >
                        Add Balance for This Employee Only
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Track a custom balance just for {employeeName || 'the selected employee'}. Cannot be booked via self-service.
                      </p>
                    </div>
                  </div>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[300px]">
                <p>Creates a manual balance tracker for this employee only. Useful for one-off arrangements like Time in Lieu.</p>
              </TooltipContent>
            </Tooltip>

            {/* Info Note */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-muted/50">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Company-wide event types can be managed in{' '}
                <span className="font-medium text-foreground">Settings → Event Manager</span>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!selected}
              className="rounded-xl gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
