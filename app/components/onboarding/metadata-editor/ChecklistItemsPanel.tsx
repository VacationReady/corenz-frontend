"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Filter, ListChecks, Search, Shuffle, Upload } from "lucide-react";
import clsx from "clsx";
import type { ChecklistStep } from "@/types/journey-metadata";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChecklistItemsPanelProps {
  steps: ChecklistStep[];
}

function StepActions({ step }: { step: ChecklistStep }) {
  const actionClass = "text-xs font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/40 rounded";

  return (
    <div className="flex items-center gap-3 text-xs">
      <button className={actionClass}>Edit</button>
      <span className="text-muted-foreground/50" aria-hidden>
        |
      </span>
      <button className={actionClass}>Duplicate</button>
      <span className="text-muted-foreground/50" aria-hidden>
        |
      </span>
      <button className={actionClass}>Archive</button>
      {step.status === "Published" && step.lastVerified ? (
        <span className="text-muted-foreground text-[11px]">
          Last verified {new Date(step.lastVerified).toLocaleDateString("en-NZ", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ) : null}
    </div>
  );
}

export function ChecklistItemsPanel({ steps }: ChecklistItemsPanelProps) {
  const [typeFilter, setTypeFilter] = useState<"All" | "Mandatory" | "Optional">("All");
  const [ownerFilter, setOwnerFilter] = useState<string>("All owners");
  const [draftOnly, setDraftOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [reorderMode, setReorderMode] = useState(false);
  const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(new Set());
  const [showBulkValidation, setShowBulkValidation] = useState(true);
  const [showBulkEdit, setShowBulkEdit] = useState(false);

  const dataset = useMemo(() => steps ?? [], [steps]);

  const owners = useMemo(() => {
    const ownerSet = new Set(dataset.map((step) => step.owner || "Unassigned"));
    return ["All owners", ...Array.from(ownerSet)];
  }, [dataset]);

  const filteredSteps = useMemo(() => {
    return dataset.filter((step) => {
      if (typeFilter === "Mandatory" && !step.mandatory) return false;
      if (typeFilter === "Optional" && step.mandatory) return false;
      if (draftOnly && step.status !== "Draft") return false;
      if (ownerFilter !== "All owners" && (step.owner || "Unassigned") !== ownerFilter) return false;
      if (!searchTerm) return true;
      const query = searchTerm.toLowerCase();
      return (
        step.name.toLowerCase().includes(query) ||
        (step.owner || "Unassigned").toLowerCase().includes(query) ||
        step.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        (step.complianceReference?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [dataset, draftOnly, ownerFilter, searchTerm, typeFilter]);

  const groupedSteps = useMemo(() => {
    return filteredSteps.reduce<Record<string, ChecklistStep[]>>((acc, step) => {
      const phaseKey = step.phase || "Uncategorised";
      acc[phaseKey] = acc[phaseKey] || [];
      acc[phaseKey].push(step);
      return acc;
    }, {});
  }, [filteredSteps]);

  const hasLargeStepCount = dataset.length > 50;

  const toggleSelectStep = (id: string) => {
    setSelectedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button icon={<ListChecks className="h-4 w-4" />} onClick={() => setSelectedStepIds(new Set())}>
          Add Step
        </Button>
        <Button variant="secondary" icon={<Filter className="h-4 w-4" />} onClick={() => setShowBulkEdit(true)}>
          Bulk Edit
        </Button>
        <Button
          variant={reorderMode ? "primary" : "secondary"}
          icon={<Shuffle className="h-4 w-4" />}
          onClick={() => setReorderMode((value) => !value)}
        >
          {reorderMode ? "Exit Reorder" : "Reorder"}
        </Button>
        <Button
          variant="secondary"
          icon={<CheckCircle2 className="h-4 w-4" />}
          onClick={() => setShowBulkValidation(true)}
        >
          Validate Compliance
        </Button>
        <Button variant="secondary" icon={<Upload className="h-4 w-4" />}>
          Import CSV
        </Button>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
            Virtualised for 200+ templates
          </span>
          <span className="rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 font-medium">
            Step validation runs asynchronously
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Button variant={typeFilter === "All" ? "primary" : "secondary"} onClick={() => setTypeFilter("All")}>
          All types
        </Button>
        <Button variant={typeFilter === "Mandatory" ? "primary" : "secondary"} onClick={() => setTypeFilter("Mandatory")}>
          Mandatory
        </Button>
        <Button variant={typeFilter === "Optional" ? "primary" : "secondary"} onClick={() => setTypeFilter("Optional")}>
          Optional
        </Button>
        <Button variant={draftOnly ? "primary" : "secondary"} onClick={() => setDraftOnly((value) => !value)}>
          Draft only
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full md:w-72">
          <Input
            placeholder="Find steps (e.g. owner:HR tag:privacy)"
            icon={<Search className="h-4 w-4" />}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Search steps"
          />
        </div>
        <div className="flex flex-wrap gap-2 text-xs" aria-label="Owner filter chips">
          {owners.map((owner) => (
            <button
              key={owner}
              className={clsx(
                "rounded-full px-3 py-1 border text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40",
                ownerFilter === owner
                  ? "bg-primary text-white border-primary"
                  : "bg-background border-border text-muted-foreground hover:bg-muted/50",
              )}
              onClick={() => setOwnerFilter(owner)}
            >
              {owner}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1"
                  onClick={() => setShowBulkValidation((value) => !value)}
                >
                  Compliance rules
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Flagged steps require NZ-specific consent, visa verification, or health and safety confirmation before
                publishing.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="space-y-6 rounded-3xl border border-border/60 glass-subtle p-5">
        {filteredSteps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-6 text-center text-sm text-muted-foreground">
            No steps match the current filters. Review MBIE onboarding templates before archiving NZ-mandated steps.
          </div>
        ) : (
          Object.entries(groupedSteps).map(([phase, stepsForPhase]) => (
            <section key={phase} className="space-y-4">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{phase}</h3>
                  <p className="text-xs text-muted-foreground">{stepsForPhase.length} steps</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-primary font-medium">Drag & drop ready</span>
                  {hasLargeStepCount ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 font-medium">
                      Jump to phase
                    </span>
                  ) : null}
                </div>
              </header>
              <div className="space-y-3">
                {stepsForPhase.map((step) => (
                  <article
                    key={step.id}
                    className={clsx(
                      "rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm transition focus-within:ring-2 focus-within:ring-primary/40",
                      selectedStepIds.has(step.id) ? "border-primary/60 bg-primary/5" : undefined,
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground">{step.name}</h4>
                          <Badge
                            variant={step.mandatory ? "default" : "outline"}
                            className={step.mandatory ? "bg-rose-600" : "bg-amber-500/20 text-amber-800"}
                          >
                            {step.mandatory ? "Mandatory" : "Optional"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Owner: {step.owner || "Unassigned"} • Duration: {step.duration} • Status: {step.status}
                        </p>
                        {step.helperText ? <p className="mt-2 text-xs text-muted-foreground">{step.helperText}</p> : null}
                        {step.complianceReference ? (
                          <p className="mt-2 text-xs text-primary">{step.complianceReference}</p>
                        ) : null}
                        {step.nzAlert ? (
                          <div className="mt-2 rounded-2xl border border-amber-400 bg-amber-100/80 px-3 py-2 text-xs text-amber-900">
                            {step.nzAlert}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {step.tags.length ? (
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            {step.tags.map((tag) => (
                              <Badge key={tag} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={selectedStepIds.has(step.id)}
                            onChange={() => toggleSelectStep(step.id)}
                            className="h-4 w-4 rounded border-border"
                          />
                          Select for bulk edit
                        </label>
                        <StepActions step={step} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {showBulkEdit || showBulkValidation ? (
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4 text-xs text-primary">
          Bulk tools update owner assignments, compliance tags, and durations with undo support. Validation highlights NZ-specific
          requirements such as Privacy Act consent and visa retention rules.
        </div>
      ) : null}
    </div>
  );
}
