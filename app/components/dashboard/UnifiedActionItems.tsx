"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { CheckCircle, Clock, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { WidgetLoading } from "@/components/ui/WidgetStates";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { labelForField, formatAuditValue } from "@/lib/audit-field-labels";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ActionItem {
  id: string;
  type: "task" | "approval" | "document" | "signature" | "change";
  title: string;
  subtitle?: string;
  urgent?: boolean;
  metadata?: any;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

interface UnifiedActionItemsProps {
  employeeId?: string;
  isManager?: boolean;
}

export function UnifiedActionItems({ employeeId, isManager = false }: UnifiedActionItemsProps) {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<null | { id: string; name: string; url?: string }>(null);
  const [viewAll, setViewAll] = useState(false);

  // Fetch onboarding tasks
  const { data: onboardingData } = useSWR(
    employeeId ? `/api/onboarding/instances/employee/${employeeId}` : null,
    fetcher
  );

  // Fetch employee documents
  const { data: employeeDocs, isLoading: loadingEmpDocs } = useSWR(
    employeeId ? `/api/documents/list-employee?employeeId=${employeeId}` : null,
    fetcher
  );

  // Fetch company documents
  const { data: companyDocs, isLoading: loadingCompanyDocs } = useSWR(
    `/api/documents/list-company`,
    fetcher
  );

  // Fetch transactional change requests
  const { data: txnRequests, mutate: mutateTxn } = useSWR(
    `/api/transactional-change-requests?scope=assigned`,
    fetcher
  );

  // Fetch approvals (for managers)
  const { data: approvals, mutate: mutateApprovals } = useSWR(
    isManager ? `/api/approvals?status=PENDING` : null,
    fetcher
  );

  // Fetch action items from database (workflow-generated tasks)
  const { data: dbActionItems, mutate: mutateActionItems } = useSWR(
    employeeId ? `/api/action-items?employeeId=${employeeId}&status=PENDING` : `/api/action-items?status=PENDING`,
    fetcher
  );

  // Process all data into unified action items
  useEffect(() => {
    const processActions = async () => {
      setLoading(true);
      const items: ActionItem[] = [];

      // Process action items from database (workflow-generated)
      if (dbActionItems?.success && Array.isArray(dbActionItems.data)) {
        dbActionItems.data.forEach((item: any) => {
          items.push({
            id: `action-${item.id}`,
            type: "task",
            title: item.title,
            subtitle: item.relatedEmployee?.name 
              ? `For ${item.relatedEmployee.name} • ${item.type}`
              : item.type,
            urgent: item.priority === "HIGH" || (item.dueDate && new Date(item.dueDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
            metadata: item,
            actionLabel: "Complete",
            onAction: async () => {
              try {
                const res = await fetch('/api/action-items', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: item.id, status: 'COMPLETED' }),
                });
                if (res.ok) {
                  toast.success('Task completed!');
                  mutateActionItems();
                }
              } catch (error) {
                toast.error('Failed to complete task');
              }
            }
          });
        });
      }

      // Process onboarding tasks
      if (onboardingData) {
        const instances = Array.isArray(onboardingData) ? onboardingData : [];
        const steps = instances.flatMap((inst: any) =>
          Array.isArray(inst?.OnboardingStepInstance) ? inst.OnboardingStepInstance : []
        );
        
        steps
          .filter((s: any) => s.status !== "completed")
          .forEach((step: any) => {
            items.push({
              id: `task-${step.id}`,
              type: "task",
              title: step.label,
              subtitle: "Onboarding task",
              urgent: step.dueDate && new Date(step.dueDate) < new Date(),
              metadata: step,
              actionLabel: "Complete",
              onAction: async () => {
                window.location.href = `/onboarding`;
              }
            });
          });
      }

      // Process document acknowledgements
      if (!loadingEmpDocs && !loadingCompanyDocs) {
        const allDocs = [
          ...(Array.isArray(employeeDocs) ? employeeDocs : []),
          ...(Array.isArray(companyDocs) ? companyDocs : [])
        ];
        
        const uniqueDocs = new Map<string, any>();
        allDocs.forEach(d => d?.id && !uniqueDocs.has(d.id) && uniqueDocs.set(d.id, d));
        
        const docsToCheck = Array.from(uniqueDocs.values())
          .filter(d => d?.requiresAck || d?.requiresSignature)
          .slice(0, 20);

        const checks = await Promise.all(
          docsToCheck.map(async (doc) => {
            if (doc.requiresAck) {
              try {
                const r = await fetch(`/api/documents/acknowledge/${doc.id}/me`, { cache: "no-store" });
                const j = await r.json();
                if (!j?.acknowledged) {
                  return {
                    id: `doc-ack-${doc.id}`,
                    type: "document" as const,
                    title: doc.name,
                    subtitle: doc.signatureDueAt ? `Due: ${new Date(doc.signatureDueAt).toLocaleDateString()}` : undefined,
                    urgent: doc.signatureDueAt && new Date(doc.signatureDueAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    metadata: doc,
                    actionLabel: "Review",
                    onAction: async () => {
                      setPreviewDoc({ id: doc.id, name: doc.name, url: doc.url });
                    }
                  };
                }
              } catch {
                return null;
              }
            }
            
            if (doc.requiresSignature) {
              try {
                const r = await fetch(`/api/documents/signatures/${doc.id}/me`, { cache: "no-store" });
                const j = await r.json();
                if (!j?.signed) {
                  return {
                    id: `doc-sign-${doc.id}`,
                    type: "signature" as const,
                    title: doc.name,
                    subtitle: "Signature required",
                    urgent: doc.signatureDueAt && new Date(doc.signatureDueAt) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                    metadata: doc,
                    actionLabel: "Sign",
                    onAction: async () => {
                      setPreviewDoc({ id: doc.id, name: doc.name, url: doc.url });
                    }
                  };
                }
              } catch {
                return null;
              }
            }
            return null;
          })
        );
        
        checks.filter(Boolean).forEach(item => items.push(item as ActionItem));
      }

      // Process change requests
      if (txnRequests?.data) {
        const txnItems = Array.isArray(txnRequests.data) ? txnRequests.data : [];
        txnItems.forEach((req: any) => {
          items.push({
            id: `change-${req.id}`,
            type: "change",
            title: `${req.section} change request`,
            subtitle: req.employee?.name || "Employee request",
            metadata: req,
            actionLabel: "Review",
            onAction: async () => {
              setSelectedItem({
                id: `change-${req.id}`,
                type: "change",
                title: `${req.section} change request`,
                subtitle: req.employee?.name,
                metadata: req
              });
            }
          });
        });
      }

      // Process approvals (for managers)
      if (isManager && approvals?.items) {
        const approvalItems = Array.isArray(approvals.items) ? approvals.items : [];
        approvalItems.forEach((approval: any) => {
          items.push({
            id: `approval-${approval.id}`,
            type: "approval",
            title: approval.title || approval.type || "Approval request",
            subtitle: approval.employee?.name || approval.dates,
            urgent: approval.urgent,
            metadata: approval,
            actionLabel: "Review",
            onAction: async () => {
              setSelectedItem({
                id: `approval-${approval.id}`,
                type: "approval",
                title: approval.title || approval.type || "Approval request",
                subtitle: approval.employee?.name || approval.dates,
                metadata: approval
              });
            }
          });
        });
      }

      // Sort items: urgent first, then by type priority
      items.sort((a, b) => {
        if (a.urgent && !b.urgent) return -1;
        if (!a.urgent && b.urgent) return 1;
        return 0;
      });

      setActionItems(items);
      setLoading(false);
    };

    processActions();
  }, [dbActionItems, onboardingData, employeeDocs, companyDocs, loadingEmpDocs, loadingCompanyDocs, txnRequests, approvals, isManager, mutateActionItems]);

  const handleQuickApprove = async () => {
    setProcessing("quick-approve");
    try {
      const approvableItems = actionItems.filter(item => 
        item.type === "approval" || item.type === "change"
      );
      
      for (const item of approvableItems) {
        if (item.type === "approval") {
          await fetch(`/api/approvals/${item.metadata.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "approve" })
          });
        } else if (item.type === "change") {
          await fetch(`/api/transactional-change-requests`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.metadata.id, action: "approve" })
          });
        }
      }
      
      toast.success(`${approvableItems.length} items approved`);
      mutateApprovals?.();
      mutateTxn?.();
    } catch (error) {
      toast.error("Failed to approve items");
    } finally {
      setProcessing(null);
    }
  };

  const handleItemAction = async (item: ActionItem, action: "approve" | "decline") => {
    setProcessing(item.id);
    try {
      if (item.type === "approval") {
        const comment = action === "decline" ? prompt("Reason for declining:") : undefined;
        if (action === "decline" && !comment) {
          setProcessing(null);
          return;
        }
        
        await fetch(`/api/approvals/${item.metadata.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, comment })
        });
        
        toast.success(action === "approve" ? "Approved" : "Declined");
        mutateApprovals?.();
      } else if (item.type === "change") {
        const comment = action === "decline" ? prompt("Reason for declining:") : undefined;
        if (action === "decline" && !comment) {
          setProcessing(null);
          return;
        }
        
        await fetch(`/api/transactional-change-requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            id: item.metadata.id, 
            action,
            comment: action === "decline" ? comment : undefined
          })
        });
        
        toast.success(action === "approve" ? "Approved" : "Declined");
        mutateTxn?.();
      }
      
      setSelectedItem(null);
      setActionItems(prev => prev.filter(i => i.id !== item.id));
    } catch (error) {
      toast.error(`Failed to ${action} item`);
    } finally {
      setProcessing(null);
    }
  };

  const displayItems = viewAll ? actionItems : actionItems.slice(0, 3);
  const pendingCount = actionItems.length;
  const hasQuickApprovable = actionItems.some(item => item.type === "approval" || item.type === "change");

  return (
    <>
      <DashboardWidget 
        title="Action items"
        icon={CheckCircle}
        action={
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                {pendingCount}
              </span>
            )}
            <button
              onClick={() => setViewAll(!viewAll)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              {viewAll ? "View less" : "View all"}
            </button>
            {hasQuickApprovable && !viewAll && (
              <Button
                size="sm"
                onClick={handleQuickApprove}
                disabled={processing === "quick-approve"}
                className="text-xs"
              >
                Quick Approve All
              </Button>
            )}
          </div>
        }
      >
        {loading ? (
          <WidgetLoading />
        ) : pendingCount === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500/20" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No actions required at the moment</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayItems.map((item) => (
              <div
                key={item.id}
                className="group relative flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all cursor-pointer"
                onClick={() => {
                  if (item.type === "approval" || item.type === "change") {
                    setSelectedItem(item);
                  } else if (item.onAction) {
                    item.onAction();
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {item.urgent && (
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {(item.type === "approval" || item.type === "change") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemAction(item, "decline");
                      }}
                      disabled={processing === item.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Decline
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (item.type === "approval" || item.type === "change") {
                        await handleItemAction(item, "approve");
                      } else if (item.onAction) {
                        await item.onAction();
                      }
                    }}
                    disabled={processing === item.id}
                    className="min-w-[80px]"
                  >
                    {processing === item.id ? (
                      <Clock className="w-3 h-3 animate-spin" />
                    ) : (
                      item.type === "approval" || item.type === "change" ? "Approve" : (item.actionLabel || "Open")
                    )}
                  </Button>
                </div>
              </div>
            ))}
            
            {!viewAll && pendingCount > 3 && (
              <button
                onClick={() => setViewAll(true)}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
              >
                View {pendingCount - 3} more items
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </DashboardWidget>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewDoc?.name || "Document"}</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="space-y-4">
              {previewDoc.url ? (
                <div className="rounded-lg border overflow-hidden">
                  <embed
                    src={`${previewDoc.url}#toolbar=0&navpanes=0&scrollbar=1`}
                    type="application/pdf"
                    className="w-full h-[60vh]"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Preview not available</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreviewDoc(null)}>
                  Close
                </Button>
                <Button
                  onClick={async () => {
                    if (!previewDoc) return;
                    try {
                      await fetch("/api/documents/acknowledge", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ documentId: previewDoc.id })
                      });
                      toast.success("Document acknowledged");
                      setActionItems(prev => prev.filter(item => 
                        !item.id.includes(previewDoc.id)
                      ));
                      setPreviewDoc(null);
                    } catch {
                      toast.error("Failed to acknowledge document");
                    }
                  }}
                >
                  Acknowledge & Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog for Approvals/Changes */}
      {selectedItem && (selectedItem.type === "approval" || selectedItem.type === "change") && (
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{selectedItem.title}</p>
                {selectedItem.subtitle && (
                  <p className="text-sm text-muted-foreground">{selectedItem.subtitle}</p>
                )}
              </div>
              {/* Leave approval details */}
              {selectedItem.type === "approval" && (
                <div className="p-3 rounded-lg bg-muted/30 text-sm space-y-1">
                  {selectedItem.metadata?.typeName && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{selectedItem.metadata.typeName}</span></div>
                  )}
                  {selectedItem.metadata?.startDate && selectedItem.metadata?.endDate && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Dates</span><span className="font-medium">{new Date(selectedItem.metadata.startDate).toLocaleDateString()} 
                      to {new Date(selectedItem.metadata.endDate).toLocaleDateString()}</span></div>
                  )}
                </div>
              )}

              {/* Transactional change request details */}
              {selectedItem.type === "change" && (
                <div className="space-y-2">
                  {Array.isArray(selectedItem.metadata?.diffs) && selectedItem.metadata.diffs.length > 0 ? (
                    <div className="p-3 rounded-lg bg-muted/30 text-sm">
                      <div className="font-medium mb-2">Proposed changes</div>
                      <div className="space-y-1">
                        {selectedItem.metadata.diffs.map((d: any, idx: number) => (
                          <div key={idx} className="grid grid-cols-3 gap-2 items-center">
                            <div className="text-muted-foreground truncate">{labelForField(d.field) || d.field}</div>
                            <div className="truncate text-xs">{formatAuditValue(d.oldValue)}</div>
                            <div className="truncate text-xs font-medium">{formatAuditValue(d.newValue)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : selectedItem.metadata?.payload ? (
                    <div className="p-3 rounded-lg bg-muted/30 text-sm space-y-1">
                      {Object.entries(selectedItem.metadata.payload).map(([k, v]) => (
                        <div key={k} className="flex justify-between"><span className="text-muted-foreground">{labelForField(k) || k}</span><span className="font-medium">{formatAuditValue(v)}</span></div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleItemAction(selectedItem, "decline")}
                  disabled={processing === selectedItem.id}
                >
                  Decline
                </Button>
                <Button
                  onClick={() => handleItemAction(selectedItem, "approve")}
                  disabled={processing === selectedItem.id}
                >
                  Approve
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
