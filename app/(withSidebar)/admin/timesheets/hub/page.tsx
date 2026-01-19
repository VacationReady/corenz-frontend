"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Eye, Filter, Users, Clock, Calendar as CalendarIcon, Sparkles, CheckCircle, Edit2, History, Info, DollarSign, Briefcase, Link2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MyTimesheetsPanel from "@/components/time-tracking/MyTimesheetsPanel";
import EditTimesheetEntryDialog from "@/components/time-tracking/EditTimesheetEntryDialog";
import TimesheetAuditTrail from "@/components/time-tracking/TimesheetAuditTrail";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subWeeks, subMonths, subQuarters } from "date-fns";
import { FeatureGuardedPage } from "@/components/FeatureGuardedPage";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

type ShiftInfo = {
  id: string;
  startTime: string;
  endTime: string;
  role: string | null;
  attendanceStatus: string;
};

type TimesheetEntry = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  hours: number;
  notes?: string | null;
  isOvertime: boolean;
  entryType: "CLOCK" | "MANUAL" | "ADJUSTED";
  // Shift reconciliation info
  shiftId?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  varianceMinutes?: number | null;
  varianceType?: string | null;
  reconciliationStatus?: string;
  shift?: ShiftInfo | null;
};

type Timesheet = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeAvatar?: string;
  department: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  status: string;
  submittedAt: string;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  notes?: string | null;
  entries: TimesheetEntry[];
  // Cost information
  hourlyRate?: number | null;
  salaryAmount?: number | null;
  estimatedCost?: number | null;
  payType?: 'HOURLY' | 'SALARY' | 'UNKNOWN';
  clockEntryCount?: number;
};

type Department = {
  id: string;
  name: string;
};

export default function AdminTimesheetHubPage() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "declined">("pending");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "week" | "month" | "quarter" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [previewSheet, setPreviewSheet] = useState<Timesheet | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; reason: string; sendEmail: boolean; timesheetId: string | null }>({
    open: false,
    reason: "",
    sendEmail: true,
    timesheetId: null,
  });
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"approvals" | "my-timesheets">("approvals");
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditTimesheetId, setAuditTimesheetId] = useState<string | null>(null);
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [decliningIds, setDecliningIds] = useState<Set<string>>(new Set());
  const [fadingOutIds, setFadingOutIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Statistics
  const totalCount = timesheets.length;
  const totalHours = timesheets.reduce((sum, t) => sum + (t.totalHours || 0), 0);
  const avgHours = totalCount > 0 ? totalHours / totalCount : 0;
  const oldestSubmission = timesheets.length > 0 ? timesheets[0].submittedAt : null;
  const totalCost = timesheets.reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
  
  // Status labels
  const statusLabel = statusFilter === "all" ? "All" : statusFilter === "pending" ? "Pending" : statusFilter === "approved" ? "Approved" : "Declined";
  const showBulkActions = statusFilter === "pending"; // Only show bulk actions for pending

  useEffect(() => {
    fetchData();
    setSelectedIds(new Set()); // Clear selections when filters change
  }, [departmentFilter, periodFilter, customStartDate, customEndDate, statusFilter]);

  const getDateRangeParams = () => {
    const params = new URLSearchParams();
    
    if (periodFilter === "week") {
      const start = startOfWeek(new Date(), { weekStartsOn: 1 });
      const end = endOfWeek(new Date(), { weekStartsOn: 1 });
      params.append("startDate", start.toISOString());
      params.append("endDate", end.toISOString());
    } else if (periodFilter === "month") {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      params.append("startDate", start.toISOString());
      params.append("endDate", end.toISOString());
    } else if (periodFilter === "quarter") {
      const start = startOfQuarter(new Date());
      const end = endOfQuarter(new Date());
      params.append("startDate", start.toISOString());
      params.append("endDate", end.toISOString());
    } else if (periodFilter === "custom" && customStartDate && customEndDate) {
      params.append("startDate", new Date(customStartDate).toISOString());
      params.append("endDate", new Date(customEndDate).toISOString());
    }
    
    if (departmentFilter && departmentFilter !== "all") {
      params.append("departmentId", departmentFilter);
    }
    
    // Add status filter
    if (statusFilter === "all") {
      params.append("status", "ALL");
    } else if (statusFilter === "approved") {
      params.append("status", "APPROVED");
    } else if (statusFilter === "declined") {
      params.append("status", "DECLINED");
    }
    // Default (pending) doesn't need status param
    
    return params;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = getDateRangeParams();
      
      const [timesheetsRes, deptsRes] = await Promise.all([
        fetch(`/api/timesheets/pending?${params.toString()}`),
        fetch("/api/departments"),
      ]);

      if (timesheetsRes.ok) {
        const data = await timesheetsRes.json();
        setTimesheets(data.timesheets || []);
      }

      if (deptsRes.ok) {
        const data = await deptsRes.json();
        setDepartments(data.departments || data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load timesheets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === timesheets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(timesheets.map((t) => t.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    try {
      setProcessing(true);
      const response = await fetch("/api/timesheets/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timesheetIds: Array.from(selectedIds),
        }),
      });

      if (!response.ok) throw new Error("Failed to approve timesheets");

      const data = await response.json();

      toast({
        title: "Approval Complete",
        description: `Approved ${data.summary.succeeded} of ${data.summary.total} timesheets`,
      });

      setSelectedIds(new Set());
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve timesheets",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0 || !rejectDialog.reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch("/api/timesheets/bulk-reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timesheetIds: Array.from(selectedIds),
          reason: rejectDialog.reason,
          sendEmail: rejectDialog.sendEmail,
        }),
      });

      if (!response.ok) throw new Error("Failed to reject timesheets");

      const data = await response.json();

      toast({
        title: "Rejection Complete",
        description: `Rejected ${data.summary.succeeded} of ${data.summary.total} timesheets`,
      });

      setSelectedIds(new Set());
      setRejectDialog({ open: false, reason: "", sendEmail: true, timesheetId: null });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject timesheets",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleIndividualDecline = async () => {
    if (!rejectDialog.timesheetId || !rejectDialog.reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a decline reason",
        variant: "destructive",
      });
      return;
    }

    const timesheetId = rejectDialog.timesheetId;
    setDecliningIds(prev => new Set(prev).add(timesheetId));

    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: rejectDialog.reason,
          sendEmail: rejectDialog.sendEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to decline timesheet");
      }

      const declinedTimesheet = timesheets.find(t => t.id === timesheetId);

      toast({
        title: "Timesheet Declined",
        description: declinedTimesheet
          ? `${declinedTimesheet.employeeName}'s timesheet has been declined${rejectDialog.sendEmail ? " and they have been notified" : ""}`
          : "Timesheet declined successfully",
      });

      setRejectDialog({ open: false, reason: "", sendEmail: true, timesheetId: null });
      setPreviewSheet(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to decline timesheet",
        variant: "destructive",
      });
    } finally {
      setDecliningIds(prev => {
        const next = new Set(prev);
        next.delete(timesheetId);
        return next;
      });
    }
  };

  const openDeclineDialog = (timesheetId: string) => {
    setRejectDialog({ open: true, reason: "", sendEmail: true, timesheetId });
  };

  const handleIndividualApprove = async (timesheetId: string) => {
    // Set loading state for this specific button
    setApprovingIds(prev => new Set(prev).add(timesheetId));
    
    try {
      const response = await fetch("/api/timesheets/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timesheetIds: [timesheetId],
        }),
      });

      if (!response.ok) throw new Error("Failed to approve timesheet");

      // Find the timesheet to get employee name for the toast
      const approvedTimesheet = timesheets.find(t => t.id === timesheetId);
      
      // Start fade-out animation
      setFadingOutIds(prev => new Set(prev).add(timesheetId));
      
      // Show success toast with employee name
      toast({
        title: "✓ Timesheet Approved",
        description: approvedTimesheet 
          ? `${approvedTimesheet.employeeName}'s timesheet has been approved`
          : "Timesheet approved successfully",
      });

      // Wait for animation to complete, then remove from list
      setTimeout(() => {
        setTimesheets(prev => prev.filter(t => t.id !== timesheetId));
        setFadingOutIds(prev => {
          const next = new Set(prev);
          next.delete(timesheetId);
          return next;
        });
      }, 300);
      
      setPreviewSheet(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve timesheet",
        variant: "destructive",
      });
    } finally {
      setApprovingIds(prev => {
        const next = new Set(prev);
        next.delete(timesheetId);
        return next;
      });
    }
  };

  // Filter timesheets by search query
  const filteredTimesheets = timesheets.filter((t) =>
    t.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FeatureGuardedPage featureKey={FEATURE_KEYS.TIMESHEETS}>
    <div className="container mx-auto max-w-7xl space-y-8 p-6">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/70 via-blue-700/60 to-indigo-800/70 p-8 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/70">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Unified timesheet workspace
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white lg:text-4xl">Timesheet Hub</h1>
              <p className="mt-2 max-w-xl text-sm text-white/80 lg:text-base">
                Approve your team&rsquo;s submissions and manage your own hours without leaving this page.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-white/80 sm:grid-cols-4 lg:text-base">
            <div className="rounded-2xl border border-white/20 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wide text-white/50">{statusLabel}</p>
              <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                <Users className="h-5 w-5 text-sky-300" />
                {totalCount}
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wide text-white/50">Total hours</p>
              <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                <Clock className="h-5 w-5 text-sky-300" />
                {totalHours.toFixed(1)}
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wide text-white/50">Avg / employee</p>
              <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                <Clock className="h-5 w-5 text-emerald-300" />
                {avgHours.toFixed(1)}
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wide text-white/50">Total Cost</p>
              <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                <DollarSign className="h-5 w-5 text-emerald-300" />
                {totalCost > 0 ? `$${totalCost.toFixed(0)}` : "N/A"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "approvals" | "my-timesheets")}
        className="space-y-6"
      >
        <TabsList className="bg-muted/30 p-1">
          <TabsTrigger value="approvals">Team Approvals</TabsTrigger>
          <TabsTrigger value="my-timesheets">My Timesheets</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="space-y-6">
          <Card className="border-white/20 bg-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>Focus the approval queue by date range, department, or teammate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Timesheets</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time Period</Label>
                  <Select value={periodFilter} onValueChange={(value: any) => setPeriodFilter(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="quarter">This Quarter</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Search Employee</Label>
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {periodFilter === "custom" && (
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {showBulkActions && selectedIds.size > 0 && (
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-primary/80 to-blue-600/80 p-4 text-white shadow-lg shadow-primary/20 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <Checkbox checked onCheckedChange={() => setSelectedIds(new Set())} className="border-white/70" />
                <span className="text-sm font-medium tracking-wide">
                  {selectedIds.size} timesheet{selectedIds.size > 1 ? "s" : ""} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setSelectedIds(new Set())}>
                  Clear Selection
                </Button>
                <Button
                  variant="destructive"
                  className="bg-white/10 hover:bg-white/20"
                  onClick={() => setRejectDialog({ open: true, reason: "", sendEmail: true, timesheetId: null })}
                  disabled={processing}
                >
                  <X className="mr-2 h-4 w-4" /> Reject Selected
                </Button>
                <Button
                  variant="default"
                  className="bg-emerald-500 hover:bg-emerald-600"
                  onClick={handleBulkApprove}
                  disabled={processing}
                >
                  {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Approve Selected
                </Button>
              </div>
            </div>
          )}

          <Card className="border-white/20 bg-white/10 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-semibold">{statusLabel} Timesheets</CardTitle>
                  <CardDescription>
                    {statusFilter === "pending" && "Oldest submissions rise to the top so nothing is missed."}
                    {statusFilter === "approved" && "Most recently approved timesheets shown first."}
                    {statusFilter === "declined" && "Most recently declined timesheets shown first."}
                  </CardDescription>
                </div>
                {showBulkActions && (
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedIds.size === timesheets.length ? "Deselect All" : "Select All"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredTimesheets.length === 0 ? (
                <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/5 py-12 text-center text-muted-foreground">
                  {statusFilter === "approved" ? (
                    <CheckCircle className="h-12 w-12 opacity-40 text-emerald-400" />
                  ) : statusFilter === "declined" ? (
                    <X className="h-12 w-12 opacity-40 text-red-400" />
                  ) : (
                    <Users className="h-12 w-12 opacity-40" />
                  )}
                  <div>
                    <p className="font-medium">No {statusLabel.toLowerCase()} timesheets</p>
                    <p className="text-sm text-muted-foreground/80">
                      {statusFilter === "pending" && "You're all caught up for now."}
                      {statusFilter === "approved" && "No approved timesheets found with current filters."}
                      {statusFilter === "declined" && "No declined timesheets found with current filters."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTimesheets.map((timesheet) => (
                    <div
                      key={timesheet.id}
                      className={`flex flex-col gap-4 rounded-2xl border p-4 transition-all duration-300 md:flex-row md:items-center ${
                        fadingOutIds.has(timesheet.id)
                          ? "opacity-0 scale-95 border-emerald-500/50 bg-emerald-500/10"
                          : "opacity-100 scale-100 border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {showBulkActions && (
                          <Checkbox
                            checked={selectedIds.has(timesheet.id)}
                            onCheckedChange={() => handleToggleSelect(timesheet.id)}
                          />
                        )}
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={timesheet.employeeAvatar} />
                          <AvatarFallback>
                            {timesheet.employeeName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{timesheet.employeeName}</p>
                          <p className="text-sm text-muted-foreground">{timesheet.department}</p>
                        </div>
                      </div>

                      <div className="ml-auto flex w-full flex-col items-start gap-2 text-sm text-muted-foreground md:w-auto md:items-end">
                        <div className="font-medium text-foreground">
                          {format(new Date(timesheet.periodStart), "MMM d")} – {format(new Date(timesheet.periodEnd), "MMM d, yyyy")}
                        </div>
                        <div className="flex items-center gap-3">
                          <span>{(timesheet.totalHours || 0).toFixed(2)} hours</span>
                          {timesheet.estimatedCost != null && (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <DollarSign className="h-3 w-3" />
                              {timesheet.estimatedCost.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {timesheet.payType === 'HOURLY' && timesheet.hourlyRate && (
                            <Badge variant="outline" className="text-xs">
                              ${timesheet.hourlyRate}/hr
                            </Badge>
                          )}
                          {timesheet.payType === 'SALARY' && (
                            <Badge variant="outline" className="text-xs">
                              Salaried
                            </Badge>
                          )}
                          {timesheet.entries && timesheet.entries.length > 1 && (
                            <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400 border-blue-600/30 dark:border-blue-400/30">
                              {timesheet.entries.length} entries
                            </Badge>
                          )}
                          {!timesheet.submittedAt && (
                            <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400">
                              Draft
                            </Badge>
                          )}
                        </div>
                        {timesheet.approvedAt && (
                          <div className="text-xs text-emerald-400">
                            Approved {format(new Date(timesheet.approvedAt), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{timesheet.status}</Badge>
                        <Button variant="outline" size="sm" onClick={() => setPreviewSheet(timesheet)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {statusFilter === "approved" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewSheet(timesheet)}
                            title="Edit approved timesheet"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Show approve/decline buttons for any PENDING timesheet regardless of filter */}
                        {timesheet.status === "PENDING" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-500/50 text-red-500 hover:bg-red-500/10 min-w-[36px]"
                              onClick={() => openDeclineDialog(timesheet.id)}
                              disabled={decliningIds.has(timesheet.id) || fadingOutIds.has(timesheet.id)}
                              title="Decline timesheet"
                            >
                              {decliningIds.has(timesheet.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 min-w-[80px] font-medium"
                              onClick={() => handleIndividualApprove(timesheet.id)}
                              disabled={approvingIds.has(timesheet.id) || fadingOutIds.has(timesheet.id)}
                              title="Approve timesheet"
                            >
                              {approvingIds.has(timesheet.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : fadingOutIds.has(timesheet.id) ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Sheet open={!!previewSheet} onOpenChange={(open) => !open && setPreviewSheet(null)}>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Timesheet Details</SheetTitle>
                <SheetDescription>Review the summary before approving.</SheetDescription>
              </SheetHeader>
              {previewSheet && (
                <div className="mt-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={previewSheet.employeeAvatar} />
                      <AvatarFallback>
                        {previewSheet.employeeName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{previewSheet.employeeName}</p>
                      <p className="text-sm text-muted-foreground">{previewSheet.department}</p>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-2xl border border-muted/40 bg-muted/10 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Period</span>
                      <span className="font-medium text-foreground">
                        {format(new Date(previewSheet.periodStart), "MMM d")} – {format(new Date(previewSheet.periodEnd), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Hours</span>
                      <span className="font-medium text-foreground">{(previewSheet.totalHours || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium text-foreground">
                        {previewSheet.submittedAt ? 'Submitted' : 'Draft'}
                        {!previewSheet.submittedAt && (
                          <Badge variant="secondary" className="ml-2 text-xs bg-amber-500/20 text-amber-400">
                            Not Submitted
                          </Badge>
                        )}
                      </span>
                    </div>
                    {previewSheet.submittedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Submitted</span>
                        <span className="font-medium text-foreground">
                          {format(new Date(previewSheet.submittedAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                  </div>

                  {previewSheet.status === "DECLINED" && previewSheet.rejectedReason && (
                    <div className="space-y-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <X className="h-4 w-4 text-red-400" />
                        <span className="font-medium text-red-400">Decline Reason</span>
                      </div>
                      <p className="text-foreground">{previewSheet.rejectedReason}</p>
                    </div>
                  )}

                  {/* Cost Summary */}
                  <div className="space-y-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                      <span className="font-medium text-emerald-400">Cost Summary</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Pay Type</span>
                      <span className="font-medium text-foreground">
                        {previewSheet.payType === 'HOURLY' ? 'Hourly' : previewSheet.payType === 'SALARY' ? 'Salaried' : 'Not Set'}
                      </span>
                    </div>
                    {previewSheet.hourlyRate && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Hourly Rate</span>
                        <span className="font-medium text-foreground">${(previewSheet.hourlyRate || 0).toFixed(2)}/hr</span>
                      </div>
                    )}
                    {previewSheet.estimatedCost != null && (
                      <div className="flex items-center justify-between border-t border-emerald-500/20 pt-2 mt-2">
                        <span className="text-muted-foreground font-medium">Estimated Cost</span>
                        <span className="font-bold text-emerald-400 text-lg">${previewSheet.estimatedCost.toFixed(2)}</span>
                      </div>
                    )}
                    {previewSheet.estimatedCost == null && (
                      <div className="text-xs text-muted-foreground italic">
                        Set employee hourly rate or salary to calculate cost
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium">Timesheet Entries</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAuditTimesheetId(previewSheet.id);
                          setShowAuditTrail(true);
                        }}
                      >
                        <History className="mr-2 h-4 w-4" />
                        View Audit Trail
                      </Button>
                    </div>
                    <div className="max-h-[400px] space-y-2 overflow-y-auto">
                      {previewSheet.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {format(new Date(entry.date), "EEE, MMM d")}
                              </span>
                              {entry.entryType === "CLOCK" && (
                                <Badge variant="default" className="bg-blue-600 text-xs">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Clock
                                </Badge>
                              )}
                              {entry.entryType === "MANUAL" && (
                                <Badge variant="secondary" className="text-xs">
                                  Manual
                                </Badge>
                              )}
                              {entry.entryType === "ADJUSTED" && (
                                <Badge variant="outline" className="border-orange-500 text-orange-500 text-xs">
                                  <Info className="mr-1 h-3 w-3" />
                                  Adjusted
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={entry.isOvertime ? "destructive" : "secondary"} className="text-xs">
                                {(entry.hours || 0).toFixed(2)}h
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setEditingEntry(entry)}
                                title="Edit entry"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center justify-between">
                              <span>Start:</span>
                              <span>{format(new Date(entry.startTime), "h:mm a")}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>End:</span>
                              <span>{format(new Date(entry.endTime), "h:mm a")}</span>
                            </div>
                            {entry.breakMinutes > 0 && (
                              <div className="flex items-center justify-between">
                                <span>Break:</span>
                                <span>{entry.breakMinutes} min</span>
                              </div>
                            )}
                            {entry.isOvertime && (
                              <div className="mt-1 text-xs text-orange-400">
                                Overtime
                              </div>
                            )}
                            {/* Shift Information */}
                            {entry.shift && (
                              <div className="mt-2 pt-2 border-t border-white/10">
                                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
                                  <Link2 className="h-3 w-3" />
                                  <span className="font-medium">Linked Shift</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Scheduled:</span>
                                  <span>
                                    {format(new Date(entry.shift.startTime), "h:mm a")} - {format(new Date(entry.shift.endTime), "h:mm a")}
                                  </span>
                                </div>
                                {entry.shift.role && (
                                  <div className="flex items-center justify-between">
                                    <span>Role:</span>
                                    <span>{entry.shift.role}</span>
                                  </div>
                                )}
                                {entry.varianceMinutes != null && entry.varianceMinutes !== 0 && (
                                  <div className="flex items-center justify-between">
                                    <span>Variance:</span>
                                    <span className={entry.varianceMinutes > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                                      {entry.varianceMinutes > 0 ? '+' : ''}{entry.varianceMinutes} min
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            {entry.notes && (
                              <div className="mt-2 rounded border border-white/5 bg-white/5 p-2">
                                {entry.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {previewSheet.notes && (
                    <div>
                      <p className="text-sm font-medium">Notes</p>
                      <p className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-muted-foreground">
                        {previewSheet.notes}
                      </p>
                    </div>
                  )}

                  {previewSheet.status === "PENDING" && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1 border-red-500/50 text-red-500 hover:bg-red-500/10"
                        onClick={() => openDeclineDialog(previewSheet.id)}
                        disabled={decliningIds.has(previewSheet.id)}
                      >
                        {decliningIds.has(previewSheet.id) ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <X className="mr-2 h-4 w-4" />
                        )}
                        Decline
                      </Button>
                      <Button
                        variant="default"
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                        onClick={() => handleIndividualApprove(previewSheet.id)}
                        disabled={approvingIds.has(previewSheet.id)}
                      >
                        {approvingIds.has(previewSheet.id) ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </SheetContent>
          </Sheet>

          <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {rejectDialog.timesheetId ? "Decline Timesheet" : "Reject Timesheets"}
                </DialogTitle>
                <DialogDescription>
                  {rejectDialog.timesheetId
                    ? "Provide a reason for declining this timesheet. The employee will need to review and resubmit."
                    : `Provide context for rejecting ${selectedIds.size} timesheet${selectedIds.size === 1 ? "" : "s"}.`
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="decline-reason">Reason for decline *</Label>
                  <Textarea
                    id="decline-reason"
                    placeholder="Enter reason for declining..."
                    value={rejectDialog.reason}
                    onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-email"
                    checked={rejectDialog.sendEmail}
                    onCheckedChange={(checked) => setRejectDialog({ ...rejectDialog, sendEmail: checked === true })}
                  />
                  <Label htmlFor="send-email" className="text-sm font-normal cursor-pointer">
                    Send email notification to employee with decline reason
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectDialog({ open: false, reason: "", sendEmail: true, timesheetId: null })}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={rejectDialog.timesheetId ? handleIndividualDecline : handleBulkReject}
                  disabled={!rejectDialog.reason.trim() || processing || (rejectDialog.timesheetId ? decliningIds.has(rejectDialog.timesheetId) : false)}
                >
                  {(processing || (rejectDialog.timesheetId && decliningIds.has(rejectDialog.timesheetId))) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <X className="mr-2 h-4 w-4" />
                  )}
                  {rejectDialog.timesheetId ? "Decline" : "Reject"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="my-timesheets" className="space-y-6">
          <MyTimesheetsPanel variant="embedded" />
        </TabsContent>
      </Tabs>

      {/* Edit Entry Dialog */}
      <EditTimesheetEntryDialog
        entry={editingEntry}
        open={!!editingEntry}
        onOpenChange={(open) => !open && setEditingEntry(null)}
        onSuccess={() => {
          fetchData();
          if (previewSheet) {
            // Refresh preview sheet data
            const updatedSheet = timesheets.find(t => t.id === previewSheet.id);
            if (updatedSheet) setPreviewSheet(updatedSheet);
          }
        }}
      />

      {/* Audit Trail Sheet */}
      <TimesheetAuditTrail
        timesheetId={auditTimesheetId}
        open={showAuditTrail}
        onOpenChange={setShowAuditTrail}
      />
    </div>
    </FeatureGuardedPage>
  );
}
