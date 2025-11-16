"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArchiveRestore, Filter, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { PageShell } from "@/components/ui/PageShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WorkingPatternWeek {
  weekNumber?: number;
  days?: Array<{ day: string; type: string }> | Record<string, string>;
}

interface WorkingPattern {
  id: string;
  name: string;
  description?: string | null;
  weeks?: WorkingPatternWeek[];
  activeYear?: number | string | null;
  year?: number | string | null;
  targetYear?: number | string | null;
  effectiveFrom?: string | null;
  effectiveDate?: string | null;
  startDate?: string | null;
  createdAt?: string | null;
  workWeekLength?: number | null;
  daysPerWeek?: number | null;
  [key: string]: any;
}

interface DecoratedPattern {
  pattern: WorkingPattern;
  meta: {
    activeYear: string | null;
    workWeekLength: string | null;
    daySummary: string;
  };
}

const deriveYear = (pattern: WorkingPattern): string | null => {
  const candidates = [
    pattern.activeYear,
    pattern.year,
    pattern.targetYear,
    pattern.effectiveFrom,
    pattern.effectiveDate,
    pattern.startDate,
    pattern.createdAt,
  ]
    .map((value) => {
      if (!value) return null;
      if (typeof value === "number") return value;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.getFullYear();
    })
    .filter((value): value is number => value !== null);

  if (candidates.length === 0) return null;
  return String(candidates[0]);
};

const deriveWorkWeekLength = (pattern: WorkingPattern): string | null => {
  if (typeof pattern.workWeekLength === "number") {
    return String(pattern.workWeekLength);
  }

  if (typeof pattern.daysPerWeek === "number") {
    return String(pattern.daysPerWeek);
  }

  if (!Array.isArray(pattern.weeks) || pattern.weeks.length === 0) {
    return null;
  }

  const calculateDays = (days: WorkingPatternWeek["days"]): number => {
    if (!days) return 0;
    if (Array.isArray(days)) {
      return days.length;
    }
    if (typeof days === "object") {
      return Object.keys(days).length;
    }
    return 0;
  };

  const lengths = pattern.weeks.map((week) => calculateDays(week?.days));
  const meaningful = lengths.filter((value) => value > 0);

  if (meaningful.length === 0) return null;
  return String(Math.max(...meaningful));
};

const buildDaySummary = (pattern: WorkingPattern): string => {
  if (!Array.isArray(pattern.weeks) || pattern.weeks.length === 0) {
    return "No working days configured";
  }

  const entries = pattern.weeks.flatMap((week) => {
    if (!week) return [];
    if (Array.isArray(week.days)) {
      return week.days.map((day) => {
        if (!day) return null;
        const label = typeof day === "string" ? day : day.day;
        const type =
          typeof day === "string"
            ? undefined
            : (day.type as string | undefined)?.replace(/_/g, " ");
        return label ? `${label}${type ? ` (${type})` : ""}` : null;
      });
    }

    if (week.days && typeof week.days === "object") {
      return Object.entries(week.days).map(([day, type]) => {
        if (!day) return null;
        const formatted =
          typeof type === "string" ? type.replace(/_/g, " ") : undefined;
        return formatted ? `${day} (${formatted})` : day;
      });
    }

    return [];
  });

  const cleaned = entries.filter((entry): entry is string => Boolean(entry));
  if (cleaned.length === 0) {
    return "No working days configured";
  }

  return cleaned.join(", ");
};

const useDecoratedPatterns = (patterns: WorkingPattern[]): DecoratedPattern[] =>
  useMemo(
    () =>
      patterns.map((pattern) => ({
        pattern,
        meta: {
          activeYear: deriveYear(pattern),
          workWeekLength: deriveWorkWeekLength(pattern),
          daySummary: buildDaySummary(pattern),
        },
      })),
    [patterns],
  );

export default function ArchivedWorkingPatternsPage() {
  const [patterns, setPatterns] = useState<WorkingPattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingActions, setPendingActions] = useState<Record<string, "restore" | "delete">>({});
  const [isNavigating, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const breadcrumbs = {
    items: [
      { label: "Settings", href: "/settings" },
      { label: "Working Patterns", href: "/settings/working-patterns" },
      { label: "Archived", isCurrentPage: true },
    ],
  };

  const fetchArchivedPatterns = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/working-patterns?archived=true", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to load archived working patterns");
      }

      const data = await res.json();
      setPatterns(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Unable to fetch archived patterns right now.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchivedPatterns();
  }, [fetchArchivedPatterns]);

  const decoratedPatterns = useDecoratedPatterns(patterns);

  const activeYearFilter = searchParams?.get("year") ?? "all";
  const weekLengthFilter = searchParams?.get("week") ?? "all";

  const yearOptions = useMemo(() => {
    const values = new Set<string>();
    decoratedPatterns.forEach(({ meta }) => {
      if (meta.activeYear) {
        values.add(meta.activeYear);
      }
    });
    return Array.from(values).sort((a, b) => Number(a) - Number(b));
  }, [decoratedPatterns]);

  const weekLengthOptions = useMemo(() => {
    const values = new Set<string>();
    decoratedPatterns.forEach(({ meta }) => {
      if (meta.workWeekLength) {
        values.add(meta.workWeekLength);
      }
    });
    return Array.from(values).sort((a, b) => Number(a) - Number(b));
  }, [decoratedPatterns]);

  const filteredPatterns = useMemo(
    () =>
      decoratedPatterns.filter(({ meta }) => {
        const matchesYear =
          activeYearFilter === "all" || meta.activeYear === activeYearFilter;
        const matchesWeek =
          weekLengthFilter === "all" || meta.workWeekLength === weekLengthFilter;
        return matchesYear && matchesWeek;
      }),
    [decoratedPatterns, activeYearFilter, weekLengthFilter],
  );

  const setActionPending = useCallback((id: string, type: "restore" | "delete") => {
    setPendingActions((prev) => ({ ...prev, [id]: type }));
  }, []);

  const clearActionPending = useCallback((id: string) => {
    setPendingActions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleChipSelect = useCallback(
    (param: "year" | "week", value: string) => {
      const next = new URLSearchParams(searchParams ? searchParams.toString() : "");
      if (value === "all") {
        next.delete(param);
      } else {
        next.set(param, value);
      }

      const query = next.toString();

      startTransition(() => {
        router.replace(`${pathname}${query ? `?${query}` : ""}`, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  const handleRestore = useCallback(
    async (id: string) => {
      let removedPattern: WorkingPattern | null = null;
      let removedIndex = -1;

      setActionPending(id, "restore");

      setPatterns((prev) => {
        const index = prev.findIndex((item) => item.id === id);
        if (index === -1) {
          return prev;
        }
        removedPattern = prev[index];
        removedIndex = index;
        const next = [...prev];
        next.splice(index, 1);
        return next;
      });

      try {
        const res = await fetch(`/api/working-patterns/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: true }),
        });

        if (!res.ok) {
          throw new Error("Restore failed");
        }

        toast.success("Pattern restored");
      } catch (error) {
        if (removedPattern) {
          const patternToReinsert = removedPattern;
          const indexToReinsert = removedIndex;
          setPatterns((prev) => {
            const next = [...prev];
            const position =
              indexToReinsert < 0
                ? next.length
                : Math.min(indexToReinsert, next.length);
            next.splice(position, 0, patternToReinsert);
            return next;
          });
        }
        toast.error("Error restoring pattern");
      } finally {
        clearActionPending(id);
      }
    },
    [clearActionPending, setActionPending],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (
        !confirm(
          "Are you sure you want to permanently delete this pattern? This cannot be undone.",
        )
      ) {
        return;
      }

      let removedPattern: WorkingPattern | null = null;
      let removedIndex = -1;

      setActionPending(id, "delete");

      setPatterns((prev) => {
        const index = prev.findIndex((item) => item.id === id);
        if (index === -1) {
          return prev;
        }
        removedPattern = prev[index];
        removedIndex = index;
        const next = [...prev];
        next.splice(index, 1);
        return next;
      });

      try {
        const res = await fetch(`/api/working-patterns/${id}?permanent=true`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error("Delete failed");
        }

        toast.success("Pattern permanently deleted");
      } catch (error) {
        if (removedPattern) {
          const patternToReinsert = removedPattern;
          const indexToReinsert = removedIndex;
          setPatterns((prev) => {
            const next = [...prev];
            const position =
              indexToReinsert < 0
                ? next.length
                : Math.min(indexToReinsert, next.length);
            next.splice(position, 0, patternToReinsert);
            return next;
          });
        }
        toast.error("Error deleting pattern");
      } finally {
        clearActionPending(id);
      }
    },
    [clearActionPending, setActionPending],
  );

  const renderFilterChip = (
    group: "year" | "week",
    value: string,
    label: string,
    isActive: boolean,
  ) => (
    <motion.button
      key={`${group}-${value}`}
      type="button"
      onClick={() => handleChipSelect(group, value)}
      className={cn(
        "relative inline-flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2",
        isActive
          ? "text-primary-foreground shadow-[0_8px_24px_rgba(79,70,229,0.35)]"
          : "text-foreground/70 hover:text-foreground",
      )}
      whileTap={{ scale: 0.95 }}
      disabled={isNavigating && isActive}
    >
      {isActive && (
        <motion.span
          layoutId={`chip-highlight-${group}`}
          className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary to-primary/80"
          style={{ borderRadius: 9999 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
        />
      )}
      <span className="relative z-10 whitespace-nowrap">{label}</span>
    </motion.button>
  );

  return (
    <PageShell
      title="Archived Working Patterns"
      breadcrumbs={breadcrumbs}
      showHomeIcon={false}
      action={
        <Button asChild variant="glass" size="sm" glow>
          <Link href="/settings/working-patterns">Back to active patterns</Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-10">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/10 via-purple-500/10 to-indigo-500/10 p-8 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.45)]">
          <div className="pointer-events-none absolute -left-10 top-12 h-40 w-40 rounded-full bg-sky-400/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-8 -bottom-12 h-52 w-52 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-white/70">
                  Explore previously archived working patterns. Use the quick filters to narrow the list by the year the pattern was active and the work week length it represents.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 backdrop-blur">
                <Filter className="h-4 w-4" aria-hidden="true" />
                Filters
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Active year
                </span>
                <div className="flex flex-wrap gap-2">
                  {renderFilterChip(
                    "year",
                    "all",
                    "All years",
                    activeYearFilter === "all",
                  )}
                  {yearOptions.map((option) =>
                    renderFilterChip(
                      "year",
                      option,
                      option,
                      activeYearFilter === option,
                    ),
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Work week length
                </span>
                <div className="flex flex-wrap gap-2">
                  {renderFilterChip(
                    "week",
                    "all",
                    "Any length",
                    weekLengthFilter === "all",
                  )}
                  {weekLengthOptions.map((option) => {
                    const numeric = Number(option);
                    const label = Number.isNaN(numeric)
                      ? option
                      : `${numeric} day${numeric === 1 ? "" : "s"}`;
                    return renderFilterChip(
                      "week",
                      option,
                      label,
                      weekLengthFilter === option,
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-background/40">
            <LoadingSpinner showText text="Fetching archived patterns" />
          </div>
        ) : filteredPatterns.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-dashed border-white/20 bg-gradient-to-br from-slate-900/10 via-sky-500/10 to-indigo-500/10 px-10 py-16 text-center shadow-[0_20px_60px_-24px_rgba(15,23,42,0.55)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_55%)]" />
            <div className="relative z-10 flex flex-col items-center gap-8">
              <div className="grid h-24 w-24 place-items-center rounded-full border border-white/20 bg-white/10 text-white">
                <ArchiveRestore className="h-10 w-10" aria-hidden="true" />
              </div>
              <div className="max-w-lg space-y-3">
                <h2 className="text-2xl font-semibold text-white">Nothing archived just yet</h2>
                <p className="text-sm leading-relaxed text-white/70">
                  When a working pattern is archived it will appear here with all of its historical details. Return to your active working patterns to restore an existing schedule or create something new.
                </p>
              </div>
              <Button asChild variant="primary" size="md" glow>
                <Link href="/settings/working-patterns">Back to active patterns</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence initial={false}>
              {filteredPatterns.map(({ pattern, meta }) => {
                const weekLengthLabel = meta.workWeekLength
                  ? `${meta.workWeekLength} day${meta.workWeekLength === "1" ? "" : "s"}`
                  : "Varied";

                return (
                  <motion.article
                    key={pattern.id}
                    layout
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -24, scale: 0.95 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="relative group"
                  >
                    <GlassSurface
                      intensity="strong"
                      variant="panel"
                      size="lg"
                      gradient
                      hoverable
                      className="relative flex flex-col gap-6 overflow-hidden border border-white/15 bg-white/10 p-6 pr-6 text-foreground backdrop-blur-xl transition-shadow hover:shadow-[0_28px_60px_-30px_rgba(15,23,42,0.65)] md:pr-60"
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_45%,rgba(15,23,42,0.15)_100%)]" aria-hidden="true" />
                      <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-semibold text-white md:text-xl">
                            {pattern.name}
                          </h2>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
                            <span className="rounded-full bg-white/10 px-3 py-1">
                              {meta.activeYear ? `Active in ${meta.activeYear}` : "Year unknown"}
                            </span>
                            <span className="rounded-full bg-white/10 px-3 py-1">
                              {weekLengthLabel}
                            </span>
                          </div>
                        </div>
                        <p className={cn("text-sm leading-relaxed", pattern.description ? "text-white/80" : "italic text-white/60")}
                        >
                          {pattern.description || "No description provided."}
                        </p>
                        <div className="text-sm text-white/80">
                          <span className="font-medium text-white">Days:</span> {meta.daySummary}
                        </div>
                      </div>
                      <div className="pointer-events-none absolute -right-16 top-6 rotate-45 bg-gradient-to-r from-amber-400/90 to-orange-500/90 px-14 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_12px_35px_-18px_rgba(249,115,22,0.75)]">
                        Archived
                      </div>
                      <div className="absolute inset-y-4 right-4 flex translate-x-12 items-center gap-3 rounded-2xl bg-background/75 px-4 py-3 text-sm shadow-depth-2 backdrop-blur-xl opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100">
                        <Button
                          size="sm"
                          variant="glass"
                          glow
                          icon={<ArchiveRestore className="h-4 w-4" aria-hidden="true" />}
                          onClick={() => handleRestore(pattern.id)}
                          loading={pendingActions[pattern.id] === "restore"}
                          loadingText="Restoring"
                        >
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                          onClick={() => handleDelete(pattern.id)}
                          loading={pendingActions[pattern.id] === "delete"}
                          loadingText="Deleting"
                        >
                          Delete
                        </Button>
                      </div>
                    </GlassSurface>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageShell>
  );
}
