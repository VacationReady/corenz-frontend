"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Smartphone,
  Monitor,
  ArrowRight,
  Sparkles,
  Flag,
  CheckCircle,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Block type configuration with icons
const BLOCK_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  TASK: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  FORM: {
    icon: <FileText className="w-5 h-5" />,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  COMMUNICATION: {
    icon: <Mail className="w-5 h-5" />,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  TRAINING: {
    icon: <GraduationCap className="w-5 h-5" />,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  APPROVAL: {
    icon: <UserCheck className="w-5 h-5" />,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  AUTOMATION: {
    icon: <Settings className="w-5 h-5" />,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
  MILESTONE: {
    icon: <Target className="w-5 h-5" />,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  SURVEY: {
    icon: <BarChart3 className="w-5 h-5" />,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  DOCUMENT: {
    icon: <FileText className="w-5 h-5" />,
    color: "text-teal-600",
    bgColor: "bg-teal-100",
  },
  MEETING: {
    icon: <Calendar className="w-5 h-5" />,
    color: "text-pink-600",
    bgColor: "bg-pink-100",
  },
};

interface ExperienceBlock {
  id: string;
  name: string;
  description?: string;
  blockType: string;
  order: number;
  estimatedDuration?: number;
  slaHours?: number;
  responsibleRole?: string;
}

interface JourneyPhase {
  id: string;
  name: string;
  description?: string;
  order: number;
  duration?: number;
  phaseType: string;
  experienceBlocks: ExperienceBlock[];
}

interface JourneyTemplate {
  id: string;
  name: string;
  description?: string;
  persona?: string;
  duration?: number;
  status: string;
  phases: JourneyPhase[];
}

interface PreviewStep {
  type: "phase" | "block";
  phase: JourneyPhase;
  block?: ExperienceBlock;
  phaseIndex: number;
  blockIndex?: number;
  globalIndex: number;
}

interface JourneyPreviewModeProps {
  journey: JourneyTemplate;
  isOpen: boolean;
  onClose: () => void;
}

export function JourneyPreviewMode({ journey, isOpen, onClose }: JourneyPreviewModeProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Build flat list of steps from phases and blocks
  const steps = useMemo<PreviewStep[]>(() => {
    const result: PreviewStep[] = [];
    let globalIndex = 0;

    journey.phases
      .sort((a, b) => a.order - b.order)
      .forEach((phase, phaseIndex) => {
        // Add phase header step
        result.push({
          type: "phase",
          phase,
          phaseIndex,
          globalIndex: globalIndex++,
        });

        // Add block steps
        phase.experienceBlocks
          .sort((a, b) => a.order - b.order)
          .forEach((block, blockIndex) => {
            result.push({
              type: "block",
              phase,
              block,
              phaseIndex,
              blockIndex,
              globalIndex: globalIndex++,
            });
          });
      });

    return result;
  }, [journey.phases]);

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

  // Calculate total journey duration
  const totalDuration = useMemo(() => {
    return journey.phases.reduce((total, phase) => {
      const phaseDuration = phase.experienceBlocks.reduce(
        (sum, block) => sum + (block.estimatedDuration || 0),
        0
      );
      return total + phaseDuration;
    }, 0);
  }, [journey.phases]);

  // Calculate time remaining from current step
  const timeRemaining = useMemo(() => {
    let remaining = 0;
    for (let i = currentStepIndex; i < steps.length; i++) {
      const step = steps[i];
      if (step.type === "block" && step.block?.estimatedDuration) {
        remaining += step.block.estimatedDuration;
      }
    }
    return remaining;
  }, [steps, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStepIndex]));
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleMarkComplete = () => {
    setCompletedSteps(prev => new Set([...prev, currentStepIndex]));
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleStepClick = (index: number) => {
    setCurrentStepIndex(index);
  };

  const handleClose = () => {
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
    onClose();
  };

  const renderPhaseStep = (step: PreviewStep) => (
    <motion.div
      key={`phase-${step.phase.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full flex flex-col items-center justify-center text-center px-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg"
      >
        <Flag className="w-10 h-10 text-white" />
      </motion.div>
      
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-gray-900 mb-2"
      >
        {step.phase.name}
      </motion.h2>
      
      {step.phase.description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 max-w-md mb-6"
        >
          {step.phase.description}
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-4 text-sm text-gray-500"
      >
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4" />
          <span>{step.phase.experienceBlocks.length} activities</span>
        </div>
        {step.phase.duration && (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{step.phase.duration} days</span>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8"
      >
        <Button onClick={handleNext} size="lg" className="gap-2">
          Start Phase
          <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </motion.div>
  );

  const renderBlockStep = (step: PreviewStep) => {
    const block = step.block!;
    const config = BLOCK_TYPE_CONFIG[block.blockType] || BLOCK_TYPE_CONFIG.TASK;
    const isCompleted = completedSteps.has(step.globalIndex);

    return (
      <motion.div
        key={`block-${block.id}`}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className="h-full flex flex-col"
      >
        {/* Phase breadcrumb */}
        <div className="px-6 py-3 bg-gray-50 border-b">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="font-normal">
              Phase {step.phaseIndex + 1}
            </Badge>
            <span className="text-gray-400">→</span>
            <span className="text-gray-600">{step.phase.name}</span>
          </div>
        </div>

        {/* Block content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-lg mx-auto">
            {/* Block header */}
            <div className="flex items-start gap-4 mb-6">
              <div className={cn("p-3 rounded-xl", config.bgColor)}>
                <div className={config.color}>{config.icon}</div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-semibold text-gray-900">{block.name}</h3>
                  {isCompleted && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {block.blockType.toLowerCase().replace("_", " ")}
                </Badge>
              </div>
            </div>

            {/* Block description */}
            {block.description && (
              <Card className="mb-6 bg-gray-50 border-0">
                <CardContent className="p-4">
                  <p className="text-gray-700">{block.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Block metadata */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {block.estimatedDuration && (
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="font-medium">{block.estimatedDuration}h</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {block.responsibleRole && (
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <User className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Assigned to</p>
                      <p className="font-medium">{block.responsibleRole}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {block.slaHours && (
                <Card className="col-span-2">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Target className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Complete within</p>
                      <p className="font-medium">{block.slaHours} hours</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Action area - simulated for preview */}
            <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">
                  {block.blockType === "TASK" && "Task content would appear here"}
                  {block.blockType === "FORM" && "Form fields would appear here"}
                  {block.blockType === "COMMUNICATION" && "Message content would appear here"}
                  {block.blockType === "TRAINING" && "Training materials would appear here"}
                  {block.blockType === "APPROVAL" && "Approval workflow would appear here"}
                  {block.blockType === "AUTOMATION" && "Automated action status would appear here"}
                  {block.blockType === "MILESTONE" && "Milestone celebration would appear here"}
                  {block.blockType === "SURVEY" && "Survey questions would appear here"}
                  {block.blockType === "DOCUMENT" && "Document viewer would appear here"}
                  {block.blockType === "MEETING" && "Meeting scheduler would appear here"}
                </p>
                <Button onClick={handleMarkComplete} className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Complete
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Play className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Preview: {journey.name}
                </DialogTitle>
                <p className="text-sm text-gray-500">
                  Experience the journey as an employee
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View mode toggle */}
              <div className="flex items-center gap-1 p-1 bg-white rounded-lg border">
                <Button
                  variant={viewMode === "desktop" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("desktop")}
                  className="h-8 px-3"
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "mobile" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("mobile")}
                  className="h-8 px-3"
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
              </div>

              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
              <div className="flex items-center gap-4 text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {timeRemaining}h remaining
                </span>
                <span>{Math.round(progress)}% complete</span>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Step navigator sidebar */}
          <div className="w-64 border-r bg-gray-50 flex flex-col">
            <div className="p-4 border-b">
              <h4 className="font-medium text-sm text-gray-700">Journey Steps</h4>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2">
                {steps.map((step, index) => {
                  const isActive = index === currentStepIndex;
                  const isCompleted = completedSteps.has(index);
                  
                  if (step.type === "phase") {
                    return (
                      <button
                        key={`nav-phase-${step.phase.id}`}
                        onClick={() => handleStepClick(index)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors",
                          isActive
                            ? "bg-indigo-100 text-indigo-700"
                            : "hover:bg-gray-100 text-gray-700"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Flag className="w-4 h-4" />
                          <span className="font-medium text-sm truncate">
                            {step.phase.name}
                          </span>
                        </div>
                      </button>
                    );
                  }

                  const block = step.block!;
                  const config = BLOCK_TYPE_CONFIG[block.blockType] || BLOCK_TYPE_CONFIG.TASK;

                  return (
                    <button
                      key={`nav-block-${block.id}`}
                      onClick={() => handleStepClick(index)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg mb-1 ml-4 transition-colors",
                        isActive
                          ? "bg-indigo-100 text-indigo-700"
                          : "hover:bg-gray-100 text-gray-600"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300" />
                        )}
                        <span className="text-sm truncate">{block.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Journey stats */}
            <div className="p-4 border-t bg-white">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Duration</span>
                  <span className="font-medium">{totalDuration}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phases</span>
                  <span className="font-medium">{journey.phases.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Completed</span>
                  <span className="font-medium text-green-600">
                    {completedSteps.size} / {totalSteps}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Preview content */}
          <div
            className={cn(
              "flex-1 flex flex-col bg-white transition-all duration-300",
              viewMode === "mobile" && "max-w-[375px] mx-auto border-x shadow-xl"
            )}
          >
            {/* Mobile frame header */}
            {viewMode === "mobile" && (
              <div className="h-6 bg-gray-900 rounded-t-xl flex items-center justify-center">
                <div className="w-20 h-1 bg-gray-700 rounded-full" />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {currentStep?.type === "phase" 
                  ? renderPhaseStep(currentStep)
                  : currentStep?.type === "block" && renderBlockStep(currentStep)
                }
              </AnimatePresence>
            </div>

            {/* Navigation footer */}
            <div className="border-t px-6 py-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStepIndex === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {steps.slice(
                    Math.max(0, currentStepIndex - 2),
                    Math.min(steps.length, currentStepIndex + 3)
                  ).map((_, i) => {
                    const actualIndex = Math.max(0, currentStepIndex - 2) + i;
                    return (
                      <button
                        key={actualIndex}
                        onClick={() => handleStepClick(actualIndex)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-colors",
                          actualIndex === currentStepIndex
                            ? "bg-indigo-600"
                            : completedSteps.has(actualIndex)
                            ? "bg-green-500"
                            : "bg-gray-300"
                        )}
                      />
                    );
                  })}
                </div>

                <Button
                  onClick={handleNext}
                  disabled={currentStepIndex === totalSteps - 1}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Mobile frame footer */}
            {viewMode === "mobile" && (
              <div className="h-6 bg-gray-900 rounded-b-xl flex items-center justify-center">
                <div className="w-32 h-1 bg-gray-700 rounded-full" />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}












