import React from "react";
import Button from "@/components/ui/Button";

export function WorkflowPalette({ onCollapse }: { onCollapse: () => void }) {
  const items = [
    { id: "trigger", label: "Trigger", help: "Starts the workflow" },
    { id: "condition", label: "Condition", help: "Filter or branch by logic" },
    { id: "action", label: "Action", help: "Sends messages, creates tasks, etc." },
    { id: "delay", label: "Delay", help: "Pause before continuing" },
    { id: "branch", label: "Branch", help: "Split into parallel paths" },
    { id: "loop", label: "Loop", help: "Repeat over a list" },
  ];

  return (
    <div className="p-2">
      <Button variant="ghost" size="sm" onClick={onCollapse} className="w-full">
        Collapse
      </Button>
      <div className="text-xs text-muted-foreground mt-2">Drag onto the canvas. Connect from the bottom handle.</div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item.id}>
            <div
              draggable
              onDragStart={(e) => e.dataTransfer.setData("application/reactflow", item.id)}
              className="glass-subtle rounded-xl px-3 py-2 text-sm cursor-grab active:cursor-grabbing"
            >
              <div className="font-medium">{item.label}</div>
              <div className="text-[11px] text-muted-foreground">{item.help}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


