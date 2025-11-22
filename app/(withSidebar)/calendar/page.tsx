"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, useRef as useMutableRef, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { SectionSkeleton } from "@/components/ui/PageSkeleton";
import Button from "@/components/ui/Button";
import { List, CalendarDays, Trash2, GraduationCap, Heart, Stethoscope, Smile, Palmtree, ShieldBan, Umbrella, Briefcase, Baby, Users, Coffee } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import BlockDayModal from "./BlockDayModal";
import { EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import type { EventContentArg } from "@fullcalendar/core";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Lock, Clock } from "lucide-react";
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

function CalendarPageInner({ initialView }: CalendarPageInnerProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(false);
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
  const blackoutKeyHashRef = useRef<string>("");
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayDefaultDate, setHolidayDefaultDate] = useState<Date | null>(null);
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
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
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
    // If date query is present (YYYY-MM-DD), navigate calendar to that date and highlight it
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
          // Defer until calendar ref is ready
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
      router.replace(url.pathname + "?" + url.searchParams.toString(), { scroll: false });
    } catch (_err) {}
  }, [filters.departments.join(","), filters.search, currentView, router]);

  useEffect(() => {
    if (!calendarRef.current) return;
    calendarRef.current.getApi().refetchEvents();
  }, [
    filters.departments.join(","),
    filters.categories.join(","),
    filters.locations.join(","),
    filters.search,
  ]);

  const fetchLeaveEvents = async (
    fetchInfo: EventSourceFuncArg,
    successCallback: (events: EventInput[]) => void,
    _failureCallback: (error: any) => void,
  ) => {
    try {
      const departmentFilter = filters.departments[0] || "";
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
      let data = await res.json();
      if (filters.categories.length > 0) {
        const selectedSet = new Set(filters.categories);
        data = (data as any[]).filter((e) =>
          e.eventCategoryId ? selectedSet.has(e.eventCategoryId) : true,
        );
      }
      if (filters.locations.length > 0) {
        const locSet = new Set(filters.locations);
        data = (data as any[]).filter((e) =>
          e.employee?.locationId ? locSet.has(e.employee.locationId) : true,
        );
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
        Array.from(catsMap.entries()).map(([name, iconKey]) => ({ name, iconKey }))
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
  };

  const fetchBlackoutEvents = async (
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
        // Use local date key to match dayCellContent logic
        const key = dateKey(d);
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
      const nextHash = Array.from(keys).sort().join(",");
      setBlackoutDateKeys(keys);
      setBlackoutIdsByDay(idMap);
      if (nextHash !== blackoutKeyHashRef.current) {
        blackoutKeyHashRef.current = nextHash;
        setRefreshTrigger((prev) => !prev);
      }
      successCallback(blackoutEvents);
    } catch (error) {
      console.error("Blackout fetch error", error);
      successCallback([]);
    }
  };

  const fetchBankHolidayEvents = async (
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
  };

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
    return ([
      "cz-daycell",
      blackoutDateKeys.has(key) && "cz-daycell--blackout",
      level > 0 && `cz-daycell--heat-${level}`,
      isToday && "cz-daycell--today",
      isSelected && "cz-daycell--selected",
      isWeekend && "cz-daycell--weekend",
    ] as (string | false)[]).filter((v): v is string => Boolean(v));
  };

  const dayCellContent = (arg: any) => {
    const d = arg.date as Date;
    const key = dateKey(d);
    const count = dailyCounts[key] || 0;
    const isBlackout = blackoutDateKeys.has(key);
    const cats = dailyCategoryCounts[key] || {};
    const entries = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const more = Object.keys(cats).length - entries.length;
    return (
      <div className="cz-daycell__inner">
        {isBlackout ? (
          <div className="cz-badge-modern cz-badge-modern--blocked">
            <ShieldBan className="h-3 w-3" />
            <span>Blocked</span>
          </div>
        ) : null}
        <div className="cz-daycell__date">{arg.dayNumberText}</div>
        {count > 0 ? (
          <div className="mt-5 space-y-1">
            {entries.map(([label, n]) => {
              const catObj = presentCategories.find((c) => c.name === label);
              const Icon = getEventCategoryIcon(catObj?.iconKey);
              return (
                <div key={label} className="w-full text-[11px]">
                  <span className={`cz-chip-modern ${getCategoryColor(label)}`}>
                    <span className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3" />
                      <span className="font-semibold">{label}</span>
                    </span>
                    <span className="cz-chip-modern__count">{n}</span>
                  </span>
                </div>
              );
            })}
            {more > 0 ? (
              <div className="text-[10px] text-muted-foreground font-medium">+{more} more</div>
            ) : null}
          </div>
        ) : null}
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
        <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
          <CalendarDays className="h-3 w-3" /> {content.event.title}
        </div>
      );
    }
    if (isBlackout) {
      return (
        <div className="flex items-center gap-1 text-[11px] font-medium text-red-700">
          <span className="inline-block w-2 h-2 bg-[repeating-linear-gradient(45deg,#fecaca,#fecaca_4px,#ffffff_4px,#ffffff_8px)] border border-red-400"></span>
          <Lock className="h-3 w-3" /> Blackout
        </div>
      );
    }
    if (isShift) {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-black/5 cursor-pointer">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="text-[11px] font-medium truncate max-w-[110px]">
                {content.timeText}
              </span>
              <Avatar src={employee?.profileImageUrl ?? null} name={employee?.name ?? null} size={16} />
            </div>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72">
            <div className="flex items-center gap-3">
              <Avatar src={employee?.profileImageUrl ?? null} name={employee?.name ?? null} size={32} />
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{employee?.name || 'Shift'}</div>
                {employee?.department ? (
                  <div className="text-xs text-gray-500 truncate">{employee.department}</div>
                ) : null}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium">{content.timeText}</span>
              </div>
              {content.event.extendedProps?.duration ? (
                <div className="text-xs text-gray-600">
                  Duration: {content.event.extendedProps.duration} hours
                </div>
              ) : null}
              {content.event.extendedProps?.locationName ? (
                <div className="text-xs text-gray-600">
                  Location: {String(content.event.extendedProps.locationName)}
                </div>
              ) : null}
              {content.event.extendedProps?.notes ? (
                <div className="text-xs text-gray-700 mt-2 p-2 bg-gray-50 rounded">
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
          <div className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-black/5 cursor-pointer">
            <Avatar src={employee?.profileImageUrl ?? null} name={employee?.name ?? null} size={18} />
            <span className="text-[11px] font-medium truncate max-w-[110px]">
              {employee?.name || content.event.title}
            </span>
            {categoryName ? <Badge className="!text-[10px] !px-1.5 !py-0 flex items-center gap-1"><Icon className="h-3 w-3" />{categoryName}</Badge> : null}
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <div className="flex items-center gap-3">
            <Avatar src={employee?.profileImageUrl ?? null} name={employee?.name ?? null} size={32} />
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{employee?.name || content.event.title}</div>
              {employee?.department ? (
                <div className="text-xs text-gray-500 truncate">{employee.department}</div>
              ) : null}
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {categoryName ? <Badge className="!text-[10px] !px-1.5 !py-0 flex items-center gap-1"><Icon className="h-3 w-3" />{categoryName}</Badge> : null}
            <div className="text-xs text-gray-600">
              {formatTenantDate(content.event.start!, tenantTimeSettings, "d MMM yyyy")} –{" "}
              {formatTenantDate(
                (content.event.end as any) || content.event.start!,
                tenantTimeSettings,
                "d MMM yyyy",
              )}
            </div>
            {content.event.extendedProps?.reason ? (
              <div className="text-xs text-gray-700">{String(content.event.extendedProps.reason)}</div>
            ) : null}
            {employee?.id ? (
              <div className="pt-2 flex gap-2">
                <Button asChild variant="secondary" size="sm">
                  <a href={`/employees/${employee.id}/leave`}>Open leave tab</a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`/employees/${employee.id}/overview`}>Open profile</a>
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
    setSelectedDate(arg.date);
    setBlockModalOpen(true);
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
    calendarRef.current?.getApi().refetchEvents();
    setRefreshTrigger((prev) => !prev);
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

  return (
    <PageShell title="Calendar">
      <Card title="Company Calendar">
        <div className="space-y-4 p-4">
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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-2xl border border-border bg-background/60 backdrop-blur">
                <Button
                  type="button"
                  size="sm"
                  variant={currentView === "dayGridMonth" ? "primary" : "ghost"}
                  className="rounded-none"
                  aria-pressed={currentView === "dayGridMonth"}
                  onClick={() => handleChangeView("dayGridMonth")}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Month
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={currentView === "listMonth" ? "primary" : "ghost"}
                  className="rounded-none"
                  aria-pressed={currentView === "listMonth"}
                  onClick={() => handleChangeView("listMonth")}
                >
                  <List className="mr-2 h-4 w-4" />
                  List
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    calendarRef.current?.getApi().today();
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    calendarRef.current?.getApi().prev();
                  }}
                  aria-label="Previous period"
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    calendarRef.current?.getApi().next();
                  }}
                  aria-label="Next period"
                >
                  Next
                </Button>
              </div>
              <span className="text-sm font-medium text-muted-foreground">{currentTitle}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show public holidays</span>
                <Switch
                  checked={bankHolidaysOn && bankHolidaysAvailable}
                  disabled={!bankHolidaysAvailable}
                  onChange={(checked) => {
                    if (!bankHolidaysAvailable) return;
                    setBankHolidaysOn(checked);
                    calendarRef.current?.getApi().refetchEvents();
                  }}
                />
                {bankHolidaysAvailable && templateLabel ? (
                  <span className="text-xs text-muted-foreground">({templateLabel})</span>
                ) : null}
                {!bankHolidaysAvailable ? (
                  <span className="text-xs text-muted-foreground">No feed configured</span>
                ) : null}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied");
                  } catch {
                    toast.error("Failed to copy link");
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </Button>
            </div>
          </div>
        </div>
        <CalendarLegend
          categories={legendCategories}
          showBankHoliday={bankHolidaysAvailable && bankHolidaysOn}
          bankHolidayLabel={templateLabel}
        />
        <div className="bg-white rounded-xl overflow-hidden">
          {loading || dataLoading ? (
            <SectionSkeleton showContainer={false} rows={1} lineClassName="h-[520px] w-full" />
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
              initialView={initialView}
              headerToolbar={false}
              datesSet={(arg: any) => {
                setCurrentTitle(arg.view?.title || "");
              }}
              eventSources={[
                { id: "leave", events: fetchLeaveEvents },
                { id: "blackout", events: fetchBlackoutEvents },
                { id: "bankholidays", events: fetchBankHolidayEvents },
              ]}
              dateClick={(arg) => {
                setInspectorDate(arg.date);
                setSelectedDay(arg.date);
              }}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              dayCellClassNames={dayCellClassNames}
              dayCellContent={dayCellContent}
              fixedWeekCount={false}
              height="auto"
              key={`${tenantTimeSettings.timeZone}-${refreshTrigger ? "refresh-on" : "refresh-off"}`}
              timeZone={tenantTimeSettings.timeZone}
            />
          )}
        </div>
      </Card>

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
        <SheetContent side="right" className="flex h-full flex-col gap-6 overflow-y-auto">
          <SheetHeader className="space-y-2">
            <SheetTitle>Day summary</SheetTitle>
            <p className="text-sm text-muted-foreground">
              {inspectorDate
                ? formatTenantDate(inspectorDate, tenantTimeSettings, "EEEE, d MMMM yyyy")
                : ""}
            </p>
          </SheetHeader>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (inspectorDate) {
                  setSelectedDate(inspectorDate);
                  setBlockModalOpen(true);
                }
              }}
            >
              Block day
            </Button>
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
            >
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
                      variant="danger"
                      onClick={() => deleteBlackoutForDate(inspectorDate)}
                      aria-label="Delete blackout day"
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Delete blackout
                    </Button>
                  ) : null;
                })()
              : null}
          </div>

          <div className="space-y-3">
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
                  <div key={ev.id} className="flex items-start gap-3 rounded border p-3">
                    <Avatar
                      src={ev.employee?.profileImageUrl ?? null}
                      name={ev.employee?.name ?? null}
                      size={28}
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
                      <span
                        className={`text-[10px] text-white px-1.5 py-0.5 rounded ${getCategoryColor(
                          ev.categoryName,
                        )}`}
                      >
                        {ev.categoryName}
                      </span>
                    ) : null}
                  </div>
                ))}
            </div>
          </div>

          <SheetFooter className="justify-end">
            <SheetClose asChild>
              <Button variant="ghost" size="sm">
                Close
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {selectedDate && (
        <BlockDayModal
          open={blockModalOpen}
          setOpen={setBlockModalOpen}
          selectedDate={selectedDate}
          refreshEvents={refreshCalendar}
        />
      )}
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
