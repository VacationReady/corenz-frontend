"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Button from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle2,
  FileText,
  Mail,
  GraduationCap,
  UserCheck,
  Settings,
  Target,
  BarChart3,
  Calendar,
  Loader2,
  Clock,
  AlertTriangle,
  User,
  Code,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Block type configuration with icons
const BLOCK_TYPE_OPTIONS = [
  { value: "TASK", label: "Task", icon: CheckCircle2, color: "bg-blue-100 text-blue-800" },
  { value: "FORM", label: "Form", icon: FileText, color: "bg-green-100 text-green-800" },
  { value: "COMMUNICATION", label: "Communication", icon: Mail, color: "bg-purple-100 text-purple-800" },
  { value: "TRAINING", label: "Training", icon: GraduationCap, color: "bg-orange-100 text-orange-800" },
  { value: "APPROVAL", label: "Approval", icon: UserCheck, color: "bg-yellow-100 text-yellow-800" },
  { value: "AUTOMATION", label: "Automation", icon: Settings, color: "bg-gray-100 text-gray-800" },
  { value: "MILESTONE", label: "Milestone", icon: Target, color: "bg-red-100 text-red-800" },
  { value: "SURVEY", label: "Survey", icon: BarChart3, color: "bg-indigo-100 text-indigo-800" },
  { value: "DOCUMENT", label: "Document", icon: FileText, color: "bg-teal-100 text-teal-800" },
  { value: "MEETING", label: "Meeting", icon: Calendar, color: "bg-pink-100 text-pink-800" },
] as const;

// Zod schema for block configuration
const blockConfigSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").nullable().optional(),
  blockType: z.enum([
    "TASK",
    "FORM",
    "COMMUNICATION",
    "TRAINING",
    "APPROVAL",
    "AUTOMATION",
    "MILESTONE",
    "SURVEY",
    "DOCUMENT",
    "MEETING",
  ]),
  estimatedDuration: z.number().min(0).max(1000).nullable().optional(),
  slaHours: z.number().min(0).max(1000).nullable().optional(),
  responsibleRole: z.string().nullable().optional(),
  isRequired: z.boolean().optional(),
  automationConfig: z.record(z.any()).nullable().optional(),
  successCriteria: z.record(z.any()).nullable().optional(),
});

type BlockConfigFormData = z.infer<typeof blockConfigSchema>;

interface ExperienceBlock {
  id: string;
  name: string;
  description?: string;
  blockType: string;
  order: number;
  estimatedDuration?: number;
  slaHours?: number;
  responsibleRole?: string;
  isRequired?: boolean;
  automationConfig?: Record<string, any>;
  successCriteria?: Record<string, any>;
}

interface JourneyPhase {
  id: string;
  name: string;
}

interface Journey {
  id: string;
  name: string;
}

interface JobRole {
  id: string;
  name: string;
  level?: string;
}

interface BlockConfigDrawerProps {
  onBlockUpdate?: (block: ExperienceBlock) => void;
}

export function BlockConfigDrawer({ onBlockUpdate }: BlockConfigDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [block, setBlock] = useState<ExperienceBlock | null>(null);
  const [phase, setPhase] = useState<JourneyPhase | null>(null);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [automationConfigText, setAutomationConfigText] = useState("");
  const [successCriteriaText, setSuccessCriteriaText] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<BlockConfigFormData>({
    resolver: zodResolver(blockConfigSchema),
    defaultValues: {
      name: "",
      description: "",
      blockType: "TASK",
      estimatedDuration: null,
      slaHours: null,
      responsibleRole: null,
      isRequired: true,
      automationConfig: null,
      successCriteria: null,
    },
  });

  const watchedBlockType = watch("blockType");

  // Listen for the openBlockConfig custom event
  useEffect(() => {
    const handleOpenBlockConfig = (event: CustomEvent) => {
      const { block: blockData, phase: phaseData, journey: journeyData } = event.detail;
      setBlock(blockData);
      setPhase(phaseData);
      setJourney(journeyData);
      
      // Reset form with block data
      reset({
        name: blockData.name || "",
        description: blockData.description || "",
        blockType: blockData.blockType || "TASK",
        estimatedDuration: blockData.estimatedDuration ?? null,
        slaHours: blockData.slaHours ?? null,
        responsibleRole: blockData.responsibleRole || null,
        isRequired: blockData.isRequired ?? true,
        automationConfig: blockData.automationConfig || null,
        successCriteria: blockData.successCriteria || null,
      });

      // Set JSON editor text
      setAutomationConfigText(
        blockData.automationConfig 
          ? JSON.stringify(blockData.automationConfig, null, 2) 
          : ""
      );
      setSuccessCriteriaText(
        blockData.successCriteria 
          ? JSON.stringify(blockData.successCriteria, null, 2) 
          : ""
      );
      
      setIsOpen(true);
      setActiveTab("general");
    };

    document.addEventListener("openBlockConfig", handleOpenBlockConfig as EventListener);
    return () => {
      document.removeEventListener("openBlockConfig", handleOpenBlockConfig as EventListener);
    };
  }, [reset]);

  // Fetch job roles when drawer opens
  useEffect(() => {
    if (isOpen && jobRoles.length === 0) {
      fetchJobRoles();
    }
  }, [isOpen]);

  const fetchJobRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const response = await fetch("/api/job-roles/active");
      if (response.ok) {
        const data = await response.json();
        setJobRoles(data);
      }
    } catch (error) {
      console.error("Failed to fetch job roles:", error);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const onSubmit = async (data: BlockConfigFormData) => {
    if (!block) return;

    setIsSaving(true);
    try {
      // Parse JSON configs if provided
      let automationConfig = null;
      let successCriteria = null;

      if (automationConfigText.trim()) {
        try {
          automationConfig = JSON.parse(automationConfigText);
        } catch (e) {
          toast.error("Invalid JSON in automation config");
          setIsSaving(false);
          return;
        }
      }

      if (successCriteriaText.trim()) {
        try {
          successCriteria = JSON.parse(successCriteriaText);
        } catch (e) {
          toast.error("Invalid JSON in success criteria");
          setIsSaving(false);
          return;
        }
      }

      const response = await fetch(`/api/journeys/blocks/${block.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          automationConfig,
          successCriteria,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update block");
      }

      const updatedBlock = await response.json();
      
      toast.success("Block updated successfully");
      setIsOpen(false);
      
      // Notify parent of update
      if (onBlockUpdate) {
        onBlockUpdate(updatedBlock);
      }

      // Dispatch event for canvas to pick up
      const updateEvent = new CustomEvent("blockUpdated", {
        detail: { block: updatedBlock, phase, journey },
        bubbles: true,
      });
      document.dispatchEvent(updateEvent);
    } catch (error) {
      console.error("Error updating block:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update block");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = useCallback(() => {
    if (isDirty) {
      const confirm = window.confirm("You have unsaved changes. Are you sure you want to close?");
      if (!confirm) return;
    }
    setIsOpen(false);
    setBlock(null);
    setPhase(null);
    setJourney(null);
    reset();
  }, [isDirty, reset]);

  const selectedBlockType = BLOCK_TYPE_OPTIONS.find(t => t.value === watchedBlockType);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <div className="flex items-center gap-3">
            {selectedBlockType && (
              <div className={cn("p-2 rounded-lg", selectedBlockType.color)}>
                <selectedBlockType.icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <SheetTitle className="text-xl">Configure Block</SheetTitle>
              <SheetDescription>
                Edit experience block settings and properties
              </SheetDescription>
            </div>
          </div>
          {phase && journey && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="font-normal">
                {journey.name}
              </Badge>
              <span>→</span>
              <Badge variant="outline" className="font-normal">
                {phase.name}
              </Badge>
            </div>
          )}
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="py-6 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="timing">Timing</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Block Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter block name"
                  {...register("name")}
                  className={cn(errors.name && "border-red-500")}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this block does..."
                  rows={3}
                  {...register("description")}
                  className={cn(errors.description && "border-red-500")}
                />
                {errors.description && (
                  <p className="text-xs text-red-500">{errors.description.message}</p>
                )}
              </div>

              {/* Block Type Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Block Type <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_TYPE_OPTIONS.map((type) => {
                    const Icon = type.icon;
                    const isSelected = watchedBlockType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setValue("blockType", type.value, { shouldDirty: true })}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <div className={cn("p-1.5 rounded-md", type.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Responsible Role */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Responsible Role
                </Label>
                <Select
                  value={watch("responsibleRole") || ""}
                  onValueChange={(value) => setValue("responsibleRole", value || null, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingRoles ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : (
                      <>
                        <SelectItem value="">No specific role</SelectItem>
                        {jobRoles.map((role) => (
                          <SelectItem key={role.id} value={role.name}>
                            {role.name}
                            {role.level && (
                              <span className="text-muted-foreground ml-2">
                                ({role.level})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Who is responsible for completing this block
                </p>
              </div>

              {/* Is Required Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Required Block</Label>
                  <p className="text-xs text-muted-foreground">
                    Must be completed to progress in the journey
                  </p>
                </div>
                <Switch
                  checked={watch("isRequired") ?? true}
                  onCheckedChange={(checked) => setValue("isRequired", checked, { shouldDirty: true })}
                />
              </div>
            </TabsContent>

            {/* Timing Tab */}
            <TabsContent value="timing" className="space-y-4 mt-4">
              {/* Estimated Duration */}
              <div className="space-y-2">
                <Label htmlFor="estimatedDuration" className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Estimated Duration (hours)
                </Label>
                <Input
                  id="estimatedDuration"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g., 2"
                  {...register("estimatedDuration", {
                    setValueAs: (v) => (v === "" ? null : parseFloat(v)),
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  How long should this block typically take to complete?
                </p>
              </div>

              {/* SLA Hours */}
              <div className="space-y-2">
                <Label htmlFor="slaHours" className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  SLA Deadline (hours)
                </Label>
                <Input
                  id="slaHours"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g., 24"
                  {...register("slaHours", {
                    setValueAs: (v) => (v === "" ? null : parseInt(v)),
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum time allowed before this block is flagged as overdue
                </p>
              </div>

              {/* Timing Visualization */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Timing Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Expected Time</span>
                    <span className="font-medium text-blue-900">
                      {watch("estimatedDuration") 
                        ? `${watch("estimatedDuration")} hours`
                        : "Not set"
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">SLA Deadline</span>
                    <span className="font-medium text-blue-900">
                      {watch("slaHours") 
                        ? `${watch("slaHours")} hours`
                        : "No deadline"
                      }
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Advanced Configuration</p>
                    <p className="text-xs text-amber-700">For power users and automation</p>
                  </div>
                </div>
                <Switch
                  checked={showAdvancedConfig}
                  onCheckedChange={setShowAdvancedConfig}
                />
              </div>

              {showAdvancedConfig && (
                <>
                  {/* Automation Config */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      Automation Configuration (JSON)
                    </Label>
                    <Textarea
                      value={automationConfigText}
                      onChange={(e) => setAutomationConfigText(e.target.value)}
                      placeholder={`{
  "trigger": "on_complete",
  "actions": [
    { "type": "notify", "target": "manager" }
  ]
}`}
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Define automation rules for this block
                    </p>
                  </div>

                  {/* Success Criteria */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      Success Criteria (JSON)
                    </Label>
                    <Textarea
                      value={successCriteriaText}
                      onChange={(e) => setSuccessCriteriaText(e.target.value)}
                      placeholder={`{
  "completionType": "self_report",
  "verificationRequired": false,
  "metrics": ["completion_time", "satisfaction"]
}`}
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Define how success is measured for this block
                    </p>
                  </div>
                </>
              )}

              {/* AI Suggestion */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-purple-900">AI Tip</h4>
                    <p className="text-xs text-purple-700 mt-1">
                      Based on similar journeys, {selectedBlockType?.label.toLowerCase()} blocks 
                      typically complete in 2-4 hours with a 24-hour SLA.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <SheetFooter className="pt-6 border-t gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !isDirty}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

