"use client";

import { useMemo, useState } from "react";
import { Calendar, CheckCircle2, Clock4, Eye, Shield } from "lucide-react";
import type { JourneyMetadataDetail } from "@/types/journey-metadata";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/switch";

const steps = ["Review", "Validate Compliance", "Preview", "Publish"] as const;

interface PublishingFlowProps {
  publishing: JourneyMetadataDetail["publishing"];
}

export function PublishingFlow({ publishing }: PublishingFlowProps) {
  const [activeStep, setActiveStep] = useState<(typeof steps)[number]>("Review");
  const [selectedPersona, setSelectedPersona] = useState(publishing.personaPreviews[0]?.id ?? "employee");
  const [schedulePublish, setSchedulePublish] = useState(false);

  const personaOptions = publishing.personaPreviews.length
    ? publishing.personaPreviews
    : [{ id: "employee", label: "Employee", description: "Employee preview" }];

  const checklistTotals = publishing.reviewTotals;
  const milestoneCoverage = useMemo(() => {
    if (!checklistTotals.totalSteps) return 0;
    return Math.round((checklistTotals.stepsConfigured / checklistTotals.totalSteps) * 100);
  }, [checklistTotals]);

  return (
    <section className="rounded-3xl border border-border/60 glass-subtle">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Publishing & validation</h2>
          <p className="text-xs text-muted-foreground">
            Stepper guides admins through NZ compliance checks before publishing large onboarding journeys.
          </p>
        </div>
        <Button variant="secondary" icon={<Shield className="h-4 w-4" />}>
          Export pre-publication report
        </Button>
      </header>
      <div className="p-6 space-y-6">
        <ol className="grid gap-4 sm:grid-cols-4">
          {steps.map((step) => (
            <li
              key={step}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                activeStep === step
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-background/70 text-muted-foreground"
              }`}
            >
              <button className="w-full text-left" onClick={() => setActiveStep(step)}>
                {step}
              </button>
            </li>
          ))}
        </ol>

        {activeStep === "Review" ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <h3 className="text-sm font-semibold text-foreground">Checklist completeness</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                {checklistTotals.stepsConfigured} / {checklistTotals.totalSteps} steps configured
              </p>
              <div className="mt-3 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, milestoneCoverage)}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <h3 className="text-sm font-semibold text-foreground">Milestone coverage</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                {checklistTotals.milestones} mapped milestones
              </p>
              <div className="mt-3 h-2 rounded-full bg-muted">
                <div className="h-full w-full rounded-full bg-primary" />
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <h3 className="text-sm font-semibold text-foreground">Document readiness</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                {checklistTotals.mandatoryDocuments} mandatory documents present
              </p>
              <div className="mt-3 h-2 rounded-full bg-muted">
                <div className="h-full w-full rounded-full bg-primary" />
              </div>
            </div>
          </div>
        ) : null}

        {activeStep === "Validate Compliance" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {publishing.complianceChecklist.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 text-sm ${
                  item.status === "Warning"
                    ? "border-amber-500 bg-amber-100/70 text-amber-900"
                    : "border-emerald-500 bg-emerald-100/80 text-emerald-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{item.label}</span>
                  <Badge className={item.status === "Warning" ? "bg-amber-600" : "bg-emerald-600"}>{item.status}</Badge>
                </div>
                {item.status === "Warning" ? (
                  <p className="mt-2 text-xs text-amber-800">
                    Resolve outstanding NZ compliance requirements before publication.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {activeStep === "Preview" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              {personaOptions.map((persona) => (
                <button
                  key={persona.id}
                  className={`rounded-full px-3 py-1 border text-xs ${
                    selectedPersona === persona.id
                      ? "bg-primary text-white border-primary"
                      : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedPersona(persona.id)}
                >
                  {persona.label}
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Eye className="h-4 w-4 text-primary" />
                {personaOptions.find((preview) => preview.id === selectedPersona)?.label ?? "Preview"} journey preview
              </div>
              <p className="mt-3 text-xs text-muted-foreground max-w-3xl">
                {personaOptions.find((preview) => preview.id === selectedPersona)?.description ??
                  "Preview highlights communication and compliance helpers for the selected persona."}
              </p>
            </div>
          </div>
        ) : null}

        {activeStep === "Publish" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Switch checked={schedulePublish} onChange={setSchedulePublish} id="schedule-publish" />
              <label htmlFor="schedule-publish" className="cursor-pointer">
                {schedulePublish ? "Schedule publish" : "Publish now"}
              </label>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-xs text-muted-foreground">
              <p>
                Confirmation references NZ data retention obligations. Publish window automatically checks for NZ public holiday
                conflicts before activating journeys.
              </p>
              <p className="mt-2 text-primary">
                Publishing timezone: {publishing.timezone}. Holiday conflicts detected: {publishing.hasHolidayConflicts ? "Yes" : "No"}
              </p>
            </div>
            {schedulePublish ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Schedule around NZ public holidays to avoid statutory downtime.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock4 className="h-4 w-4 text-primary" />
                <span>Publish action queues asynchronous jobs to prevent bottlenecks for large tenants.</span>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Progress bars dynamically scale to journeys with up to 200 steps and milestones.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary">Back</Button>
            <Button>Continue</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
