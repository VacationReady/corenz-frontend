"use client";

import React, { useEffect, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";

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
}

interface FilterState {
  entityType: string;
  action: string;
  actorId: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  search: string;
}

const entityTypeOptions = [
  { value: '', label: 'All Entity Types' },
  { value: 'LEAVE_POLICY', label: 'Leave Policies' },
  { value: 'PERMISSION_PROFILE', label: 'Permission Profiles' },
  { value: 'EVENT_RULE', label: 'Event Rules' },
  { value: 'DOCUMENT_TYPE', label: 'Document Types' },
  { value: 'AUTOMATION_RULE', label: 'Automation Rules' },
  { value: 'NOTIFICATION_CHANNEL', label: 'Notification Channels' },
  { value: 'SSO_CONFIG', label: 'SSO Configuration' },
  { value: 'SCIM_CONFIG', label: 'SCIM Configuration' },
  { value: 'BRANDING_CONFIG', label: 'Branding Configuration' },
];

const actionOptions = [
  { value: '', label: 'All Actions' },
  { value: 'CREATED', label: 'Created' },
  { value: 'UPDATED', label: 'Updated' },
  { value: 'DELETED', label: 'Deleted' },
  { value: 'ACTIVATED', label: 'Activated' },
  { value: 'DEACTIVATED', label: 'Deactivated' },
];

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  const [filters, setFilters] = useState<FilterState>({
    entityType: '',
    action: '',
    actorId: '',
    dateFrom: null,
    dateTo: null,
    search: '',
  });

  useEffect(() => {
    fetchLogs();
    fetchUsers();
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
        if (value) {
          if (key === 'dateFrom' || key === 'dateTo') {
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
        throw new Error('Failed to fetch audit logs');
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
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
      const response = await fetch('/api/users?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const resetFilters = () => {
    setFilters({
      entityType: '',
      action: '',
      actorId: '',
      dateFrom: null,
      dateTo: null,
      search: '',
    });
    setCurrentPage(1);
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams();
      
      // Add current filters to export
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (key === 'dateFrom' || key === 'dateTo') {
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
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Success",
          description: "Audit logs exported successfully",
        });
      } else {
        throw new Error('Failed to export audit logs');
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to export audit logs",
        variant: "destructive",
      });
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'LEAVE_POLICY':
        return <Calendar className="w-4 h-4" />;
      case 'PERMISSION_PROFILE':
        return <Shield className="w-4 h-4" />;
      case 'EVENT_RULE':
        return <Settings className="w-4 h-4" />;
      case 'DOCUMENT_TYPE':
        return <FileText className="w-4 h-4" />;
      case 'AUTOMATION_RULE':
        return <Zap className="w-4 h-4" />;
      case 'NOTIFICATION_CHANNEL':
        return <Bell className="w-4 h-4" />;
      case 'SSO_CONFIG':
      case 'SCIM_CONFIG':
        return <Key className="w-4 h-4" />;
      case 'BRANDING_CONFIG':
        return <Palette className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATED':
        return <Badge className="bg-green-100 text-green-800">Created</Badge>;
      case 'UPDATED':
        return <Badge className="bg-blue-100 text-blue-800">Updated</Badge>;
      case 'DELETED':
        return <Badge className="bg-red-100 text-red-800">Deleted</Badge>;
      case 'ACTIVATED':
        return <Badge className="bg-emerald-100 text-emerald-800">Activated</Badge>;
      case 'DEACTIVATED':
        return <Badge className="bg-orange-100 text-orange-800">Deactivated</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const openDetailsDialog = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setDetailsDialogOpen(true);
  };

  const formatEntityType = (entityType: string) => {
    return entityTypeOptions.find(opt => opt.value === entityType)?.label || entityType;
  };

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
              Filter audit log entries by entity type, action, user, and date range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <Label>Entity Type</Label>
                <Select
                  value={filters.entityType}
                  onValueChange={(value) => setFilters({ ...filters, entityType: value })}
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
                  onValueChange={(value) => setFilters({ ...filters, action: value })}
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
                  onValueChange={(value) => setFilters({ ...filters, actorId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All users</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
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
                      {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom ?? undefined}
                      onSelect={(date) => setFilters({ ...filters, dateFrom: date || null })}
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
                      {filters.dateTo ? format(filters.dateTo, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo ?? undefined}
                      onSelect={(date) => setFilters({ ...filters, dateTo: date || null })}
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
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} entries
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
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
                <div className="text-center text-muted-foreground">Loading audit logs...</div>
              </CardContent>
            </Card>
          ) : logs.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No audit logs found</h3>
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
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatEntityType(log.entityType)}</span>
                          {getActionBadge(log.action)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          by {log.actor?.name || log.actor?.email || 'System'} • {format(new Date(log.timestamp), 'PPp')}
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
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
                    <div className="text-sm">{formatEntityType(selectedLog.entityType)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Action</Label>
                    <div>{getActionBadge(selectedLog.action)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Actor</Label>
                    <div className="text-sm">
                      {selectedLog.actor?.name || selectedLog.actor?.email || 'System'}
                      <span className="text-muted-foreground ml-2">({selectedLog.actorType})</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Timestamp</Label>
                    <div className="text-sm">{format(new Date(selectedLog.timestamp), 'PPpp')}</div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Entity ID</Label>
                    <div className="text-sm font-mono bg-muted p-2 rounded">{selectedLog.entityId}</div>
                  </div>
                </div>

                {selectedLog.changes && (
                  <div>
                    <Label className="text-sm font-medium">Changes</Label>
                    <pre className="text-sm bg-muted p-4 rounded mt-2 overflow-auto max-h-64">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div>
                    <Label className="text-sm font-medium">Metadata</Label>
                    <pre className="text-sm bg-muted p-4 rounded mt-2 overflow-auto max-h-64">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
}
