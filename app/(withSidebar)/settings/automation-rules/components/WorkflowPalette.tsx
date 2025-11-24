"use client";

import React from "react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Zap, Filter, PlayCircle, Clock, GitBranch, Repeat, ChevronLeft } from "lucide-react";

interface PaletteItem {
  id: string;
  label: string;
  help: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const items: PaletteItem[] = [
  { 
    id: "trigger", 
    label: "Trigger", 
    help: "Starts the workflow", 
    icon: <Zap className="w-5 h-5" strokeWidth={2} />, 
    color: "text-blue-600", 
    bgColor: "bg-blue-50 group-hover:bg-blue-100" 
  },
  { 
    id: "condition", 
    label: "Condition", 
    help: "Filter or branch by logic", 
    icon: <Filter className="w-5 h-5" strokeWidth={2} />, 
    color: "text-amber-600", 
    bgColor: "bg-amber-50 group-hover:bg-amber-100" 
  },
  { 
    id: "action", 
    label: "Action", 
    help: "Sends messages, creates tasks, etc.", 
    icon: <PlayCircle className="w-5 h-5" strokeWidth={2} />, 
    color: "text-green-600", 
    bgColor: "bg-green-50 group-hover:bg-green-100" 
  },
  { 
    id: "delay", 
    label: "Delay", 
    help: "Pause before continuing", 
    icon: <Clock className="w-5 h-5" strokeWidth={2} />, 
    color: "text-purple-600", 
    bgColor: "bg-purple-50 group-hover:bg-purple-100" 
  },
  { 
    id: "branch", 
    label: "Branch", 
    help: "Split into parallel paths", 
    icon: <GitBranch className="w-5 h-5" strokeWidth={2} />, 
    color: "text-pink-600", 
    bgColor: "bg-pink-50 group-hover:bg-pink-100" 
  },
  { 
    id: "loop", 
    label: "Loop", 
    help: "Repeat over a list", 
    icon: <Repeat className="w-5 h-5" strokeWidth={2} />, 
    color: "text-sky-600", 
    bgColor: "bg-sky-50 group-hover:bg-sky-100" 
  },
];

function DraggablePaletteItem({ item }: { item: PaletteItem }) {
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    // Set the data that EnhancedWorkflowCanvas expects
    event.dataTransfer.setData("application/reactflow", item.id);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "group rounded-xl px-3 py-2.5 text-sm cursor-grab active:cursor-grabbing",
        "border border-transparent hover:border-primary/20 hover:shadow-md",
        "bg-white/60 hover:bg-white/90 backdrop-blur-sm",
        "transition-all duration-200 select-none",
        "active:scale-95 active:shadow-lg active:ring-2 active:ring-primary/30"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className={cn("p-2 rounded-lg transition-colors flex-shrink-0", item.bgColor)}>
          <div className={item.color}>
            {item.icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground/90 group-hover:text-foreground">
            {item.label}
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight">
            {item.help}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkflowPalette({ onCollapse }: { onCollapse: () => void }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <span className="text-sm font-medium">Node Palette</span>
        <Button variant="ghost" size="sm" onClick={onCollapse} className="h-8 w-8 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-3 text-xs text-muted-foreground border-b bg-blue-50/50">
        <strong>Drag</strong> nodes onto the canvas. <strong>Connect</strong> from the bottom handle.
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div className="grid gap-2">
          {items.map((item) => (
            <DraggablePaletteItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
