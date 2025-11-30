"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Button from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  GitBranch,
  Target,
  Percent,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Beaker,
  Sparkles,
  FileText,
  Mail,
  GraduationCap,
  UserCheck,
  Settings,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Block type icons
const BLOCK_TYPE_ICONS: Record<string, React.ReactNode> = {
  TASK: <CheckCircle2 className="w-4 h-4" />,
  FORM: <FileText className="w-4 h-4" />,
  COMMUNICATION: <Mail className="w-4 h-4" />,
  TRAINING: <GraduationCap className="w-4 h-4" />,
  APPROVAL: <UserCheck className="w-4 h-4" />,
  AUTOMATION: <Settings className="w-4 h-4" />,
  MILESTONE: <Target className="w-4 h-4" />,
  SURVEY: <BarChart3 className="w-4 h-4" />,
  DOCUMENT: <FileText className="w-4 h-4" />,
  MEETING: <Calendar className="w-4 h-4" />,
};

interface ExperienceBlock {
  id: string;
  name: string;
  description?: string;
  blockType: string;
  order: number;
}

interface JourneyPhase {
  id: string;
  name: string;
  order: number;
  experienceBlocks: ExperienceBlock[];
}

interface JourneyTemplate {
  id: string;
  name: string;
  phases: JourneyPhase[];
}

interface Variant {
  id: string;
  name: string;
  description: string;
  trafficAllocation: number;
  isControl: boolean;
  variantConfig: Record<string, any>;
}

interface ExperimentWizardProps {
  journey: JourneyTemplate;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (experiment: any) => void;
}

const STEPS = [
  { id: 1, title: "Select Block", icon: Target },
  { id: 2, title: "Create Variants", icon: GitBranch },
  { id: 3, title: "Traffic Split", icon: Percent },
  { id: 4, title: "Success Metric", icon: BarChart3 },
  { id: 5, title: "Review", icon: CheckCircle2 },
];

const SUCCESS_METRICS = [
  {
    value: "COMPLETION_RATE",
    label: "Completion Rate",
    description: "Percentage of participants who complete the block",
    icon: CheckCircle2,
  },
  {
    value: "SATISFACTION_SCORE",
    label: "Satisfaction Score",
    description: "Average satisfaction rating from feedback",
    icon: TrendingUp,
  },
  {
    value: "TIME_TO_COMPLETE",
    label: "Time to Complete",
    description: "Average time taken to complete the block",
    icon: Clock,
  },
  {
    value: "ENGAGEMENT_SCORE",
    label: "Engagement Score",
    description: "Overall engagement metrics for the block",
    icon: Users,
  },
];

export function ExperimentWizard({
  journey,
  isOpen,
  onClose,
  onCreated,
}: ExperimentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [experimentName, setExperimentName] = useState("");
  const [experimentDescription, setExperimentDescription] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [variants, setVariants] = useState<Variant[]>([
    {
      id: "control",
      name: "Control",
      description: "Original block configuration",
      trafficAllocation: 50,
      isControl: true,
      variantConfig: {},
    },
    {
      id: "treatment",
      name: "Treatment A",
      description: "Modified block configuration",
      trafficAllocation: 50,
      isControl: false,
      variantConfig: {},
    },
  ]);
  const [successMetric, setSuccessMetric] = useState("COMPLETION_RATE");
  const [targetSampleSize, setTargetSampleSize] = useState(100);

  // Get all blocks from journey
  const allBlocks = useMemo(() => {
    return journey.phases.flatMap((phase) =>
      phase.experienceBlocks.map((block) => ({
        ...block,
        phaseName: phase.name,
        phaseOrder: phase.order,
      }))
    ).sort((a, b) => {
      if (a.phaseOrder !== b.phaseOrder) return a.phaseOrder - b.phaseOrder;
      return a.order - b.order;
    });
  }, [journey.phases]);

  const selectedBlock = allBlocks.find((b) => b.id === selectedBlockId);

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddVariant = () => {
    const newVariant: Variant = {
      id: `variant-${Date.now()}`,
      name: `Treatment ${String.fromCharCode(65 + variants.length - 1)}`,
      description: "",
      trafficAllocation: 0,
      isControl: false,
      variantConfig: {},
    };
    
    // Redistribute traffic
    const newVariants = [...variants, newVariant];
    const equalSplit = Math.floor(100 / newVariants.length);
    const remainder = 100 - (equalSplit * newVariants.length);
    
    setVariants(
      newVariants.map((v, i) => ({
        ...v,
        trafficAllocation: equalSplit + (i === 0 ? remainder : 0),
      }))
    );
  };

  const handleRemoveVariant = (variantId: string) => {
    if (variants.length <= 2) return;
    
    const newVariants = variants.filter((v) => v.id !== variantId);
    const equalSplit = Math.floor(100 / newVariants.length);
    const remainder = 100 - (equalSplit * newVariants.length);
    
    setVariants(
      newVariants.map((v, i) => ({
        ...v,
        trafficAllocation: equalSplit + (i === 0 ? remainder : 0),
      }))
    );
  };

  const handleTrafficChange = (variantId: string, value: number) => {
    const variantIndex = variants.findIndex((v) => v.id === variantId);
    if (variantIndex === -1) return;

    const newVariants = [...variants];
    const oldValue = newVariants[variantIndex].trafficAllocation;
    const diff = value - oldValue;

    // Adjust other variants proportionally
    const otherVariants = newVariants.filter((_, i) => i !== variantIndex);
    const totalOther = otherVariants.reduce((sum, v) => sum + v.trafficAllocation, 0);

    newVariants[variantIndex].trafficAllocation = value;

    if (totalOther > 0) {
      otherVariants.forEach((v) => {
        const proportion = v.trafficAllocation / totalOther;
        const variantIdx = newVariants.findIndex((nv) => nv.id === v.id);
        newVariants[variantIdx].trafficAllocation = Math.max(
          0,
          Math.round(v.trafficAllocation - diff * proportion)
        );
      });
    }

    // Ensure total is 100
    const total = newVariants.reduce((sum, v) => sum + v.trafficAllocation, 0);
    if (total !== 100) {
      const firstOther = newVariants.findIndex((v) => v.id !== variantId);
      if (firstOther !== -1) {
        newVariants[firstOther].trafficAllocation += 100 - total;
      }
    }

    setVariants(newVariants);
  };

  const handleCreate = async () => {
    if (!selectedBlockId || !experimentName) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`/api/journeys/${journey.id}/experiments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: experimentName,
          description: experimentDescription,
          targetBlockId: selectedBlockId,
          variants: variants.map((v) => ({
            name: v.name,
            description: v.description,
            trafficAllocation: v.trafficAllocation,
            isControl: v.isControl,
            variantConfig: v.variantConfig,
          })),
          successMetric,
          targetSampleSize,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create experiment");
      }

      const experiment = await response.json();
      toast.success("Experiment created successfully!");
      
      if (onCreated) {
        onCreated(experiment);
      }
      
      handleClose();
    } catch (error) {
      console.error("Error creating experiment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create experiment");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setExperimentName("");
    setExperimentDescription("");
    setSelectedBlockId(null);
    setVariants([
      {
        id: "control",
        name: "Control",
        description: "Original block configuration",
        trafficAllocation: 50,
        isControl: true,
        variantConfig: {},
      },
      {
        id: "treatment",
        name: "Treatment A",
        description: "Modified block configuration",
        trafficAllocation: 50,
        isControl: false,
        variantConfig: {},
      },
    ]);
    setSuccessMetric("COMPLETION_RATE");
    setTargetSampleSize(100);
    onClose();
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!selectedBlockId;
      case 2:
        return variants.length >= 2 && variants.every((v) => v.name.trim());
      case 3:
        return variants.reduce((sum, v) => sum + v.trafficAllocation, 0) === 100;
      case 4:
        return !!successMetric;
      case 5:
        return !!experimentName;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select an experience block to run an A/B test on. The experiment will compare
              different versions of this block.
            </p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {allBlocks.map((block) => (
                <button
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 transition-all",
                    selectedBlockId === block.id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {BLOCK_TYPE_ICONS[block.blockType] || <Target className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{block.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {block.blockType.toLowerCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {block.phaseName} • Block {block.order}
                      </p>
                      {block.description && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {block.description}
                        </p>
                      )}
                    </div>
                    {selectedBlockId === block.id && (
                      <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create variants to test. The control is your current block configuration.
              Add treatment variants with different configurations.
            </p>
            <div className="space-y-3">
              {variants.map((variant, index) => (
                <Card key={variant.id} className={cn(
                  "border-2",
                  variant.isControl ? "border-blue-200 bg-blue-50/50" : "border-gray-200"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                        variant.isControl ? "bg-blue-500" : "bg-purple-500"
                      )}>
                        {variant.isControl ? "C" : String.fromCharCode(65 + index - 1)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={variant.name}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[index].name = e.target.value;
                              setVariants(newVariants);
                            }}
                            placeholder="Variant name"
                            className="flex-1"
                          />
                          {variant.isControl && (
                            <Badge className="bg-blue-100 text-blue-700">Control</Badge>
                          )}
                          {!variant.isControl && variants.length > 2 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveVariant(variant.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <Input
                          value={variant.description}
                          onChange={(e) => {
                            const newVariants = [...variants];
                            newVariants[index].description = e.target.value;
                            setVariants(newVariants);
                          }}
                          placeholder="Description (e.g., 'Shorter duration, different content')"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={handleAddVariant}
              className="w-full"
              disabled={variants.length >= 4}
            >
              <GitBranch className="w-4 h-4 mr-2" />
              Add Another Variant
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Set the traffic allocation for each variant. This determines what percentage
              of participants will see each version.
            </p>
            <div className="space-y-6">
              {variants.map((variant) => (
                <div key={variant.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold",
                        variant.isControl ? "bg-blue-500" : "bg-purple-500"
                      )}>
                        {variant.isControl ? "C" : "T"}
                      </div>
                      <span className="font-medium text-sm">{variant.name}</span>
                    </div>
                    <span className="text-lg font-bold text-indigo-600">
                      {variant.trafficAllocation}%
                    </span>
                  </div>
                  <Slider
                    value={[variant.trafficAllocation]}
                    onValueChange={([value]) => handleTrafficChange(variant.id, value)}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
            
            {/* Quick presets */}
            <div className="pt-4 border-t">
              <Label className="text-xs text-muted-foreground mb-2 block">Quick Presets</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const equal = Math.floor(100 / variants.length);
                    const remainder = 100 - (equal * variants.length);
                    setVariants(variants.map((v, i) => ({
                      ...v,
                      trafficAllocation: equal + (i === 0 ? remainder : 0),
                    })));
                  }}
                >
                  Equal Split
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVariants(variants.map((v, i) => ({
                      ...v,
                      trafficAllocation: i === 0 ? 80 : Math.floor(20 / (variants.length - 1)),
                    })));
                  }}
                >
                  80/20 Control Heavy
                </Button>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose the primary metric to determine which variant wins.
              The experiment will track this metric for statistical significance.
            </p>
            <RadioGroup value={successMetric} onValueChange={setSuccessMetric}>
              <div className="space-y-3">
                {SUCCESS_METRICS.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <label
                      key={metric.value}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        successMetric === metric.value
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <RadioGroupItem value={metric.value} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-indigo-600" />
                          <span className="font-medium">{metric.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {metric.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </RadioGroup>

            <div className="pt-4 border-t">
              <Label className="text-sm font-medium mb-2 block">
                Target Sample Size (optional)
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  value={targetSampleSize}
                  onChange={(e) => setTargetSampleSize(parseInt(e.target.value) || 100)}
                  min={10}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  participants per variant for statistical significance
                </span>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Experiment Name *</Label>
                <Input
                  value={experimentName}
                  onChange={(e) => setExperimentName(e.target.value)}
                  placeholder="e.g., Welcome Email Timing Test"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <Textarea
                  value={experimentDescription}
                  onChange={(e) => setExperimentDescription(e.target.value)}
                  placeholder="Describe the hypothesis you're testing..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>

            <Card className="bg-gray-50 border-0">
              <CardContent className="p-4 space-y-4">
                <h4 className="font-medium text-sm">Experiment Summary</h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Target Block:</span>
                    <p className="font-medium">{selectedBlock?.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Success Metric:</span>
                    <p className="font-medium">
                      {SUCCESS_METRICS.find((m) => m.value === successMetric)?.label}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Variants:</span>
                    <p className="font-medium">{variants.length} variants</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sample Size:</span>
                    <p className="font-medium">{targetSampleSize} per variant</p>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <span className="text-muted-foreground text-sm">Traffic Split:</span>
                  <div className="flex gap-2 mt-2">
                    {variants.map((v) => (
                      <div
                        key={v.id}
                        className={cn(
                          "flex-1 h-8 rounded flex items-center justify-center text-xs font-medium text-white",
                          v.isControl ? "bg-blue-500" : "bg-purple-500"
                        )}
                        style={{ flex: v.trafficAllocation }}
                      >
                        {v.name}: {v.trafficAllocation}%
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Before launching:</p>
                <p>The experiment will be created in Draft status. You can review and start it from the experiments panel.</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Beaker className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Create A/B Experiment
              </DialogTitle>
              <DialogDescription>
                Test variations of &quot;{journey.name}&quot;
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step indicator */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                        isActive
                          ? "bg-indigo-600 text-white"
                          : isCompleted
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-500"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs mt-1 font-medium",
                        isActive ? "text-indigo-600" : "text-gray-500"
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "w-12 h-0.5 mx-2",
                        step.id < currentStep ? "bg-green-500" : "bg-gray-200"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? handleClose : handlePrevious}
          >
            {currentStep === 1 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </>
            )}
          </Button>

          {currentStep < 5 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={!canProceed() || isCreating}
              className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Experiment
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}





