"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Database, FileText, History, Lock, Upload, Users } from "lucide-react";
import type { DocumentSetting } from "@/types/journey-metadata";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/switch";

interface DocumentSettingsPanelProps {
  documents: DocumentSetting[];
  retentionYears: number;
  storageLocation: string | null;
  encryption: string | null;
  approverRoles: string[];
  notifyPortal: boolean;
}

export function DocumentSettingsPanel({
  documents,
  retentionYears,
  storageLocation,
  encryption,
  approverRoles,
  notifyPortal,
}: DocumentSettingsPanelProps) {
  const [autoVersioning, setAutoVersioning] = useState(true);
  const [notifyEmployees, setNotifyEmployees] = useState(notifyPortal);
  const [retention, setRetention] = useState(retentionYears);

  useEffect(() => {
    setNotifyEmployees(notifyPortal);
  }, [notifyPortal]);

  useEffect(() => {
    setRetention(retentionYears);
  }, [retentionYears]);

  const retentionLabel = useMemo(() => {
    if (retention === 7) return "7 years (NZ Tax Administration Act)";
    if (retention === 10) return "10 years (extended payroll retention)";
    return `${retention} years`;
  }, [retention]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button icon={<Upload className="h-4 w-4" />}>Batch upload templates</Button>
        <Button variant="secondary" icon={<Archive className="h-4 w-4" />}>Manage archives</Button>
        <div className="ml-auto text-xs text-muted-foreground flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary font-medium">
            Batch upload supports {documents.length || "?"} documents
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 font-medium">
            Encryption defaults to {encryption || "managed"}
          </span>
        </div>
      </div>

      <section className="rounded-3xl border border-border/60 glass-subtle">
        <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-base font-semibold text-foreground">Document types</h3>
              <p className="text-xs text-muted-foreground">
                Highlight mandatory vs conditional documents with NZ compliance badges and sample templates.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary">
            NZ-specific guidance
          </Badge>
        </header>
        <div className="grid gap-4 p-6 md:grid-cols-2">
          {documents.map((document) => (
            <article
              key={document.id}
              className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{document.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {document.helper || "Document available to onboarding journeys."}
                  </p>
                </div>
                <Badge className={document.mandatory ? "bg-rose-600" : "bg-amber-500"}>
                  {document.mandatory ? "Mandatory" : "Conditional"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="rounded-full bg-muted px-2.5 py-1">
                  {document.category ? document.category : "Uncategorised"}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1">
                  Added {new Date(document.createdAt).toLocaleDateString("en-NZ")}
                </span>
                {document.requiresSignature ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Signature required</span>
                ) : null}
              </div>
            </article>
          ))}
          {documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/70 p-6 text-center text-sm text-muted-foreground">
              No onboarding documents linked yet. Upload employment agreements, IRD forms, and KiwiSaver packs to satisfy NZ compliance.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 glass-subtle">
        <header className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
          <Database className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-semibold text-foreground">Storage & retention</h3>
            <p className="text-xs text-muted-foreground">
              Align retention periods with NZ Tax Administration Act guidance and regional data residency policies.
            </p>
          </div>
        </header>
        <div className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <h4 className="text-sm font-semibold text-primary">Retention period</h4>
              <p className="mt-2 text-xs text-primary/80">{retentionLabel}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {[7, 10, 12].map((year) => (
                  <button
                    key={year}
                    className={`rounded-full px-3 py-1 border text-xs ${
                      retention === year
                        ? "bg-primary text-white border-primary"
                        : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                    onClick={() => setRetention(year)}
                  >
                    {year === 12 ? "Indefinite (with approval)" : `${year} years`}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-primary">
                Confirm data residency policies with NZ Privacy Commissioner guidance before selecting offshore regions.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <h4 className="text-sm font-semibold text-foreground">Storage location</h4>
              <p className="mt-2 text-xs text-muted-foreground">
                {storageLocation ? `Primary region: ${storageLocation}` : "Region not yet configured."}
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-primary">
                <Lock className="h-3.5 w-3.5" />
                <span>Privacy Act encourages NZ/AU data residency. Geo-fencing enabled.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 glass-subtle">
        <header className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-semibold text-foreground">Sharing & approvals</h3>
            <p className="text-xs text-muted-foreground">
              Visualise approver roles, escalate missing compliance officer approvals, and notify employees via secure portal.
            </p>
          </div>
        </header>
        <div className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <h4 className="text-sm font-semibold text-foreground">Approver roles</h4>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                {approverRoles.length
                  ? approverRoles.map((role) => <li key={role}>• {role}</li>)
                  : [
                      "• HR Manager — reviews employment agreement updates.",
                      "• Compliance Officer — validates NZ statutory references.",
                    ].map((line) => <li key={line}>{line}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={notifyEmployees} onChange={setNotifyEmployees} id="notify-portal" />
                <label htmlFor="notify-portal" className="cursor-pointer">
                  Notify employees via secure portal
                </label>
              </div>
              <p className="mt-3 text-[11px] text-primary">
                Ensure access logs are available for MBIE audits. Portal exports available within audit trail.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 glass-subtle">
        <header className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
          <History className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-semibold text-foreground">Version control</h3>
            <p className="text-xs text-muted-foreground">
              Auto versioning and exportable audit trails help satisfy WorkSafe NZ inspections.
            </p>
          </div>
        </header>
        <div className="space-y-4 p-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <Switch checked={autoVersioning} onChange={setAutoVersioning} id="auto-versioning" />
            <label htmlFor="auto-versioning" className="cursor-pointer">
              Auto versioning enabled
            </label>
          </div>
          <p className="text-[11px] text-primary">
            Export audit logs quarterly to satisfy WorkSafe NZ inspections.
          </p>
        </div>
      </section>
    </div>
  );
}
