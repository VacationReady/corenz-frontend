"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  BarChart3,
  FileText,
  GitBranch,
  Loader2,
  Megaphone,
  Settings,
  UploadCloud,
  User,
  UserPlus,
  Users,
} from "lucide-react";

const RECENT_STORAGE_KEY = "command_palette_recent_v1";
const MAX_RECENT_ITEMS = 8;

const entityIcons: Record<SearchEntityType, LucideIcon> = {
  employee: User,
  document: FileText,
  workflow: GitBranch,
};

const createBadgeClasses = (tone?: BadgeTone) =>
  cn(
    "ml-auto rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide",
    tone === "positive" && "border-primary/30 bg-primary/10 text-primary",
    tone === "danger" &&
      "border-destructive/30 bg-destructive/10 text-destructive",
    tone === "default" && "border-secondary/30 bg-secondary/20 text-secondary-foreground",
    (!tone || tone === "muted") &&
      "border-border/40 bg-muted/40 text-muted-foreground",
  );

const toTitle = (value?: string | null) => {
  if (!value) return undefined;
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const joinParts = (parts: Array<string | null | undefined>) =>
  parts.filter((part) => part && part.trim().length > 0).join(" • ");

type SearchEntityType = "employee" | "document" | "workflow";
type PaletteItemType = SearchEntityType | "shortcut" | "navigation";
type BadgeTone = "default" | "muted" | "positive" | "danger";

interface SearchResults {
  employees: EmployeeResult[];
  documents: DocumentResult[];
  workflows: WorkflowResult[];
}

interface EmployeeResult {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  role: string | null;
  department: string | null;
  jobRole: string | null;
  profileImageUrl: string | null;
}

interface DocumentResult {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  type: string;
  requiresAck: boolean;
  createdAt: string;
}

interface WorkflowResult {
  id: string;
  name: string;
  scopeType: string;
  isActive: boolean;
  priority: number;
  updatedAt: string;
  eventCategory: string | null;
}

interface StoredItem {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle?: string | null;
  href: string;
  badge?: string | null;
  badgeTone?: BadgeTone;
}

interface PaletteItem {
  id: string;
  type: PaletteItemType;
  title: string;
  subtitle?: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeTone?: BadgeTone;
}

interface QuickActionConfig {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeTone?: BadgeTone;
}

interface NavigationConfig {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
}

export function CommandPaletteMount() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user?.role as string) ?? "EMPLOYEE";

  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [results, setResults] = React.useState<SearchResults>({
    employees: [],
    documents: [],
    workflows: [],
  });
  const [recentItems, setRecentItems] = React.useState<StoredItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const debouncedSearch = useDebounce(searchValue, 250);
  const normalizedQuery = searchValue.trim().toLowerCase();

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((previous) => !previous);
      }

      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      setSearchValue("");
      setResults({ employees: [], documents: [], workflows: [] });
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const stored = window.localStorage.getItem(RECENT_STORAGE_KEY);
      if (stored) {
        const parsed: StoredItem[] = JSON.parse(stored);
        setRecentItems(Array.isArray(parsed) ? parsed : []);
      } else {
        setRecentItems([]);
      }
    } catch (storageError) {
      console.error("Failed to load recent command palette items", storageError);
      setRecentItems([]);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const query = debouncedSearch.trim();
    if (!query) {
      setResults({ employees: [], documents: [], workflows: [] });
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;

    const search = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to fetch search results");
        }

        if (!active) return;

        setResults({
          employees: Array.isArray(payload?.employees)
            ? (payload.employees as EmployeeResult[])
            : [],
          documents: Array.isArray(payload?.documents)
            ? (payload.documents as DocumentResult[])
            : [],
          workflows: Array.isArray(payload?.workflows)
            ? (payload.workflows as WorkflowResult[])
            : [],
        });
      } catch (requestError) {
        if ((requestError as Error).name === "AbortError") return;
        console.error("Command palette search failed", requestError);
        if (!active) return;
        setError(
          (requestError as Error).message || "Unable to fetch search results",
        );
        setResults({ employees: [], documents: [], workflows: [] });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void search();

    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedSearch, open]);

  const quickActions = React.useMemo<QuickActionConfig[]>(() => {
    const actions: QuickActionConfig[] = [];

    if (userRole === "ADMIN" || userRole === "MANAGER") {
      actions.push(
        {
          id: "quick-add-employee",
          title: "Add employee",
          subtitle: "Create a new team member profile",
          href: "/employees",
          icon: UserPlus,
          badge: "Shortcut",
          badgeTone: "default",
        },
        {
          id: "quick-upload-document",
          title: "Upload document",
          subtitle: "Share a policy or file with the team",
          href: "/documents",
          icon: UploadCloud,
          badge: "Shortcut",
          badgeTone: "default",
        },
        {
          id: "quick-create-workflow",
          title: "Create approval workflow",
          subtitle: "Automate multi-stage approvals",
          href: "/settings/multi-stage-approvals",
          icon: GitBranch,
          badge: "Shortcut",
          badgeTone: "default",
        },
      );
    }

    return actions;
  }, [userRole]);

  const navigationItems = React.useMemo<NavigationConfig[]>(() => {
    const items: NavigationConfig[] = [
      {
        id: "nav-employees",
        title: "Employees",
        subtitle: "Directory and people data",
        href: "/employees",
        icon: Users,
      },
      {
        id: "nav-documents",
        title: "Documents",
        subtitle: "Company policies and files",
        href: "/documents",
        icon: FileText,
      },
      {
        id: "nav-news",
        title: "News",
        subtitle: "Announcements and updates",
        href: "/news",
        icon: Megaphone,
      },
    ];

    if (userRole !== "EMPLOYEE") {
      items.splice(2, 0, {
        id: "nav-reports",
        title: "Reports",
        subtitle: "Insights and analytics",
        href: "/reports",
        icon: BarChart3,
      });
    }

    if (userRole === "ADMIN") {
      items.push({
        id: "nav-settings",
        title: "Settings",
        subtitle: "Tenant configuration",
        href: "/settings",
        icon: Settings,
      });
    }

    return items;
  }, [userRole]);

  const recentPaletteItems = React.useMemo<PaletteItem[]>(
    () =>
      recentItems.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        subtitle: item.subtitle ?? undefined,
        href: item.href,
        icon: entityIcons[item.type],
        badge: item.badge ?? undefined,
        badgeTone: item.badgeTone ?? "muted",
      })),
    [recentItems],
  );

  const searchPaletteItems = React.useMemo(() => {
    const employees: PaletteItem[] = results.employees.map((employee) => ({
      id: employee.id,
      type: "employee",
      title: employee.name || "Unnamed employee",
      subtitle:
        joinParts([
          employee.email,
          employee.department,
          employee.jobRole,
        ]) || undefined,
      href: `/employees/${employee.id}/overview`,
      icon: entityIcons.employee,
      badge: toTitle(employee.role) ?? undefined,
      badgeTone: "muted" as BadgeTone,
    }));

    const documents: PaletteItem[] = results.documents.map((document) => ({
      id: document.id,
      type: "document",
      title: document.name,
      subtitle:
        document.description?.trim() ||
        joinParts([document.category, document.type]) ||
        undefined,
      href: `/documents?open=${document.id}`,
      icon: entityIcons.document,
      badge: document.requiresAck
        ? "Ack required"
        : toTitle(document.category) ?? undefined,
      badgeTone: document.requiresAck ? "danger" : "muted",
    }));

    const workflows: PaletteItem[] = results.workflows.map((workflow) => ({
      id: workflow.id,
      type: "workflow",
      title: workflow.name,
      subtitle:
        joinParts([
          workflow.eventCategory,
          toTitle(workflow.scopeType),
          typeof workflow.priority === "number"
            ? `Priority ${workflow.priority}`
            : undefined,
        ]) || undefined,
      href: "/settings/multi-stage-approvals",
      icon: entityIcons.workflow,
      badge: workflow.isActive ? "Active" : "Inactive",
      badgeTone: workflow.isActive ? "positive" : "muted",
    }));

    return { employees, documents, workflows };
  }, [results]);

  const showRecent = recentPaletteItems.length > 0 && !normalizedQuery;
  const quickActionMatches = quickActions.filter((action) => {
    if (!normalizedQuery) return true;
    const haystack = `${action.title} ${action.subtitle}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
  const showQuickActions = quickActionMatches.length > 0;

  const navigationMatches = navigationItems.filter((item) => {
    if (!normalizedQuery) return true;
    const haystack = `${item.title} ${item.subtitle}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
  const showNavigation = navigationMatches.length > 0;

  const hasResultGroups =
    searchPaletteItems.employees.length > 0 ||
    searchPaletteItems.documents.length > 0 ||
    searchPaletteItems.workflows.length > 0;

  const prefetchRoute = React.useCallback(
    (href: string) => {
      if (!href || href.startsWith("http")) return;
      try {
        router.prefetch(href);
      } catch (prefetchError) {
        console.debug("Prefetch skipped", prefetchError);
      }
    },
    [router],
  );

  const handleSelect = React.useCallback(
    (item: PaletteItem) => {
      if (!item) return;

      if (
        item.type === "employee" ||
        item.type === "document" ||
        item.type === "workflow"
      ) {
        try {
          if (typeof window !== "undefined") {
            setRecentItems((prev) => {
              const filtered = prev.filter(
                (existing) =>
                  !(existing.id === item.id && existing.type === item.type),
              );
              const updated: StoredItem[] = [
                {
                  id: item.id,
                  type: item.type,
                  title: item.title,
                  subtitle: item.subtitle,
                  href: item.href,
                  badge: item.badge,
                  badgeTone: item.badgeTone,
                },
                ...filtered,
              ].slice(0, MAX_RECENT_ITEMS);
              window.localStorage.setItem(
                RECENT_STORAGE_KEY,
                JSON.stringify(updated),
              );
              return updated;
            });
          }
        } catch (storageError) {
          console.error("Failed to persist recent item", storageError);
        }
      }

      setOpen(false);
      setSearchValue("");

      if (item.href.startsWith("http")) {
        window.open(item.href, "_blank", "noopener,noreferrer");
        return;
      }

      router.push(item.href);
    },
    [router],
  );

  const renderItem = (item: PaletteItem) => (
    <CommandItem
      key={`${item.type}-${item.id}`}
      value={`${item.type} ${item.title} ${item.subtitle ?? ""}`.trim()}
      onSelect={() => handleSelect(item)}
      onMouseEnter={() => prefetchRoute(item.href)}
      onFocus={() => prefetchRoute(item.href)}
      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition data-[selected=true]:bg-primary/10 data-[selected=true]:text-foreground"
    >
      <item.icon className="h-4 w-4 shrink-0 text-primary" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <span className="font-medium leading-5">{item.title}</span>
        {item.subtitle && (
          <span className="truncate text-xs text-muted-foreground">
            {item.subtitle}
          </span>
        )}
      </div>
      {item.badge && (
        <span className={createBadgeClasses(item.badgeTone)}>{item.badge}</span>
      )}
    </CommandItem>
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity dark:bg-background/60"
        onClick={() => setOpen(false)}
      />
      <div className="relative mt-24 w-full max-w-2xl">
        <Command className="rounded-3xl border border-border/40 bg-popover/95 text-popover-foreground shadow-glass backdrop-blur-xl">
          <CommandInput
            value={searchValue}
            onValueChange={setSearchValue}
            placeholder="Search employees, documents, workflows…"
            autoFocus
          />
          <CommandList className="max-h-[70vh] overflow-y-auto px-2 pb-3 pt-2">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {showRecent && (
              <CommandGroup heading="Recent">
                {recentPaletteItems.map(renderItem)}
              </CommandGroup>
            )}

            {showQuickActions && (
              <CommandGroup heading="Quick actions">
                {quickActionMatches.map((action) =>
                  renderItem({
                    id: action.id,
                    type: "shortcut",
                    title: action.title,
                    subtitle: action.subtitle,
                    href: action.href,
                    icon: action.icon,
                    badge: action.badge,
                    badgeTone: action.badgeTone,
                  }),
                )}
              </CommandGroup>
            )}

            {showNavigation && (
              <CommandGroup heading="Navigate">
                {navigationMatches.map((nav) =>
                  renderItem({
                    id: nav.id,
                    type: "navigation",
                    title: nav.title,
                    subtitle: nav.subtitle,
                    href: nav.href,
                    icon: nav.icon,
                  }),
                )}
              </CommandGroup>
            )}

            {((showRecent || showQuickActions || showNavigation) &&
              hasResultGroups) && <CommandSeparator className="my-2" />}

            {searchPaletteItems.employees.length > 0 && (
              <CommandGroup heading="Employees">
                {searchPaletteItems.employees.map(renderItem)}
              </CommandGroup>
            )}

            {searchPaletteItems.documents.length > 0 && (
              <CommandGroup heading="Documents">
                {searchPaletteItems.documents.map(renderItem)}
              </CommandGroup>
            )}

            {searchPaletteItems.workflows.length > 0 && (
              <CommandGroup heading="Workflows">
                {searchPaletteItems.workflows.map(renderItem)}
              </CommandGroup>
            )}

            <CommandEmpty
              className={cn(
                "py-6 text-center text-sm text-muted-foreground",
                (loading || error) && "hidden",
              )}
            >
              {normalizedQuery
                ? "No results found. Try adjusting your search."
                : "Start typing to search employees, documents, and workflows."}
            </CommandEmpty>
          </CommandList>
        </Command>
      </div>
    </div>
  );
}
