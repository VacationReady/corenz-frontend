"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type Template = "NZ" | "AU" | "UK" | null;

const MotionButton = motion(Button);

export default function PublicHolidaysSettingsPage() {
  const [value, setValue] = useState<Template>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [regions, setRegions] = useState<{ value: string; label: string }[]>([]);
  const [regionsLoadedFor, setRegionsLoadedFor] = useState<Template>(null);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [regionPopoverOpen, setRegionPopoverOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewHolidays, setPreviewHolidays] = useState<Array<{ title: string; start: string }>>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/public-holidays");
        if (res.ok) {
          const data = await res.json();
          setValue((data?.template as Template) ?? null);
          setRegion((data?.region as string | null) ?? null);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const ensureRegionsLoaded = useCallback(async () => {
    if (!value || regionsLoadedFor === value) return;
    setRegionsLoading(true);
    try {
      const res = await fetch(`/api/public-holiday-regions?template=${value}`);
      if (res.ok) {
        const data = await res.json();
        setRegions(Array.isArray(data) ? data : []);
        setRegionsLoadedFor(value);
      }
    } catch {
      setRegions([]);
    }
    setRegionsLoading(false);
  }, [regionsLoadedFor, value]);

  useEffect(() => {
    if (value === null) {
      setRegions([]);
      setRegionsLoadedFor(null);
    }
  }, [value]);

  useEffect(() => {
    if (value && region && regions.length === 0) {
      ensureRegionsLoaded();
    }
  }, [ensureRegionsLoaded, region, regions.length, value]);

  // Load a preview list when selection changes
  useEffect(() => {
    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewHolidays([]);
      if (!value) {
        setPreviewLoading(false);
        return;
      }
      const year = new Date().getFullYear();
      const from = new Date(Date.UTC(year, 0, 1)).toISOString();
      const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();
      try {
        const qs = new URLSearchParams({ from, to, template: value, ...(region ? { region } : {}) });
        const res = await fetch(`/api/public-holidays?${qs.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const items = (Array.isArray(data) ? data : []).map((e: any) => ({ title: e.title, start: e.start }));
          items.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
          setPreviewHolidays(items);
        }
      } catch {
        setPreviewHolidays([]);
      }
      setPreviewLoading(false);
    };
    loadPreview();
  }, [value, region]);

  const holidayDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [],
  );

  const selectedRegionLabel = region
    ? regions.find((r) => r.value === region)?.label ?? "Loading region…"
    : "None (national)";

  const handleCountryChange = (template: string) => {
    setValue(template as Template);
    setRegion(null);
    setRegions([]);
    setRegionsLoadedFor(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/public-holidays", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: value, region }),
      });
      if (res.ok) toast.success("Public holiday template saved");
      else toast.error("Failed to save");
    } catch {
      toast.error("Error saving");
    }
    setSaving(false);
  };

  return (
    <PageShell
      title="Public Holiday Templates"
      description="Choose a regional holiday template for your company calendar."
      breadcrumbs={breadcrumbConfigs.settingsSection("Public Holiday Templates")}
      showHomeIcon={false}
      action={
        <MotionButton
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={handleSave}
          loading={saving}
          disabled={loading}
          loadingText="Saving template"
          icon={<Save className="h-4 w-4" />}
          className="bg-gradient-to-r from-primary-500 via-editorial-purple/90 to-editorial-teal/80 text-white shadow-[0_20px_45px_-20px_rgba(79,70,229,0.65)] hover:shadow-[0_28px_65px_-25px_rgba(56,189,248,0.55)] focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Save
        </MotionButton>
      }
    >
      <motion.div
        data-state={value ? "region-active" : "country-only"}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative isolate mt-6 space-y-6 overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-white/70 via-primary/10 to-primary/5 p-6 shadow-[0_40px_120px_-60px_rgba(59,130,246,0.6)] before:pointer-events-none before:absolute before:inset-[-30%] before:-z-10 before:rounded-full before:bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.28),transparent_60%)] before:opacity-40 before:transition-opacity data-[state=region-active]:before:opacity-80 dark:border-white/5 dark:from-slate-900/60 dark:via-slate-900/30 dark:to-slate-900/70 motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-bottom-6"
      >
        <span className="pointer-events-none absolute -right-10 top-10 h-56 w-56 rounded-full bg-editorial-purple/20 blur-3xl opacity-70 dark:bg-editorial-purple/30" />
        <span className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-editorial-teal/10 blur-3xl opacity-60 dark:bg-editorial-teal/20" />
        <div className="relative space-y-6">
          <Card className="relative overflow-hidden border border-white/20 bg-white/80 p-6 shadow-xl shadow-[0_30px_60px_-45px_rgba(59,130,246,0.5)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-32 rounded-full bg-white/60 dark:bg-slate-800/70" />
                <div className="relative w-full md:w-96 overflow-hidden rounded-2xl border border-white/30 bg-white/60 p-3 shadow-inner dark:border-white/10 dark:bg-slate-900/70">
                  <div className="absolute inset-0 animate-gradient-shift bg-[length:200%_200%] bg-[radial-gradient(circle_at_0%_50%,rgba(79,70,229,0.25),transparent_55%),radial-gradient(circle_at_100%_50%,rgba(56,189,248,0.25),transparent_55%)] opacity-70" />
                  <div className="relative space-y-2">
                    <Skeleton className="h-4 w-3/4 rounded-full bg-white/80 dark:bg-slate-800/70" />
                    <Skeleton className="h-4 w-2/3 rounded-full bg-white/70 dark:bg-slate-800/70" />
                  </div>
                </div>
                <Skeleton className="h-3 w-1/2 rounded-full bg-white/60 dark:bg-slate-800/70" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="mb-1 font-medium text-sm uppercase tracking-wide text-muted-foreground/80">Country</div>
                  <Select value={value ?? undefined} onValueChange={handleCountryChange}>
                    <SelectTrigger className="w-full md:w-96 rounded-2xl border border-white/30 bg-white/70 text-foreground shadow-inner transition hover:border-primary/40 hover:bg-white/90 focus:ring-2 focus:ring-primary/40 dark:border-white/10 dark:bg-slate-900/60 dark:text-white">
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border border-white/20 bg-white/90 backdrop-blur-xl shadow-xl dark:border-white/10 dark:bg-slate-900/90">
                      <SelectItem value="NZ">New Zealand</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </Card>
          <AnimatePresence mode="wait">
            {!loading && value ? (
              <motion.div
                key="region-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <Card className="relative overflow-hidden border border-white/20 bg-white/85 p-6 shadow-xl shadow-[0_35px_70px_-45px_rgba(79,70,229,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/70">
                  <div className="mb-2 font-medium">Region / State</div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Choose a subdivision for more accurate holidays (optional).
                  </p>
                  <Popover
                    open={regionPopoverOpen}
                    onOpenChange={(open) => {
                      setRegionPopoverOpen(open);
                      if (open) ensureRegionsLoaded();
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="glass"
                        className="group w-full justify-between rounded-2xl border border-white/40 bg-gradient-to-r from-white/70 via-white/50 to-white/30 px-4 py-3 text-sm font-medium text-foreground shadow-[0_15px_35px_-20px_rgba(59,130,246,0.6)] transition hover:border-primary/40 hover:shadow-[0_22px_45px_-25px_rgba(56,189,248,0.55)] focus:ring-2 focus:ring-primary/50 dark:border-white/10 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-900/70 dark:text-white"
                      >
                        <span className="truncate">
                          {regionsLoading && regions.length === 0 ? "Loading regions…" : selectedRegionLabel}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-60 transition group-hover:opacity-90" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 rounded-3xl border border-white/20 bg-white/95 p-0 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95">
                      <Command>
                        <CommandInput placeholder="Search regions…" />
                        <CommandList>
                          <CommandEmpty className={cn("py-4 text-center text-sm text-muted-foreground", regionsLoading && "hidden")}>No regions found.</CommandEmpty>
                          {regionsLoading ? (
                            <div className="space-y-3 px-4 py-6">
                              <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/50">
                                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-70" />
                              </div>
                              <Skeleton className="h-4 w-2/3 rounded-full" />
                              <Skeleton className="h-4 w-1/2 rounded-full" />
                              <Skeleton className="h-4 w-3/4 rounded-full" />
                            </div>
                          ) : (
                            <CommandGroup className="space-y-1">
                              <CommandItem
                                value=""
                                onSelect={() => {
                                  setRegion(null);
                                  setRegionPopoverOpen(false);
                                }}
                                className={cn(
                                  "group flex items-center justify-between rounded-2xl px-3 py-2 text-sm",
                                  region === null && "bg-primary/10 text-primary",
                                )}
                              >
                                <span>None (national)</span>
                                <Check
                                  className={cn(
                                    "h-4 w-4 opacity-0 transition-opacity group-hover:opacity-60",
                                    region === null && "opacity-100",
                                  )}
                                />
                              </CommandItem>
                              {regions.map((r) => (
                                <CommandItem
                                  key={r.value}
                                  value={r.label}
                                  onSelect={() => {
                                    setRegion(r.value);
                                    setRegionPopoverOpen(false);
                                  }}
                                  className={cn(
                                    "group flex items-center justify-between rounded-2xl px-3 py-2 text-sm",
                                    region === r.value && "bg-primary/10 text-primary",
                                  )}
                                >
                                  <span className="truncate">{r.label}</span>
                                  <Check
                                    className={cn(
                                      "h-4 w-4 opacity-0 transition-opacity group-hover:opacity-60",
                                      region === r.value && "opacity-100",
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <AnimatePresence mode="wait">
                    {previewLoading ? (
                      <motion.div
                        key="preview-loading"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="mt-8 space-y-4"
                      >
                        <Skeleton className="h-4 w-48 rounded-full" />
                        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-r from-muted/40 via-muted/60 to-muted/40 p-6 shadow-inner dark:border-white/10 dark:from-slate-900/50 dark:via-slate-900/70 dark:to-slate-900/50">
                          <div className="absolute inset-0 animate-gradient-shift bg-[length:200%_200%] bg-[linear-gradient(120deg,rgba(59,130,246,0.15),rgba(56,189,248,0.1),rgba(147,51,234,0.15))] opacity-70" />
                          <div className="relative space-y-4">
                            {[0, 1, 2].map((idx) => (
                              <div key={idx} className="flex items-start gap-4">
                                <Skeleton className="mt-1 h-3 w-3 rounded-full" />
                                <div className="flex-1 space-y-2">
                                  <Skeleton className="h-4 w-1/2 rounded-full" />
                                  <Skeleton className="h-3 w-3/4 rounded-full" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ) : previewHolidays.length > 0 ? (
                      <motion.div
                        key="preview-data"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="mt-8 space-y-4 motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-bottom-2"
                      >
                        <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Bank holidays this year</div>
                        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/80 p-6 shadow-lg backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/70">
                          <div className="relative mb-6 h-1 w-full overflow-hidden rounded-full bg-primary/10">
                            <motion.div
                              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-primary/30 via-editorial-blue/80 to-transparent"
                              animate={{ x: ["-50%", "100%"] }}
                              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                            />
                          </div>
                          <div className="relative flex flex-col gap-4">
                            {previewHolidays.map((holiday, idx) => {
                              const formattedDate = holidayDateFormatter.format(new Date(holiday.start));
                              return (
                                <motion.div
                                  key={`${holiday.start}-${holiday.title}`}
                                  initial={{ opacity: 0, x: -12 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05, duration: 0.25, ease: "easeOut" }}
                                  className="group relative flex items-start gap-4 rounded-2xl border border-transparent bg-white/70 p-4 shadow-sm transition hover:border-primary/30 hover:bg-white dark:bg-slate-900/60 dark:hover:border-primary/40"
                                >
                                  <span className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-primary shadow-[0_0_0_6px_rgba(59,130,246,0.15)]" />
                                  <div className="flex-1 space-y-1">
                                    <div className="text-sm font-semibold text-foreground dark:text-white">{holiday.title}</div>
                                    <div className="text-xs text-muted-foreground">{formattedDate}</div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="preview-empty"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="mt-8 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-sm text-muted-foreground"
                      >
                        No holiday preview available for this selection yet.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </PageShell>
  );
}


