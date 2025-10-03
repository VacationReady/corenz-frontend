"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  History,
  Loader2,
  Mail,
  User,
  Clock,
  FileText,
  FileSpreadsheet,
  Users,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

interface SendHistoryItem {
  id: string;
  reportName: string;
  sentBy: {
    id: string;
    email: string;
    name: string;
  };
  sentAt: string;
  recipientType: string;
  departments: { id: string; name: string }[];
  jobRoles: { id: string; name: string }[];
  recipientCount: number;
  recipientEmails: string[];
  format: string;
  subject: string;
  messageBody: string | null;
}

interface SendHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: number;
  reportName: string;
}

export function SendHistoryModal({
  isOpen,
  onClose,
  reportId,
  reportName,
}: SendHistoryModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SendHistoryItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, reportId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/${reportId}/send-history`);

      if (!response.ok) {
        throw new Error("Failed to fetch send history");
      }

      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error("Error fetching send history:", error);
      toast({
        title: "Error loading history",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load send history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPpp"); // e.g., "Apr 29, 2023, 9:30 AM"
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <History className="w-5 h-5" />
            Send History
          </DialogTitle>
          <DialogDescription>
            View all sends for &quot;{reportName}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No send history yet</h3>
              <p className="text-sm text-muted-foreground">
                This report hasn&apos;t been emailed to anyone yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const isExpanded = expandedItems.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="glass-subtle rounded-xl p-4 space-y-3 transition-all hover:bg-muted/50"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {item.format === "PDF" ? (
                              <FileText className="w-4 h-4 text-primary" />
                            ) : (
                              <FileSpreadsheet className="w-4 h-4 text-primary" />
                            )}
                            <span className="text-sm font-semibold">
                              {item.format} Report
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {item.recipientCount} recipient{item.recipientCount !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>Sent by {item.sentBy.name}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(item.sentAt)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleExpanded(item.id)}
                        className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <span>Less</span>
                            <ChevronUp className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            <span>Details</span>
                            <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="space-y-4 pt-3 border-t border-border/50">
                        {/* Subject */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Subject
                          </label>
                          <p className="text-sm">{item.subject}</p>
                        </div>

                        {/* Message */}
                        {item.messageBody && (
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Message
                            </label>
                            <p className="text-sm whitespace-pre-wrap glass-subtle rounded-lg p-3">
                              {item.messageBody}
                            </p>
                          </div>
                        )}

                        {/* Recipients */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Departments */}
                          {item.departments && item.departments.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Departments ({item.departments.length})
                              </label>
                              <div className="space-y-1">
                                {item.departments.map((dept) => (
                                  <div
                                    key={dept.id}
                                    className="text-sm px-2 py-1 glass-subtle rounded"
                                  >
                                    {dept.name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Job Roles */}
                          {item.jobRoles && item.jobRoles.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                Job Roles ({item.jobRoles.length})
                              </label>
                              <div className="space-y-1">
                                {item.jobRoles.map((role) => (
                                  <div
                                    key={role.id}
                                    className="text-sm px-2 py-1 glass-subtle rounded"
                                  >
                                    {role.name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Recipient Emails */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Recipients ({item.recipientEmails.length})
                          </label>
                          <div className="max-h-40 overflow-y-auto glass-subtle rounded-lg p-3">
                            <div className="flex flex-wrap gap-2">
                              {item.recipientEmails.map((email, index) => (
                                <span
                                  key={index}
                                  className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full"
                                >
                                  {email}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

