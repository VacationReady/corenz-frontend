import React from "react";
import Button from "@/components/ui/Button";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Zap, Filter, PlayCircle, Clock, GitBranch, Repeat } from "lucide-react";

interface PaletteItem {
  id: string;
  label: string;
  help: string;
  icon: React.ReactNode;
  color: string;
}

const items: PaletteItem[] = [
  { id: "trigger", label: "Trigger", help: "Starts the workflow", icon: <Zap className="w-4 h-4" />, color: "text-blue-500 bg-blue-50" },
  { id: "condition", label: "Condition", help: "Filter or branch by logic", icon: <Filter className="w-4 h-4" />, color: "text-amber-500 bg-amber-50" },
  { id: "action", label: "Action", help: "Sends messages, creates tasks, etc.", icon: <PlayCircle className="w-4 h-4" />, color: "text-green-500 bg-green-50" },
  { id: "delay", label: "Delay", help: "Pause before continuing", icon: <Clock className="w-4 h-4" />, color: "text-purple-500 bg-purple-50" },
  { id: "branch", label: "Branch", help: "Split into parallel paths", icon: <GitBranch className="w-4 h-4" />, color: "text-pink-500 bg-pink-50" },
  { id: "loop", label: "Loop", help: "Repeat over a list", icon: <Repeat className="w-4 h-4" />, color: "text-sky-500 bg-sky-50" },
];

function DraggablePaletteItem({ item }: { item: PaletteItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${item.id}`,
    data: { type: item.id, label: item.label },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    transition: isDragging ? undefined : "opacity 0.15s ease, box-shadow 0.15s ease",
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={cn(
        "glass-subtle rounded-xl px-3 py-2 text-sm border border-transparent hover:border-primary/20 hover:shadow-md select-none",
        isDragging && "ring-2 ring-primary/50 shadow-lg z-50"
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-lg", item.color)}>
          {item.icon}
        </div>
        <div>
          <div className="font-medium">{item.label}</div>
          <div className="text-[11px] text-muted-foreground">{item.help}</div>
        </div>
      </div>
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


