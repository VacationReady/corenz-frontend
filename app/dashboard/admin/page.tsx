"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Bell, ChevronDown, CalendarCheck2, ClipboardList, Users, Megaphone, Filter } from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';

export default function AdminDashboardPage() {
  const [name, setName] = useState<string>("Admin");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date | [Date, Date] | null>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filter, setFilter] = useState<"Headcount" | "Turnover" | "New Starters">("Headcount");
  const [filterDropdown, setFilterDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      if (session?.user?.name) setName(session.user.name);
    };
    fetchSession();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCalendarChange = (value: Date | Date[] | null) => {
    if (value instanceof Date) {
      setSelectedDate(value);
      setCalendarDate(value);
    } else if (Array.isArray(value)) {
      const start = value[0] instanceof Date ? value[0] : new Date();
      const end = value[1] instanceof Date ? value[1] : new Date();
      setSelectedDate(start);
      setCalendarDate([start, end]);
    }
  };

  const headcountData = [
    { month: "Jul", employees: 40, leavers: 1, starters: 2 },
    { month: "Aug", employees: 41, leavers: 0, starters: 1 },
    { month: "Sep", employees: 42, leavers: 1, starters: 2 },
    { month: "Oct", employees: 42, leavers: 0, starters: 1 },
    { month: "Nov", employees: 43, leavers: 0, starters: 2 },
    { month: "Dec", employees: 43, leavers: 1, starters: 1 },
    { month: "Jan", employees: 44, leavers: 0, starters: 3 },
    { month: "Feb", employees: 44, leavers: 1, starters: 1 },
    { month: "Mar", employees: 45, leavers: 0, starters: 2 },
    { month: "Apr", employees: 45, leavers: 0, starters: 1 },
    { month: "May", employees: 46, leavers: 0, starters: 2 },
    { month: "Jun", employees: 46, leavers: 0, starters: 1 },
  ];

  const turnoverData = headcountData.map(item => ({
    month: item.month,
    turnover: ((item.leavers / item.employees) * 100).toFixed(1),
  }));

  const startersData = headcountData.map(item => ({
    month: item.month,
    starters: item.starters,
  }));

  const whoIsOffMock = {
    "2025-06-28": ["John Doe (Annual Leave)", "Jane Smith (Sick Leave)"],
    "2025-06-29": ["Alice Brown (Annual Leave)"],
  };

  const selectedDateString = selectedDate ? selectedDate.toISOString().split("T")[0] : "";

  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Top Bar */}
      <div className="w-full px-6 py-4 flex items-center justify-between border-b bg-transparent dark:bg-transparent dark:border-neutral-700">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Hi, {name} 👋
        </h1>
        <div className="flex items-center gap-4">
          <div className="relative cursor-pointer mr-1">
            <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">3</span>
          </div>
          <div className="relative ml-2" ref={dropdownRef}>
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 focus:outline-none">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`}
                alt="Avatar"
                className="w-8 h-8 rounded-full"
              />
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg z-50">
                <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700">Manage Profile</Link>
                <Link href="#" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700">Help</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Header with Search */}
      <header className="w-full px-6 py-6 bg-surface dark:bg-surface-dark">
        <div className="relative w-full max-w-md mt-3">
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
      </header>

      <main className="flex-1 p-6 w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
          <DashboardWidget title="Book Leave" icon={CalendarCheck2} className="h-full">
            <p className="text-sm mb-4">Quickly book leave for yourself or a team member.</p>
            <Button className="bg-primary text-white hover:bg-primary/90 w-full">Book Leave</Button>
          </DashboardWidget>

          <DashboardWidget title="Quick Actions" icon={Megaphone} className="h-full">
            <ul className="space-y-2 text-sm">
              {["Post News", "Start Survey", "Add Company Document", "Email Employee"].map((action) => (
                <li key={action}><Link href="#" className="text-primary hover:underline">{action}</Link></li>
              ))}
            </ul>
          </DashboardWidget>

          <DashboardWidget title="People Metrics" icon={Users} className="h-full">
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <li>Active Employees: <span className="font-semibold text-gray-900 dark:text-gray-100">46</span></li>
              <li>Managers: <span className="font-semibold text-gray-900 dark:text-gray-100">5</span></li>
              <li>New Starters This Month: <span className="font-semibold text-gray-900 dark:text-gray-100">3</span></li>
            </ul>
          </DashboardWidget>

          <DashboardWidget title="Pending Approvals" icon={ClipboardList} className="h-full">
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">7</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Awaiting your approval</p>
          </DashboardWidget>

          <DashboardWidget
            title="Headcount & Turnover"
            icon={Users}
            className="h-full"
            action={
              <div className="relative">
                <button onClick={() => setFilterDropdown(!filterDropdown)} className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                  <Filter className="w-4 h-4" /> Filters
                </button>
                {filterDropdown && (
                  <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded shadow z-50">
                    {["Headcount", "Turnover", "New Starters"].map(option => (
                      <button
                        key={option}
                        onClick={() => { setFilter(option as "Headcount" | "Turnover" | "New Starters"); setFilterDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 ${
                          filter === option ? "bg-gray-100 dark:bg-neutral-700" : ""
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={
                filter === "Headcount" ? headcountData :
                filter === "Turnover" ? turnoverData :
                startersData
              }>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                {filter === "Headcount" && <Line type="monotone" dataKey="employees" stroke="#6366f1" name="Employees" />}
                {filter === "Turnover" && <Line type="monotone" dataKey="turnover" stroke="#f97316" name="Turnover %" />}
                {filter === "New Starters" && <Line type="monotone" dataKey="starters" stroke="#22c55e" name="New Starters" />}
              </LineChart>
            </ResponsiveContainer>
          </DashboardWidget>

          <DashboardWidget title="Leave Calendar" icon={CalendarCheck2} className="h-full">
            <Calendar value={calendarDate} onChange={handleCalendarChange} />
            {selectedDateString && whoIsOffMock[selectedDateString] && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">People off on {selectedDate?.toDateString()}:</p>
                <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                  {whoIsOffMock[selectedDateString].map((person, index) => (
                    <li key={index}>{person}</li>
                  ))}
                </ul>
              </div>
            )}
          </DashboardWidget>
        </div>
      </main>
    </div>
  );
}
