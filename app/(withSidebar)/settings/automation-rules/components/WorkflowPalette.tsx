import React from "react";
import Button from "@/components/ui/Button";

export function WorkflowPalette({ onCollapse }: { onCollapse: () => void }) {
  const items = [
    { id: "trigger", label: "Trigger" },
    { id: "condition", label: "Condition" },
    { id: "action", label: "Action" },
    { id: "delay", label: "Delay" },
    { id: "branch", label: "Branch" },
    { id: "loop", label: "Loop" },
  ];

  return (
    <div className="p-2">
      <Button variant="ghost" size="sm" onClick={onCollapse} className="w-full">
        Collapse
      </Button>
      <div className="text-xs text-muted-foreground mt-2">Drag nodes onto the canvas</div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("application/reactflow", item.id)}
            className="glass-subtle rounded-xl px-3 py-2 text-sm cursor-grab active:cursor-grabbing"
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}


