"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Library, BarChart3, ExternalLink, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import type { ReportLibraryEntry } from "@/lib/reportLibrary";
import { hrCategories } from "@/lib/hrReportFields";
import { cn } from "@/lib/utils";

interface LibraryResponse {
  data: ReportLibraryEntry[];
}

const engineLabels: Record<ReportLibraryEntry["engine"], string> = {
  dynamic: "Customisable",
  custom: "Specialist",
};

export default function ReportsLibraryPage() {
  const router = useRouter();
  const breadcrumbs = useBreadcrumbs();

  const [entries, setEntries] = useState<ReportLibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/reports/library", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load library (${res.status})`);
        const json: LibraryResponse = await res.json();
        if (!cancelled && Array.isArray(json?.data)) {
          setEntries(json.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load library");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const byCategory: Record<string, ReportLibraryEntry[]> = {};
    entries.forEach((entry) => {
      if (!byCategory[entry.category]) byCategory[entry.category] = [];
      byCategory[entry.category].push(entry);
    });
    hrCategories.forEach((category) => {
      if (byCategory[category.id]) {
        byCategory[category.id].sort((a, b) => a.name.localeCompare(b.name));
      }
    });
    return byCategory;
  }, [entries]);

  const renderCard = (entry: ReportLibraryEntry) => {
    const handlePreview = () => {
      const params = new URLSearchParams();
      if (entry.engine === "custom" && entry.reportType) {
        params.set("reportType", entry.reportType);
        params.set("engine", "custom");
      } else {
        params.set("fields", JSON.stringify(entry.defaultFields));
        params.set("engine", "dynamic");
      }
      params.set("templateId", entry.id);
      params.set("returnTo", "/reports/library");
      router.push(`/reports/preview?${params.toString()}`);
    };

    const handleOpenBuilder = () => {
      const params = new URLSearchParams();
      params.set("templateId", entry.id);
      params.set("returnTo", "/reports/library");
      router.push(`/reports/builder-new?${params.toString()}`);
    };

    return (
      <Card key={entry.id} className="flex flex-col border-glass bg-background/70">
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
              {entry.icon}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">{entry.name}</CardTitle>
              <div className="text-xs text-muted-foreground uppercase tracking-tight">
                {engineLabels[entry.engine]}
              </div>
            </div>
          </div>
          <CardDescription>{entry.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Default columns
            </p>
            <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
              {entry.defaultFields.slice(0, 6).map((field) => (
                <span key={field} className="rounded-full border border-border/60 px-2 py-0.5">
                  {field.split(".").slice(-1)[0]}
                </span>
              ))}
              {entry.defaultFields.length > 6 && (
                <span className="text-muted-foreground/80">+{entry.defaultFields.length - 6} more</span>
              )}
            </div>
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button onClick={handlePreview}>
              <ExternalLink className="h-4 w-4 mr-2" /> Preview
            </Button>
            <Button variant="outline" onClick={handleOpenBuilder}>
              <BarChart3 className="h-4 w-4 mr-2" /> Open in Builder
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PageShell
      title="Report Library"
      description="Ready-made reports tuned for NZ HR and people managers"
      icon={<Library className="h-6 w-6" />}
      breadcrumbs={breadcrumbs}
      action={
        <Button variant="outline" onClick={() => router.push("/reports")}>Back to reports</Button>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Loading report templates…</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6">
          <p className="font-semibold text-destructive">Unable to load library</p>
          <p className="text-sm text-destructive/70">{error}</p>
        </div>
      ) : (
        <div className="space-y-10">
          {hrCategories.map((category) => {
            const items = grouped[category.id];
            if (!items || items.length === 0) return null;
            return (
              <section key={category.id} className="space-y-4">
                <header className={cn(
                  "flex flex-col gap-1 rounded-xl border px-4 py-3",
                  category.color,
                )}>
                  <p className="text-sm font-semibold">
                    <span className="mr-2 text-lg">{category.icon}</span>
                    {category.name}
                  </p>
                  <p className="text-xs opacity-80">{category.description}</p>
                </header>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map(renderCard)}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

