"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, useRef as useMutableRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { List, CalendarDays, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy } from "lucide-react";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { toast } from "sonner";
import BlockDayModal from "./BlockDayModal";
import { EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import type { EventContentArg } from "@fullcalendar/core";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Lock } from "lucide-react";

interface Department {
  id: string;
  name: string;
}

export default function CalendarPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(false); // 🚩 NEW: force re-render trigger
  const [currentView, setCurrentView] = useState<"dayGridMonth" | "listMonth">("dayGridMonth");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dailyCounts, setDailyCounts] = useState<Record<string, number>>({});
  const [thresholds, setThresholds] = useState<{ defaultMaxConcurrent?: number } | null>(null);
  const [presentCategories, setPresentCategories] = useState<string[]>([]);
  const [leaveEventsInRange, setLeaveEventsInRange] = useState<any[]>([]);
  const [inspectorDate, setInspectorDate] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [bankHolidaysOn, setBankHolidaysOn] = useState(false);
  const [currentTitle, setCurrentTitle] = useState("");
  const bankHolidayCacheRef = useRef<any | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initializedFromUrl = useMutableRef(false);
  const [categoryOptions, setCategoryOptions] = useState<{label: string; value: string}[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [nameQuery, setNameQuery] = useState("");
  const [locationOptions, setLocationOptions] = useState<{label: string; value: string}[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [blackoutDateKeys, setBlackoutDateKeys] = useState<Set<string>>(new Set());
  const [blackoutIdsByDay, setBlackoutIdsByDay] = useState<Record<string, string[]>>({});
  const calendarRef = useRef<FullCalendar | null>(null);
  const blackoutKeyHashRef = useRef<string>("");

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
    fetchDepartments();
    setLoading(false);
  }, []);

  useEffect(() => {
    // Load event rules to show capacity hints (maxConcurrent per category - simplified aggregate)
    (async () => {
      try {
        const res = await fetch("/api/event-rules");
        if (res.ok) {
          const rules = await res.json();
          const maxes = (rules || [])
            .map((r: any) => r.maxConcurrent)
            .filter((n: any) => typeof n === 'number') as number[];
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
    // Load categories for filter drawer
    (async () => {
      try {
        const res = await fetch("/api/event-categories");
        if (res.ok) {
          const cats = await res.json();
          setCategoryOptions(
            (cats || []).map((c: any) => ({ label: c.name, value: c.id }))
          );
        }
      } catch (_err) {}
    })();
  }, []);

  useEffect(() => {
    // Load locations for filter drawer
    (async () => {
      try {
        const res = await fetch("/api/locations");
        if (res.ok) {
          const items = await res.json();
          setLocationOptions((items || []).map((l: any) => ({ label: l.name, value: l.id })));
        }
      } catch (_err) {}
    })();
  }, []);

  useEffect(() => {
    if (initializedFromUrl.current) return;
    if (!searchParams) return;
    const dep = searchParams.get("department") || "";
    const view = (searchParams.get("view") as any) || "";
    if (dep) setSelectedDepartment(dep);
    if (view === "list") setCurrentView("listMonth");
    initializedFromUrl.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initializedFromUrl.current) return;
    try {
      const url = new URL(window.location.href);
      if (selectedDepartment) url.searchParams.set("department", selectedDepartment);
      else url.searchParams.delete("department");
      url.searchParams.set("view", currentView === "listMonth" ? "list" : "month");
      router.replace(url.pathname + "?" + url.searchParams.toString(), { scroll: false });
    } catch (_err) {}
  }, [selectedDepartment, currentView, router]);

  const fetchLeaveEvents = async (
    fetchInfo: EventSourceFuncArg,
    successCallback: (events: EventInput[]) => void,
    failureCallback: (error: any) => void,
  ) => {
    try {
      const params = new URLSearchParams({
        from: fetchInfo.startStr,
        to: fetchInfo.endStr,
      });
      if (selectedDepartment) params.set("department", selectedDepartment);
      const res = await fetch(`/api/calendar-events?${params.toString()}`);
      if (!res.ok) {
        console.warn("Leave events fetch non-OK status", res.status);
        successCallback([]);
        return;
      }
      let data = await res.json();
      // Client-side filtering by category and name (optional)
      if (selectedCategories.length > 0) {
        const selectedSet = new Set(selectedCategories);
        data = (data as any[]).filter((e) => e.eventCategoryId ? selectedSet.has(e.eventCategoryId) : true);
      }
      if (selectedLocations.length > 0) {
        const locSet = new Set(selectedLocations);
        data = (data as any[]).filter((e) => e.employee?.locationId ? locSet.has(e.employee.locationId) : true);
      }
      if (nameQuery.trim().length > 0) {
        const q = nameQuery.trim().toLowerCase();
        data = (data as any[]).filter((e) => (e.employee?.name || e.title || "").toLowerCase().includes(q));
      }
      setLeaveEventsInRange(data);
      // Track which categories are present for legend
      const cats = Array.from(
        new Set((data as any[]).map((e) => (e.categoryName as string) || "Uncategorized").filter(Boolean))
      );
      setPresentCategories(cats);
      // Compute simple capacity counts per day
      const counts: Record<string, number> = {};
      const rangeStart = new Date(fetchInfo.startStr);
      const rangeEnd = new Date(fetchInfo.endStr);
      for (const ev of data as any[]) {
        const start = new Date(ev.start);
        const end = new Date(ev.end || ev.start);
        const cur = new Date(Math.max(start.getTime(), rangeStart.getTime()));
        const last = new Date(Math.min(end.getTime(), rangeEnd.getTime()));
        cur.setHours(0,0,0,0);
        last.setHours(0,0,0,0);
        for (let d = new Date(cur); d <= last; d.setDate(d.getDate() + 1)) {
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          counts[key] = (counts[key] || 0) + 1;
        }
      }
      setDailyCounts(counts);
      successCallback(data);
    } catch (error) {
      console.warn("Leave events fetch error", error);
      successCallback([]);
    }
  };

  const fetchBlackoutEvents = async (
    fetchInfo: EventSourceFuncArg,
    successCallback: (events: EventInput[]) => void,
    failureCallback: (error: any) => void,
  ) => {
    try {
      const params = new URLSearchParams({
        from: fetchInfo.startStr,
        to: fetchInfo.endStr,
      });
      const res = await fetch(`/api/blackout-days/get?${params.toString()}`);
      if (!res.ok) {
        // Soft-fail: do not spam toasts; just return empty
        console.warn("Blackout fetch non-OK status", res.status);
        successCallback([]);
        return;
      }
      const blackoutData = await res.json();
      const keys = new Set<string>();
      const idMap: Record<string, string[]> = {};
      const blackoutEvents = blackoutData.map((b: any) => {
        const d = new Date(b.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        keys.add(key);
        if (!idMap[key]) idMap[key] = [];
        idMap[key].push(b.id);
        return {
          id: b.id,
          title: b.allEvents ? "Blackout Day (All Events)" : "Blackout Day",
          start: b.date,
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
      // Update blackout key set and trigger a one-time rerender of day cells
      const nextHash = Array.from(keys).sort().join(',');
      setBlackoutDateKeys(keys);
      setBlackoutIdsByDay(idMap);
      if (nextHash !== blackoutKeyHashRef.current) {
        blackoutKeyHashRef.current = nextHash;
        setRefreshTrigger((prev) => !prev);
      }
      successCallback(blackoutEvents);
    } catch (error) {
      console.error("Blackout fetch error", error);
      // Soft-fail without toast storm
      successCallback([]);
    }
  };

  const fetchBankHolidayEvents = async (
    fetchInfo: EventSourceFuncArg,
    successCallback: (events: EventInput[]) => void,
    failureCallback: (error: any) => void,
  ) => {
    try {
      if (!bankHolidaysOn) {
        successCallback([]);
        return;
      }
      if (!bankHolidayCacheRef.current) {
        const res = await fetch("https://www.gov.uk/bank-holidays.json");
        if (!res.ok) throw new Error("Failed to load bank holidays");
        bankHolidayCacheRef.current = await res.json();
      }
      const defaultRegion = "england-and-wales";
      const configuredRegion = process.env.NEXT_PUBLIC_BANK_HOLIDAY_REGION || defaultRegion;
      const region = bankHolidayCacheRef.current[configuredRegion];
      const events: EventInput[] = (region?.events || [])
        .map((e: any) => ({
          id: `bank-${e.date}`,
          title: e.title || "Bank Holiday",
          start: e.date,
          allDay: true,
          backgroundColor: "#86efac",
          borderColor: "#22c55e",
          textColor: "#065f46",
          extendedProps: { isBankHoliday: true },
        }))
        .filter((ev: any) => ev.start >= fetchInfo.startStr && ev.start <= fetchInfo.endStr);
      successCallback(events);
    } catch (error) {
      console.error(error);
      failureCallback(error);
    }
  };

  const dayCellDidMount = (arg: any) => {
    const d = arg.date as Date;
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const count = dailyCounts[key] || 0;
    const el: HTMLElement = arg.el;
    // Cleanup any previous badge
    const prev = el.querySelector('.capacity-badge');
    if (prev && prev.parentElement) prev.parentElement.removeChild(prev);
    // Weekend subtle shading if no capacity shading
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isToday = (() => { const t = new Date(); return t.toDateString() === d.toDateString(); })();
    // Blackout day gets highest priority visual
    if (blackoutDateKeys.has(key)) {
      el.style.backgroundColor = 'rgba(239,68,68,0.18)'; // red-500 at low alpha
      const badge = document.createElement('div');
      badge.className = 'capacity-badge absolute top-1 right-1 text-[10px] leading-none rounded-full bg-red-600 text-white px-1.5 py-0.5';
      badge.textContent = 'Blocked';
      el.style.position = el.style.position || 'relative';
      el.appendChild(badge);
      // Add small lock icon overlay (bottom-left)
      const prevLock = el.querySelector('.blackout-lock');
      if (prevLock && prevLock.parentElement) prevLock.parentElement.removeChild(prevLock as any);
      const lock = document.createElement('div');
      lock.className = 'blackout-lock absolute bottom-1 left-1 text-[12px]';
      lock.textContent = '🔒';
      el.appendChild(lock);
    } else if (count > 0) {
      // Heat color by tiers
      let alpha = getHeatAlpha(count);
      el.style.backgroundColor = `rgba(59, 130, 246, ${alpha})`; // blue-500 with varying alpha
      const badge = document.createElement('div');
      badge.className = 'capacity-badge absolute top-1 right-1 text-[10px] leading-none rounded-full bg-blue-600 text-white px-1.5 py-0.5';
      badge.textContent = String(count);
      el.style.position = el.style.position || 'relative';
      el.appendChild(badge);
    } else {
      el.style.backgroundColor = isWeekend ? 'rgba(0,0,0,0.035)' : '';
    }
    // Today ring
    const prevRing = el.querySelector('.today-ring');
    if (prevRing && prevRing.parentElement) prevRing.parentElement.removeChild(prevRing);
    if (isToday) {
      const ring = document.createElement('div');
      ring.className = 'today-ring pointer-events-none absolute inset-0 rounded-md ring-2 ring-sky-400';
      el.style.position = el.style.position || 'relative';
      el.appendChild(ring);
    }

    // Selected day highlight (soft yellow)
    const prevSelect = el.querySelector('.selected-day-ring');
    if (prevSelect && prevSelect.parentElement) prevSelect.parentElement.removeChild(prevSelect);
    if (selectedDay && selectedDay.toDateString() === d.toDateString()) {
      const sel = document.createElement('div');
      sel.className = 'selected-day-ring pointer-events-none absolute inset-0 rounded-md ring-2 ring-yellow-300 bg-yellow-50/40';
      el.style.position = el.style.position || 'relative';
      el.appendChild(sel);
    }
  };

  const renderEventContent = (content: EventContentArg) => {
    const isBlackout = Boolean(content.event.extendedProps?.isBlackout);
    const isBankHoliday = Boolean(content.event.extendedProps?.isBankHoliday);
    const categoryName = (content.event.extendedProps as any)?.categoryName as string | null;
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
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-black/5 cursor-pointer">
            <Avatar src={employee?.profileImageUrl ?? null} name={employee?.name ?? null} size={18} />
            <span className="text-[11px] font-medium truncate max-w-[110px]">{employee?.name || content.event.title}</span>
            {categoryName ? (
              <Badge className="!text-[10px] !px-1.5 !py-0">{categoryName}</Badge>
            ) : null}
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
            {categoryName ? <Badge className="!text-[10px] !px-1.5 !py-0">{categoryName}</Badge> : null}
            <div className="text-xs text-gray-600">
              {new Date(content.event.start!).toLocaleDateString()} – {new Date((content.event.end as any) || content.event.start!).toLocaleDateString()}
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
    const key = (name || '').toLowerCase();
    if (key.includes('annual')) return 'bg-emerald-500';
    if (key.includes('holiday')) return 'bg-emerald-500';
    if (key.includes('sick')) return 'bg-amber-500';
    if (key.includes('training')) return 'bg-indigo-500';
    if (key.includes('parent')) return 'bg-pink-500';
    if (key.includes('bereave')) return 'bg-purple-500';
    if (key.includes('unpaid')) return 'bg-slate-500';
    if (key.includes('toil') || key.includes('lieu')) return 'bg-sky-500';
    return 'bg-blue-500';
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedDepartment(value);
    calendarRef.current?.getApi().refetchEvents();
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
    console.log("🔄 Refreshing calendar events...");
    calendarRef.current?.getApi().refetchEvents();
    setRefreshTrigger((prev) => !prev); // 🚩 NEW: force re-render on refresh
  };

  const deleteBlackoutForDate = async (date: Date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
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

  return (
    <PageShell title="Calendar">
      <Card title="Company Calendar">
        <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={currentView === "dayGridMonth" ? "primary" : "secondary"}
              size="sm"
              onClick={() => handleChangeView("dayGridMonth")}
            >
              <CalendarDays className="h-4 w-4 mr-2" /> Month
            </Button>
            <Button
              variant={currentView === "listMonth" ? "primary" : "secondary"}
              size="sm"
              onClick={() => handleChangeView("listMonth")}
            >
              <List className="h-4 w-4 mr-2" /> List
            </Button>
            <div className="ml-2 text-sm text-gray-700 font-medium">{currentTitle}</div>
            <div className="ml-2 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { calendarRef.current?.getApi().today(); }}
              >
                Today
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { calendarRef.current?.getApi().prev(); }}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { calendarRef.current?.getApi().next(); }}
              >
                Next
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="block mb-2 font-medium">Department</label>
              <select
                value={selectedDepartment}
                onChange={handleDepartmentChange}
                className="border rounded p-2 w-full md:w-64"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setFiltersOpen(true)}>
              Filters
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Bank holidays</span>
              <Switch checked={bankHolidaysOn} onChange={setBankHolidaysOn} />
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
              <Copy className="h-4 w-4 mr-2" /> Copy link
            </Button>
          </div>
        </div>
        {presentCategories.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {presentCategories.map((cat) => (
              <div key={cat} className="inline-flex items-center gap-2 mr-2 mb-1">
                <span className={`inline-block w-3 h-3 rounded-sm ${getCategoryColor(cat)}`}></span>
                <span className="text-xs text-gray-600">{cat}</span>
              </div>
            ))}
          </div>
        )}
        <div className="bg-white rounded-xl overflow-hidden">
          {loading ? (
            <p className="p-4">Loading...</p>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
              initialView="dayGridMonth"
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
                // Force re-render day cells to show selection highlight
                setRefreshTrigger((prev) => !prev);
              }}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              dayCellDidMount={dayCellDidMount}
              height="auto"
              key={refreshTrigger ? "refresh-on" : "refresh-off"} // 🚩 forces rerender on refresh
              timeZone="Europe/London" // 🚩 added for BST stability
            />
          )}
        </div>
      </Card>
      {inspectorDate && (
        <div className="fixed right-0 top-0 h-full w-full sm:w-[380px] bg-white shadow-2xl border-l z-40 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-gray-500">Day summary</div>
              <div className="text-lg font-semibold">{inspectorDate.toDateString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedDate(inspectorDate);
                  setBlockModalOpen(true);
                }}
              >
                Block day
              </Button>
              {(() => {
                const key = `${inspectorDate.getFullYear()}-${String(inspectorDate.getMonth()+1).padStart(2,'0')}-${String(inspectorDate.getDate()).padStart(2,'0')}`;
                const hasBlackout = blackoutDateKeys.has(key);
                return hasBlackout ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => deleteBlackoutForDate(inspectorDate)}
                    aria-label="Delete blackout day"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete blackout
                  </Button>
                ) : null;
              })()}
              <Button size="sm" variant="ghost" onClick={() => setInspectorDate(null)}>Close</Button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-sm text-gray-600">People off</div>
            <div className="space-y-2">
              {leaveEventsInRange.filter((ev: any) => {
                const d = inspectorDate;
                const start = new Date(ev.start);
                const end = new Date(ev.end || ev.start);
                start.setHours(0,0,0,0);
                end.setHours(0,0,0,0);
                const target = new Date(d);
                target.setHours(0,0,0,0);
                return target >= start && target <= end;
              }).map((ev: any) => (
                <div key={ev.id} className="flex items-center gap-3 p-2 rounded border">
                  <Avatar src={ev.employee?.profileImageUrl ?? null} name={ev.employee?.name ?? null} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{ev.employee?.name || ev.title}</div>
                    <div className="text-xs text-gray-600 truncate">{ev.employee?.department ?? ""}</div>
                  </div>
                  {ev.categoryName ? (
                    <span className={`text-[10px] text-white px-1.5 py-0.5 rounded ${getCategoryColor(ev.categoryName)}`}>{ev.categoryName}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent title="Filters">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium">Categories</label>
              <MultiSelect
                options={categoryOptions}
                selected={selectedCategories}
                onChange={setSelectedCategories}
                placeholder="Select categories"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">Locations</label>
              <MultiSelect
                options={locationOptions}
                selected={selectedLocations}
                onChange={setSelectedLocations}
                placeholder="Select locations"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">Search by name</label>
              <input
                type="text"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder="Search employees..."
                className="w-full border rounded-md p-2"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setSelectedCategories([]); setSelectedLocations([]); setNameQuery(""); }}>Clear</Button>
              <Button size="sm" onClick={() => setFiltersOpen(false)}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {selectedDate && (
        <BlockDayModal
          open={blockModalOpen}
          setOpen={setBlockModalOpen}
          selectedDate={selectedDate}
          refreshEvents={refreshCalendar}
        />
      )}
    </PageShell>
  );
}
