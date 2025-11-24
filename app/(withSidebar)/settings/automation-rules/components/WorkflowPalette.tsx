import React from "react";
import Button from "@/components/ui/Button";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface PaletteItem {
  id: string;
  label: string;
  help: string;
}

const items: PaletteItem[] = [
  { id: "trigger", label: "Trigger", help: "Starts the workflow" },
  { id: "condition", label: "Condition", help: "Filter or branch by logic" },
  { id: "action", label: "Action", help: "Sends messages, creates tasks, etc." },
  { id: "delay", label: "Delay", help: "Pause before continuing" },
  { id: "branch", label: "Branch", help: "Split into parallel paths" },
  { id: "loop", label: "Loop", help: "Repeat over a list" },
];

function DraggablePaletteItem({ item }: { item: PaletteItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${item.id}`,
    data: { type: item.id, label: item.label },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "glass-subtle rounded-xl px-3 py-2 text-sm cursor-grab active:cursor-grabbing border border-transparent hover:border-primary/20 transition-all",
        isDragging && "opacity-50"
      )}
    >
      <div className="font-medium">{item.label}</div>
      <div className="text-[11px] text-muted-foreground">{item.help}</div>
    </div>
  );
}

export function WorkflowPalette({ onCollapse }: { onCollapse: () => void }) {
  return (
    <div className="p-2">
      <Button variant="ghost" size="sm" onClick={onCollapse} className="w-full">
        Collapse
      </Button>
      <div className="text-xs text-muted-foreground mt-2">Drag onto the canvas. Connect from the bottom handle.</div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <DraggablePaletteItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}


