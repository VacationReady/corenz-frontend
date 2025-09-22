"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus,
  GripVertical,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Zap,
  Filter,
  PlayCircle,
  HelpCircle,
  Copy,
  Trash2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import {
  TriggerConfiguration,
  ConditionConfiguration,
  ActionConfiguration,
} from "./FlowNodeConfigurations";

// Type definitions
interface FlowBuilderProps {
  formData: any;
  setFormData: (data: any) => void;
  validationErrors: Record<string, string>;
  triggerTypes: any[];
  conditionTypes: any[];
  actionTypes: any[];
  formsOptions: { value: string; label: string }[];
  templatesOptions: { value: string; label: string }[];
  departmentsOptions: { value: string; label: string }[];
  jobRolesOptions: { value: string; label: string }[];
  usersOptions: { value: string; label: string }[];
  documentTypeOptions: { value: string; label: string }[];
  onSave: () => void;
  onCancel: () => void;
  onTest?: () => void;
  isFormValid: boolean;
  selectedRule?: any;
}

interface NodeProps {
  id: string;
  type: "trigger" | "condition" | "action";
  data: any;
  index?: number;
  onRemove?: () => void;
  onUpdate: (data: any) => void;
  onDuplicate?: () => void;
  errors?: string[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// Draggable Node Component
const DraggableNode: React.FC<NodeProps & { isDragging?: boolean }> = ({
  id,
  type,
  data,
  index,
  onRemove,
  onUpdate,
  onDuplicate,
  errors,
  isExpanded = true,
  onToggleExpand,
  isDragging = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getNodeIcon = () => {
    switch (type) {
      case "trigger":
        return <Zap className="w-4 h-4" />;
      case "condition":
        return <Filter className="w-4 h-4" />;
      case "action":
        return <PlayCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getNodeColor = () => {
    switch (type) {
      case "trigger":
        return "border-blue-200 bg-gradient-to-r from-blue-50 to-white";
      case "condition":
        return "border-amber-200 bg-gradient-to-r from-amber-50 to-white";
      case "action":
        return "border-green-200 bg-gradient-to-r from-green-50 to-white";
      default:
        return "";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group transition-all duration-200",
        isDragging && "z-50"
      )}
    >
      <Card 
        className={cn(
          "shadow-sm hover:shadow-md transition-shadow",
          getNodeColor(),
          errors && errors.length > 0 && "border-red-400"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {type !== "trigger" && (
                <button
                  {...attributes}
                  {...listeners}
                  className="cursor-grab hover:cursor-grabbing text-muted-foreground hover:text-foreground"
                  aria-label="Drag handle"
                >
                  <GripVertical className="w-4 h-4" />
                </button>
              )}
              <div className="flex items-center gap-2">
                {getNodeIcon()}
                <CardTitle className="text-sm font-medium">
                  {type === "trigger" && "Trigger"}
                  {type === "condition" && `Condition ${(index || 0) + 1}`}
                  {type === "action" && `Action ${(index || 0) + 1}`}
                </CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onDuplicate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDuplicate}
                  className="h-7 w-7 p-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className="h-7 w-7 p-0"
              >
                {isExpanded ? 
                  <ChevronUp className="w-3.5 h-3.5" /> : 
                  <ChevronDown className="w-3.5 h-3.5" />
                }
              </Button>
              {onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
          {!isExpanded && data.name && (
            <CardDescription className="text-xs mt-1 ml-6">
              {data.name || data.description}
            </CardDescription>
          )}
        </CardHeader>
        {isExpanded && (
          <CardContent className="pt-0 pb-4 px-4">
            <div className="space-y-3 text-sm">
              {/* Render configuration based on node type */}
              {type === "trigger" && data.triggerType && (
                <TriggerConfiguration
                  triggerType={data.triggerType}
                  triggerConfig={data.config || {}}
                  onUpdate={(config) => onUpdate({ ...data, config })}
                  triggerTypes={data.triggerTypes || []}
                  formsOptions={data.formsOptions || []}
                  documentTypeOptions={data.documentTypeOptions || []}
                  errors={data.errors || {}}
                />
              )}
              {type === "condition" && (
                <ConditionConfiguration
                  condition={data}
                  onUpdate={onUpdate}
                  conditionTypes={data.conditionTypes || []}
                  departmentsOptions={data.departmentsOptions || []}
                  jobRolesOptions={data.jobRolesOptions || []}
                  errors={data.errors || {}}
                />
              )}
              {type === "action" && (
                <ActionConfiguration
                  action={data}
                  onUpdate={onUpdate}
                  actionTypes={data.actionTypes || []}
                  templatesOptions={data.templatesOptions || []}
                  usersOptions={data.usersOptions || []}
                  errors={data.errors || {}}
                />
              )}
            </div>
            {errors && errors.length > 0 && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                {errors.map((error, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-red-700">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

// Add Step Button Component
const AddStepButton: React.FC<{ 
  onAddCondition: () => void;
  onAddAction: () => void;
  showCondition?: boolean;
  showAction?: boolean;
}> = ({ onAddCondition, onAddAction, showCondition = true, showAction = true }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative flex items-center justify-center py-2">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-dashed border-gray-300" />
      </div>
      <div className="relative">
        {!isOpen ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="h-8 w-8 rounded-full p-0 bg-white hover:bg-gray-50 border-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
          </Button>
        ) : (
          <div className="flex items-center gap-2 bg-white rounded-full shadow-md border p-1">
            {showCondition && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onAddCondition();
                  setIsOpen(false);
                }}
                className="text-xs h-7 px-3"
              >
                <Filter className="w-3 h-3 mr-1" />
                Condition
              </Button>
            )}
            {showAction && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onAddAction();
                  setIsOpen(false);
                }}
                className="text-xs h-7 px-3"
              >
                <PlayCircle className="w-3 h-3 mr-1" />
                Action
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Flow Builder Component
export const AutomationFlowBuilder: React.FC<FlowBuilderProps> = ({
  formData,
  setFormData,
  validationErrors,
  triggerTypes,
  conditionTypes,
  actionTypes,
  formsOptions,
  templatesOptions,
  departmentsOptions,
  jobRolesOptions,
  usersOptions,
  documentTypeOptions,
  onSave,
  onCancel,
  onTest,
  isFormValid,
  selectedRule,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    trigger: true,
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Backfill stable IDs for existing arrays once
  useEffect(() => {
    const withIds = <T extends { id?: string }>(items: T[] | undefined) =>
      (items || []).map((item) => (item?.id ? item : { ...item, id: uuidv4() }));

    const needsBackfill =
      (formData.conditions || []).some((c: any) => !c?.id) ||
      (formData.actions || []).some((a: any) => !a?.id);

    if (needsBackfill) {
      setFormData({
        ...formData,
        conditions: withIds(formData.conditions as any),
        actions: withIds(formData.actions as any),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoize stable ID arrays for dnd-kit
  const conditionIds = useMemo(
    () => (formData.conditions || []).map((c: any) => `condition-${c.id}`),
    [formData.conditions],
  );
  const actionIds = useMemo(
    () => (formData.actions || []).map((a: any) => `action-${a.id}`),
    [formData.actions],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    if (activeIdStr.startsWith("condition-") && overIdStr.startsWith("condition-")) {
      const sourceId = activeIdStr.replace("condition-", "");
      const targetId = overIdStr.replace("condition-", "");
      const list = formData.conditions || [];
      const fromIndex = list.findIndex((c: any) => c.id === sourceId);
      const toIndex = list.findIndex((c: any) => c.id === targetId);
      if (fromIndex !== -1 && toIndex !== -1) {
        setFormData({
          ...formData,
          conditions: arrayMove(list, fromIndex, toIndex),
        });
      }
    }

    if (activeIdStr.startsWith("action-") && overIdStr.startsWith("action-")) {
      const sourceId = activeIdStr.replace("action-", "");
      const targetId = overIdStr.replace("action-", "");
      const list = formData.actions || [];
      const fromIndex = list.findIndex((a: any) => a.id === sourceId);
      const toIndex = list.findIndex((a: any) => a.id === targetId);
      if (fromIndex !== -1 && toIndex !== -1) {
        setFormData({
          ...formData,
          actions: arrayMove(list, fromIndex, toIndex),
        });
      }
    }

    setActiveId(null);
  };

  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [...(formData.conditions || []), { id: uuidv4(), type: "", config: {} }],
    });
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [...(formData.actions || []), { id: uuidv4(), type: "", config: {} }],
    });
  };

  // Helpers to update/remove by id (reduces duplication)
  const updateConditionByIndex = (index: number, updated: any) => {
    const next = [...(formData.conditions || [])];
    next[index] = updated;
    setFormData({ ...formData, conditions: next });
  };

  const removeConditionByIndex = (index: number) => {
    setFormData({
      ...formData,
      conditions: (formData.conditions || []).filter((_: any, i: number) => i !== index),
    });
  };

  const insertConditionAfter = (index: number) => {
    const newCondition = { id: uuidv4(), type: "", config: {} };
    setFormData({
      ...formData,
      conditions: [
        ...(formData.conditions || []).slice(0, index + 1),
        newCondition,
        ...(formData.conditions || []).slice(index + 1),
      ],
    });
  };

  const updateActionByIndex = (index: number, updated: any) => {
    const next = [...(formData.actions || [])];
    next[index] = updated;
    setFormData({ ...formData, actions: next });
  };

  const removeActionByIndex = (index: number) => {
    setFormData({
      ...formData,
      actions: (formData.actions || []).filter((_: any, i: number) => i !== index),
    });
  };

  const insertActionAfter = (index: number) => {
    const newAction = { id: uuidv4(), type: "", config: {} };
    setFormData({
      ...formData,
      actions: [
        ...(formData.actions || []).slice(0, index + 1),
        newAction,
        ...(formData.actions || []).slice(index + 1),
      ],
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              <div>
                <Label htmlFor="rule-name" className="text-xs font-medium">Rule Name</Label>
                <Input
                  id="rule-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Document Expiry Reminder"
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label htmlFor="rule-description" className="text-xs font-medium">Description</Label>
                <Input
                  id="rule-description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  className="mt-1 h-9"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label className="text-sm">Active</Label>
            </div>
            {onTest && (
              <Button variant="outline" size="sm" onClick={onTest}>
                Test
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={onSave}
              disabled={!isFormValid}
            >
              {selectedRule ? "Update" : "Create"} Rule
            </Button>
          </div>
        </div>
        {validationErrors.name && (
          <div className="text-xs text-destructive mt-1">{validationErrors.name}</div>
        )}
      </div>

      {/* Flow Canvas */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-3xl mx-auto p-6 space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Trigger Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">1</span>
                </div>
                When this happens...
              </div>
              
              {/* Trigger Selection Grid */}
              {!formData.triggerType ? (
                <div className="grid grid-cols-2 gap-3">
                  {triggerTypes.map((trigger) => (
                    <Card
                      key={trigger.id}
                      className="cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all"
                      onClick={() => setFormData({ ...formData, triggerType: trigger.id, triggerConfig: {} })}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {trigger.icon}
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{trigger.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {trigger.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <DraggableNode
                  id="trigger"
                  type="trigger"
                  data={{
                    triggerType: formData.triggerType,
                    config: formData.triggerConfig,
                    name: triggerTypes.find(t => t.id === formData.triggerType)?.name,
                    triggerTypes,
                    formsOptions,
                    documentTypeOptions,
                    errors: Object.keys(validationErrors)
                      .filter(key => key.startsWith('triggerConfig.'))
                      .reduce((acc, key) => ({ ...acc, [key]: validationErrors[key] }), {}),
                  }}
                  onUpdate={(data) => setFormData({ ...formData, triggerConfig: data.config || {} })}
                  errors={validationErrors.triggerType ? [validationErrors.triggerType] : undefined}
                  isExpanded={expandedNodes.trigger !== false}
                  onToggleExpand={() => toggleNodeExpanded("trigger")}
                />
              )}
            </div>

            {/* Add Condition Button */}
            {formData.triggerType && (
              <AddStepButton
                onAddCondition={addCondition}
                onAddAction={addAction}
                showCondition={true}
                showAction={formData.conditions?.length === 0}
              />
            )}

            {/* Conditions Section */}
            {formData.conditions && formData.conditions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-amber-600">2</span>
                  </div>
                  If these conditions are met... (optional)
                </div>
                
                <SortableContext
                  items={conditionIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {formData.conditions.map((condition: any, index: number) => (
                      <React.Fragment key={`condition-${index}`}>
                        <DraggableNode
                          id={`condition-${condition.id}`}
                          type="condition"
                          data={{
                            ...condition,
                            conditionTypes,
                            departmentsOptions,
                            jobRolesOptions,
                          }}
                          index={index}
                          onUpdate={(data) => updateConditionByIndex(index, data)}
                          onRemove={() => removeConditionByIndex(index)}
                          onDuplicate={() => {
                            const duplicated = { ...condition, id: uuidv4() };
                            setFormData({
                              ...formData,
                              conditions: [
                                ...(formData.conditions || []).slice(0, index + 1),
                                duplicated,
                                ...(formData.conditions || []).slice(index + 1),
                              ],
                            });
                          }}
                          errors={validationErrors[`condition-${index}`] ? [validationErrors[`condition-${index}`]] : undefined}
                          isExpanded={expandedNodes[`condition-${index}`] !== false}
                          onToggleExpand={() => toggleNodeExpanded(`condition-${index}`)}
                        />
                        {index < formData.conditions.length - 1 && (
                          <AddStepButton
                            onAddCondition={() => insertConditionAfter(index)}
                            onAddAction={() => {}}
                            showCondition={true}
                            showAction={false}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </SortableContext>

                <AddStepButton
                  onAddCondition={addCondition}
                  onAddAction={addAction}
                  showCondition={true}
                  showAction={true}
                />
              </div>
            )}

            {/* Actions Section */}
            {formData.actions && formData.actions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-green-600">3</span>
                  </div>
                  Then do this...
                </div>
                
                <SortableContext
                  items={actionIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {formData.actions.map((action: any, index: number) => (
                      <React.Fragment key={`action-${index}`}>
                        <DraggableNode
                          id={`action-${action.id}`}
                          type="action"
                          data={{
                            ...action,
                            actionTypes,
                            templatesOptions,
                            usersOptions,
                          }}
                          index={index}
                          onUpdate={(data) => updateActionByIndex(index, data)}
                          onRemove={() => removeActionByIndex(index)}
                          onDuplicate={() => {
                            const duplicated = { ...action, id: uuidv4() };
                            setFormData({
                              ...formData,
                              actions: [
                                ...(formData.actions || []).slice(0, index + 1),
                                duplicated,
                                ...(formData.actions || []).slice(index + 1),
                              ],
                            });
                          }}
                          errors={validationErrors[`action-${index}`] ? [validationErrors[`action-${index}`]] : undefined}
                          isExpanded={expandedNodes[`action-${index}`] !== false}
                          onToggleExpand={() => toggleNodeExpanded(`action-${index}`)}
                        />
                        {index < formData.actions.length - 1 && (
                          <AddStepButton
                            onAddCondition={() => {}}
                            onAddAction={() => insertActionAfter(index)}
                            showCondition={false}
                            showAction={true}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </SortableContext>

                <AddStepButton
                  onAddCondition={() => {}}
                  onAddAction={addAction}
                  showCondition={false}
                  showAction={true}
                />
              </div>
            )}

            <DragOverlay>
              {activeId ? (
                <div className="opacity-80">
                  {/* Render dragging item */}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Empty state for actions */}
          {formData.triggerType && (!formData.actions || formData.actions.length === 0) && (
            <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
              <CardContent className="py-8">
                <div className="text-center">
                  <PlayCircle className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-3">
                    Add at least one action to complete your automation
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addAction}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Action
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Validation Summary */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="sticky bottom-0 bg-amber-50 border-t border-amber-200 px-6 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Please fix the following issues:</p>
              <ul className="text-xs text-amber-800 mt-1 space-y-0.5">
                {Object.entries(validationErrors).slice(0, 3).map(([key, error]) => (
                  <li key={key}>• {error}</li>
                ))}
                {Object.keys(validationErrors).length > 3 && (
                  <li>• And {Object.keys(validationErrors).length - 3} more...</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
