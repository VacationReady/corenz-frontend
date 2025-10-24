"use client";

import React, { useEffect, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  FileText,
  User,
  Shield,
  Settings,
  Zap,
  Bell,
  Palette,
  Key,
  Eye,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { labelForField, formatAuditValue } from "@/lib/audit-field-labels";

interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorType: string;
  changes?: any;
  metadata?: any;
  timestamp: string;
  actor?: {
    id: string;
    name?: string;
    email: string;
  };
  employee?: {
    id: string;
    User?: {
      id: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      email: string;
    };
  } | null;
}

interface FilterState {
  entityType: string;
  action: string;
  actorId: string;
  employeeId: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  search: string;
}

const entityTypeOptions = [
  { value: "all", label: "All Entity Types" },
  { value: "LEAVE_POLICY", label: "Leave Policies" },
  { value: "PERMISSION_PROFILE", label: "Permission Profiles" },
  { value: "EVENT_RULE", label: "Event Rules" },
  { value: "DOCUMENT_TYPE", label: "Document Types" },
  { value: "AUTOMATION_RULE", label: "Automation Rules" },
  { value: "NOTIFICATION_CHANNEL", label: "Notification Channels" },
  { value: "SSO_CONFIG", label: "SSO Configuration" },
  { value: "SCIM_CONFIG", label: "SCIM Configuration" },
  { value: "BRANDING_CONFIG", label: "Branding Configuration" },
  { value: "EMPLOYEE", label: "Employee Records" },
  { value: "EMERGENCY_CONTACT", label: "Emergency Contacts" },
  { value: "EMPLOYMENT_CHECK", label: "Employment Checks" },
  { value: "DRIVER_LICENSE", label: "Driver Licenses" },
  { value: "TRAINING_RECORD", label: "Training Records" },
];

const actionOptions = [
  { value: "all", label: "All Actions" },
  { value: "CREATED", label: "Created" },
  { value: "UPDATED", label: "Updated" },
  { value: "DELETED", label: "Deleted" },
  { value: "ACTIVATED", label: "Activated" },
  { value: "DEACTIVATED", label: "Deactivated" },
];

type NormalizedChange = {
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getFirstDefined<T>(
  obj: Record<string, unknown>,
  keys: string[],
): T | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null) {
      return value as T;
    }
  }
  return undefined;
}

function mapChange(change: Record<string, unknown>): NormalizedChange {
  const field = getFirstDefined<string>(change, ["field", "attribute", "name"]);
  const oldValue = getFirstDefined<unknown>(change, [
    "oldValue",
    "previousValue",
    "old",
    "from",
    "before",
  ]);
  const newValue = getFirstDefined<unknown>(change, [
    "newValue",
    "currentValue",
    "new",
    "to",
    "after",
  ]);
  const reason = getFirstDefined<string>(change, ["reason", "note", "description"]);

  return {
    ...(field ? { field } : {}),
    ...(oldValue !== undefined ? { oldValue } : {}),
    ...(newValue !== undefined ? { newValue } : {}),
    ...(reason ? { reason } : {}),
  };
}

function normalizeAuditChanges(changes: unknown): NormalizedChange[] {
  if (!changes) return [];

  if (Array.isArray(changes)) {
    return changes
      .map((item) => {
        if (isRecord(item)) {
          return mapChange(item);
        }
        return item !== undefined
          ? ({ newValue: item } as NormalizedChange)
          : ({} as NormalizedChange);
      })
      .filter((change) => Object.keys(change).length > 0);
  }

  if (isRecord(changes)) {
    const singular = mapChange(changes);
    if (Object.keys(singular).length > 0) {
      return [singular];
    }

    return Object.entries(changes).map(([fieldKey, value]) => {
      if (isRecord(value)) {
        const normalized = mapChange(value);
        const field = normalized.field ?? fieldKey;
        return {
          field,
          ...(normalized.oldValue !== undefined ? { oldValue: normalized.oldValue } : {}),
          ...(normalized.newValue !== undefined ? { newValue: normalized.newValue } : {}),
          ...(normalized.reason ? { reason: normalized.reason } : {}),
        };
      }

      return {
        field: fieldKey,
        ...(value !== undefined ? { newValue: value } : {}),
      };
    });
  }

  return [];
}

function formatAuditValueOrEmpty(value: unknown): string {
  if (value === null || value === undefined) {
    return formatAuditValue("");
  }

  if (typeof value === "string") {
    return formatAuditValue(value);
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return formatAuditValue(String(value));
    }
  }

  return formatAuditValue(String(value));
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  const [filters, setFilters] = useState<FilterState>({
    entityType: "all",
    action: "all",
    actorId: "all",
    employeeId: "all",
    dateFrom: null,
    dateTo: null,
    search: "",
  });

  useEffect(() => {
    fetchLogs();
    fetchUsers();
    fetchEmployees();
  }, [currentPage, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") {
          if (key === "dateFrom" || key === "dateTo") {
            params.append(key, (value as Date).toISOString());
          } else {
            params.append(key, value as string);
          }
        }
      });

      const response = await fetch(`/api/audit-logs?${params}`);

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      } else {
        throw new Error("Failed to fetch audit logs");
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users?limit=1000");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees?limit=1000&include=user");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const resetFilters = () => {
    setFilters({
      entityType: "all",
      action: "all",
      actorId: "all",
      employeeId: "all",
      dateFrom: null,
      dateTo: null,
      search: "",
    });
    setCurrentPage(1);
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams();

      // Add current filters to export
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") {
          if (key === "dateFrom" || key === "dateTo") {
            params.append(key, (value as Date).toISOString());
          } else {
            params.append(key, value as string);
          }
        }
      });

      const response = await fetch(`/api/audit-logs/export?${params}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Success",
          description: "Audit logs exported successfully",
        });
      } else {
        throw new Error("Failed to export audit logs");
      }
    } catch (error) {
      console.error("Error exporting audit logs:", error);
      toast({
        title: "Error",
        description: "Failed to export audit logs",
        variant: "destructive",
      });
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "LEAVE_POLICY":
        return <Calendar className="w-4 h-4" />;
      case "PERMISSION_PROFILE":
        return <Shield className="w-4 h-4" />;
      case "EVENT_RULE":
        return <Settings className="w-4 h-4" />;
      case "DOCUMENT_TYPE":
        return <FileText className="w-4 h-4" />;
      case "AUTOMATION_RULE":
        return <Zap className="w-4 h-4" />;
      case "NOTIFICATION_CHANNEL":
        return <Bell className="w-4 h-4" />;
      case "SSO_CONFIG":
      case "SCIM_CONFIG":
        return <Key className="w-4 h-4" />;
      case "BRANDING_CONFIG":
        return <Palette className="w-4 h-4" />;
      case "EMPLOYEE":
      case "EMERGENCY_CONTACT":
      case "EMPLOYMENT_CHECK":
      case "DRIVER_LICENSE":
      case "TRAINING_RECORD":
        return <User className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATED":
        return <Badge className="bg-green-100 text-green-800">Created</Badge>;
      case "UPDATED":
        return <Badge className="bg-blue-100 text-blue-800">Updated</Badge>;
      case "DELETED":
        return <Badge className="bg-red-100 text-red-800">Deleted</Badge>;
      case "ACTIVATED":
        return (
          <Badge className="bg-emerald-100 text-emerald-800">Activated</Badge>
        );
      case "DEACTIVATED":
        return (
          <Badge className="bg-orange-100 text-orange-800">Deactivated</Badge>
        );
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const openDetailsDialog = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setDetailsDialogOpen(true);
  };

  const formatEntityType = (entityType: string) => {
    return (
      entityTypeOptions.find((opt) => opt.value === entityType)?.label ||
      entityType
    );
  };

  const getEmployeeName = (log: AuditLogEntry) => {
    // Use employee data from API response if available
    if (log.employee?.User) {
      // Try to construct name from firstName and lastName first
      const fullName = `${log.employee.User.firstName || ""} ${log.employee.User.lastName || ""}`.trim();
      if (fullName) {
        return fullName;
      }
      // Fallback to name field if firstName/lastName not available
      if (log.employee.User.name) {
        return log.employee.User.name;
      }
      // Last resort: use email
      return log.employee.User.email || log.entityId;
    }
    
    // Fallback to local employees list for backward compatibility
    const employee = employees.find((e) => e.id === log.entityId);
    if (employee?.User) {
      // Try to construct name from firstName and lastName first
      const fullName = `${employee.User.firstName || ""} ${employee.User.lastName || ""}`.trim();
      if (fullName) {
        return fullName;
      }
      // Fallback to name field if firstName/lastName not available
      if (employee.User.name) {
        return employee.User.name;
      }
      // Last resort: use email
      return employee.User.email || log.entityId;
    }
    
    return log.entityId;
  };

  const normalizedSelectedLogChanges = selectedLog
    ? normalizeAuditChanges(selectedLog.changes)
    : [];

  const meaningfulChanges = normalizedSelectedLogChanges.filter((change) => {
    const hasOldValue = change.oldValue !== undefined && change.oldValue !== null;
    const hasNewValue = change.newValue !== undefined && change.newValue !== null;
    const hasReason = typeof change.reason === "string" && change.reason.trim() !== "";
    return hasOldValue || hasNewValue || hasReason;
  });

  const hasStructuredSelectedLogChanges = meaningfulChanges.length > 0;

  return (
    <PageShell
      title="Global Audit Log"
      description="Track all changes to system configuration and settings"
      breadcrumbs={breadcrumbConfigs.settingsSection("System Audit Log")}
      showHomeIcon={false}
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={fetchLogs}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
            <CardDescription>
              Filter audit log entries by entity type, action, user, and date
              range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <Label>Entity Type</Label>
                <Select
                  value={filters.entityType}
                  onValueChange={(value) =>
                    setFilters({ ...filters, entityType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {entityTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Action</Label>
                <Select
                  value={filters.action}
                  onValueChange={(value) =>
                    setFilters({ ...filters, action: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {actionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>User</Label>
                <Select
                  value={filters.actorId}
                  onValueChange={(value) =>
                    setFilters({ ...filters, actorId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Employee</Label>
                <Select
                  value={filters.employeeId}
                  onValueChange={(value) =>
                    setFilters({ ...filters, employeeId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.User?.name || employee.User?.email || employee.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom
                        ? format(filters.dateFrom, "PPP")
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom ?? undefined}
                      onSelect={(date) =>
                        setFilters({ ...filters, dateFrom: date || null })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Date To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo
                        ? format(filters.dateTo, "PPP")
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo ?? undefined}
                      onSelect={(date) =>
                        setFilters({ ...filters, dateTo: date || null })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4">
              <div className="flex-1">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search entity IDs, actor names, or changes..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={resetFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
            entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Audit Log Entries */}
        <div className="space-y-2">
          {loading ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  Loading audit logs...
                </div>
              </CardContent>
            </Card>
          ) : logs.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No audit logs found
                  </h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or check back later
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getEntityIcon(log.entityType)}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {formatEntityType(log.entityType)}
                          </span>
                          {getActionBadge(log.action)}
                          {(log.entityType === "EMPLOYEE" || log.metadata?.employeeId) && (
                            <span className="text-sm font-medium text-blue-600">
                              → {getEmployeeName(log)}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          by {log.actor?.name || log.actor?.email || "System"} •{" "}
                          {format(new Date(log.timestamp), "PPp")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetailsDialog(log)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <span className="px-4 py-2 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedLog && getEntityIcon(selectedLog.entityType)}
                Audit Log Details
              </DialogTitle>
              <DialogDescription>
                Detailed information about this audit log entry
              </DialogDescription>
            </DialogHeader>

            {selectedLog && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Entity Type</Label>
                    <div className="text-sm">
                      {formatEntityType(selectedLog.entityType)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Action</Label>
                    <div>{getActionBadge(selectedLog.action)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Actor</Label>
                    <div className="text-sm">
                      {selectedLog.actor?.name ||
                        selectedLog.actor?.email ||
                        "System"}
                      <span className="text-muted-foreground ml-2">
                        ({selectedLog.actorType})
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Timestamp</Label>
                    <div className="text-sm">
                      {format(new Date(selectedLog.timestamp), "PPpp")}
                    </div>
                  </div>
                  {(selectedLog.entityType === "EMPLOYEE" || selectedLog.metadata?.employeeId) && (
                    <div className="col-span-2">
                      <Label className="text-sm font-medium">Employee</Label>
                      <div className="text-sm font-medium text-blue-600 bg-blue-50 p-2 rounded">
                        {getEmployeeName(selectedLog)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ID: {selectedLog.metadata?.employeeId || selectedLog.entityId}
                      </div>
                    </div>
                  )}
                  {selectedLog.entityType !== "EMPLOYEE" && !selectedLog.metadata?.employeeId && (
                    <div className="col-span-2">
                      <Label className="text-sm font-medium">Entity ID</Label>
                      <div className="text-sm font-mono bg-muted p-2 rounded">
                        {selectedLog.entityId}
                      </div>
                    </div>
                  )}
                </div>

                {selectedLog.changes && (
                  hasStructuredSelectedLogChanges ? (
                    <div>
                      <Label className="text-sm font-medium">Changes</Label>
                      <div className="space-y-4 mt-2">
                        {meaningfulChanges.map((change, index) => (
                          <div
                            key={`${change.field ?? "change"}-${index}`}
                            className="border rounded-lg p-4 bg-gray-50"
                          >
                            {typeof change.field === "string" && change.field.trim() !== "" && (
                              <div className="text-sm font-medium text-gray-700 mb-3">
                                {labelForField(change.field)}
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <span className="text-xs font-semibold uppercase text-gray-500">Previous</span>
                                <div className="mt-1 p-3 rounded border bg-red-50 text-sm text-gray-900 whitespace-pre-wrap">
                                  {formatAuditValueOrEmpty(change.oldValue)}
                                </div>
                              </div>
                              <div>
                                <span className="text-xs font-semibold uppercase text-gray-500">Updated</span>
                                <div className="mt-1 p-3 rounded border bg-emerald-50 text-sm text-gray-900 whitespace-pre-wrap">
                                  {formatAuditValueOrEmpty(change.newValue)}
                                </div>
                              </div>
                            </div>
                            {typeof change.reason === "string" && change.reason.trim() !== "" && (
                              <div className="mt-4">
                                <span className="text-xs font-semibold uppercase text-gray-500">Reason</span>
                                <div className="mt-1 p-3 rounded border bg-blue-50 text-sm text-gray-900">
                                  {change.reason}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-sm font-medium">Changes</Label>
                      <pre className="text-sm bg-muted p-4 rounded mt-2 overflow-auto max-h-64">
                        {JSON.stringify(selectedLog.changes, null, 2)}
                      </pre>
                    </div>
                  )
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
}
