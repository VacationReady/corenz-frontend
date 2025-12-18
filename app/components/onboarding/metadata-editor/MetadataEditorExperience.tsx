"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  ClipboardList,
  FileJson,
  LayoutGrid,
  Plus,
  ShieldAlert,
} from "lucide-react";
import type { JourneyMetadataResponse, TemplateSummary } from "@/types/journey-metadata";
import { nzRegulationSnippets, nzComplianceNotices } from "./data";
import { ChecklistItemsPanel } from "./ChecklistItemsPanel";
import { TimelineMilestonesPanel } from "./TimelineMilestonesPanel";
import { DocumentSettingsPanel } from "./DocumentSettingsPanel";
import { AuditTrailPanel } from "./AuditTrailPanel";
import { JourneyIdDrawer } from "./JourneyIdDrawer";
import { PublishingFlow } from "./PublishingFlow";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const filterOptions = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "published", label: "Published" },
  { id: "large", label: "50+ steps" },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function MetadataEditorExperience() {
  const router = useRouter();
  const [filters, setFilters] = useState<string[]>(["all"]);
  const [activeTab, setActiveTab] = useState("checklist");
  const [journeyDrawerOpen, setJourneyDrawerOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);

  const query = useMemo(() => {
    if (!selectedTemplateId) return "/api/journeys/metadata";
    const params = new URLSearchParams({ templateId: selectedTemplateId });
    return `/api/journeys/metadata?${params.toString()}`;
  }, [selectedTemplateId]);

  const { data, isLoading, mutate } = useSWR<JourneyMetadataResponse>(query, fetcher, {
    revalidateOnFocus: false,
  });

  const templates = data?.templates ?? [];

  const detail = data?.detail ?? null;

  const filteredTemplates = useMemo(() => {
    const dataset = templates;
    return dataset.filter((template) => {
      if (filters.includes("all")) return true;
      const matchesDraft = filters.includes("draft") && template.status === "Draft";
      const matchesPublished = filters.includes("published") && template.status === "Published";
      const matchesLarge = filters.includes("large") && template.steps >= 50;
      return matchesDraft || matchesPublished || matchesLarge;
    });
  }, [templates, filters]);

  const toggleFilter = (id: string) => {
    setFilters((prev) => {
      if (id === "all") return ["all"];
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev.filter((item) => item !== "all"), id];
      return next.length === 0 ? ["all"] : next;
    });
  };

  const handleSelectTemplate = (template: TemplateSummary) => {
    setSelectedTemplateId(template.id);
  };

  const handleValidateJourneyId = async (journeyId: string) => {
    const response = await fetch("/api/journeys/ids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ journeyId, templateId: detail?.template.id }),
    });
    const json = await response.json();
    if (!response.ok) {
      return { status: "error" as const, message: json?.error || "Validation failed." };
    }
    if (json.valid) {
      return { status: "ok" as const, message: json.message };
    }
    return { status: "error" as const, message: json.message };
  };

  const handleSaveJourneyId = async (journeyId: string) => {
    const response = await fetch("/api/journeys/ids", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ journeyId, templateId: detail?.template.id }),
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error || "Unable to update journey ID");
    }
    await mutate();
    return json.journeyId as string;
  };

  return (
    <div className="space-y-10">
      <header className="rounded-3xl border border-border/60 glass-subtle p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <Breadcrumb
              items={[
                { label: "Journeys", href: "/onboarding" },
                { label: "Onboarding", href: "/onboarding" },
                { label: "Metadata Editor", isCurrentPage: true },
              ]}
            />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Tenant Name • Journey Metadata Editor</h1>
              <p className="text-sm text-muted-foreground">
                Manage NZ-specific onboarding templates, compliance rules, and publishing workflows designed to scale to 50+ steps.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => router.push("/settings/journeys?tab=onboarding")}
            >
              Create new template
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="secondary" icon={<FileJson className="h-4 w-4" />} disabled>
                      Import JSON
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs leading-relaxed">
                  JSON import isnt available in this environment yet.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="secondary"
              icon={<ClipboardList className="h-4 w-4" />}
              onClick={() => router.push("/settings/system/audit-log")}
            >
              View audit log
            </Button>
            <Button variant="glass" icon={<LayoutGrid className="h-4 w-4" />} onClick={() => setJourneyDrawerOpen(true)}>
              Manage Journey ID
            </Button>
          </div>
        </div>
      </header>

      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              className={`rounded-full px-3 py-1 border text-xs font-medium transition ${
                filters.includes(option.id)
                  ? "bg-primary text-white border-primary"
                  : "bg-background border-border text-muted-foreground hover:bg-muted/50"
              }`}
              onClick={() => toggleFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">Virtualised table ready for 200+ templates</span>
        </div>
        <div className="overflow-hidden rounded-3xl border border-border/60 glass-subtle">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-muted-foreground">
              <tr className="text-left">
                <th className="px-5 py-3 font-medium">Template name</th>
                <th className="px-5 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    Journey ID
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-primary/40 text-[11px] text-primary">
                            i
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs leading-relaxed">
                          Journey IDs must match IRD reporting references when applicable.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
                <th className="px-5 py-3 font-medium">Last edited</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Steps</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-xs text-muted-foreground">
                    Loading metadata...
                  </td>
                </tr>
              ) : filteredTemplates.length ? (
                filteredTemplates.map((template) => (
                  <tr
                    key={template.id}
                    className={`transition hover:bg-primary/5 ${
                      detail?.template.id === template.id ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <td className="px-5 py-3">
                      <div className="font-semibold text-foreground">{template.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Updated {new Date(template.updatedAt).toLocaleString("en-NZ")}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-muted-foreground">{template.journeyId}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {new Date(template.updatedAt).toLocaleString("en-NZ", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <Badge className={template.status === "Published" ? "bg-emerald-600" : "bg-amber-500"}>
                        {template.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {template.steps} steps
                      <div className="text-[11px] text-muted-foreground/80">
                        {template.mandatorySteps} mandatory · {template.optionalSteps} optional
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-primary">
                      <button className="inline-flex items-center gap-1 rounded-full px-3 py-1 hover:underline">
                        Open template
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-xs text-muted-foreground">
                    No templates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="rounded-3xl border border-primary/30 bg-primary/5 p-4 text-sm text-primary flex items-center gap-3">
          <ShieldAlert className="h-5 w-5" /> NZ Privacy Act 2020 requires explicit consent for data use.
        </div>
        <div className="rounded-3xl border border-border/60 bg-background/80 p-4 text-sm text-muted-foreground flex items-center justify-between">
          <span>Need guidance? Review NZ MBIE onboarding standards.</span>
          <a
            href="https://www.mbie.govt.nz/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            View standards <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Journey • Template overview</CardTitle>
              <CardDescription>
                {detail ? (
                  <>
                    Journey ID: {detail.template.journeyId} • Status: {detail.template.status} • Last edited {new Date(detail.template.updatedAt).toLocaleString("en-NZ")}
                  </>
                ) : (
                  "Select a template to view details"
                )}
              </CardDescription>
            </CardHeader>
            {detail ? (
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
                    <p className="text-xs text-muted-foreground">Total steps</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{detail.template.steps}</p>
                    <p className="text-xs text-muted-foreground">NZ max threshold: 80</p>
                  </div>
                  <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                    <p className="text-xs text-muted-foreground">Mandatory steps</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{detail.template.mandatorySteps}</p>
                  </div>
                  <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                    <p className="text-xs text-muted-foreground">Optional steps</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{detail.template.optionalSteps}</p>
                  </div>
                  <div className="rounded-3xl border border-amber-400 bg-amber-50 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-amber-700">Compliance alerts</p>
                        <p className="mt-2 text-2xl font-semibold text-amber-900">{detail.template.complianceAlerts}</p>
                      </div>
                      <AlertTriangle className="h-5 w-5 text-amber-700" />
                    </div>
                    <button className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-700 underline">
                      View alerts
                    </button>
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full flex flex-wrap gap-2 bg-transparent p-0">
                    <TabsTrigger value="checklist" className="flex-1 rounded-2xl px-4 py-2">
                      Checklist Items
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="flex-1 rounded-2xl px-4 py-2">
                      Timeline Milestones
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex-1 rounded-2xl px-4 py-2">
                      Document Settings
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="flex-1 rounded-2xl px-4 py-2">
                      Audit Trail
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="checklist" className="mt-6">
                    <ChecklistItemsPanel steps={detail.checklist} />
                  </TabsContent>
                  <TabsContent value="timeline" className="mt-6">
                    <TimelineMilestonesPanel
                      milestones={detail.timeline.milestones}
                      timezone={detail.timeline.timezone}
                      holidayRegion={detail.timeline.holidayRegion}
                    />
                  </TabsContent>
                  <TabsContent value="documents" className="mt-6">
                    <DocumentSettingsPanel
                      documents={detail.documents.items}
                      retentionYears={detail.documents.retentionYears}
                      storageLocation={detail.documents.storageLocation}
                      encryption={detail.documents.encryption}
                      approverRoles={detail.documents.approverRoles}
                      notifyPortal={detail.documents.notifyPortal}
                    />
                  </TabsContent>
                  <TabsContent value="audit" className="mt-6">
                    <AuditTrailPanel events={detail.auditTrail.events} alerts={detail.auditTrail.alerts} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            ) : (
              <CardContent>
                <p className="text-sm text-muted-foreground">Select a template to review metadata and compliance details.</p>
              </CardContent>
            )}
          </Card>

          {detail ? <PublishingFlow publishing={detail.publishing} /> : null}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance guidance</CardTitle>
              <CardDescription>Contextual legislation based on the active tab.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(nzRegulationSnippets[activeTab as keyof typeof nzRegulationSnippets] || []).map((snippet) => (
                <div key={snippet} className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-xs text-primary">
                  {snippet}
                </div>
              ))}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700">
                Resolve flagged steps before publishing to maintain NZ compliance.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>NZ compliance notices</CardTitle>
              <CardDescription>Helper content surfaces per journey tab.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {nzComplianceNotices.map((notice) => (
                <div key={notice.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <h3 className="text-sm font-semibold text-foreground">{notice.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{notice.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </section>

      {detail ? (
        <JourneyIdDrawer
          open={journeyDrawerOpen}
          onOpenChange={setJourneyDrawerOpen}
          currentId={detail.template.journeyId}
          templateId={detail.template.id}
          suggestions={detail.journeyIdSuggestions}
          onValidate={handleValidateJourneyId}
          onSave={handleSaveJourneyId}
        />
      ) : null}
    </div>
  );
}
