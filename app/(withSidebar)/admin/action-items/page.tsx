"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ActionItemCategoryModal } from "@/components/admin/ActionItemCategoryModal";
import { TimesheetApprovalModal } from "@/components/approvals/TimesheetApprovalModal";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Search,
  RefreshCw,
  Calendar,
  Users,
  FileText,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getIconConfigFromType } from "@/lib/action-item-icons";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ActionItemStats {
  totalPending: number;
  totalOverdue: number;
  dueToday: number;
  dueThisWeek: number;
  byType: Record<string, number>;
  byDepartment: Record<string, number>;
  completionRate: number;
}

interface ActionItemWithDetails {
  id: string;
  type: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
  relatedEmployee?: {
    id: string;
    name: string;
    department?: string;
  };
  metadata?: any;
  isOverdue: boolean;
  daysOverdue?: number;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  PERFORMANCE_SELF_REVIEW: "Self Review",
  PERFORMANCE_MANAGER_REVIEW: "Manager Review",
  PERFORMANCE_PEER_REVIEW: "Peer Review",
  PERFORMANCE_360_REVIEW: "360° Review",
  LEAVE_APPROVAL: "Leave Approval",
  LEAVE_HR_APPROVAL: "HR Leave Approval",
  DOCUMENT_UPLOAD_REQUEST: "Document Upload",
  DOCUMENT_ACKNOWLEDGEMENT: "Document Acknowledgement",
  DOCUMENT_SIGNATURE: "Document Signature",
  SURVEY: "Survey",
  SURVEY_COMPLETION: "Survey Completion",
  ONBOARDING_TASK: "Onboarding Task",
  OFFBOARDING_TASK: "Offboarding Task",
  EXIT_INTERVIEW: "Exit Interview",
  EXIT_INTERVIEW_FORM: "Exit Interview Form",
  MEETING_PREPARATION: "Meeting Prep",
  MEETING_ACTION_ITEM: "Meeting Follow-up",
  BULK_UPDATE_APPROVAL: "Bulk Update Approval",
  FORM_COMPLETION: "Form Completion",
  TIMESHEET_APPROVAL: "Timesheet Approval",
  TASK: "Task",
};

const PRIORITY_COLORS = {
  HIGH: "bg-red-100 text-red-800 border-red-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW: "bg-blue-100 text-blue-800 border-blue-200",
};

export default function AdminActionItemsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("PENDING");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [categoryModal, setCategoryModal] = useState<"pending" | "overdue" | "dueToday" | "dueThisWeek" | null>(null);
  const [timesheetApprovalId, setTimesheetApprovalId] = useState<string | null>(null);
  const [timesheetActionItemId, setTimesheetActionItemId] = useState<string | null>(null);

  // Fetch stats
  const { data: statsData, error: statsError } = useSWR(
    "/api/admin/action-items/stats",
    fetcher,
    { refreshInterval: 30000 }
  );

  // Fetch action items
  const { data: itemsData, error: itemsError, mutate } = useSWR(
    `/api/admin/action-items?status=${filterStatus}&type=${filterType}&priority=${filterPriority}&search=${searchQuery}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  // Redirect if not admin (after hooks)
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    router.push("/dashboard");
    return null;
  }

  const stats: ActionItemStats | undefined = statsData?.data;
  const items: ActionItemWithDetails[] = itemsData?.data || [];

  const isLoading = !statsData && !statsError;

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/action-items/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `action-items-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Action items exported");
    } catch (error) {
      toast.error("Failed to export");
    }
  };

  useEffect(() => {
    setSelectedItems([]);
  }, [filterType, filterStatus, filterPriority, searchQuery]);

  const handleItemSelection = (itemId: string, checked: boolean) => {
    setSelectedItems((prev) => {
      if (checked) {
        if (prev.includes(itemId)) return prev;
        return [...prev, itemId];
      }
      return prev.filter((id) => id !== itemId);
    });
  };

  const clearSelection = () => setSelectedItems([]);

  const handleDeleteSelected = async () => {
    const pendingIds = items
      .filter((item) => selectedItems.includes(item.id) && item.status === "PENDING")
      .map((item) => item.id);

    if (pendingIds.length === 0) {
      toast.info("Only pending action items can be deleted.");
      return;
    }

    await handleBulkAction("delete", pendingIds);
    setSelectedItems((prev) => prev.filter((id) => !pendingIds.includes(id)));
  };

  const handleBulkAction = async (action: "remind" | "cancel" | "delete", itemIds: string[]) => {
    try {
      await fetch("/api/admin/action-items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, itemIds }),
      });
      const successMessage =
        action === "remind"
          ? "Reminders sent"
          : action === "cancel"
          ? "Items cancelled"
          : "Items deleted";
      toast.success(successMessage);
      mutate();
    } catch (error) {
      toast.error("Failed to perform action");
    }
  };

  const handleView = (item: ActionItemWithDetails) => {
    const type = item.type || "";
    const metadata = (item.metadata || {}) as Record<string, any>;

    if (type === "TIMESHEET_APPROVAL") {
      const timesheetId = metadata?.timesheetId;
      if (timesheetId) {
        setTimesheetApprovalId(timesheetId);
        setTimesheetActionItemId(item.id);
      } else {
        toast.error("Timesheet data not available");
      }
      return;
    }

    if (type.includes("PERFORMANCE")) {
      router.push(`/performance?actionItemId=${item.id}`);
      return;
    }

    if (type.includes("LEAVE")) {
      router.push(`/calendar?actionItemId=${item.id}`);
      return;
    }

    if (type === "SURVEY" || type === "SURVEY_COMPLETION") {
      const surveyId = metadata?.surveyId || metadata?.SurveyId;
      if (surveyId) {
        router.push(`/surveys/complete/${surveyId}?actionItemId=${item.id}`);
      } else {
        router.push(`/surveys`);
      }
      return;
    }

    if (type.includes("DOCUMENT")) {
      const documentId = metadata?.documentId;
      if (documentId) {
        router.push(`/documents?open=${documentId}`);
      } else {
        router.push(`/documents`);
      }
      return;
    }

    if (type.includes("ONBOARDING")) {
      router.push(`/onboarding`);
      return;
    }

    if (type.includes("OFFBOARDING")) {
      router.push(`/offboarding`);
      return;
    }

    if (type.includes("MEETING")) {
      router.push(`/performance/meetings?actionItemId=${item.id}`);
      return;
    }

    const urlLike = metadata?.url || metadata?.link || metadata?.path;
    if (typeof urlLike === "string" && urlLike.length) {
      if (/^https?:\/\//i.test(urlLike)) {
        window.open(urlLike, "_blank", "noopener,noreferrer");
      } else {
        router.push(urlLike);
      }
      return;
    }

    toast.info("No view destination configured for this action item yet.");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" showText text="Loading action items..." />
      </div>
    );
  }

  const breadcrumbs = {
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Action Items", isCurrentPage: true },
    ],
  };

  return (
    <PageShell
      title="Action Items Hub"
      description="Global overview of all outstanding people tasks across your organisation"
      breadcrumbs={breadcrumbs}
      action={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      }
      className="bg-transparent"
    >
      <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
          onClick={() => setCategoryModal("pending")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPending || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Action items awaiting completion
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-red-200 bg-red-50 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
          onClick={() => setCategoryModal("overdue")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-900">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{stats?.totalOverdue || 0}</div>
            <p className="text-xs text-red-700 mt-1">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-orange-200 bg-orange-50 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
          onClick={() => setCategoryModal("dueToday")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">Due Today</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{stats?.dueToday || 0}</div>
            <p className="text-xs text-orange-700 mt-1">
              Items due by end of day
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-blue-200 bg-blue-50 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
          onClick={() => setCategoryModal("dueThisWeek")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats?.dueThisWeek || 0}</div>
            <p className="text-xs text-blue-700 mt-1">
              Items due within 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Modal */}
      <ActionItemCategoryModal
        open={categoryModal !== null}
        onOpenChange={(open) => !open && setCategoryModal(null)}
        category={categoryModal}
        onRefresh={() => {
          mutate();
        }}
      />

      {/* Timesheet Approval Modal */}
      <TimesheetApprovalModal
        timesheetId={timesheetApprovalId}
        open={!!timesheetApprovalId}
        onOpenChange={(open) => {
          if (!open) {
            setTimesheetApprovalId(null);
            setTimesheetActionItemId(null);
          }
        }}
        onApprove={async () => {
          if (!timesheetApprovalId) return;
          try {
            const res = await fetch(`/api/timesheets/${timesheetApprovalId}/approve`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({})
            });
            const result = await res.json();
            if (result.success) {
              toast.success("Timesheet approved");
              mutate();
            } else {
              toast.error(result.error || "Failed to approve timesheet");
            }
          } catch (error) {
            toast.error("Failed to approve timesheet");
          } finally {
            setTimesheetApprovalId(null);
            setTimesheetActionItemId(null);
          }
        }}
        onDecline={async () => {
          if (!timesheetApprovalId) return;
          const reason = prompt("Please provide a reason for rejecting this timesheet:");
          if (!reason || reason.trim() === "") return;

          try {
            const res = await fetch(`/api/timesheets/${timesheetApprovalId}/reject`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason })
            });
            const result = await res.json();
            if (result.success) {
              toast.success("Timesheet rejected");
              mutate();
            } else {
              toast.error(result.error || "Failed to reject timesheet");
            }
          } catch (error) {
            toast.error("Failed to reject timesheet");
          } finally {
            setTimesheetApprovalId(null);
            setTimesheetActionItemId(null);
          }
        }}
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">All Types</option>
              <option value="PERFORMANCE">Performance Reviews</option>
              <option value="LEAVE">Leave Requests</option>
              <option value="TIMESHEET">Timesheets</option>
              <option value="SURVEY">Surveys</option>
              <option value="DOCUMENT">Documents</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="OFFBOARDING">Offboarding</option>
              <option value="MEETING">Meetings</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Action Items Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Action Items</CardTitle>
              <CardDescription>
                {items.length} items found
              </CardDescription>
            </div>
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.length} selected
                </span>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500/50 mb-3" />
              <p className="text-sm font-medium">No action items found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const iconConfig = getIconConfigFromType(item.type);
                const ItemIcon = iconConfig.icon;
                
                return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    item.isOverdue
                      ? "border-red-200 bg-red-50"
                      : "border-border bg-background hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Action item type icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${iconConfig.bgColor} flex items-center justify-center relative`}>
                      <ItemIcon className={`w-5 h-5 ${iconConfig.iconColor}`} />
                      {item.isOverdue && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className="text-xs flex-shrink-0"
                        >
                          {ACTION_TYPE_LABELS[item.type] || item.type}
                        </Badge>
                        <Badge
                          className={`text-xs flex-shrink-0 ${PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS] || ""}`}
                        >
                          {item.priority}
                        </Badge>
                        {item.isOverdue && (
                          <span className="text-xs text-red-600 font-medium">
                            {item.daysOverdue} days overdue
                          </span>
                        )}
                      </div>
                      
                      <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {item.assignedTo && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{item.assignedTo.name}</span>
                            {item.assignedTo.department && (
                              <span className="text-muted-foreground/70">
                                ({item.assignedTo.department})
                              </span>
                            )}
                          </div>
                        )}
                        {item.relatedEmployee && (
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>For: {item.relatedEmployee.name}</span>
                          </div>
                        )}
                        {item.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        aria-label="Select action item"
                        disabled={item.status !== "PENDING"}
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(value) => handleItemSelection(item.id, !!value)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(item)}
                      >
                        View
                      </Button>
                      {item.isOverdue && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBulkAction("remind", [item.id])}
                        >
                          Send Reminder
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Breakdown */}
      {stats?.byDepartment && Object.keys(stats.byDepartment).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Department Breakdown</CardTitle>
            <CardDescription>Pending action items by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byDepartment).map(([dept, count]) => (
                <div key={dept} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{dept || "Unassigned"}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </PageShell>
  );
}
