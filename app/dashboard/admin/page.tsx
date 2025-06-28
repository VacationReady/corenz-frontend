"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  CalendarCheck2,
  ClipboardList,
  Users,
  Megaphone,
  Filter,
  FilePlus2,
  Mail,
  FileText,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import Image from "next/image";

export default function AdminDashboardPage() {
  const [name, setName] = useState<string>("Admin");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<"Headcount" | "Turnover" | "New Starters">("Headcount");
  const [filterDropdown, setFilterDropdown] = useState(false);
  const [offFilter, setOffFilter] = useState<"Today" | "This Week" | "This Month">("Today");
  const [offFilterDropdown, setOffFilterDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setFilterDropdown(false);
        setOffFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const turnoverData = headcountData.map((item) => ({
    month: item.month,
    turnover: ((item.leavers / item.employees) * 100).toFixed(1),
  }));

  const startersData = headcountData.map((item) => ({
    month: item.month,
    starters: item.starters,
  }));

  const peopleOffData = {
    Today: [
      { name: "John Doe", reason: "Annual Leave", avatar: "/avatar1.png" },
      { name: "Jane Smith", reason: "Sick Leave", avatar: "/avatar2.png" },
    ],
    "This Week": [
      { name: "John Doe", reason: "Annual Leave", avatar: "/avatar1.png" },
      { name: "Jane Smith", reason: "Sick Leave", avatar: "/avatar2.png" },
      { name: "Alice Brown", reason: "Maternity Leave", avatar: "/avatar3.png" },
    ],
    "This Month": [
      { name: "John Doe", reason: "Annual Leave", avatar: "/avatar1.png" },
      { name: "Jane Smith", reason: "Sick Leave", avatar: "/avatar2.png" },
      { name: "Alice Brown", reason: "Maternity Leave", avatar: "/avatar3.png" },
      { name: "Michael Green", reason: "Training", avatar: "/avatar4.png" },
    ],
  };

  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Header with Search and Actions */}
      <div className="w-full px-6 pt-6 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Hi, {name} 👋</h1>
        <div className="flex items-center gap-4">
          <div className="relative cursor-pointer">
            <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">3</span>
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-800 font-semibold">
                {name.slice(0, 2).toUpperCase()}
              </div>
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

      <div className="w-full px-6 mt-4 mb-2">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      <main className="flex-1 p-6 w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
        {/* Book Leave */}
        <DashboardWidget title="Book Leave" icon={CalendarCheck2} className="h-full">
          <p className="text-sm mb-2">Quickly book leave for yourself or a team member.</p>
          <ul className="text-sm mb-4 text-gray-700 dark:text-gray-300">
            <li>Total Entitlement: <span className="font-semibold text-gray-900 dark:text-gray-100">25 days</span></li>
            <li>Taken: <span className="font-semibold text-gray-900 dark:text-gray-100">10 days</span></li>
            <li>Remaining: <span className="font-semibold text-gray-900 dark:text-gray-100">15 days</span></li>
          </ul>
          <Button className="bg-primary text-white hover:bg-primary/90 w-full">Book Leave</Button>
        </DashboardWidget>

        {/* Quick Actions */}
        <DashboardWidget title="Quick Actions" icon={Megaphone} className="h-full">
          <ul className="space-y-2 text-sm">
            {[
              { label: "Post News", icon: FileText },
              { label: "Start Survey", icon: FilePlus2 },
              { label: "Add Company Document", icon: FileText },
              { label: "Email Employee", icon: Mail },
            ].map((action) => (
              <li key={action.label} className="flex items-center gap-2">
                <action.icon className="w-4 h-4 text-indigo-600" />
                <Link href="#" className="text-primary hover:underline">{action.label}</Link>
              </li>
            ))}
          </ul>
        </DashboardWidget>

        {/* People Metrics */}
        <DashboardWidget title="People Metrics" icon={Users} className="h-full">
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <li>Active Employees: <span className="font-semibold text-gray-900 dark:text-gray-100">46</span></li>
            <li>Managers: <span className="font-semibold text-gray-900 dark:text-gray-100">5</span></li>
            <li>New Starters This Month: <span className="font-semibold text-gray-900 dark:text-gray-100">3</span></li>
          </ul>
        </DashboardWidget>

        {/* Pending Approvals */}
        <DashboardWidget title="Pending Approvals" icon={ClipboardList} className="h-full">
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">7</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Awaiting your approval</p>
        </DashboardWidget>

        {/* Headcount & Turnover */}
        <DashboardWidget
          title="Headcount & Turnover"
          icon={Users}
          className="h-full"
          action={
            <div>
              <button onClick={() => setFilterDropdown(!filterDropdown)} className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                <Filter className="w-4 h-4" /> Filters
              </button>
              {filterDropdown && (
                <div className="absolute right-6 mt-2 w-36 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded shadow z-50">
                  {["Headcount", "Turnover", "New Starters"].map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setFilter(option as "Headcount" | "Turnover" | "New Starters");
                        setFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 ${filter === option ? "bg-gray-100 dark:bg-neutral-700" : ""}`}
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
            <LineChart
              data={filter === "Headcount" ? headcountData : filter === "Turnover" ? turnoverData : startersData}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              {filter === "Headcount" && <Line type="monotone" dataKey="employees" stroke="#6366f1" name="Employees" dot />}
              {filter === "Turnover" && <Line type="monotone" dataKey="turnover" stroke="#f97316" name="Turnover %" dot />}
              {filter === "New Starters" && <Line type="monotone" dataKey="starters" stroke="#22c55e" name="New Starters" dot />}
            </LineChart>
          </ResponsiveContainer>
        </DashboardWidget>

        {/* Who's Off */}
        <DashboardWidget
          title="Who's Off"
          icon={CalendarCheck2}
          className="h-full"
          action={
            <div>
              <button onClick={() => setOffFilterDropdown(!offFilterDropdown)} className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                <Filter className="w-4 h-4" /> {offFilter}
              </button>
              {offFilterDropdown && (
                <div className="absolute right-6 mt-2 w-36 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded shadow z-50">
                  {["Today", "This Week", "This Month"].map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setOffFilter(option as "Today" | "This Week" | "This Month");
                        setOffFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 ${offFilter === option ? "bg-gray-100 dark:bg-neutral-700" : ""}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          }
        >
          {peopleOffData[offFilter].map((person, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold">
                  {person.name.split(" ").map(n => n[0]).join("")}
                </div>
                <span>{person.name}</span>
              </div>
              <span className="text-gray-500 dark:text-gray-400">{person.reason}</span>
            </div>
          ))}
        </DashboardWidget>
      </main>
    </div>
  );
}
