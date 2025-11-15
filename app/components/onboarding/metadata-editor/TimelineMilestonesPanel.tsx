"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { addDays, format } from "date-fns";
import { CalendarClock, Columns3, ListTree, Search, TimerReset } from "lucide-react";
import clsx from "clsx";
import type { Milestone } from "@/types/journey-metadata";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TimelineMilestonesPanelProps {
  milestones: Milestone[];
  timezone: string;
  holidayRegion?: string | null;
}

type ViewMode = "board" | "gantt";

type HolidayEvent = { title: string; start: string };

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatDayOffset(dayOffset: number) {
  if (dayOffset === 0) return "Day 0";
  return `Day ${dayOffset > 0 ? `+${dayOffset}` : dayOffset}`;
}

export function TimelineMilestonesPanel({ milestones, timezone, holidayRegion }: TimelineMilestonesPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [businessDaysOnly, setBusinessDaysOnly] = useState(true);
  const [showHolidayOverlay, setShowHolidayOverlay] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const dataset = useMemo(() => milestones ?? [], [milestones]);

  const filteredMilestones = useMemo(() => {
    if (!searchTerm) return dataset;
    const query = searchTerm.toLowerCase();
    return dataset.filter((milestone) =>
      milestone.title.toLowerCase().includes(query) ||
      milestone.phase.toLowerCase().includes(query) ||
      milestone.helperText?.toLowerCase().includes(query) ||
      milestone.complianceAlert?.toLowerCase().includes(query),
    );
  }, [dataset, searchTerm]);

  const visibleMilestones = useMemo(() => {
    if (!businessDaysOnly) return filteredMilestones;
    return filteredMilestones.filter((milestone) => {
      const date = addDays(new Date(), milestone.dayOffset);
      const day = date.getUTCDay();
      return day !== 0 && day !== 6;
    });
  }, [filteredMilestones, businessDaysOnly]);

  const phases = useMemo(() => {
    const groups: Record<string, Milestone[]> = {};
    visibleMilestones.forEach((milestone) => {
      if (!groups[milestone.phase]) groups[milestone.phase] = [];
      groups[milestone.phase].push(milestone);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [visibleMilestones]);

  const range = useMemo(() => {
    if (!dataset.length) {
      const today = new Date();
      return {
        min: 0,
        max: 0,
        from: today,
        to: addDays(today, 7),
      };
    }
    const min = dataset.reduce((acc, milestone) => Math.min(acc, milestone.dayOffset), Infinity);
    const max = dataset.reduce((acc, milestone) => Math.max(acc, milestone.dayOffset), -Infinity);
    const base = new Date();
    return {
      min,
      max,
      from: addDays(base, min - 7),
      to: addDays(base, max + 7),
    };
  }, [dataset]);

  const holidayQuery = useMemo(() => {
    if (!showHolidayOverlay || !dataset.length) return null;
    const params = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    });
    if (holidayRegion) {
      params.set("region", holidayRegion);
    }
    return `/api/public-holidays?${params.toString()}`;
  }, [showHolidayOverlay, dataset.length, range.from, range.to, holidayRegion]);

  const { data: holidaysData } = useSWR<HolidayEvent[]>(holidayQuery, fetcher, {
    revalidateOnFocus: false,
  });

  const holidays = holidaysData ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            icon={<Columns3 className="h-4 w-4" />}
            variant={viewMode === "board" ? "primary" : "secondary"}
            onClick={() => setViewMode("board")}
          >
            Milestone view
          </Button>
          <Button
            icon={<ListTree className="h-4 w-4" />}
            variant={viewMode === "gantt" ? "primary" : "secondary"}
            onClick={() => setViewMode("gantt")}
          >
            Gantt view
          </Button>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-primary font-medium">
              Auto-clustering active for 50+ steps
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 font-medium">
              NZ public holidays overlay ready
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full md:w-80">
            <Input
              placeholder="Search milestones or phases"
              icon={<Search className="h-4 w-4" />}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search milestones"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={businessDaysOnly} onChange={setBusinessDaysOnly} id="timeline-business-days" />
            <label htmlFor="timeline-business-days" className="cursor-pointer">
              Business days only
            </label>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={showHolidayOverlay}
              onChange={setShowHolidayOverlay}
              id="timeline-holiday-overlay"
              disabled={!holidaysData && !!holidayQuery}
            />
            <label htmlFor="timeline-holiday-overlay" className="cursor-pointer">
              Show NZ public holidays
            </label>
          </div>
        </div>

        {viewMode === "board" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {phases.map(([phase, milestonesForPhase]) => (
              <section key={phase} className="rounded-3xl border border-border/60 glass-subtle">
                <header className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{phase}</h3>
                    <p className="text-xs text-muted-foreground">{milestonesForPhase.length} milestones</p>
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary">
                    Drag & drop ready
                  </Badge>
                </header>
                <div className="space-y-4 p-5">
                  {milestonesForPhase.map((milestone) => (
                    <article
                      key={milestone.id}
                      className="rounded-2xl border border-border/60 bg-background/60 p-4 shadow-sm transition hover:shadow-md focus-within:ring-2 focus-within:ring-primary/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-foreground">{milestone.title}</h4>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                          {formatDayOffset(milestone.dayOffset)}
                        </span>
                      </div>
                      {milestone.helperText ? (
                        <p className="mt-2 text-xs text-muted-foreground">{milestone.helperText}</p>
                      ) : null}
                      {milestone.complianceAlert ? (
                        <div className="mt-3 rounded-2xl border border-amber-400 bg-amber-100/80 px-3 py-2 text-xs text-amber-900">
                          {milestone.complianceAlert}
                        </div>
                      ) : null}
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-primary">
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span>Linked checklist steps adjust automatically when milestone date shifts.</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-3 rounded-3xl border border-border/60 glass-subtle p-5">
            {visibleMilestones.map((milestone) => (
              <div
                key={milestone.id}
                className="grid gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm md:grid-cols-[200px_1fr]"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">{milestone.phase}</span>
                  <span className="text-sm font-semibold text-foreground">{milestone.title}</span>
                  <span className="text-xs text-muted-foreground">{formatDayOffset(milestone.dayOffset)}</span>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  {milestone.helperText ? <p>{milestone.helperText}</p> : null}
                  <div className="flex items-center gap-2 text-[11px] text-primary">
                    <TimerReset className="h-3.5 w-3.5" />
                    <span>Auto-adjusted in {timezone}</span>
                  </div>
                  {milestone.complianceAlert ? (
                    <div className="rounded-2xl border border-amber-400 bg-amber-100/80 px-3 py-2 text-amber-900">
                      {milestone.complianceAlert}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <section className="rounded-3xl border border-border/60 glass-subtle">
          <header className="border-b border-border/60 px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">Timeline settings</h3>
            <p className="text-xs text-muted-foreground">NZST alignment with regional holiday awareness.</p>
          </header>
          <div className="space-y-3 p-5 text-xs text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">Timezone</span>
              <p>{timezone}</p>
            </div>
            <div>
              <span className="font-semibold text-foreground">Window</span>
              <p>
                {format(range.from, "d MMM yyyy")} → {format(range.to, "d MMM yyyy")}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 glass-subtle">
          <header className="border-b border-border/60 px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">NZ public holidays</h3>
            <p className="text-xs text-muted-foreground">Overlay helps avoid statutory scheduling conflicts.</p>
          </header>
          <div className="max-h-64 space-y-2 overflow-auto p-5 text-xs text-muted-foreground">
            {showHolidayOverlay && holidays.length === 0 ? (
              <p>No holidays detected in the visible window.</p>
            ) : null}
            {showHolidayOverlay
              ? holidays.map((holiday) => (
                  <div key={`${holiday.title}-${holiday.start}`} className="flex items-center justify-between gap-3">
                    <span>{holiday.title}</span>
                    <span className="text-[11px] text-muted-foreground/80">
                      {format(new Date(holiday.start), "d MMM yyyy")}
                    </span>
                  </div>
                ))
              : (
                  <p>Enable the overlay to load regional public holidays.</p>
                )}
          </div>
        </section>
      </aside>
    </div>
  );
}
