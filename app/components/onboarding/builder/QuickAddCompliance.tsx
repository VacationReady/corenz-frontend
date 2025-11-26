"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Wallet,
  HeartPulse,
  FileText,
  ChevronDown,
  Check,
  Plus,
  Zap,
  Star,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NZ_ONBOARDING_PRESETS,
  type NzOnboardingPreset,
} from "@/lib/onboarding/nzPresets";

interface QuickAddComplianceProps {
  onApplyPreset: (preset: NzOnboardingPreset) => void;
  appliedPresets: Set<string>;
  steps: any[];
}

// Quick action definitions for one-click compliance additions
const QUICK_ACTIONS = [
  {
    id: "add-ird",
    label: "Add IRD Collection",
    description: "IRD number, tax code & IR330 declaration",
    icon: Wallet,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    presetId: "nz-ird-forms",
  },
  {
    id: "add-kiwisaver",
    label: "Add KiwiSaver",
    description: "KiwiSaver enrollment & contribution rates",
    icon: HeartPulse,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    presetId: "nz-kiwisaver",
  },
  {
    id: "add-hs",
    label: "Add Health & Safety",
    description: "WorkSafe briefing & H&S acknowledgement",
    icon: ShieldCheck,
    color: "text-rose-600",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    presetId: "nz-health-safety",
  },
];

// Check which compliance areas are covered by current steps
function analyzeComplianceCoverage(steps: any[]) {
  const coverage = {
    ird: false,
    kiwisaver: false,
    healthSafety: false,
  };

  steps.forEach((step) => {
    const slug = step?.metadata?.presetSlug;
    const type = step?.type;
    const title = (step?.title || "").toLowerCase();

    // IRD coverage
    if (
      slug?.startsWith("nz-ird") ||
      type === "payroll-setup" ||
      title.includes("ird") ||
      title.includes("tax code")
    ) {
      coverage.ird = true;
    }

    // KiwiSaver coverage
    if (
      slug?.startsWith("nz-kiwisaver") ||
      title.includes("kiwisaver") ||
      title.includes("superannuation")
    ) {
      coverage.kiwisaver = true;
    }

    // Health & Safety coverage
    if (
      slug?.startsWith("nz-hs") ||
      (type === "compliance-training" && title.includes("safety")) ||
      title.includes("health & safety") ||
      title.includes("worksafe")
    ) {
      coverage.healthSafety = true;
    }
  });

  return coverage;
}

export function QuickAddCompliance({
  onApplyPreset,
  appliedPresets,
  steps,
}: QuickAddComplianceProps) {
  const [selectedPreset, setSelectedPreset] = useState<NzOnboardingPreset | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const coverage = useMemo(() => analyzeComplianceCoverage(steps), [steps]);

  const allCovered = coverage.ird && coverage.kiwisaver && coverage.healthSafety;
  const noneCovered = !coverage.ird && !coverage.kiwisaver && !coverage.healthSafety;
  const partialCoverage = !allCovered && !noneCovered;

  const handleQuickAction = (presetId: string) => {
    const preset = NZ_ONBOARDING_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPreset(preset);
      setShowPreview(true);
    }
  };

  const handleConfirmAdd = () => {
    if (selectedPreset) {
      onApplyPreset(selectedPreset);
      setShowPreview(false);
      setSelectedPreset(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "gap-2 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:border-emerald-700",
              noneCovered &&
                "border-amber-300 bg-amber-50 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20"
            )}
          >
            <ShieldCheck
              className={cn(
                "w-4 h-4",
                noneCovered ? "text-amber-600" : "text-emerald-600"
              )}
            />
            <span className="hidden sm:inline">
              {noneCovered ? "Add NZ Compliance" : "Quick Add"}
            </span>
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          {/* Coverage Summary */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                NZ Compliance Coverage
              </span>
              {allCovered ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px]">
                  <Check className="w-2.5 h-2.5 mr-0.5" />
                  Complete
                </Badge>
              ) : noneCovered ? (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-[10px]">
                  <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                  Not configured
                </Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-[10px]">
                  <Info className="w-2.5 h-2.5 mr-0.5" />
                  Partial
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <CompliancePill label="IRD" covered={coverage.ird} />
              <CompliancePill label="KiwiSaver" covered={coverage.kiwisaver} />
              <CompliancePill label="H&S" covered={coverage.healthSafety} />
            </div>
          </div>

          {/* Quick Actions */}
          <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">
            Quick Add
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            {QUICK_ACTIONS.map((action) => {
              const isApplied =
                (action.presetId === "nz-ird-forms" && coverage.ird) ||
                (action.presetId === "nz-kiwisaver" && coverage.kiwisaver) ||
                (action.presetId === "nz-health-safety" && coverage.healthSafety);

              return (
                <DropdownMenuItem
                  key={action.id}
                  onClick={() => handleQuickAction(action.presetId)}
                  disabled={isApplied}
                  className="flex items-start gap-3 py-3 cursor-pointer"
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-none", action.bgColor)}>
                    <action.icon className={cn("w-4 h-4", action.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{action.label}</span>
                      {isApplied && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Check className="w-2.5 h-2.5 mr-0.5" />
                          Added
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  {!isApplied && <Plus className="w-4 h-4 text-slate-400 flex-none" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Full Presets Link */}
          <DropdownMenuItem className="text-xs text-slate-500 justify-center">
            <Star className="w-3 h-3 mr-1" />
            All presets available in full library
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              {selectedPreset?.name}
            </DialogTitle>
            <DialogDescription>{selectedPreset?.summary}</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              This will add {selectedPreset?.steps.length} steps:
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedPreset?.steps.map((step, index) => (
                <div
                  key={step.slug}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                >
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {selectedPreset?.complianceReferences && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 mb-1">
                  Compliance References:
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  {selectedPreset.complianceReferences.join(", ")}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAdd}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              <Plus className="w-4 h-4" />
              Add {selectedPreset?.steps.length} Steps
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CompliancePill({ label, covered }: { label: string; covered: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        covered
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
      )}
    >
      {covered ? (
        <Check className="w-3 h-3" />
      ) : (
        <span className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600" />
      )}
      {label}
    </div>
  );
}

// Compliance Summary Badge for header
export function ComplianceSummaryBadge({ steps }: { steps: any[] }) {
  const coverage = useMemo(() => analyzeComplianceCoverage(steps), [steps]);
  const coveredCount = [coverage.ird, coverage.kiwisaver, coverage.healthSafety].filter(
    Boolean
  ).length;

  if (coveredCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {coverage.ird && (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-[10px] px-1.5">
          IRD
        </Badge>
      )}
      {coverage.kiwisaver && (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] px-1.5">
          KiwiSaver
        </Badge>
      )}
      {coverage.healthSafety && (
        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 text-[10px] px-1.5">
          H&S
        </Badge>
      )}
    </div>
  );
}

export default QuickAddCompliance;

