"use client";

import { useMemo, useState } from "react";
import { Filter, History, ShieldAlert } from "lucide-react";
import type { AuditEvent, ComplianceAlert } from "@/types/journey-metadata";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface AuditTrailPanelProps {
  events: AuditEvent[];
  alerts: ComplianceAlert[];
}

export function AuditTrailPanel({ events, alerts }: AuditTrailPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<"All" | "High" | "Medium">("All");

  const filteredAlerts = useMemo(() => {
    if (severityFilter === "All") return alerts;
    return alerts.filter((alert) => alert.severity === severityFilter);
  }, [alerts, severityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button icon={<History className="h-4 w-4" />}>View audit log</Button>
        <Button variant="secondary" icon={<Filter className="h-4 w-4" />}>Export filters</Button>
        <div className="ml-auto text-xs text-muted-foreground flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary font-medium">
            Journeys retain NZ compliance snapshots per publish event
          </span>
        </div>
      </div>

      <section className="rounded-3xl border border-border/60 glass-subtle">
        <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Recent activity</h3>
            <p className="text-xs text-muted-foreground">
              Every change is versioned with NZ compliance context. Undo window of 24 hours on bulk edits prevents misconfiguration.
            </p>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary">
            CSV / PDF export
          </Badge>
        </header>
        <div className="divide-y divide-border/60">
          {events.length ? (
            events.map((event) => (
              <article key={event.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{event.actor}</h4>
                    <p className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleString("en-NZ")}</p>
                  </div>
                  <Badge className="bg-primary text-white">{event.action}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground max-w-3xl">{event.details}</p>
              </article>
            ))
          ) : (
            <div className="px-6 py-8 text-sm text-muted-foreground">No audit events recorded yet.</div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 glass-subtle">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <div>
              <h3 className="text-base font-semibold text-foreground">Compliance alerts</h3>
              <p className="text-xs text-muted-foreground">
                Resolve flagged items before publishing to maintain NZ compliance.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {(["All", "High", "Medium"] as const).map((option) => (
              <button
                key={option}
                className={`rounded-full px-3 py-1 border text-xs ${
                  severityFilter === option
                    ? "bg-primary text-white border-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                }`}
                onClick={() => setSeverityFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </header>
        <div className="divide-y divide-border/60">
          {filteredAlerts.length ? (
            filteredAlerts.map((alert) => (
              <article key={alert.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={alert.severity === "High" ? "bg-rose-600" : "bg-amber-500"}>
                        {alert.severity}
                      </Badge>
                      <span className="text-sm font-semibold text-foreground">{alert.summary}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground max-w-3xl">{alert.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Related tab: {alert.relatedTab}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="px-6 py-8 text-sm text-muted-foreground">No compliance alerts detected.</div>
          )}
        </div>
      </section>
    </div>
  );
}
