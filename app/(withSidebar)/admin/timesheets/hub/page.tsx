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
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; reason: string }>({
    open: false,
    reason: "",
  });
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"approvals" | "my-timesheets">("approvals");
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditTimesheetId, setAuditTimesheetId] = useState<string | null>(null);
  const { toast } = useToast();

  // Statistics
  const totalCount = timesheets.length;
  const totalHours = timesheets.reduce((sum, t) => sum + t.totalHours, 0);
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
    if (selectedIds.size === filteredTimesheets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTimesheets.map((t) => t.id)));
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
        }),
      });

      if (!response.ok) throw new Error("Failed to reject timesheets");

      const data = await response.json();

      toast({
        title: "Rejection Complete",
        description: `Rejected ${data.summary.succeeded} of ${data.summary.total} timesheets`,
      });

      setSelectedIds(new Set());
      setRejectDialog({ open: false, reason: "" });
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

  const handleIndividualApprove = async (timesheetId: string) => {
    try {
      const response = await fetch("/api/timesheets/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timesheetIds: [timesheetId],
        }),
      });

      if (!response.ok) throw new Error("Failed to approve timesheet");

      toast({
        title: "Success",
        description: "Timesheet approved",
      });

      fetchData();
      setPreviewSheet(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve timesheet",
        variant: "destructive",
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
    <div className="container mx-auto max-w-7xl space-y-8 p-6">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/60 via-blue-500/50 to-blue-700/60 p-8 shadow-2xl backdrop-blur">
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
                <Clock className="h-5 w-5 text-purple-300" />
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
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-blue-600/80 to-purple-600/80 p-4 text-white shadow-lg shadow-blue-500/20 lg:flex-row lg:items-center lg:justify-between">
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
                  onClick={() => setRejectDialog({ open: true, reason: "" })}
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
                    {selectedIds.size === filteredTimesheets.length ? "Deselect All" : "Select All"}
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
                      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/10 md:flex-row md:items-center"
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
                          <span>{timesheet.totalHours.toFixed(2)} hours</span>
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
                        {statusFilter === "approved" ? (
                          <Badge variant="default" className="bg-emerald-500">Approved</Badge>
                        ) : statusFilter === "declined" ? (
                          <Badge variant="destructive">Declined</Badge>
                        ) : (
                          <Badge variant="secondary">{timesheet.status}</Badge>
                        )}
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
                        {showBulkActions && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600"
                            onClick={() => handleIndividualApprove(timesheet.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
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
                      <span className="font-medium text-foreground">{previewSheet.totalHours.toFixed(2)}</span>
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
                        <span className="font-medium text-foreground">${previewSheet.hourlyRate.toFixed(2)}/hr</span>
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
                                <Badge variant="default" className="bg-blue-500 text-xs">
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
                                {parseFloat(entry.hours.toString()).toFixed(2)}h
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
                                <div className="flex items-center gap-1 text-blue-400 mb-1">
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

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="default"
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                      onClick={() => handleIndividualApprove(previewSheet.id)}
                    >
                      <Check className="mr-2 h-4 w-4" /> Approve
                    </Button>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>

          <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Timesheets</DialogTitle>
                <DialogDescription>
                  Provide context for rejecting {selectedIds.size} timesheet{selectedIds.size === 1 ? "" : "s"}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Textarea
                  placeholder="Enter rejection reason..."
                  value={rejectDialog.reason}
                  onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
                  rows={4}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectDialog({ open: false, reason: "" })}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkReject}
                  disabled={!rejectDialog.reason.trim() || processing}
                >
                  {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                  Reject
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
  );
}
