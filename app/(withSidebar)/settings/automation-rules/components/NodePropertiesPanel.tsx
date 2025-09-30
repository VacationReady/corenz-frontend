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
    <div className="p-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{node.data?.label ?? node.type}</div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">Basic properties (stub)</div>
      <div className="space-y-2">
        <label className="block text-xs">Label</label>
        <input
          className="w-full rounded-xl border px-2 py-1 text-sm"
          value={node.data?.label ?? ""}
          onChange={(e) => onUpdate({ label: e.target.value })}
        />
      </div>
    </div>
  );
}


