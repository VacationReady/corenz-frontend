import React from "react";
import Button from "@/components/ui/Button";
import { actionTypes } from "../config/actionTypes";

export function NodePropertiesPanel({
  node,
  onUpdate,
  onClose,
}: {
  node: any;
  onUpdate: (updates: any) => void;
  onClose: () => void;
}) {
  if (!node) {
    return (
      <div className="p-4 text-center">
        <div className="text-xs text-muted-foreground">Click a node to edit its properties</div>
      </div>
    );
  }
  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="text-sm font-semibold">{node.data?.label ?? node.type}</div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1">Display Name</label>
          <input
            className="w-full rounded-xl border px-3 py-2 text-sm"
            value={node.data?.label ?? ""}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder={`e.g., ${node.type === "trigger" ? "When employee joins" : node.type === "action" ? "Send welcome email" : node.type}`}
          />
        </div>
        {node.type === "trigger" && (
          <div>
            <label className="block text-xs font-medium mb-1">Trigger Event</label>
            <select
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={node.data?.config?.triggerType || "EMPLOYEE_CREATED"}
              onChange={(e) => onUpdate({ config: { ...(node.data?.config || {}), triggerType: e.target.value } })}
            >
              <option value="EMPLOYEE_CREATED">Employee Created</option>
              <option value="EMPLOYEE_START_DATE">Employee Start Date</option>
              <option value="DOCUMENT_EXPIRING">Document Expiring</option>
              <option value="FORM_SUBMITTED">Form Submitted</option>
              <option value="LEAVE_REQUEST">Leave Request</option>
              <option value="CONTRACT_EXPIRING">Contract Expiring</option>
              <option value="PERFORMANCE_REVIEW_COMPLETED">Performance Review Completed</option>
              <option value="ONBOARDING_STEP_COMPLETED">Onboarding Step Completed</option>
              <option value="SCHEDULED">Scheduled (Cron)</option>
              <option value="MANUAL">Manual Trigger</option>
            </select>
          </div>
        )}
        {node.type === "action" && (
          <>
            <div>
              <label className="block text-xs font-medium mb-1">Action Type</label>
              <select
                className="w-full rounded-xl border px-3 py-2 text-sm"
                value={node.data?.actionType || "send_notification"}
                onChange={(e) => onUpdate({ actionType: e.target.value })}
              >
                <optgroup label="Communication">
                  <option value="send_email">📧 Send Email</option>
                  <option value="send_manager_reminder">👤 Remind Manager</option>
                </optgroup>
                <optgroup label="Action Items">
                  <option value="create_action_item">✅ Create Action Item</option>
                </optgroup>
                <optgroup label="Forms & Documents">
                  <option value="assign_form">📝 Assign Form</option>
                  <option value="request_document_upload">📎 Request Document Upload</option>
                  <option value="request_document_acknowledgement">✍️ Request Doc Acknowledgement</option>
                </optgroup>
                <optgroup label="Offboarding">
                  <option value="create_offboarding_task">🚪 Add Offboarding Task</option>
                </optgroup>
                <optgroup label="Employee Updates">
                  <option value="update_employee_field">✏️ Update Field</option>
                  <option value="adjust_leave_balance">🏝️ Adjust Leave Balance</option>
                </optgroup>
                <optgroup label="Training & Performance">
                  <option value="assign_training">🎓 Assign Training</option>
                  <option value="schedule_review">⭐ Schedule Review</option>
                </optgroup>
                <optgroup label="Security">
                  <option value="update_permissions">🔒 Update Permissions</option>
                </optgroup>
                <optgroup label="Integrations">
                  <option value="webhook">🔗 Call Webhook</option>
                </optgroup>
              </select>
            </div>
            <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded-lg">
              {actionTypes.find(a => a.id === (node.data?.actionType || "send_notification"))?.description || "Configure action details"}
            </div>
          </>
        )}
        {node.type === "delay" && (
          <div>
            <label className="block text-xs font-medium mb-1">Delay Duration (days)</label>
            <input
              type="number"
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={node.data?.config?.days || 1}
              onChange={(e) => onUpdate({ config: { ...(node.data?.config || {}), days: parseInt(e.target.value) || 1 } })}
              min="0"
              max="365"
            />
          </div>
        )}
      </div>
      <div className="pt-3 border-t text-[10px] text-muted-foreground">
        Node ID: {node.id}
      </div>
    </div>
  );
}


