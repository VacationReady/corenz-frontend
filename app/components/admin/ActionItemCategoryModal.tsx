"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Users,
  FileText,
  Search,
  ChevronRight,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getIconConfigFromType } from "@/lib/action-item-icons";

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

interface ActionItemCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: "pending" | "overdue" | "dueToday" | "dueThisWeek" | null;
  onRefresh?: () => void;
}

const CATEGORY_CONFIG = {
  pending: {
    title: "Total Pending Action Items",
    description: "All action items awaiting completion",
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  overdue: {
    title: "Overdue Action Items",
    description: "Items requiring immediate attention",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  dueToday: {
    title: "Due Today",
    description: "Items due by end of day",
    icon: Calendar,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  dueThisWeek: {
    title: "Due This Week",
    description: "Items due within 7 days",
    icon: Calendar,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  PERFORMANCE_SELF_REVIEW: "Self Review",
  PERFORMANCE_MANAGER_REVIEW: "Manager Review",
  PERFORMANCE_PEER_REVIEW: "Peer Review",
  PERFORMANCE_360_REVIEW: "360° Review",
  LEAVE_APPROVAL: "Leave Approval",
  LEAVE_HR_APPROVAL: "HR Leave Approval",
  DOCUMENT_UPLOAD_REQUEST: "Document Upload",
  SURVEY: "Survey",
  ONBOARDING_TASK: "Onboarding Task",
  OFFBOARDING_TASK: "Offboarding Task",
  EXIT_INTERVIEW: "Exit Interview",
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

export function ActionItemCategoryModal({
  open,
  onOpenChange,
  category,
  onRefresh,
}: ActionItemCategoryModalProps) {
  const router = useRouter();
  const [items, setItems] = useState<ActionItemWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<ActionItemWithDetails | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    if (open && category) {
      fetchItems();
    }
  }, [open, category]);

  const fetchItems = async () => {
    if (!category) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/action-items/category?category=${category}`);
      const data = await response.json();
      
      if (data.success) {
        setItems(data.data || []);
      } else {
        toast.error("Failed to load action items");
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
      toast.error("Failed to load action items");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item: ActionItemWithDetails) => {
    setProcessing(item.id);
    try {
      // Check if this is a leave approval
      if (item.type.includes("LEAVE")) {
        const leaveRequestId = item.metadata?.leaveRequestId;
        if (leaveRequestId) {
          const response = await fetch(`/api/leave-request/${leaveRequestId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "approve" }),
          });
          
          if (response.ok) {
            // Mark action item as completed
            await fetch(`/api/action-items/${item.id}/complete`, {
              method: "POST",
            });
            toast.success("Leave request approved");
          } else {
            const error = await response.json();
            toast.error(error.error || "Failed to approve leave request");
            return;
          }
        }
      } else {
        // Generic approval endpoint
        const response = await fetch(`/api/action-items/${item.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        });
        
        if (!response.ok) {
          toast.error("Failed to approve item");
          return;
        }
        toast.success("Item approved");
      }
      
      // Remove from list
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelectedItem(null);
      onRefresh?.();
    } catch (error) {
      console.error("Failed to approve:", error);
      toast.error("Failed to approve item");
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (item: ActionItemWithDetails) => {
    if (!declineReason.trim()) {
      toast.error("Please provide a reason for declining");
      return;
    }

    setProcessing(item.id);
    try {
      // Check if this is a leave approval
      if (item.type.includes("LEAVE")) {
        const leaveRequestId = item.metadata?.leaveRequestId;
        if (leaveRequestId) {
          const response = await fetch(`/api/leave-request/${leaveRequestId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "decline", reason: declineReason }),
          });
          
          if (response.ok) {
            // Mark action item as completed
            await fetch(`/api/action-items/${item.id}/complete`, {
              method: "POST",
            });
            toast.success("Leave request declined");
          } else {
            const error = await response.json();
            toast.error(error.error || "Failed to decline leave request");
            return;
          }
        }
      } else {
        // Generic decline endpoint
        const response = await fetch(`/api/action-items/${item.id}/decline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: declineReason }),
        });
        
        if (!response.ok) {
          toast.error("Failed to decline item");
          return;
        }
        toast.success("Item declined");
      }
      
      // Remove from list
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelectedItem(null);
      setDeclineReason("");
      onRefresh?.();
    } catch (error) {
      console.error("Failed to decline:", error);
      toast.error("Failed to decline item");
    } finally {
      setProcessing(null);
    }
  };

  const handleViewDetails = (item: ActionItemWithDetails) => {
    const type = item.type || "";
    const metadata = (item.metadata || {}) as Record<string, any>;

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

    // If no navigation, just show the details
    setSelectedItem(item);
  };

  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    return (
      item.title.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.assignedTo?.name.toLowerCase().includes(query) ||
      item.relatedEmployee?.name.toLowerCase().includes(query)
    );
  });

  if (!category) return null;

  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.bgColor}`}>
                <Icon className={`h-6 w-6 ${config.color}`} />
              </div>
              <div>
                <DialogTitle className="text-xl">{config.title}</DialogTitle>
                <DialogDescription>{config.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, assignee, or employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" showText text="Loading..." />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {searchQuery ? "No items match your search" : "No items in this category"}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const iconConfig = getIconConfigFromType(item.type);
                const ItemIcon = iconConfig.icon;
                
                return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                    item.isOverdue
                      ? "border-red-200 bg-red-50"
                      : "border-border bg-background"
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
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {ACTION_TYPE_LABELS[item.type] || item.type}
                        </Badge>
                        <Badge
                          className={`text-xs ${
                            PRIORITY_COLORS[
                              item.priority as keyof typeof PRIORITY_COLORS
                            ] || ""
                          }`}
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
                      {item.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
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
                            <span>
                              Due: {new Date(item.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(item)}
                        disabled={processing === item.id}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(item)}
                        disabled={processing === item.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processing === item.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item);
                          setDeclineReason("");
                        }}
                        disabled={processing === item.id}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decline Reason Dialog */}
      {selectedItem && declineReason !== undefined && (
        <Dialog
          open={!!selectedItem}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setSelectedItem(null);
              setDeclineReason("");
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Decline Action Item</DialogTitle>
              <DialogDescription>
                Please provide a reason for declining this item
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{selectedItem.title}</p>
                {selectedItem.relatedEmployee && (
                  <p className="text-xs text-muted-foreground mt-1">
                    For: {selectedItem.relatedEmployee.name}
                  </p>
                )}
              </div>

              <Textarea
                placeholder="Enter reason for declining..."
                value={declineReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeclineReason(e.target.value)}
                rows={4}
                className="resize-none"
              />

              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedItem(null);
                    setDeclineReason("");
                  }}
                  disabled={processing === selectedItem.id}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDecline(selectedItem)}
                  disabled={processing === selectedItem.id || !declineReason.trim()}
                >
                  {processing === selectedItem.id ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    "Decline Item"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

