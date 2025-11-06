"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, User, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";

type AuditLog = {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  changeReason: string;
  changedAt: string;
  ChangedBy: {
    User: {
      name: string;
      email: string;
    };
  };
};

interface TimesheetAuditTrailProps {
  timesheetId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TimesheetAuditTrail({
  timesheetId,
  open,
  onOpenChange,
}: TimesheetAuditTrailProps) {
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (timesheetId && open) {
      fetchAuditTrail();
    }
  }, [timesheetId, open]);

  const fetchAuditTrail = async () => {
    if (!timesheetId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/timesheets/${timesheetId}/audit`);

      if (!response.ok) throw new Error("Failed to fetch audit trail");

      const data = await response.json();
      setAuditLogs(data.auditLogs || []);
    } catch (error) {
      console.error("Failed to fetch audit trail:", error);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const formatFieldName = (field: string) => {
    const fieldMap: Record<string, string> = {
      date: "Date",
      startTime: "Start Time",
      endTime: "End Time",
      breakMinutes: "Break Duration",
      hours: "Hours",
      notes: "Notes",
    };
    return fieldMap[field] || field;
  };

  const formatValue = (field: string, value: string) => {
    if (!value) return "—";

    try {
      switch (field) {
        case "date":
          return format(new Date(value), "MMM d, yyyy");
        case "startTime":
        case "endTime":
          return format(new Date(value), "h:mm a");
        case "breakMinutes":
          return `${value} min`;
        case "hours":
          return `${parseFloat(value).toFixed(2)}h`;
        default:
          return value;
      }
    } catch {
      return value;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Trail
          </SheetTitle>
          <SheetDescription>
            Complete history of all changes made to this timesheet
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="font-medium text-muted-foreground">No changes recorded</p>
                <p className="text-sm text-muted-foreground/70">
                  This timesheet has not been modified
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {auditLogs.length} change{auditLogs.length !== 1 ? "s" : ""} recorded
              </div>

              <div className="relative space-y-4">
                {/* Timeline line */}
                <div className="absolute left-[13px] top-2 bottom-2 w-[2px] bg-border" />

                {auditLogs.map((log, index) => (
                  <div key={log.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className="relative z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-background bg-primary">
                      <AlertCircle className="h-3 w-3 text-primary-foreground" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2 pb-4">
                      <div className="rounded-lg border bg-card p-4">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{formatFieldName(log.field)} Changed</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              {log.ChangedBy.User.name}
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(log.changedAt), "MMM d, yyyy")}
                            </div>
                            <div>{format(new Date(log.changedAt), "h:mm a")}</div>
                          </div>
                        </div>

                        {/* Old and New Values */}
                        <div className="space-y-2 rounded-md bg-muted/50 p-3 text-sm">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <Badge variant="outline" className="mb-1">
                                Old
                              </Badge>
                              <p className="text-muted-foreground">
                                {formatValue(log.field, log.oldValue)}
                              </p>
                            </div>
                            <div className="text-muted-foreground">→</div>
                            <div>
                              <Badge variant="default" className="mb-1">
                                New
                              </Badge>
                              <p className="font-medium">
                                {formatValue(log.field, log.newValue)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Change Reason */}
                        {log.changeReason && (
                          <div className="mt-3 rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/30">
                            <p className="mb-1 text-xs font-medium text-orange-900 dark:text-orange-100">
                              Reason for Change
                            </p>
                            <p className="text-sm text-orange-800 dark:text-orange-200">
                              {log.changeReason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
