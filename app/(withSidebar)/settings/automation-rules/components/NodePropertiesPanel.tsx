import React from "react";
import Button from "@/components/ui/Button";

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
      <div className="p-2 text-xs text-muted-foreground">Select a node to edit its properties</div>
    );
  }
  return (
    <div className="p-2 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{node.data?.label ?? node.type}</div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">Configure this {node.type}.</div>
      <div className="space-y-2">
        <label className="block text-xs">Label</label>
        <input
          className="w-full rounded-xl border px-2 py-1 text-sm"
          value={node.data?.label ?? ""}
          onChange={(e) => onUpdate({ label: e.target.value })}
        />
      </div>
      {node.type === "trigger" && (
        <div className="space-y-2">
          <label className="block text-xs">Trigger Type</label>
          <select
            className="w-full rounded-xl border px-2 py-1 text-sm"
            value={node.data?.config?.triggerType || "EMPLOYEE_CREATED"}
            onChange={(e) => onUpdate({ config: { ...(node.data?.config || {}), triggerType: e.target.value } })}
          >
            <option value="EMPLOYEE_CREATED">Employee Created</option>
            <option value="DOCUMENT_EXPIRING">Document Expiring</option>
            <option value="FORM_SUBMITTED">Form Submitted</option>
            <option value="EMPLOYEE_START_DATE">Employee Start Date</option>
          </select>
        </div>
      )}
      {node.type === "action" && (
        <div className="space-y-2">
          <label className="block text-xs">Action</label>
          <select
            className="w-full rounded-xl border px-2 py-1 text-sm"
            value={node.data?.actionType || "send_notification"}
            onChange={(e) => onUpdate({ actionType: e.target.value })}
          >
            <option value="send_notification">Send Notification</option>
            <option value="create_task">Create Task</option>
          </select>
        </div>
      )}
    </div>
  );
}


