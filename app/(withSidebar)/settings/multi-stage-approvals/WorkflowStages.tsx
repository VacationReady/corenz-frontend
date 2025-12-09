"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Check, ChevronsUpDown, User } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface WorkflowStagesProps {
  stages: any[];
  onChange: (stages: any[]) => void;
  employees: { id: string; name: string }[];
}

export function WorkflowStages({ stages, onChange, employees }: WorkflowStagesProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = stages.findIndex((s) => s.id === active.id);
      const newIndex = stages.findIndex((s) => s.id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newStages = arrayMove(stages, oldIndex, newIndex).map((s, idx) => ({
            ...s,
            order: idx
        }));
        onChange(newStages);
      }
    }
  };

  const addStage = () => {
    const newStage = {
      id: `stage-${Date.now()}`,
      order: stages.length,
      approvers: [{ type: "MANAGER", userId: undefined, order: 0 }],
    };
    onChange([...stages, newStage]);
  };

  const updateStage = (id: string, updates: any) => {
    onChange(stages.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeStage = (id: string) => {
    onChange(stages.filter((s) => s.id !== id).map((s, idx) => ({ ...s, order: idx })));
  };

  // Ensure stages have IDs for DnD
  const stagesWithIds = useMemo(() => {
    return stages.map((s, i) => ({
      ...s,
      id: s.id || `stage-${i}-${Date.now()}`, // Fallback ID if missing
    }));
  }, [stages]);

  // Sync IDs back if we generated them? 
  // Actually, we should probably ensure IDs exist in the parent or handle it here.
  // For now, let's use the index-based strategy if IDs are missing, but DnD needs stable IDs.
  // We'll assume the parent can handle the updated stages with IDs if we pass them back.
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
            <h3 className="text-sm font-medium text-foreground">Approval Stages</h3>
            <p className="text-xs text-muted-foreground">
                Drag to reorder. Each stage must be approved before moving to the next.
            </p>
        </div>
        <Button size="sm" variant="outline" onClick={addStage}>
          Add Stage
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={stagesWithIds.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {stagesWithIds.map((stage, index) => (
              <SortableStageItem
                key={stage.id}
                id={stage.id}
                stage={stage}
                index={index}
                employees={employees}
                onUpdate={(updates) => updateStage(stage.id, updates)}
                onRemove={() => removeStage(stage.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      {stages.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
            No stages defined. Add a stage to start the approval flow.
        </div>
      )}
    </div>
  );
}

function SortableStageItem({
  id,
  stage,
  index,
  employees,
  onUpdate,
  onRemove,
}: {
  id: string;
  stage: any;
  index: number;
  employees: { id: string; name: string }[];
  onUpdate: (updates: any) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? "relative" as const : undefined,
  };

  const approver = stage.approvers?.[0] || {};
  const [open, setOpen] = useState(false);

  // Sort employees alphabetically
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  const selectedValue = approver.type === "MANAGER" ? "MANAGER" : approver.userId;
  
  const getLabel = (val: string) => {
      if (val === "MANAGER") return "Line Manager";
      return employees.find(e => e.id === val)?.name || "Select approver...";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 p-3 bg-white rounded-lg border shadow-sm transition-all hover:border-primary/20",
        isDragging && "shadow-lg ring-2 ring-primary/20 rotate-1"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
        {index + 1}
      </div>

      <div className="flex-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
            >
              <span className="flex items-center gap-2 truncate">
                <User className="w-4 h-4 text-muted-foreground" />
                {getLabel(selectedValue)}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search approver..." />
              <CommandList>
                <CommandEmpty>No approver found.</CommandEmpty>
                <CommandGroup heading="Roles">
                  <CommandItem
                    value="Line Manager"
                    onSelect={() => {
                      onUpdate({
                        approvers: [{ type: "MANAGER", userId: undefined, order: 0 }],
                      });
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedValue === "MANAGER" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Line Manager
                  </CommandItem>
                </CommandGroup>
                <CommandGroup heading="Specific Employees">
                  {sortedEmployees.map((employee) => (
                    <CommandItem
                      key={employee.id}
                      value={employee.name}
                      onSelect={() => {
                        onUpdate({
                          approvers: [{ type: "USER", userId: employee.id, order: 0 }],
                        });
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedValue === employee.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {employee.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}



















