"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/label";
import {
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  FileText,
  UploadCloud,
  FileEdit,
  Info,
  Wrench,
  KeySquare,
  CalendarClock,
  UserRoundPlus,
  ShieldCheck,
  Wallet,
  HeartPulse,
  Target,
  Smile,
  Workflow,
  Check,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LivePreviewPaneProps {
  step: any | null;
  totalSteps: number;
  currentIndex: number | null;
}

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "acknowledge-document": FileText,
  "upload-document": UploadCloud,
  "collect-document": UploadCloud,
  "fill-form": FileEdit,
  "instructions": Info,
  "training-assignment": ShieldCheck,
  "equipment-checklist": Wrench,
  "system-access": KeySquare,
  "manager-checkin": CalendarClock,
  "buddy-introduction": UserRoundPlus,
  "compliance-training": ShieldCheck,
  "payroll-setup": Wallet,
  "benefits-enrollment": HeartPulse,
  "probation-goals": Target,
  "welcome-survey": Smile,
  "journey-automation": Workflow,
};

export function LivePreviewPane({ step, totalSteps, currentIndex }: LivePreviewPaneProps) {
  const [previewDevice, setPreviewDevice] = React.useState<"desktop" | "tablet" | "mobile">("desktop");

  const progress = currentIndex !== null && totalSteps > 0 
    ? Math.round(((currentIndex + 1) / totalSteps) * 100) 
    : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none px-4 py-4 border-b dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Live Preview</h3>
              <p className="text-xs text-muted-foreground">Employee view</p>
            </div>
          </div>
        </div>

        {/* Device Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {[
            { id: "desktop", icon: Monitor, label: "Desktop" },
            { id: "tablet", icon: Tablet, label: "Tablet" },
            { id: "mobile", icon: Smartphone, label: "Mobile" },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setPreviewDevice(id as typeof previewDevice)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                previewDevice === id
                  ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {!step ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Select a step to preview
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden mx-auto transition-all duration-300",
                previewDevice === "mobile" && "max-w-[320px]",
                previewDevice === "tablet" && "max-w-[480px]",
                previewDevice === "desktop" && "max-w-full"
              )}
            >
              {/* Progress Header */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">
                    Step {(currentIndex || 0) + 1} of {totalSteps}
                  </Badge>
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    {progress}% complete
                  </span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>

              {/* Step Content Preview */}
              <div className="p-4">
                <StepPreviewContent step={step} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex-none px-4 py-3 border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Preview mode</span>
          <Badge variant="outline" className="text-xs">
            Read-only
          </Badge>
        </div>
      </div>
    </div>
  );
}

function StepPreviewContent({ step }: { step: any }) {
  const Icon = STEP_ICONS[step.type] || FileText;
  const title = step.title?.trim() || "Untitled Step";
  const description = step.description?.trim() || "No description provided";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      {/* Step-specific preview */}
      {step.type === "acknowledge-document" && (
        <div className="space-y-3">
          <div className="aspect-[4/3] rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Document preview</p>
            </div>
          </div>
          <Label className="flex items-center gap-2 cursor-pointer">
            <Checkbox disabled />
            <span className="text-sm">I have read and acknowledge this document</span>
          </Label>
          <Button disabled className="w-full">Mark Complete</Button>
        </div>
      )}

      {step.type === "upload-document" && (
        <div className="space-y-3">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors">
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG up to 10MB
            </p>
          </div>
          <Button disabled className="w-full">Upload & Complete</Button>
        </div>
      )}

      {step.type === "fill-form" && (
        <div className="space-y-3">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Field example</Label>
              <Input placeholder="Enter value..." disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Another field</Label>
              <Input placeholder="Enter value..." disabled />
            </div>
          </div>
          <Button disabled className="w-full">Submit & Continue</Button>
        </div>
      )}

      {step.type === "instructions" && (
        <div className="space-y-3">
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-600 flex-none mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Welcome message or instructions will appear here. Use this step to introduce new hires to your company.
                </p>
              </div>
            </div>
          </Card>
          <Button disabled className="w-full gap-2">
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {(step.type === "equipment-checklist" || step.type === "system-access" || step.type === "training-assignment" || step.type === "compliance-training") && (
        <div className="space-y-3">
          <div className="space-y-2">
            {["Item 1", "Item 2", "Item 3"].map((item, i) => (
              <Label key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <Checkbox disabled />
                <span className="text-sm">{item}</span>
              </Label>
            ))}
          </div>
          <Button disabled className="w-full">Save Progress</Button>
        </div>
      )}

      {(step.type === "payroll-setup" || step.type === "benefits-enrollment" || step.type === "probation-goals" || step.type === "welcome-survey") && (
        <div className="space-y-3">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Required field</Label>
              <Input placeholder="Enter value..." disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Selection field</Label>
              <select className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" disabled>
                <option>Select an option...</option>
              </select>
            </div>
          </div>
          <Button disabled className="w-full">Save & Continue</Button>
        </div>
      )}

      {(step.type === "manager-checkin" || step.type === "buddy-introduction") && (
        <div className="space-y-3">
          <Card className="p-4 bg-slate-50 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <UserRoundPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Meeting Scheduled</p>
                <p className="text-sm text-muted-foreground">Check your calendar</p>
              </div>
            </div>
          </Card>
          <Button disabled className="w-full">Mark Complete</Button>
        </div>
      )}

      {!["acknowledge-document", "upload-document", "fill-form", "instructions", "equipment-checklist", "system-access", "training-assignment", "compliance-training", "payroll-setup", "benefits-enrollment", "probation-goals", "welcome-survey", "manager-checkin", "buddy-introduction"].includes(step.type) && (
        <div className="space-y-3">
          <Card className="p-4 bg-slate-50 dark:bg-slate-800">
            <p className="text-sm text-muted-foreground">
              Step content preview for "{step.type}" type
            </p>
          </Card>
          <Button disabled className="w-full">Complete Step</Button>
        </div>
      )}
    </div>
  );
}

export default LivePreviewPane;










