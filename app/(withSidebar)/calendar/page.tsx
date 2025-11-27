"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, useRef as useMutableRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { SectionSkeleton } from "@/components/ui/PageSkeleton";
import Button from "@/components/ui/Button";
import { 
  List, 
  CalendarDays, 
  Trash2, 
  GraduationCap, 
  Heart, 
  Stethoscope, 
  Smile, 
  Palmtree, 
  ShieldBan, 
  Umbrella, 
  Briefcase, 
  Baby, 
  Users, 
  Coffee,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Grid3X3,
  Sparkles,
  Clock,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Eye,
  Plus,
  Filter,
  Share2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, ShieldBan as ShieldBanIcon } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import BlackoutManagementModal from "./BlackoutManagementModal";
import DayActionSheet from "./DayActionSheet";
import { EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import type { EventContentArg } from "@fullcalendar/core";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Lock, Clock as ClockIcon } from "lucide-react";
import { FilterProvider, useFilters } from "@/components/ui/FilterProvider";
import { FilterBar } from "@/components/ui/FilterBar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { CalendarLegend } from "./CalendarLegend";
import {
  resolveTenantTimeSettings,
  formatTenantDate,
  type TenantTimeSettings,
} from "@/lib/calendar/timezone";
import AddHolidayModal from "./AddHolidayModal";
import { getEventCategoryIcon } from "@/lib/event-category-icons";
import { cn } from "@/lib/utils";

interface Department {
  id: string;
  name: string;
}

interface CalendarPageInnerProps {
  initialView: "dayGridMonth" | "listMonth";
}

type PublicHolidayTemplate = "NZ" | "AU" | "UK" | null;

const PUBLIC_HOLIDAY_REGION_LABELS: Record<string, string> = {
  NZ: "New Zealand (National)",
  "NZ-AUK": "Auckland Anniversary",
  "NZ-WGN": "Wellington Anniversary",
  "NZ-CAN": "Canterbury Anniversary",
  "NZ-OTA": "Otago Anniversary",
  AU: "Australia (National)",
  "AU-NSW": "New South Wales",
  "AU-VIC": "Victoria",
  "AU-QLD": "Queensland",
  "AU-SA": "South Australia",
  "AU-WA": "Western Australia",
  "AU-TAS": "Tasmania",
  "AU-NT": "Northern Territory",
  "AU-ACT": "Australian Capital Territory",
  UK: "United Kingdom (National)",
  "GB-ENG": "England & Wales",
  "GB-SCT": "Scotland",
  "GB-NIR": "Northern Ireland",
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
    }
  },
};

// Stat card component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtext?: string;
  gradient: string;
  iconBg: string;
  delay?: number;
}

function StatCard({ icon, label, value, subtext, gradient, iconBg, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "relative overflow-hidden rounded-xl p-3 border",
        gradient
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wide truncate">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <motion.p
              key={value}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-xl font-bold"
            >
              {value}
            </motion.p>
            {subtext && <p className="text-[10px] text-muted-foreground truncate">{subtext}</p>}
          </div>
        </div>
        <div className={cn("p-2 rounded-lg flex-shrink-0", iconBg)}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function CalendarPageInner({ initialView }: CalendarPageInnerProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [blackoutModalOpen, setBlackoutModalOpen] = useState(false);
  const [dayActionSheetOpen, setDayActionSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentView, setCurrentView] = useState<"dayGridMonth" | "listMonth">(initialView);
  const [tenantTimeSettings, setTenantTimeSettings] = useState<TenantTimeSettings>(() =>
    resolveTenantTimeSettings(null, null),
  );
  const [dailyCounts, setDailyCounts] = useState<Record<string, number>>({});
  const [dailyCategoryCounts, setDailyCategoryCounts] = useState<Record<string, Record<string, number>>>({});
  const [thresholds, setThresholds] = useState<{ defaultMaxConcurrent?: number } | null>(null);
  const [presentCategories, setPresentCategories] = useState<{ name: string; iconKey?: string | null }[]>([]);
  const [leaveEventsInRange, setLeaveEventsInRange] = useState<any[]>([]);
  const [inspectorDate, setInspectorDate] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [bankHolidaysOn, setBankHolidaysOn] = useState(false);
  const [bankHolidaysAvailable, setBankHolidaysAvailable] = useState(false);
  const [templateLabel, setTemplateLabel] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState("");
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date | null>(null);
  const _bankHolidayCacheRef = useRef<any | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initializedFromUrl = useMutableRef(false);
  const { filters, updateFilter } = useFilters();
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [locationOptions, setLocationOptions] = useState<{ label: string; value: string }[]>([]);
  const [blackoutDateKeys, setBlackoutDateKeys] = useState<Set<string>>(new Set());
  const [blackoutIdsByDay, setBlackoutIdsByDay] = useState<Record<string, string[]>>({});
  const calendarRef = useRef<FullCalendar | null>(null);
  const eventsCacheRef = useRef<{ key: string; data: any[] } | null>(null);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayDefaultDate, setHolidayDefaultDate] = useState<Date | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as
    | "ADMIN"
    | "MANAGER"
    | "EMPLOYEE"
    | "SUPER_ADMIN"
    | undefined;
  const isEmployeeRole = role === "EMPLOYEE";

  const inspectorBlackoutKey = inspectorDate
    ? `${inspectorDate.getFullYear()}-${String(inspectorDate.getMonth() + 1).padStart(2, "0")}-${String(inspectorDate.getDate()).padStart(2, "0")}`
    : null;
  const _inspectorHasBlackout = inspectorBlackoutKey
    ? blackoutDateKeys.has(inspectorBlackoutKey)
    : false;

  // Calculate stats
  const stats = useMemo(() => {
    const totalPeopleOff = new Set(leaveEventsInRange.map((e: any) => e.employee?.id)).size;
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const offToday = dailyCounts[todayKey] || 0;
    const totalBlackouts = blackoutDateKeys.size;
    const totalLeaveRequests = leaveEventsInRange.length;
    
    return { totalPeopleOff, offToday, totalBlackouts, totalLeaveRequests };
  }, [leaveEventsInRange, dailyCounts, blackoutDateKeys]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      if (!res.ok) {
        throw new Error("Failed to fetch departments");
      }
      const data = await res.json();
      setDepartments(data);
    } catch (error) {
      console.error(error);
      toast.error("Error loading departments");
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await fetchDepartments();
        setLoading(false);
      } catch (error) {
        console.error("Error loading initial data:", error);
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/event-rules");
        if (res.ok) {
          const rules = await res.json();
          const maxes = (rules || [])
            .map((r: any) => r.maxConcurrent)
            .filter((n: any) => typeof n === "number") as number[];
          if (maxes.length > 0) {
            setThresholds({ defaultMaxConcurrent: Math.min(...maxes) });
          }
        }
      } catch (_err) {}
    })();
  }, []);

  const getHeatAlpha = (count: number) => {
    const base = count >= 5 ? 0.35 : count >= 3 ? 0.24 : 0.14;
    if (thresholds?.defaultMaxConcurrent && count >= thresholds.defaultMaxConcurrent) {
      return Math.min(0.5, base + 0.1);
    }
    return base;
  };

  useEffect(() => {
    (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const res = await fetch("/api/event-categories", {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const cats = await res.json();
          setCategoryOptions((cats || []).map((c: any) => ({ label: c.name, value: c.id })));
        } else {
          console.error("Failed to fetch event categories:", res.status, res.statusText);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.error("Request timeout for event categories");
        } else {
          console.error("Failed to fetch event categories:", err);
        }
      } finally {
        setDataLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const res = await fetch("/api/locations", {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const items = await res.json();
          setLocationOptions((items || []).map((l: any) => ({ label: l.name, value: l.id })));
        }
      } catch (err) {
        if (!(err instanceof Error && err.name === 'AbortError')) {
          console.error("Failed to fetch locations:", err);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (initializedFromUrl.current) return;
    if (!searchParams) return;
    const dep = searchParams.get("department") || "";
    const view = searchParams.get("view") || "";
    const query = searchParams.get("q") || "";
    const dateParam = searchParams.get("date") || "";
    updateFilter("departments", dep ? [dep] : []);
    updateFilter("search", query);
    if (view === "list") setCurrentView("listMonth");
    if (dateParam) {
      const parts = dateParam.split("-");
      if (parts.length === 3) {
        const [yy, mm, dd] = parts;
        const y = Number(yy);
        const m = Number(mm);
        const d = Number(dd);
        const parsed = !isNaN(y) && !isNaN(m) && !isNaN(d)
          ? new Date(y, m - 1, d)
          : null;
        if (parsed && !isNaN(parsed.getTime())) {
          setSelectedDay(parsed);
          setCurrentCalendarDate(parsed);
          setTimeout(() => {
            try {
              calendarRef.current?.getApi().gotoDate(parsed);
            } catch {}
          }, 0);
        }
      }
    }
    initializedFromUrl.current = true;
  }, [searchParams, updateFilter]);

  useEffect(() => {
    if (!initializedFromUrl.current) return;
    try {
      const url = new URL(window.location.href);
      const departmentParam = filters.departments[0];
      if (departmentParam) url.searchParams.set("department", departmentParam);
      else url.searchParams.delete("department");
      if (filters.search) url.searchParams.set("q", filters.search);
      else url.searchParams.delete("q");
      url.searchParams.set("view", currentView === "listMonth" ? "list" : "month");
      if (currentCalendarDate) {
        const dateStr = `${currentCalendarDate.getFullYear()}-${String(currentCalendarDate.getMonth() + 1).padStart(2, "0")}-${String(currentCalendarDate.getDate()).padStart(2, "0")}`;
        url.searchParams.set("date", dateStr);
      }
      router.replace(url.pathname + "?" + url.searchParams.toString(), { scroll: false });
    } catch (_err) {}
  }, [filters.departments.join(","), filters.search, currentView, currentCalendarDate, router]);

  const fetchLeaveEvents = useCallback(
    async (
      fetchInfo: EventSourceFuncArg,
      successCallback: (events: EventInput[]) => void,
      _failureCallback: (error: any) => void,
    ) => {
      try {
        const departmentFilter = filters.departments[0] || "";
        const cacheKey = `${fetchInfo.startStr}|${fetchInfo.endStr}|${departmentFilter || "all"}`;

        let baseData: any[];
        if (eventsCacheRef.current && eventsCacheRef.current.key === cacheKey) {
          baseData = eventsCacheRef.current.data;
        } else {
          const params = new URLSearchParams({
            from: fetchInfo.startStr,
            to: fetchInfo.endStr,
          });
          if (departmentFilter) params.set("department", departmentFilter);
          const res = await fetch(`/api/calendar-events?${params.toString()}`);
          if (!res.ok) {
            console.warn("Leave events fetch non-OK status", res.status);
            successCallback([]);
            return;
          }
          baseData = await res.json();
          eventsCacheRef.current = { key: cacheKey, data: baseData };
        }

        let data = baseData;

        const hasCategoryFilter =
          filters.categories.length > 0 && !filters.categories.includes("all");
        if (hasCategoryFilter) {
          const selectedSet = new Set(filters.categories.filter((c) => c !== "all"));
          data = (data as any[]).filter((e) =>
            e.eventCategoryId ? selectedSet.has(e.eventCategoryId) : false,
          );
        }

        const hasLocationFilter =
          filters.locations.length > 0 && !filters.locations.includes("all");
        if (hasLocationFilter) {
          const locSet = new Set(filters.locations.filter((l) => l !== "all"));
          data = (data as any[]).filter((e) => {
            const employeeLoc = e.employee?.locationId as string | undefined;
            const topLevelLoc = (e as any).locationId as string | undefined;
            const effectiveLoc = employeeLoc ?? topLevelLoc ?? null;
            return effectiveLoc ? locSet.has(effectiveLoc) : false;
          });
        }

        if (filters.search.trim().length > 0) {
          const q = filters.search.trim().toLowerCase();
          data = (data as any[]).filter((e) =>
            (e.employee?.name || e.title || "").toLowerCase().includes(q),
          );
        }
        setLeaveEventsInRange(data);
        const catsMap = new Map<string, string | null>();
        (data as any[]).forEach((e) => {
          const name = (e.categoryName as string) || "Uncategorized";
          if (!catsMap.has(name)) {
            catsMap.set(name, e.categoryIconKey ?? null);
          }
        });
        setPresentCategories(
          Array.from(catsMap.entries()).map(([name, iconKey]) => ({ name, iconKey })),
        );
        const counts: Record<string, number> = {};
        const categoryCounts: Record<string, Record<string, number>> = {};
        const rangeStart = new Date(fetchInfo.startStr);
        const rangeEnd = new Date(fetchInfo.endStr);
        for (const ev of data as any[]) {
          const start = new Date(ev.start);
          const end = new Date(ev.end || ev.start);
          const cur = new Date(Math.max(start.getTime(), rangeStart.getTime()));
          const last = new Date(Math.min(end.getTime(), rangeEnd.getTime()));
          cur.setHours(0, 0, 0, 0);
          last.setHours(0, 0, 0, 0);
          const label = (ev.categoryName as string) || "Other";
          for (let d = new Date(cur); d <= last; d.setDate(d.getDate() + 1)) {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
              d.getDate(),
            ).padStart(2, "0")}`;
            counts[key] = (counts[key] || 0) + 1;
            if (!categoryCounts[key]) categoryCounts[key] = {};
            categoryCounts[key][label] = (categoryCounts[key][label] || 0) + 1;
          }
        }
        setDailyCounts(counts);
        setDailyCategoryCounts(categoryCounts);
        successCallback(data);
      } catch (error) {
        console.warn("Leave events fetch error", error);
        successCallback([]);
      }
    },
    [
      filters.departments.join(","),
      filters.categories.join(","),
      filters.locations.join(","),
      filters.search,
    ],
  );

  const fetchBlackoutEvents = useCallback(
    async (
      fetchInfo: EventSourceFuncArg,
      successCallback: (events: EventInput[]) => void,
      _failureCallback: (error: any) => void,
    ) => {
      try {
      const params = new URLSearchParams({
        from: fetchInfo.startStr,
        to: fetchInfo.endStr,
      });
      const res = await fetch(`/api/blackout-days/get?${params.toString()}`);
      if (!res.ok) {
        console.warn("Blackout fetch non-OK status", res.status);
        successCallback([]);
        return;
      }
      const blackoutData = await res.json();
      const keys = new Set<string>();
      const idMap: Record<string, string[]> = {};
      const blackoutEvents = blackoutData.map((b: any) => {
        const d = new Date(b.date);
        const key = utcDateKey(d);
        const startDate = key;
        keys.add(key);
        if (!idMap[key]) idMap[key] = [];
        idMap[key].push(b.id);
        return {
          id: b.id,
          title: b.allEvents ? "Blackout Day (All Events)" : "Blackout Day",
          start: startDate,
          allDay: true,
          display: "background",
          backgroundColor: "#fecaca",
          borderColor: "#ef4444",
          extendedProps: {
            isBlackout: true,
            note: b.note ?? null,
          },
        };
      });
      setBlackoutDateKeys(keys);
      setBlackoutIdsByDay(idMap);
      successCallback(blackoutEvents);
    } catch (error) {
      console.error("Blackout fetch error", error);
      successCallback([]);
    }
  },
  []);

  const fetchBankHolidayEvents = useCallback(
    async (
      fetchInfo: EventSourceFuncArg,
      successCallback: (events: EventInput[]) => void,
      failureCallback: (error: any) => void,
    ) => {
      try {
        if (!bankHolidaysOn || !bankHolidaysAvailable) {
          successCallback([]);
          return;
        }
      const params = new URLSearchParams({ from: fetchInfo.startStr, to: fetchInfo.endStr });
      const res = await fetch(`/api/public-holidays?${params.toString()}`);
      if (!res.ok) {
        successCallback([]);
        return;
      }
      const events = await res.json();
      successCallback(
        (events || []).map((e: any) => ({
          ...e,
          id: `pub-${e.start}`,
          backgroundColor: "#86efac",
          borderColor: "#22c55e",
          textColor: "#065f46",
          extendedProps: { isBankHoliday: true },
        })),
      );
    } catch (error) {
      console.error(error);
      failureCallback(error);
    }
  },
  [bankHolidaysOn, bankHolidaysAvailable]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/public-holidays");
        if (!res.ok) {
          setBankHolidaysAvailable(false);
          setTenantTimeSettings(resolveTenantTimeSettings(null, null));
          setTemplateLabel(null);
          return;
        }
        const data = await res.json();
        const template = (data?.template ?? null) as PublicHolidayTemplate;
        const region = (data?.region ?? null) as string | null;
        setBankHolidaysAvailable(Boolean(template));
        const templateName =
          template === "NZ" ? "New Zealand" : template === "AU" ? "Australia" : template === "UK" ? "United Kingdom" : null;
        const regionLabel = region ? PUBLIC_HOLIDAY_REGION_LABELS[region] || region : null;
        setTemplateLabel(templateName ? (regionLabel ? `${templateName} — ${regionLabel}` : templateName) : null);
        setTenantTimeSettings(resolveTenantTimeSettings(template, region));
      } catch (error) {
        console.error(error);
        setBankHolidaysAvailable(false);
        setTenantTimeSettings(resolveTenantTimeSettings(null, null));
        setTemplateLabel(null);
      }
    })();
  }, []);

  const dateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const utcDateKey = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

  const getHeatLevel = (count: number) => {
    if (count >= 7) return 5;
    if (count >= 5) return 4;
    if (count >= 4) return 3;
    if (count >= 3) return 2;
    if (count >= 1) return 1;
    return 0;
  };

  const dayCellClassNames = (arg: any) => {
    const d = arg.date as Date;
    const key = dateKey(d);
    const count = dailyCounts[key] || 0;
    const level = getHeatLevel(count);
    const today = new Date();
    const isToday = today.toDateString() === d.toDateString();
    const isSelected = selectedDay && selectedDay.toDateString() === d.toDateString();
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isBlackout = blackoutDateKeys.has(key);
    return ([
      "cz-daycell",
      isBlackout && "cz-daycell--blackout",
      level > 0 && `cz-daycell--heat-${level}`,
      isToday && "cz-daycell--today",
      isSelected && "cz-daycell--selected",
      isWeekend && "cz-daycell--weekend",
    ] as (string | false)[]).filter((v): v is string => Boolean(v));
  };

  const dayCellContent = (arg: any) => {
    return (
      <div className="cz-daycell__inner">
        <div className="cz-daycell__date">{arg.dayNumberText}</div>
      </div>
    );
  };

  const renderEventContent = (content: EventContentArg) => {
    const isBlackout = Boolean(content.event.extendedProps?.isBlackout);
    const isBankHoliday = Boolean(content.event.extendedProps?.isBankHoliday);
    const isShift = (content.event.extendedProps as any)?.type === 'shift';
    const categoryName = (content.event.extendedProps as any)?.categoryName as string | null;
    const categoryIconKey = (content.event.extendedProps as any)?.categoryIconKey as string | null;
    const Icon = getEventCategoryIcon(categoryIconKey);
    const employee = (content.event.extendedProps as any)?.employee as any | undefined;
    
    if (isBankHoliday) {
      return (
        <div className="flex items-center gap-1 text-[9px] font-medium text-emerald-700 px-1 py-0.5 rounded bg-emerald-50/80">
          <CalendarDays className="h-2.5 w-2.5" /> {content.event.title}
        </div>
      );
    }
    if (isBlackout) {
      return (
        <div className="flex items-center gap-1 text-[9px] font-medium text-red-700 px-1 py-0.5 rounded bg-red-50/80">
          <Lock className="h-2.5 w-2.5" /> Blackout
        </div>
      );
    }
    if (isShift) {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md hover:bg-primary/10 cursor-pointer transition-colors">
              <ClockIcon className="h-2.5 w-2.5 flex-shrink-0 text-primary" />
              <span className="text-[10px] font-medium truncate max-w-[80px]">
                {content.timeText}
              </span>
              <Avatar src={employee?.profileImageUrl ?? null} name={employee?.name ?? null} size={14} />
            </div>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 rounded-xl shadow-xl border-border/50">
            <div className="flex items-center gap-3">
              <Avatar src={employee?.profileImageUrl ?? null} name={employee?.name ?? null} size={32} />
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{employee?.name || 'Shift'}</div>
                {employee?.department ? (
                  <div className="text-xs text-muted-foreground truncate">{employee.department}</div>
                ) : null}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <ClockIcon className="h-4 w-4 text-primary" />
                <span className="font-medium">{content.timeText}</span>
              </div>
              {content.event.extendedProps?.duration ? (
                <div className="text-xs text-muted-foreground">
                  Duration: {content.event.extendedProps.duration} hours
                </div>
              ) : null}
              {content.event.extendedProps?.locationName ? (
                <div className="text-xs text-muted-foreground">
                  Location: {String(content.event.extendedProps.locationName)}
                </div>
              ) : null}
              {content.event.extendedProps?.notes ? (
                <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded-lg">
                  {String(content.event.extendedProps.notes)}
                </div>
              ) : null}
              {employee?.id ? (
                <div className="pt-2 flex gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <a href={`/admin/timesheets/hub`}>View Timesheets</a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={`/employees/${employee.id}/overview`}>View Profile</a>
                  </Button>
                </div>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md hover:bg-primary/10 cursor-pointer transition-all group">
            <Avatar src={employee?.profileImageUrl ?? null} name={employee?.name ?? null} size={16} className="ring-1 ring-white shadow-sm flex-shrink-0" />
            <span className="text-[10px] font-medium truncate max-w-[70px] group-hover:text-primary transition-colors">
              {employee?.name || content.event.title}
            </span>
            {categoryName ? (
              <span className="text-[9px] text-white/90 font-medium truncate max-w-[60px]">
                • {categoryName}
              </span>
            ) : null}
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 rounded-xl shadow-xl border-border/50 p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
            <div className="flex items-center gap-3">
              <Avatar src={employee?.profileImageUrl ?? null} name={employee?.name ?? null} size={40} className="ring-2 ring-white shadow-lg" />
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{employee?.name || content.event.title}</div>
                {employee?.department ? (
                  <div className="text-xs text-muted-foreground truncate">{employee.department}</div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {categoryName ? (
              <Badge className="!text-xs flex items-center gap-1.5 w-fit">
                <Icon className="h-3.5 w-3.5" />{categoryName}
              </Badge>
            ) : null}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span>
                {formatTenantDate(content.event.start!, tenantTimeSettings, "d MMM yyyy")} –{" "}
                {formatTenantDate(
                  (content.event.end as any) || content.event.start!,
                  tenantTimeSettings,
                  "d MMM yyyy",
                )}
              </span>
            </div>
            {content.event.extendedProps?.reason ? (
              <div className="text-sm text-muted-foreground p-2.5 bg-muted/50 rounded-lg italic">
                "{String(content.event.extendedProps.reason)}"
              </div>
            ) : null}
            {employee?.id ? (
              <div className="pt-2 flex gap-2 border-t border-border/50">
                <Button asChild variant="secondary" size="sm" className="flex-1">
                  <a href={`/employees/${employee.id}/leave`}>View Leave</a>
                </Button>
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <a href={`/employees/${employee.id}/overview`}>Profile</a>
                </Button>
              </div>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const getCategoryColor = (name: string) => {
    const key = (name || "").toLowerCase();
    if (key.includes("annual") || key.includes("holiday")) return "cz-chip-modern--annual";
    if (key.includes("sick")) return "cz-chip-modern--sick";
    if (key.includes("training")) return "cz-chip-modern--training";
    if (key.includes("maternity") || key.includes("parent")) return "cz-chip-modern--parental";
    if (key.includes("compassion") || key.includes("bereave")) return "cz-chip-modern--compassion";
    if (key.includes("doctor")) return "cz-chip-modern--medical";
    if (key.includes("dentist")) return "cz-chip-modern--medical";
    if (key.includes("unpaid")) return "cz-chip-modern--unpaid";
    if (key.includes("toil") || key.includes("lieu")) return "cz-chip-modern--toil";
    return "cz-chip-modern--default";
  };

  const formatEventRange = (start: string, end?: string) => {
    const startLabel = formatTenantDate(start, tenantTimeSettings, "d MMM yyyy");
    const endLabel = formatTenantDate(end ?? start, tenantTimeSettings, "d MMM yyyy");
    return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
  };

  const handleChangeView = (viewName: "dayGridMonth" | "listMonth") => {
    setCurrentView(viewName);
    const api = calendarRef.current?.getApi();
    api?.changeView(viewName);
  };

  const handleDateClick = (arg: any) => {
    if (isEmployeeRole) {
      return;
    }
    setSelectedDate(arg.date);
    setDayActionSheetOpen(true);
  };

  const handleEventClick = async (clickInfo: any) => {
    if (clickInfo.event.extendedProps.isBlackout) {
      if (confirm("Delete this blackout day?")) {
        try {
          const res = await fetch("/api/blackout-days/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blackoutDayId: clickInfo.event.id }),
          });
          if (!res.ok) throw new Error("Failed to delete blackout day");
          toast.success("Blackout day deleted");
          refreshCalendar();
        } catch (error) {
          console.error(error);
          toast.error("Error deleting blackout day");
        }
      }
    }
  };

  const refreshCalendar = () => {
    console.log("Refreshing calendar events...");
    eventsCacheRef.current = null;
    const api = calendarRef.current?.getApi();
    if (api) {
      const currentDate = api.getDate();
      setCurrentCalendarDate(currentDate);
      api.refetchEvents();
    }
  };

  const deleteBlackoutForDate = async (date: Date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
    const ids = blackoutIdsByDay[key] || [];
    if (ids.length === 0) return;
    try {
      for (const id of ids) {
        const res = await fetch("/api/blackout-days/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blackoutDayId: id }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      toast.success("Blackout day removed");
      refreshCalendar();
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove blackout day");
    }
  };

  const legendCategories = useMemo(
    () =>
      presentCategories.map((cat) => ({
        label: cat.name,
        swatchClassName: getCategoryColor(cat.name),
        icon: getEventCategoryIcon(cat.iconKey),
      })),
    [presentCategories],
  );

  const eventSources = useMemo(
    () => [
      { id: "leave", events: fetchLeaveEvents },
      { id: "blackout", events: fetchBlackoutEvents },
      { id: "bankholidays", events: fetchBankHolidayEvents },
    ],
    [fetchLeaveEvents, fetchBlackoutEvents, fetchBankHolidayEvents],
  );

  return (
    <PageShell title="Calendar">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Hero Header - Compact */}
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-violet-500/5 to-purple-500/5 border border-primary/10">
          <div className="relative px-4 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  className="p-2 bg-gradient-to-br from-primary to-violet-600 rounded-xl shadow-md shadow-primary/25"
                >
                  <CalendarIcon className="w-5 h-5 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    Company Calendar
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Track leave, holidays, and team availability
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {!isEmployeeRole && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHolidayDefaultDate(new Date());
                      setHolidayModalOpen(true);
                    }}
                    className="h-8 rounded-lg border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all text-xs"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Book Leave
                  </Button>
                )}
                {!isEmployeeRole && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDate(null);
                      setBlackoutModalOpen(true);
                    }}
                    className="h-8 rounded-lg bg-red-50/50 hover:bg-red-50 border-red-200/50 text-red-700 hover:text-red-800 hover:border-red-300 transition-all text-xs"
                  >
                    <ShieldBanIcon className="mr-1.5 h-3.5 w-3.5" />
                    Blackouts
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(window.location.href);
                      toast.success("Link copied to clipboard");
                    } catch {
                      toast.error("Failed to copy link");
                    }
                  }}
                  className="h-8 rounded-lg text-xs"
                >
                  <Share2 className="mr-1.5 h-3.5 w-3.5" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid - Compact */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Users className="h-4 w-4 text-white" />}
            label="Off Today"
            value={stats.offToday}
            subtext="away"
            gradient="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50"
            iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
            delay={0.1}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4 text-white" />}
            label="This Period"
            value={stats.totalLeaveRequests}
            subtext="requests"
            gradient="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50"
            iconBg="bg-gradient-to-br from-emerald-500 to-emerald-600"
            delay={0.15}
          />
          <StatCard
            icon={<UserCheck className="h-4 w-4 text-white" />}
            label="People"
            value={stats.totalPeopleOff}
            subtext="unique"
            gradient="bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200/50"
            iconBg="bg-gradient-to-br from-violet-500 to-violet-600"
            delay={0.2}
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4 text-white" />}
            label="Blackouts"
            value={stats.totalBlackouts}
            subtext="blocked"
            gradient="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50"
            iconBg="bg-gradient-to-br from-amber-500 to-amber-600"
            delay={0.25}
          />
        </motion.div>

        {/* Main Calendar Card */}
        <motion.div variants={fadeInScale}>
          <Card className="overflow-hidden border-border/50 shadow-xl shadow-black/5">
            {/* Card Header with Controls - Compact */}
            <div className="p-3 border-b border-border/50 bg-gradient-to-r from-card via-card to-muted/10">
              <div className="flex flex-col gap-3">
                {/* Top Row - Navigation and View Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  {/* Left - Navigation */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => calendarRef.current?.getApi().prev()}
                        className="rounded-none h-7 px-2 hover:bg-muted/80"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => calendarRef.current?.getApi().today()}
                        className="rounded-none h-7 px-3 border-x border-border/30 font-medium hover:bg-muted/80 text-xs"
                      >
                        Today
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => calendarRef.current?.getApi().next()}
                        className="rounded-none h-7 px-2 hover:bg-muted/80"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <motion.h2 
                      key={currentTitle}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm font-semibold text-foreground"
                    >
                      {currentTitle}
                    </motion.h2>
                  </div>

                  {/* Right - View Toggle and Filters */}
                  <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm p-0.5">
                      <Button
                        variant={currentView === "dayGridMonth" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleChangeView("dayGridMonth")}
                        className={cn(
                          "rounded-md h-7 px-2.5 gap-1 transition-all text-xs",
                          currentView === "dayGridMonth" && "bg-primary text-primary-foreground shadow-sm"
                        )}
                      >
                        <Grid3X3 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Month</span>
                      </Button>
                      <Button
                        variant={currentView === "listMonth" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleChangeView("listMonth")}
                        className={cn(
                          "rounded-md h-7 px-2.5 gap-1 transition-all text-xs",
                          currentView === "listMonth" && "bg-primary text-primary-foreground shadow-sm"
                        )}
                      >
                        <List className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">List</span>
                      </Button>
                    </div>

                    {/* Filter Toggle */}
                    <Button
                      variant={showFilters ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className={cn(
                        "rounded-lg h-7 gap-1 transition-all text-xs",
                        showFilters && "bg-primary/10 border-primary/30"
                      )}
                    >
                      <Filter className={cn("h-3.5 w-3.5", showFilters && "text-primary")} />
                      <span className="hidden sm:inline">Filters</span>
                    </Button>
                  </div>
                </div>

                {/* Expandable Filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 border-t border-border/30">
                        <FilterBar
                          config={{
                            searchPlaceholder: "Search people or leave...",
                            showDepartmentFilter: false,
                            showCategoryFilter: categoryOptions.length > 0,
                            showLocationFilter: locationOptions.length > 0,
                          }}
                          departmentOptions={departments.map((dept) => ({ label: dept.name, value: dept.name }))}
                          categoryOptions={categoryOptions}
                          locationOptions={locationOptions}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Public Holiday Toggle - Compact */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/30">
                  <CalendarLegend
                    categories={legendCategories}
                    showBankHoliday={bankHolidaysAvailable && bankHolidaysOn}
                    bankHolidayLabel={templateLabel}
                  />
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30 border border-border/30">
                      <span className="text-[10px] font-medium text-muted-foreground">Holidays</span>
                      <Switch
                        checked={bankHolidaysOn && bankHolidaysAvailable}
                        disabled={!bankHolidaysAvailable}
                        onChange={(checked) => {
                          if (!bankHolidaysAvailable) return;
                          setBankHolidaysOn(checked);
                          calendarRef.current?.getApi().refetchEvents();
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar Content */}
            <div className="bg-card">
              {loading || dataLoading ? (
                <div className="p-8">
                  <SectionSkeleton showContainer={false} rows={1} lineClassName="h-[520px] w-full rounded-xl" />
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="calendar-wrapper"
                >
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
                    initialView={initialView}
                    initialDate={currentCalendarDate || undefined}
                    headerToolbar={false}
                    datesSet={(arg: any) => {
                      setCurrentTitle(arg.view?.title || "");
                      if (arg.view?.currentStart) {
                        setCurrentCalendarDate(new Date(arg.view.currentStart));
                      }
                    }}
                    eventSources={eventSources}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    eventContent={renderEventContent}
                    dayCellClassNames={dayCellClassNames}
                    dayCellContent={dayCellContent}
                    fixedWeekCount={false}
                    height="auto"
                    key={`${tenantTimeSettings.timeZone}`}
                    timeZone={tenantTimeSettings.timeZone}
                  />
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Day Inspector Sheet */}
      <Sheet
        open={Boolean(inspectorDate)}
        onOpenChange={(open) => {
          if (!open) {
            setInspectorDate(null);
            setSelectedDay(null);
            setHolidayDefaultDate(null);
          }
        }}
      >
        <SheetContent side="right" className="flex h-full flex-col gap-6 overflow-y-auto w-full sm:max-w-md">
          <SheetHeader className="space-y-2">
            <SheetTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Day Summary
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              {inspectorDate
                ? formatTenantDate(inspectorDate, tenantTimeSettings, "EEEE, d MMMM yyyy")
                : ""}
            </p>
          </SheetHeader>

          <div className="flex flex-wrap gap-2">
            {!isEmployeeRole && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (inspectorDate) {
                    setSelectedDate(inspectorDate);
                    setBlackoutModalOpen(true);
                  }
                }}
                className="rounded-xl"
              >
                <ShieldBanIcon className="mr-2 h-4 w-4" />
                Block day
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                if (inspectorDate) {
                  setHolidayDefaultDate(new Date(inspectorDate));
                  setHolidayModalOpen(true);
                } else {
                  toast.error("Select a day to add a holiday");
                }
              }}
              className="rounded-xl"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add holiday
            </Button>
            {inspectorDate
              ? (() => {
                  const key = `${inspectorDate.getFullYear()}-${String(
                    inspectorDate.getMonth() + 1,
                  ).padStart(2, "0")}-${String(inspectorDate.getDate()).padStart(2, "0")}`;
                  const hasBlackout = blackoutDateKeys.has(key);
                  return hasBlackout ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteBlackoutForDate(inspectorDate)}
                      className="rounded-xl"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Remove blackout
                    </Button>
                  ) : null;
                })()
              : null}
          </div>

          <div className="space-y-3 flex-1">
            <div className="text-sm font-medium text-muted-foreground">People off</div>
            <div className="space-y-2">
              {leaveEventsInRange
                .filter((ev: any) => {
                  if (!inspectorDate) return false;
                  const start = new Date(ev.start);
                  const end = new Date(ev.end || ev.start);
                  start.setHours(0, 0, 0, 0);
                  end.setHours(0, 0, 0, 0);
                  const target = new Date(inspectorDate);
                  target.setHours(0, 0, 0, 0);
                  return target >= start && target <= end;
                })
                .map((ev: any) => (
                  <motion.div 
                    key={ev.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-3 rounded-xl border border-border/50 p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <Avatar
                      src={ev.employee?.profileImageUrl ?? null}
                      name={ev.employee?.name ?? null}
                      size={32}
                      className="ring-2 ring-white shadow-sm"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-sm font-medium truncate">{ev.employee?.name || ev.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {formatEventRange(ev.start, ev.end)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {ev.employee?.department ?? ""}
                      </div>
                    </div>
                    {ev.categoryName ? (
                      <Badge className={cn("text-[10px]", getCategoryColor(ev.categoryName))}>
                        {ev.categoryName}
                      </Badge>
                    ) : null}
                  </motion.div>
                ))}
              {leaveEventsInRange.filter((ev: any) => {
                if (!inspectorDate) return false;
                const start = new Date(ev.start);
                const end = new Date(ev.end || ev.start);
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                const target = new Date(inspectorDate);
                target.setHours(0, 0, 0, 0);
                return target >= start && target <= end;
              }).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No one is off on this day</p>
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="justify-end border-t border-border/50 pt-4">
            <SheetClose asChild>
              <Button variant="outline" size="sm" className="rounded-xl">
                Close
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DayActionSheet
        open={dayActionSheetOpen}
        setOpen={setDayActionSheetOpen}
        selectedDate={selectedDate}
        onBlockDay={() => {
          setBlackoutModalOpen(true);
        }}
        onBookLeave={() => {}}
        refreshCalendar={refreshCalendar}
      />
      <BlackoutManagementModal
        open={blackoutModalOpen}
        setOpen={setBlackoutModalOpen}
        defaultDate={selectedDate}
        refreshEvents={refreshCalendar}
      />
      <AddHolidayModal
        open={holidayModalOpen}
        setOpen={setHolidayModalOpen}
        defaultDate={holidayDefaultDate}
        onSubmitted={refreshCalendar}
      />
    </PageShell>
  );
}

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const departmentParam = searchParams?.get("department") || "";
  const queryParam = searchParams?.get("q") || "";
  const viewParam = searchParams?.get("view") || "";
  const initialView = viewParam === "list" ? "listMonth" : "dayGridMonth";

  const initialFilters = useMemo(
    () => ({
      departments: departmentParam ? [departmentParam] : [],
      search: queryParam,
    }),
    [departmentParam, queryParam],
  );

  return (
    <FilterProvider initialFilters={initialFilters}>
      <CalendarPageInner initialView={initialView} />
    </FilterProvider>
  );
}
