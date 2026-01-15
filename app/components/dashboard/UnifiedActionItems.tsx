"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  PenLine, 
  UserRound, 
  Briefcase,
} from "lucide-react";
import { getActionItemIconConfig } from "@/lib/action-item-icons";
import Button from "@/components/ui/Button";
import { WidgetLoading } from "@/components/ui/WidgetStates";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import ModernSignatureCapture, { SignatureCaptureValue } from "@/components/documents/ModernSignatureCapture";
import { toast } from "sonner";
import { labelForField, formatAuditValue } from "@/lib/audit-field-labels";
import { HolidayApprovalModal } from "@/components/approvals/HolidayApprovalModal";
import { TransactionalChangeReviewModal } from "@/components/approvals/TransactionalChangeReviewModal";
import { TimesheetApprovalModal } from "@/components/approvals/TimesheetApprovalModal";
import { DocumentAcknowledgmentModal } from "@/components/documents/DocumentAcknowledgmentModal";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import { getTenantHeadersSync } from "@/lib/tenant-fetch";

// Signature field interface
interface SignatureField {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  assignedEmployeeId?: string;
}

// Field themes for visual styling
const fieldThemes = {
  signature: {
    icon: PenLine,
    border: "border-sky-400",
    bg: "bg-sky-50",
    iconBg: "bg-sky-100 text-sky-700",
  },
  name: {
    icon: UserRound,
    border: "border-purple-400",
    bg: "bg-purple-50",
    iconBg: "bg-purple-100 text-purple-700",
  },
  job: {
    icon: Briefcase,
    border: "border-emerald-400",
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100 text-emerald-700",
  },
};

const getFieldTheme = (label?: string) => {
  const normalized = (label || "").toLowerCase();
  if (normalized.includes("job")) return fieldThemes.job;
  if (normalized.includes("name")) return fieldThemes.name;
  return fieldThemes.signature;
};

const getFieldType = (label?: string): "signature" | "name" | "job" => {
  const normalized = (label || "").toLowerCase();
  if (normalized.includes("job")) return "job";
  if (normalized.includes("name")) return "name";
  return "signature";
};

const createFetcher = (companyId?: string | null) => (url: string) => {
  const headers = getTenantHeadersSync(url, companyId);
  return fetch(url, { headers }).then((r) => r.json());
};

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
  className?: string;
}

export function UnifiedActionItems({ employeeId, isManager = false, className }: UnifiedActionItemsProps) {
  const { data: session, status } = useSession();
  const tenantFetch = useTenantFetch();
  const fetcher = createFetcher(session?.user?.companyId);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<null | { id: string; name: string; url?: string; requiresSignature?: boolean; requiresAck?: boolean }>(null);
  const [signatureValue, setSignatureValue] = useState<SignatureCaptureValue | null>(null);
  const [signSubmitting, setSignSubmitting] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [holidayApprovalId, setHolidayApprovalId] = useState<string | null>(null);
  const [timesheetApprovalId, setTimesheetApprovalId] = useState<string | null>(null);
  const [timesheetActionItemId, setTimesheetActionItemId] = useState<string | null>(null);
  const [selectedChangeRequest, setSelectedChangeRequest] = useState<any | null>(null);
  const [changeProcessing, setChangeProcessing] = useState(false);
  
  // Document signature fields state
  const [documentFields, setDocumentFields] = useState<SignatureField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loadingFields, setLoadingFields] = useState(false);
  
  // Fetch signature fields when a document is selected for signing
  useEffect(() => {
    if (previewDoc?.id && previewDoc?.requiresSignature) {
      setLoadingFields(true);
      tenantFetch(`/api/documents/signature-fields/${previewDoc.id}`)
        .then((r) => r.json())
        .then((data) => {
          const fields = Array.isArray(data) ? data : [];
          setDocumentFields(fields);
          // Initialize field values
          const initialValues: Record<string, string> = {};
          fields.forEach((f: SignatureField) => {
            const fieldType = getFieldType(f.label);
            if (fieldType !== "signature") {
              initialValues[f.id] = "";
            }
          });
          setFieldValues(initialValues);
        })
        .catch(() => setDocumentFields([]))
        .finally(() => setLoadingFields(false));
    } else {
      setDocumentFields([]);
      setFieldValues({});
    }
  }, [previewDoc?.id, previewDoc?.requiresSignature, tenantFetch]);
  
  // Determine which field types are present
  const hasNameField = useMemo(() => 
    documentFields.some(f => getFieldType(f.label) === "name"), 
    [documentFields]
  );
  const hasJobField = useMemo(() => 
    documentFields.some(f => getFieldType(f.label) === "job"), 
    [documentFields]
  );
  const hasSignatureField = useMemo(() => 
    documentFields.some(f => getFieldType(f.label) === "signature"), 
    [documentFields]
  );
  
  // Check if all required fields are filled
  const allFieldsFilled = useMemo(() => {
    // Check text fields
    for (const field of documentFields) {
      const fieldType = getFieldType(field.label);
      if (fieldType !== "signature" && (!fieldValues[field.id] || !fieldValues[field.id].trim())) {
        return false;
      }
    }
    // Signature is ALWAYS required when document requiresSignature (not just when signature field exists)
    if (previewDoc?.requiresSignature && !signatureValue) {
      return false;
    }
    // Allow submission if document requires signature (even without placed fields)
    return previewDoc?.requiresSignature || documentFields.length > 0;
  }, [documentFields, fieldValues, previewDoc?.requiresSignature, signatureValue]);

  const isLoadingSession = status === "loading";

  const toAuditValue = (val: unknown): string | null | undefined => {
    if (val === null || val === undefined) return null;
    return String(val);
  };

  // Fetch onboarding tasks
  const { data: onboardingData } = useSWR(
    !isLoadingSession && employeeId ? `/api/onboarding/instances/employee/${employeeId}` : null,
    fetcher
  );

  // Fetch employee documents
  const { data: employeeDocs, isLoading: loadingEmpDocs } = useSWR(
    !isLoadingSession && employeeId ? `/api/documents/list-employee?employeeId=${employeeId}` : null,
    fetcher
  );

  // Fetch company documents
  const { data: companyDocsPaged, isLoading: loadingCompanyDocs } = useSWR(
    !isLoadingSession ? `/api/documents/list-company?limit=40&requiresAction=1` : null,
    fetcher
  );

  // Fetch transactional change requests
  const { data: txnRequests, mutate: mutateTxn } = useSWR(
    !isLoadingSession ? `/api/transactional-change-requests?scope=assigned` : null,
    fetcher
  );

  // Fetch approvals (for all users who might be approvers)
  const { data: approvals, mutate: mutateApprovals } = useSWR(
    !isLoadingSession ? `/api/approvals?status=PENDING` : null,
    fetcher
  );

  // Fetch action items from database (workflow-generated tasks)
  const { data: dbActionItems, mutate: mutateActionItems } = useSWR(
    !isLoadingSession ? (employeeId ? `/api/action-items?employeeId=${employeeId}&status=PENDING` : `/api/action-items?status=PENDING`) : null,
    fetcher
  );

  // Determine if we're still in initial loading phase
  // Only show loading spinner when we haven't completed initial load AND data is still being fetched
  const isLoadingData = !initialLoadComplete && (
    isLoadingSession ||
    (employeeId && !onboardingData && !dbActionItems) ||
    (!employeeDocs && loadingEmpDocs) ||
    (!companyDocsPaged && loadingCompanyDocs)
  );

  // Process all data into unified action items
  useEffect(() => {
    // Don't process if session is still loading
    if (isLoadingSession) return;

    // Track if this effect run is still valid (prevents race conditions)
    let isStale = false;

    const processActions = async () => {
      const items: ActionItem[] = [];

      // Process action items from database (workflow-generated + AI approvals)
      if (dbActionItems?.success && Array.isArray(dbActionItems.data)) {
        for (const item of dbActionItems.data) {
          // Handle AI bulk update approvals specially
          if (item.type === 'BULK_UPDATE_APPROVAL') {
            const metadata = item.metadata || {};
            const changes = metadata.changes || [];
            items.push({
              id: `action-${item.id}`,
              type: "approval",
              title: item.title,
              subtitle: `${changes.length} employees • ${item.description || 'AI Generated'}`,
              urgent: item.priority === "HIGH",
              metadata: item,
              actionLabel: "Review",
              onAction: async () => {
                setSelectedItem({
                  id: `action-${item.id}`,
                  type: "approval",
                  title: item.title,
                  subtitle: `Bulk update approval`,
                  metadata: item,
                });
              }
            });
          } else if (item.type === 'SURVEY') {
            // Survey completion tasks
            items.push({
              id: `action-${item.id}`,
              type: "task",
              title: item.title,
              subtitle: item.metadata?.surveyName ? `Survey: ${item.metadata.surveyName}` : "Survey",
              urgent: item.priority === "HIGH" || (item.dueDate && new Date(item.dueDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
              metadata: item,
              actionLabel: "Complete Survey",
              onAction: async () => {
                // Navigate to survey completion page or open survey modal
                if (item.metadata?.surveyId && item.metadata?.formSchema) {
                  // For now, we'll redirect to a survey completion page
                  // In the future, this could open a modal with the survey form
                  window.location.href = `/surveys/complete/${item.metadata.surveyId}?actionItemId=${item.id}`;
                } else {
                  toast.error('Survey data not available');
                }
              }
            });
          } else if (item.type === 'TIMESHEET_APPROVAL') {
            // Timesheet approval tasks - open modal instead of redirecting
            const metadata = item.metadata || {};
            const label = metadata.label || '';
            const totalHours = metadata.totalHours ? `${metadata.totalHours} hours` : '';

            items.push({
              id: `action-${item.id}`,
              type: "approval",
              title: item.title,
              subtitle: [label, totalHours].filter(Boolean).join(' • '),
              urgent: item.priority === "HIGH" || (item.dueDate && new Date(item.dueDate) < new Date()),
              metadata: { ...item, isTimesheetApproval: true },
              actionLabel: "Review Timesheet",
              onAction: async () => {
                // Open timesheet approval modal
                if (metadata.timesheetId) {
                  setTimesheetApprovalId(metadata.timesheetId);
                  setTimesheetActionItemId(item.id);
                } else {
                  toast.error('Timesheet data not available');
                }
              }
            });
          } else if (item.type === 'EXIT_INTERVIEW_FORM') {
            // Exit interview form completion task
            const metadata = item.metadata || {};
            items.push({
              id: `action-${item.id}`,
              type: "task",
              title: item.title,
              subtitle: "Exit interview form",
              urgent: item.priority === "HIGH" || (item.dueDate && new Date(item.dueDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
              metadata: item,
              actionLabel: "Complete Form",
              onAction: async () => {
                // Navigate to exit interview form page using the completion token
                if (metadata.completionTokenHash) {
                  window.location.href = `/exit-interview/${metadata.completionTokenHash}`;
                } else if (metadata.formLink) {
                  window.location.href = metadata.formLink;
                } else {
                  toast.error('Exit interview form link not available');
                }
              }
            });
          } else if (item.type === 'DOCUMENT_SIGNATURE') {
            // Document signature tasks - verify signature fields exist before showing
            const metadata = item.metadata || {};
            if (metadata.documentId) {
              try {
                // Check if signature fields have been placed on the document
                const fieldsRes = await tenantFetch(`/api/documents/signature-fields/${metadata.documentId}`, { cache: "no-store" });
                const fieldsData = await fieldsRes.json();
                const hasFields = Array.isArray(fieldsData) && fieldsData.length > 0;
                
                // Only show action item if admin has finished setting up signature fields
                if (hasFields) {
                  items.push({
                    id: `action-${item.id}`,
                    type: "signature",
                    title: item.title,
                    subtitle: metadata.documentCategory || "Signature required",
                    urgent: item.priority === "HIGH" || (item.dueDate && new Date(item.dueDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
                    metadata: { ...item, documentId: metadata.documentId, documentName: metadata.documentName },
                    actionLabel: "Sign",
                    onAction: async () => {
                      // Open signature modal with document
                      if (metadata.documentId) {
                        // Fetch the document URL for preview
                        try {
                          const docRes = await tenantFetch(`/api/documents/signed-url/${metadata.documentId}`);
                          const docData = await docRes.json();
                          setPreviewDoc({ 
                            id: metadata.documentId, 
                            name: metadata.documentName || item.title, 
                            url: docData?.url || undefined,
                            requiresSignature: true, 
                            requiresAck: false 
                          });
                        } catch {
                          // Fallback without URL if fetch fails
                          setPreviewDoc({ 
                            id: metadata.documentId, 
                            name: metadata.documentName || item.title, 
                            requiresSignature: true, 
                            requiresAck: false 
                          });
                        }
                      } else {
                        toast.error('Document data not available');
                      }
                    }
                  });
                }
              } catch {
                // Skip this action item if we can't verify fields
              }
            }
          } else if (item.type === 'DOCUMENT_ACKNOWLEDGEMENT') {
            // Document acknowledgement tasks - open acknowledgement modal
            const metadata = item.metadata || {};
            items.push({
              id: `action-${item.id}`,
              type: "document",
              title: item.title,
              subtitle: metadata.documentCategory || "Acknowledgement required",
              urgent: item.priority === "HIGH" || (item.dueDate && new Date(item.dueDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
              metadata: { ...item, documentId: metadata.documentId, documentName: metadata.documentName },
              actionLabel: "Review",
              onAction: async () => {
                // Open acknowledgement modal with document
                if (metadata.documentId) {
                  // Fetch the document URL for preview
                  try {
                    const docRes = await tenantFetch(`/api/documents/signed-url/${metadata.documentId}`);
                    const docData = await docRes.json();
                    setPreviewDoc({ 
                      id: metadata.documentId, 
                      name: metadata.documentName || item.title, 
                      url: docData?.url || undefined,
                      requiresSignature: metadata.requiresSignature || false, 
                      requiresAck: true 
                    });
                  } catch {
                    // Fallback without URL if fetch fails
                    setPreviewDoc({ 
                      id: metadata.documentId, 
                      name: metadata.documentName || item.title, 
                      requiresSignature: metadata.requiresSignature || false, 
                      requiresAck: true 
                    });
                  }
                } else {
                  toast.error('Document data not available');
                }
              }
            });
          } else {
            // Regular workflow tasks
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
                const processingId = `action-${item.id}`;
                setProcessing(processingId);
                try {
                  const res = await fetch('/api/action-items', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: item.id, status: 'COMPLETED' }),
                  });
                  if (res.ok) {
                    toast.success('Task completed!');
                    mutateActionItems();
                  } else {
                    const bodyText = await res.text().catch(() => "");
                    let errorMessage = "";
                    try {
                      const parsed = bodyText ? JSON.parse(bodyText) : null;
                      errorMessage = parsed?.error || parsed?.message || parsed?.details || "";
                    } catch {
                      // ignore parse errors
                    }

                    if (!errorMessage) {
                      errorMessage = bodyText;
                    }

                    toast.error(errorMessage || "Failed to complete task");
                  }
                } catch (error) {
                  toast.error('Failed to complete task');
                } finally {
                  setProcessing((current) => (current === processingId ? null : current));
                }
              }
            });
          }
        }
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
          ...(Array.isArray(companyDocsPaged?.items) ? companyDocsPaged.items : [])
        ];

        const uniqueDocs = new Map<string, any>();
        allDocs.forEach(d => d?.id && !uniqueDocs.has(d.id) && uniqueDocs.set(d.id, d));

        // Get document IDs that already have action items from the database to avoid duplicates
        const dbDocumentIds = new Set<string>();
        if (dbActionItems?.success && Array.isArray(dbActionItems.data)) {
          dbActionItems.data.forEach((item: any) => {
            if ((item.type === 'DOCUMENT_SIGNATURE' || item.type === 'DOCUMENT_ACKNOWLEDGEMENT') && item.metadata?.documentId) {
              dbDocumentIds.add(item.metadata.documentId);
            }
          });
        }

        const docsToCheck = Array.from(uniqueDocs.values())
          .filter(d => d?.requiresAck || d?.requiresSignature)
          // Skip documents that already have database action items
          .filter(d => !dbDocumentIds.has(d.id))
          .slice(0, 20);

        const checks = await Promise.all(
          docsToCheck.map(async (doc) => {
            if (doc.requiresAck) {
              try {
                const r = await tenantFetch(`/api/documents/acknowledge/${doc.id}/me`, { cache: "no-store" });
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
                      setPreviewDoc({ id: doc.id, name: doc.name, url: doc.url, requiresAck: true, requiresSignature: false });
                    }
                  };
                }
              } catch {
                return null;
              }
            }

            if (doc.requiresSignature) {
              try {
                // First check if signature fields have been placed on the document
                // Don't show action item if admin hasn't finished setting up the document
                const fieldsRes = await tenantFetch(`/api/documents/signature-fields/${doc.id}`, { cache: "no-store" });
                const fieldsData = await fieldsRes.json();
                const hasFields = Array.isArray(fieldsData) && fieldsData.length > 0;
                
                // Skip this document if no signature fields have been placed yet
                if (!hasFields) {
                  return null;
                }

                const r = await tenantFetch(`/api/documents/signatures/${doc.id}/me`, { cache: "no-store" });
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
                      setPreviewDoc({ id: doc.id, name: doc.name, url: doc.url, requiresSignature: true, requiresAck: doc.requiresAck });
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

      // Process approvals (for all users)
      if (approvals?.items) {
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
              // Check if this is a leave/holiday approval
              if (approval.type === 'LEAVE' || approval.source === 'leave') {
                // Open the detailed holiday approval modal
                setHolidayApprovalId(approval.id);
              } else {
                // Other types use the generic dialog
                setSelectedItem({
                  id: `approval-${approval.id}`,
                  type: "approval",
                  title: approval.title || approval.type || "Approval request",
                  subtitle: approval.employee?.name || approval.dates,
                  metadata: approval
                });
              }
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

      // Only update state if this effect run is still valid (prevents race conditions)
      if (isStale) return;

      setActionItems(items);
      // Mark initial load as complete after first successful processing
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    };

    processActions();

    // Cleanup: mark this effect run as stale if dependencies change before async completes
    return () => {
      isStale = true;
    };
  }, [dbActionItems, onboardingData, employeeDocs, companyDocsPaged, loadingEmpDocs, loadingCompanyDocs, txnRequests, approvals, isManager, mutateActionItems, isLoadingSession, tenantFetch]);

  const handleQuickApprove = async () => {
    setProcessing("quick-approve");
    try {
      const approvableItems = actionItems.filter(item =>
        item.type === "approval"
      );

      for (const item of approvableItems) {
        await fetch(`/api/approvals/${item.metadata.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" })
        });
      }

      toast.success(`${approvableItems.length} items approved`);
      mutateApprovals?.();
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
        // Check if it's a timesheet approval
        if (item.metadata.type === 'TIMESHEET_APPROVAL') {
          const timesheetId = item.metadata.metadata?.timesheetId;
          if (!timesheetId) {
            toast.error("Timesheet ID not found");
            setProcessing(null);
            return;
          }

          if (action === "decline") {
            const reason = prompt("Please provide a reason for rejecting this timesheet:");
            if (!reason || reason.trim() === "") {
              setProcessing(null);
              return;
            }

            const res = await fetch(`/api/timesheets/${timesheetId}/reject`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason })
            });

            const result = await res.json();

            if (result.success) {
              toast.success("Timesheet rejected");
            } else {
              toast.error(result.error || "Failed to reject timesheet");
            }
            // Always refresh to remove orphaned action items that may have been cleaned up
            mutateActionItems?.();
          } else {
            // Approve
            const res = await fetch(`/api/timesheets/${timesheetId}/approve`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({})
            });

            const result = await res.json();

            if (result.success) {
              toast.success("Timesheet approved");
            } else {
              toast.error(result.error || "Failed to approve timesheet");
            }
            // Always refresh to remove orphaned action items that may have been cleaned up
            mutateActionItems?.();
          }
        }
        // Check if it's an AI bulk update approval
        else if (item.metadata.type === 'BULK_UPDATE_APPROVAL') {
          const reason = action === "decline" ? prompt("Reason for declining this bulk update:") : undefined;
          if (action === "decline" && !reason) {
            setProcessing(null);
            return;
          }

          const decision = action === "approve" ? "approve" : "reject";
          const res = await fetch(`/api/action-items/${item.metadata.id}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision, reason })
          });

          const result = await res.json();

          if (result.success) {
            toast.success(action === "approve"
              ? `✅ Approved! ${result.data?.changesApplied || 0} employees updated`
              : "Request declined");
            mutateActionItems?.();
          } else {
            toast.error(result.error || "Failed to process request");
          }
        } else {
          // Regular leave approval
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
        }
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
  const hasQuickApprovable = actionItems.some(item => item.type === "approval");

  return (
    <>
      <DashboardWidget
        title="Action items"
        icon={CheckCircle}
        className={className}
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
        {isLoadingData ? (
          <WidgetLoading />
        ) : pendingCount === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500/20" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No actions required at the moment</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayItems.map((item) => {
              const iconConfig = getActionItemIconConfig(item);
              const ItemIcon = iconConfig.icon;
              
              return (
              <div
                key={item.id}
                className="group relative flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all cursor-pointer"
                onClick={() => {
                  if (item.type === "approval" && (item.metadata.type === 'LEAVE' || item.metadata.source === 'leave')) {
                    // Open holiday approval modal for leave requests
                    setHolidayApprovalId(item.metadata.id);
                  } else if (item.type === "approval" && item.metadata.isTimesheetApproval) {
                    // Open timesheet approval modal
                    const timesheetId = item.metadata.metadata?.timesheetId;
                    if (timesheetId) {
                      setTimesheetApprovalId(timesheetId);
                      setTimesheetActionItemId(item.metadata.id);
                    }
                  } else if (item.type === "approval") {
                    setSelectedItem(item);
                  } else if (item.type === "change") {
                    setSelectedChangeRequest(item.metadata);
                  } else if (item.onAction) {
                    item.onAction();
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Action item type icon */}
                  <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${iconConfig.bgColor} flex items-center justify-center relative`}>
                    <ItemIcon className={`w-4.5 h-4.5 ${iconConfig.iconColor}`} />
                    {item.urgent && (
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.type === "approval" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e: React.MouseEvent) => {
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
                    onClick={async (e: React.MouseEvent) => {
                      e.stopPropagation();
                      if (item.type === "approval" && (item.metadata.type === 'LEAVE' || item.metadata.source === 'leave')) {
                        // Open holiday approval modal for leave requests
                        setHolidayApprovalId(item.metadata.id);
                      } else if (item.type === "approval" && item.metadata.isTimesheetApproval) {
                        // Open timesheet approval modal
                        const timesheetId = item.metadata.metadata?.timesheetId;
                        if (timesheetId) {
                          setTimesheetApprovalId(timesheetId);
                          setTimesheetActionItemId(item.metadata.id);
                        }
                      } else if (item.type === "approval") {
                        await handleItemAction(item, "approve");
                      } else if (item.type === "change") {
                        setSelectedChangeRequest(item.metadata);
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
                      item.type === "approval"
                        ? "Approve"
                        : item.type === "change"
                          ? (item.actionLabel || "Review")
                          : (item.actionLabel || "Open")
                    )}
                  </Button>
                </div>
              </div>
            );
            })}

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

      {/* Document Acknowledgment Modal (New Sleek Version) */}
      <DocumentAcknowledgmentModal
        open={!!previewDoc && !!previewDoc.requiresAck && !previewDoc.requiresSignature}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        doc={previewDoc}
        onAcknowledge={async (docId) => {
          await tenantFetch("/api/documents/acknowledge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId: docId })
          });
          // Update local state and trigger re-fetch
          mutateActionItems();
          setActionItems(prev => prev.filter(item => !item.id.includes(docId)));
        }}
      />

      {/* Document Preview Dialog (Signature Only) */}
      <Dialog open={!!previewDoc && (!!previewDoc.requiresSignature || !previewDoc.requiresAck)} onOpenChange={(open) => {
        if (!open) {
          setPreviewDoc(null);
          setSignatureValue(null);
          setDocumentFields([]);
          setFieldValues({});
          setSignSubmitting(false);
        }
      }}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle>{previewDoc?.name || "Document"}</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* PDF Preview with Field Overlays */}
              <div className="flex-1 relative bg-slate-100 overflow-auto p-4">
                {previewDoc.url ? (
                  <div className="relative w-full h-full min-h-[70vh]">
                    <iframe
                      src={`${previewDoc.url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                      className="absolute inset-0 w-full h-full rounded-lg border shadow-sm bg-white"
                      title="Document Preview"
                      style={{ minHeight: "100%" }}
                    />
                    {/* Field Overlays - Visual indicators where fields are placed */}
                    {documentFields.map((field) => {
                      const theme = getFieldTheme(field.label);
                      const fieldType = getFieldType(field.label);
                      const Icon = theme.icon;
                      const isFilled = fieldType === "signature" 
                        ? !!signatureValue 
                        : !!fieldValues[field.id]?.trim();
                      
                      return (
                        <div
                          key={field.id}
                          className={`absolute pointer-events-none ${theme.border} ${theme.bg} border-2 rounded-lg flex items-center justify-center transition-all ${isFilled ? 'opacity-60' : 'opacity-90 animate-pulse'}`}
                          style={{
                            left: `${field.x * 100}%`,
                            top: `${field.y * 100}%`,
                            width: `${field.width * 100}%`,
                            height: `${field.height * 100}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <div className="flex items-center gap-2 px-2">
                            <span className={`flex items-center justify-center w-6 h-6 rounded-full ${theme.iconBg}`}>
                              <Icon className="w-3 h-3" />
                            </span>
                            <span className="text-xs font-medium text-gray-700 truncate">
                              {isFilled ? (
                                fieldType === "signature" ? "✓ Signed" : fieldValues[field.id]
                              ) : (
                                field.label || "Field"
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Preview not available</p>
                )}
              </div>

              {/* Signature Section - Right Panel */}
              {previewDoc.requiresSignature && (
                <div className="w-full lg:w-[400px] flex-shrink-0 border-t lg:border-t-0 lg:border-l overflow-y-auto bg-white">
                  <div className="p-6 space-y-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-indigo-600" />
                        Complete Document
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {loadingFields ? "Loading fields..." : 
                          documentFields.length === 0 ? "No fields placed on this document" :
                          "Please fill in all required fields below"
                        }
                      </p>
                    </div>

                    {/* Dynamic Field Inputs based on what was placed */}
                    {documentFields.length > 0 && (
                      <div className="space-y-4">
                        {/* Name Fields */}
                        {documentFields.filter(f => getFieldType(f.label) === "name").map((field) => (
                          <div key={field.id} className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <span className={`flex items-center justify-center w-5 h-5 rounded-full ${fieldThemes.name.iconBg}`}>
                                <UserRound className="w-3 h-3" />
                              </span>
                              {field.label || "Full Name"}
                            </Label>
                            <Input 
                              placeholder="Enter your full legal name" 
                              value={fieldValues[field.id] || ""} 
                              onChange={(e) => setFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                              className="bg-white"
                            />
                          </div>
                        ))}

                        {/* Job Role Fields */}
                        {documentFields.filter(f => getFieldType(f.label) === "job").map((field) => (
                          <div key={field.id} className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <span className={`flex items-center justify-center w-5 h-5 rounded-full ${fieldThemes.job.iconBg}`}>
                                <Briefcase className="w-3 h-3" />
                              </span>
                              {field.label || "Job Role"}
                            </Label>
                            <Input 
                              placeholder="Enter your job title/role" 
                              value={fieldValues[field.id] || ""} 
                              onChange={(e) => setFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                              className="bg-white"
                            />
                          </div>
                        ))}

                        {/* Signature Fields - Always show when document requires signature */}
                        {previewDoc?.requiresSignature && (
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <span className={`flex items-center justify-center w-5 h-5 rounded-full ${fieldThemes.signature.iconBg}`}>
                                <PenLine className="w-3 h-3" />
                              </span>
                              Signature <span className="text-red-500">*</span>
                            </Label>
                            <ModernSignatureCapture
                              value={signatureValue}
                              onChange={setSignatureValue}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 pt-4 border-t">
                      <Button
                        disabled={!allFieldsFilled || signSubmitting}
                        loading={signSubmitting}
                        onClick={async () => {
                          if (!previewDoc) return;
                          setSignSubmitting(true);
                          try {
                            // Get the name value to use for typed signature
                            const nameField = documentFields.find(f => getFieldType(f.label) === "name");
                            const nameValue = nameField ? fieldValues[nameField.id] : "";
                            
                            const res = await tenantFetch("/api/documents/sign", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                documentId: previewDoc.id,
                                method: signatureValue?.method || "TYPED",
                                typedText: signatureValue?.typedText || nameValue,
                                drawnDataUrl: signatureValue?.dataUrl,
                                fieldValues: fieldValues, // Send all field values
                              })
                            });
                            if (res.ok) {
                              toast.success("Document signed successfully!");
                              mutateActionItems();
                              setActionItems(prev => prev.filter(item =>
                                !item.id.includes(previewDoc.id)
                              ));
                              setPreviewDoc(null);
                              setSignatureValue(null);
                              setDocumentFields([]);
                              setFieldValues({});
                            } else {
                              toast.error("Failed to sign document");
                            }
                          } catch {
                            toast.error("Failed to sign document");
                          } finally {
                            setSignSubmitting(false);
                          }
                        }}
                        className="w-full"
                      >
                        {signSubmitting ? "Signing..." : "Sign Document"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setPreviewDoc(null);
                          setSignatureValue(null);
                          setDocumentFields([]);
                          setFieldValues({});
                        }}
                        className="w-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Acknowledgement Only (no signature) */}
              {!previewDoc.requiresSignature && previewDoc.requiresAck && (
                <div className="w-full lg:w-[300px] flex-shrink-0 border-t lg:border-t-0 lg:border-l p-6 bg-white">
                  <Button
                    onClick={async () => {
                      if (!previewDoc) return;
                      try {
                        await tenantFetch("/api/documents/acknowledge", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ documentId: previewDoc.id })
                        });
                        toast.success("Document acknowledged");
                        mutateActionItems();
                        setActionItems(prev => prev.filter(item =>
                          !item.id.includes(previewDoc.id)
                        ));
                        setPreviewDoc(null);
                      } catch {
                        toast.error("Failed to acknowledge document");
                      }
                    }}
                    className="w-full"
                  >
                    Acknowledge & Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TransactionalChangeReviewModal
        open={!!selectedChangeRequest}
        item={selectedChangeRequest}
        processing={changeProcessing}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedChangeRequest(null);
          }
        }}
        onApprove={async () => {
          if (!selectedChangeRequest) return;
          setChangeProcessing(true);
          try {
            const res = await fetch(`/api/transactional-change-requests`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: selectedChangeRequest.id, action: "approve" })
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              toast.error(data?.error || "Failed to approve change");
              return;
            }
            toast.success("Change approved");
            mutateTxn?.();
            setActionItems(prev => prev.filter(i => i.metadata?.id !== selectedChangeRequest.id));
            setSelectedChangeRequest(null);
          } catch {
            toast.error("Failed to approve change");
          } finally {
            setChangeProcessing(false);
          }
        }}
        onDecline={async () => {
          if (!selectedChangeRequest) return;
          const comment = prompt("Reason for declining:");
          if (!comment) return;
          setChangeProcessing(true);
          try {
            const res = await fetch(`/api/transactional-change-requests`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: selectedChangeRequest.id, action: "decline", comment })
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              toast.error(data?.error || "Failed to decline change");
              return;
            }
            toast.success("Change declined");
            mutateTxn?.();
            setActionItems(prev => prev.filter(i => i.metadata?.id !== selectedChangeRequest.id));
            setSelectedChangeRequest(null);
          } catch {
            toast.error("Failed to decline change");
          } finally {
            setChangeProcessing(false);
          }
        }}
      />

      {/* Holiday Approval Modal */}
      <HolidayApprovalModal
        decisionId={holidayApprovalId}
        open={!!holidayApprovalId}
        onOpenChange={(open) => !open && setHolidayApprovalId(null)}
        onApprove={async () => {
          if (!holidayApprovalId) return;
          setProcessing(holidayApprovalId);
          try {
            await fetch(`/api/approvals/${holidayApprovalId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "approve" })
            });
            toast.success("Holiday approved");
            mutateApprovals?.();
            setActionItems(prev => prev.filter(i => i.metadata?.id !== holidayApprovalId));
            setHolidayApprovalId(null);
          } catch (error) {
            toast.error("Failed to approve holiday");
          } finally {
            setProcessing(null);
          }
        }}
        onDecline={async () => {
          if (!holidayApprovalId) return;
          const comment = prompt("Reason for declining:");
          if (!comment) return;

          setProcessing(holidayApprovalId);
          try {
            await fetch(`/api/approvals/${holidayApprovalId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "decline", comment })
            });
            toast.success("Holiday declined");
            mutateApprovals?.();
            setActionItems(prev => prev.filter(i => i.metadata?.id !== holidayApprovalId));
            setHolidayApprovalId(null);
          } catch (error) {
            toast.error("Failed to decline holiday");
          } finally {
            setProcessing(null);
          }
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
          setProcessing(timesheetApprovalId);
          try {
            const res = await fetch(`/api/timesheets/${timesheetApprovalId}/approve`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({})
            });
            const result = await res.json();
            if (result.success) {
              toast.success("Timesheet approved");
              mutateActionItems?.();
              setActionItems(prev => prev.filter(i => 
                !(i.metadata?.metadata?.timesheetId === timesheetApprovalId || i.metadata?.id === timesheetActionItemId)
              ));
            } else {
              toast.error(result.error || "Failed to approve timesheet");
            }
          } catch (error) {
            toast.error("Failed to approve timesheet");
          } finally {
            setProcessing(null);
            setTimesheetApprovalId(null);
            setTimesheetActionItemId(null);
          }
        }}
        onDecline={async () => {
          if (!timesheetApprovalId) return;
          const reason = prompt("Please provide a reason for rejecting this timesheet:");
          if (!reason || reason.trim() === "") return;

          setProcessing(timesheetApprovalId);
          try {
            const res = await fetch(`/api/timesheets/${timesheetApprovalId}/reject`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason })
            });
            const result = await res.json();
            if (result.success) {
              toast.success("Timesheet rejected");
              mutateActionItems?.();
              setActionItems(prev => prev.filter(i => 
                !(i.metadata?.metadata?.timesheetId === timesheetApprovalId || i.metadata?.id === timesheetActionItemId)
              ));
            } else {
              toast.error(result.error || "Failed to reject timesheet");
            }
          } catch (error) {
            toast.error("Failed to reject timesheet");
          } finally {
            setProcessing(null);
            setTimesheetApprovalId(null);
            setTimesheetActionItemId(null);
          }
        }}
      />
    </>
  );
}
