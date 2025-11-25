"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { 
  Zap, 
  Filter, 
  PlayCircle, 
  Clock, 
  GitBranch, 
  Repeat, 
  ChevronLeft, 
  Sparkles,
  GripVertical,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PaletteItem {
  id: string;
  label: string;
  help: string;
  icon: React.ReactNode;
  gradient: string;
  shadowColor: string;
  bgHover: string;
}

const items: PaletteItem[] = [
  { 
    id: "trigger", 
    label: "Trigger", 
    help: "Starts the workflow when an event occurs", 
    icon: <Zap className="w-5 h-5" strokeWidth={2.5} />, 
    gradient: "from-blue-500 to-indigo-600",
    shadowColor: "shadow-blue-500/30",
    bgHover: "hover:bg-blue-50/80"
  },
  { 
    id: "condition", 
    label: "Condition", 
    help: "Filter or branch based on criteria", 
    icon: <Filter className="w-5 h-5" strokeWidth={2} />, 
    gradient: "from-amber-500 to-orange-500",
    shadowColor: "shadow-amber-500/30",
    bgHover: "hover:bg-amber-50/80"
  },
  { 
    id: "action", 
    label: "Action", 
    help: "Send notifications, create tasks, and more", 
    icon: <PlayCircle className="w-5 h-5" strokeWidth={2} />, 
    gradient: "from-emerald-500 to-green-600",
    shadowColor: "shadow-emerald-500/30",
    bgHover: "hover:bg-emerald-50/80"
  },
  { 
    id: "delay", 
    label: "Delay", 
    help: "Wait a specified time before continuing", 
    icon: <Clock className="w-5 h-5" strokeWidth={2} />, 
    gradient: "from-violet-500 to-purple-600",
    shadowColor: "shadow-violet-500/30",
    bgHover: "hover:bg-violet-50/80"
  },
  { 
    id: "branch", 
    label: "Branch", 
    help: "Split workflow into parallel paths", 
    icon: <GitBranch className="w-5 h-5" strokeWidth={2} />, 
    gradient: "from-pink-500 to-rose-600",
    shadowColor: "shadow-pink-500/30",
    bgHover: "hover:bg-pink-50/80"
  },
  { 
    id: "loop", 
    label: "Loop", 
    help: "Repeat actions over a collection", 
    icon: <Repeat className="w-5 h-5" strokeWidth={2} />, 
    gradient: "from-cyan-500 to-sky-600",
    shadowColor: "shadow-cyan-500/30",
    bgHover: "hover:bg-cyan-50/80"
  },
];

function DraggablePaletteItem({ item, index }: { item: PaletteItem; index: number }) {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleNativeDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData("application/reactflow", item.id);
    event.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
    
    // Create custom drag image
    const dragPreview = document.createElement('div');
    dragPreview.className = 'fixed pointer-events-none';
    dragPreview.innerHTML = `
      <div class="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-2xl border-2 border-slate-200">
        <span class="font-semibold text-slate-800">${item.label}</span>
      </div>
    `;
    document.body.appendChild(dragPreview);
    event.dataTransfer.setDragImage(dragPreview, 40, 20);
    setTimeout(() => document.body.removeChild(dragPreview), 0);
  };
  
  const handleNativeDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, type: "spring" as const, stiffness: 300, damping: 25 }}
            draggable
            onDragStart={handleNativeDragStart as unknown as React.DragEventHandler}
            onDragEnd={handleNativeDragEnd as unknown as React.DragEventHandler}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group rounded-xl p-3 cursor-grab active:cursor-grabbing",
              "bg-white/80 backdrop-blur-sm border border-slate-200/60",
              "hover:border-slate-300 hover:shadow-lg transition-all duration-200",
              "active:shadow-xl active:ring-2 active:ring-primary/20",
              item.bgHover,
              isDragging && "opacity-50 scale-95"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-xl bg-gradient-to-br text-white shadow-lg transition-all duration-200",
                "group-hover:shadow-xl group-hover:scale-110",
                item.gradient,
                item.shadowColor
              )}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-800 group-hover:text-slate-900">
                  {item.label}
                </div>
                <div className="text-[11px] text-slate-500 leading-tight line-clamp-1">
                  {item.help}
                </div>
              </div>
              <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
            </div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className="max-w-[200px] bg-slate-900 text-white border-0 shadow-xl"
        >
          <p className="font-medium mb-1">{item.label}</p>
          <p className="text-xs text-slate-300">{item.help}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function WorkflowPalette({ onCollapse }: { onCollapse: () => void }) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50/50 to-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-slate-800">Components</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onCollapse} 
          className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg"
        >
          <ChevronLeft className="h-4 w-4 text-slate-500" />
        </Button>
      </div>
      
      {/* Instructions */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-3 mt-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100"
      >
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-800 leading-relaxed">
            <strong className="font-semibold">Drag</strong> components onto the canvas and{' '}
            <strong className="font-semibold">connect</strong> them to build your workflow.
          </p>
        </div>
      </motion.div>
      
      {/* Components List */}
      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-2">
          {items.map((item, index) => (
            <DraggablePaletteItem key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
      
      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-slate-200/60 bg-white/80">
        <p className="text-[10px] text-slate-400 text-center">
          Click a node on canvas to configure it
        </p>
      </div>
    </div>
  );
}
