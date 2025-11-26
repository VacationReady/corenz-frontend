"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { CheckCircle2, Users, Loader2 } from "lucide-react";

interface Step {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface BulkActionDialogWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon: React.ReactNode;
  iconGradient: string;
  steps?: Step[];
  currentStep?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "xl" | "full";
  selectedCount?: number;
}

export function BulkActionDialogWrapper({
  open,
  onOpenChange,
  title,
  description,
  icon,
  iconGradient,
  steps,
  currentStep = 0,
  children,
  footer,
  size = "xl",
  selectedCount = 0,
}: BulkActionDialogWrapperProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent rawContent className={cn("p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col", size === "md" && "max-w-lg", size === "lg" && "max-w-2xl", size === "xl" && "max-w-4xl", size === "full" && "max-w-6xl")}>
        <div className={cn("h-1 w-full", iconGradient)} />
        <div className="px-6 pt-5 pb-4 flex-shrink-0 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <motion.div className={cn("p-3 rounded-xl", iconGradient.replace("bg-gradient-to-r", "bg-gradient-to-br"), "shadow-lg")} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <div className="text-white">{icon}</div>
              </motion.div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{title}</h2>
                {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
              </div>
            </div>
            {selectedCount > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">{selectedCount} selected</span>
              </motion.div>
            )}
          </div>
          {steps && steps.length > 1 && (
            <div className="mt-5">
              <div className="flex items-center gap-2">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300", index < currentStep ? "bg-primary text-white" : index === currentStep ? "bg-primary/20 text-primary border-2 border-primary" : "bg-muted text-muted-foreground")}>
                        {index < currentStep ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </div>
                      <span className={cn("text-sm font-medium transition-colors", index === currentStep ? "text-foreground" : "text-muted-foreground")}>{step.label}</span>
                    </div>
                    {index < steps.length - 1 && <div className={cn("w-12 h-0.5 mx-3 rounded transition-colors duration-300", index < currentStep ? "bg-primary" : "bg-muted")} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>{children}</motion.div>
          </AnimatePresence>
        </div>
        {footer && <div className="px-6 py-4 border-t border-white/10 bg-muted/30 flex-shrink-0">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}

interface ActionButtonsProps {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  loading?: boolean;
  submitVariant?: "primary" | "danger";
  showBack?: boolean;
  onBack?: () => void;
  submitIcon?: React.ReactNode;
  submitGradient?: string;
}

export function ActionButtons({
  onCancel,
  onSubmit,
  submitLabel = "Apply Changes",
  submitDisabled = false,
  loading = false,
  submitVariant = "primary",
  showBack = false,
  onBack,
  submitIcon,
  submitGradient = "from-primary to-blue-600",
}: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-between">
      <div>{showBack && onBack && <Button type="button" variant="ghost" onClick={onBack} disabled={loading} className="rounded-xl">Back</Button>}</div>
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="rounded-xl border-white/20">Cancel</Button>
        <Button type="button" onClick={onSubmit} disabled={submitDisabled || loading} className={cn("rounded-xl font-semibold text-white shadow-lg min-w-[140px]", submitVariant === "primary" && ("bg-gradient-to-r " + submitGradient), submitVariant === "danger" && "bg-gradient-to-r from-rose-500 to-red-600")}>
          {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>) : (<>{submitIcon && <span className="mr-2">{submitIcon}</span>}{submitLabel}</>)}
        </Button>
      </div>
    </div>
  );
}
