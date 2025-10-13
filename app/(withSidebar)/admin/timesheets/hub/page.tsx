"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Eye, Filter, Users, Clock, Calendar as CalendarIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";

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
  notes?: string;
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
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewSheet, setPreviewSheet] = useState<Timesheet | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; reason: string }>({
    open: false,
    reason: "",
  });
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  // Statistics
  const totalPending = timesheets.length;
  const totalHours = timesheets.reduce((sum, t) => sum + t.totalHours, 0);
  const avgHours = totalPending > 0 ? totalHours / totalPending : 0;
  const oldestSubmission = timesheets.length > 0 ? timesheets[0].submittedAt : null;

  useEffect(() => {
    fetchData();
  }, [departmentFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [timesheetsRes, deptsRes] = await Promise.all([
        fetch(
          `/api/timesheets/pending?${departmentFilter ? `departmentId=${departmentFilter}` : ""}`
        ),
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
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Timesheet Approval Hub
        </h1>
        <p className="text-muted-foreground">Review and approve employee timesheets</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <p className="text-2xl font-bold">{totalPending}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Hours/Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-500" />
              <p className="text-2xl font-bold">{avgHours.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Oldest Submission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-amber-500" />
              <p className="text-sm font-bold">
                {oldestSubmission ? format(new Date(oldestSubmission), "MMM d") : "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="backdrop-blur-md bg-white/10 border-white/20 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Departments</SelectItem>
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
        </CardContent>
      </Card>

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <Checkbox checked={true} onCheckedChange={() => setSelectedIds(new Set())} />
            <span className="font-medium">{selectedIds.size} selected</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSelectedIds(new Set())}>
              Clear Selection
            </Button>
            <Button
              variant="destructive"
              onClick={() => setRejectDialog({ open: true, reason: "" })}
              disabled={processing}
            >
              <X className="w-4 h-4 mr-2" />
              Reject Selected
            </Button>
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleBulkApprove}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Approve Selected
            </Button>
          </div>
        </div>
      )}

      {/* Timesheet Table */}
      <Card className="backdrop-blur-md bg-white/10 border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pending Timesheets</CardTitle>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedIds.size === filteredTimesheets.length ? "Deselect All" : "Select All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTimesheets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pending timesheets</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTimesheets.map((timesheet) => (
                <div
                  key={timesheet.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.has(timesheet.id)}
                    onCheckedChange={() => handleToggleSelect(timesheet.id)}
                  />

                  <Avatar className="w-10 h-10">
                    <AvatarImage src={timesheet.employeeAvatar} />
                    <AvatarFallback>
                      {timesheet.employeeName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <p className="font-medium">{timesheet.employeeName}</p>
                    <p className="text-sm text-muted-foreground">{timesheet.department}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(new Date(timesheet.periodStart), "MMM d")} -{" "}
                      {format(new Date(timesheet.periodEnd), "MMM d, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {timesheet.totalHours.toFixed(2)} hours
                    </p>
                  </div>

                  <Badge variant="secondary">{timesheet.status}</Badge>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewSheet(timesheet)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleIndividualApprove(timesheet.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Sheet */}
      <Sheet open={!!previewSheet} onOpenChange={(open) => !open && setPreviewSheet(null)}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Timesheet Details</SheetTitle>
            <SheetDescription>Review timesheet before approving</SheetDescription>
          </SheetHeader>
          {previewSheet && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
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

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period:</span>
                  <span className="font-medium">
                    {format(new Date(previewSheet.periodStart), "MMM d")} -{" "}
                    {format(new Date(previewSheet.periodEnd), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Hours:</span>
                  <span className="font-medium">{previewSheet.totalHours.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted:</span>
                  <span className="font-medium">
                    {format(new Date(previewSheet.submittedAt), "MMM d, yyyy")}
                  </span>
                </div>
              </div>

              {previewSheet.notes && (
                <div>
                  <p className="text-sm font-medium mb-2">Notes:</p>
                  <p className="text-sm text-muted-foreground p-3 bg-white/5 rounded-lg">
                    {previewSheet.notes}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="default"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleIndividualApprove(previewSheet.id)}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timesheets</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedIds.size} timesheet(s)
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
              {processing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
