"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import Checkbox from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/label";
import confetti from "canvas-confetti";
import {
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  UploadCloud,
  FileEdit,
  Info,
  Wrench,
  KeySquare,
  CalendarClock,
  UserRoundPlus,
  ShieldCheck,
  Wallet,
  HeartPulse,
  Target,
  Smile,
  Workflow,
  Check,
  Circle,
  CheckCircle,
  ArrowRight,
  Sparkles,
  PartyPopper,
  Trophy,
  Star,
  Rocket,
  Play,
  Pause,
  RotateCcw,
  Users,
  Clock,
  Zap,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  steps: any[];
  templateName: string;
}

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "acknowledge-document": FileText,
  "upload-document": UploadCloud,
  "collect-document": UploadCloud,
  "fill-form": FileEdit,
  "instructions": Info,
  "training-assignment": ShieldCheck,
  "equipment-checklist": Wrench,
  "system-access": KeySquare,
  "manager-checkin": CalendarClock,
  "buddy-introduction": UserRoundPlus,
  "compliance-training": ShieldCheck,
  "payroll-setup": Wallet,
  "benefits-enrollment": HeartPulse,
  "probation-goals": Target,
  "welcome-survey": Smile,
  "journey-automation": Workflow,
};

const STEP_COLORS: Record<string, string> = {
  "acknowledge-document": "from-blue-500 to-indigo-600",
  "upload-document": "from-emerald-500 to-teal-600",
  "collect-document": "from-cyan-500 to-blue-600",
  "fill-form": "from-purple-500 to-violet-600",
  "instructions": "from-amber-500 to-orange-600",
  "training-assignment": "from-rose-500 to-pink-600",
  "equipment-checklist": "from-slate-500 to-gray-600",
  "system-access": "from-indigo-500 to-blue-600",
  "manager-checkin": "from-teal-500 to-cyan-600",
  "buddy-introduction": "from-green-500 to-emerald-600",
  "compliance-training": "from-red-500 to-rose-600",
  "payroll-setup": "from-yellow-500 to-amber-600",
  "benefits-enrollment": "from-pink-500 to-rose-600",
  "probation-goals": "from-violet-500 to-purple-600",
  "welcome-survey": "from-orange-500 to-red-600",
  "journey-automation": "from-blue-600 to-indigo-700",
};

export function OnboardingSimulator({
  isOpen,
  onClose,
  steps,
  templateName,
}: OnboardingSimulatorProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isComplete, setIsComplete] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setCompletedSteps(new Set());
      setIsComplete(false);
      setShowWelcome(true);
    }
  }, [isOpen]);

  const fireConfetti = useCallback(() => {
    const colors = ["#6366f1", "#8b5cf6", "#22c55e", "#10b981", "#fbbf24"];
    
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors,
      startVelocity: 45,
      gravity: 0.8,
      ticks: 300,
      zIndex: 9999,
    });

    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.8 },
        colors,
        startVelocity: 40,
        zIndex: 9999,
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.8 },
        colors,
        startVelocity: 40,
        zIndex: 9999,
      });
    }, 250);
  }, []);

  const handleCompleteStep = useCallback(() => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(currentStepIndex);
    setCompletedSteps(newCompleted);

    if (currentStepIndex < steps.length - 1) {
      setTimeout(() => {
        setCurrentStepIndex(currentStepIndex + 1);
      }, 300);
    } else {
      setIsComplete(true);
      fireConfetti();
    }
  }, [currentStepIndex, completedSteps, steps.length, fireConfetti]);

  const handleRestart = useCallback(() => {
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
    setIsComplete(false);
    setShowWelcome(true);
  }, []);

  const currentStep = steps[currentStepIndex];
  const progress = ((completedSteps.size) / steps.length) * 100;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-900/20">
        <AnimatePresence mode="wait">
          {/* Welcome Screen */}
          {showWelcome && !isComplete && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center p-8"
            >
              <div className="text-center max-w-lg">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-8 shadow-2xl shadow-indigo-500/30"
                >
                  <Rocket className="w-12 h-12 text-white" />
                </motion.div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold text-slate-900 dark:text-white mb-3"
                >
                  Simulation Mode
                </motion.h2>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg text-slate-600 dark:text-slate-400 mb-8"
                >
                  Experience "{templateName}" exactly as your new hires will see it.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-center gap-6 mb-8"
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600">{steps.length}</div>
                    <div className="text-sm text-muted-foreground">Steps</div>
                  </div>
                  <div className="w-px h-12 bg-slate-200 dark:bg-slate-700" />
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emerald-600">~{steps.length * 2}</div>
                    <div className="text-sm text-muted-foreground">Minutes</div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center justify-center gap-3"
                >
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setShowWelcome(false)}
                    className="px-8 gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
                  >
                    <Play className="w-4 h-4" />
                    Start Simulation
                  </Button>
                </motion.div>
              </div>

              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </motion.div>
          )}

          {/* Completion Screen */}
          {isComplete && (
            <motion.div
              key="complete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center p-8 bg-gradient-to-br from-amber-50 via-white to-emerald-50 dark:from-amber-900/20 dark:via-slate-900 dark:to-emerald-900/20"
            >
              <div className="text-center max-w-lg">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="relative inline-block mb-8"
                >
                  <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/40">
                    <Trophy className="w-14 h-14 text-white" />
                  </div>
                  {/* Sparkles */}
                  {[0, 72, 144, 216, 288].map((angle, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="absolute w-4 h-4"
                      style={{
                        top: `${50 + 55 * Math.sin((angle * Math.PI) / 180)}%`,
                        left: `${50 + 55 * Math.cos((angle * Math.PI) / 180)}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <Star className="w-full h-full text-amber-400 fill-amber-400" />
                    </motion.div>
                  ))}
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-emerald-600 to-blue-600 mb-4"
                >
                  Simulation Complete!
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg text-slate-600 dark:text-slate-400 mb-8"
                >
                  Your new hires will have this amazing experience when they join.
                </motion.p>

                {/* Achievement Badges */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex justify-center gap-4 mb-8"
                >
                  {[
                    { icon: CheckCircle, label: `${steps.length} Steps`, color: "text-emerald-500" },
                    { icon: Zap, label: "Well designed", color: "text-amber-500" },
                    { icon: Users, label: "Employee ready", color: "text-blue-500" },
                  ].map((achievement, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6 + i * 0.1, type: "spring" }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2 shadow-sm">
                        <achievement.icon className={cn("w-6 h-6", achievement.color)} />
                      </div>
                      <span className="text-xs text-slate-500">{achievement.label}</span>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center justify-center gap-3"
                >
                  <Button
                    variant="outline"
                    onClick={handleRestart}
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restart
                  </Button>
                  <Button
                    onClick={onClose}
                    className="px-8 gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
                  >
                    Done
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              </div>

              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </motion.div>
          )}

          {/* Main Simulation View */}
          {!showWelcome && !isComplete && (
            <motion.div
              key="simulation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              {/* Header */}
              <div className="flex-none px-6 py-4 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="gap-1">
                      <Play className="w-3 h-3" />
                      Simulation Mode
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {templateName}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{Math.round(progress)}%</span>
                      <div className="w-32">
                        <Progress value={progress} className="h-2" />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 flex overflow-hidden">
                {/* Step List Sidebar */}
                <div className="w-80 border-r bg-white/50 dark:bg-slate-900/50 overflow-y-auto p-4">
                  <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wider mb-4">
                    Journey Progress
                  </h3>
                  <div className="space-y-2">
                    {steps.map((step, index) => {
                      const Icon = STEP_ICONS[step.type] || FileText;
                      const isCompleted = completedSteps.has(index);
                      const isCurrent = index === currentStepIndex;
                      const isLocked = index > currentStepIndex && !isCompleted;

                      return (
                        <button
                          key={step.key}
                          onClick={() => !isLocked && setCurrentStepIndex(index)}
                          disabled={isLocked}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                            isCurrent && "bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800",
                            isCompleted && !isCurrent && "bg-emerald-50/50 dark:bg-emerald-900/20",
                            isLocked && "opacity-50 cursor-not-allowed",
                            !isCurrent && !isCompleted && !isLocked && "hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          {/* Status Icon */}
                          <div className={cn(
                            "flex-none w-8 h-8 rounded-lg flex items-center justify-center",
                            isCompleted && "bg-emerald-100 dark:bg-emerald-900/50",
                            isCurrent && !isCompleted && "bg-indigo-100 dark:bg-indigo-900/50",
                            !isCompleted && !isCurrent && "bg-slate-100 dark:bg-slate-800"
                          )}>
                            {isCompleted ? (
                              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : isCurrent ? (
                              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                {index + 1}
                              </span>
                            ) : (
                              <span className="text-sm font-medium text-slate-400">
                                {index + 1}
                              </span>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium truncate",
                              isCurrent && "text-indigo-700 dark:text-indigo-300",
                              isCompleted && "text-emerald-700 dark:text-emerald-300",
                              !isCurrent && !isCompleted && "text-slate-600 dark:text-slate-400"
                            )}>
                              {step.title || "Untitled step"}
                            </p>
                          </div>

                          {/* Step Icon */}
                          <div className={cn(
                            "flex-none w-6 h-6 rounded-md bg-gradient-to-br flex items-center justify-center opacity-75",
                            STEP_COLORS[step.type] || "from-gray-500 to-gray-600"
                          )}>
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Step Content */}
                <div className="flex-1 overflow-y-auto p-8">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep?.key}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="max-w-2xl mx-auto"
                    >
                      <SimulatedStepContent
                        step={currentStep}
                        stepIndex={currentStepIndex}
                        totalSteps={steps.length}
                        onComplete={handleCompleteStep}
                        isCompleted={completedSteps.has(currentStepIndex)}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Footer Navigation */}
              <div className="flex-none px-6 py-4 border-t bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                    disabled={currentStepIndex === 0}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    {steps.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentStepIndex(index)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all",
                          index === currentStepIndex && "w-6 bg-indigo-600",
                          completedSteps.has(index) && index !== currentStepIndex && "bg-emerald-500",
                          !completedSteps.has(index) && index !== currentStepIndex && "bg-slate-300 dark:bg-slate-600"
                        )}
                      />
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStepIndex(Math.min(steps.length - 1, currentStepIndex + 1))}
                    disabled={currentStepIndex === steps.length - 1 || !completedSteps.has(currentStepIndex)}
                    className="gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function SimulatedStepContent({
  step,
  stepIndex,
  totalSteps,
  onComplete,
  isCompleted,
}: {
  step: any;
  stepIndex: number;
  totalSteps: number;
  onComplete: () => void;
  isCompleted: boolean;
}) {
  const Icon = STEP_ICONS[step?.type] || FileText;
  const color = STEP_COLORS[step?.type] || "from-gray-500 to-gray-600";
  const title = step?.title?.trim() || "Untitled Step";
  const description = step?.description?.trim() || "";

  return (
    <Card className="overflow-hidden">
      {/* Step Header */}
      <div className={cn("px-6 py-4 bg-gradient-to-r", color)}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Step {stepIndex + 1} of {totalSteps}
              </Badge>
              {isCompleted && (
                <Badge className="bg-emerald-500 text-white border-0 gap-1">
                  <Check className="w-3 h-3" />
                  Completed
                </Badge>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6 space-y-6">
        {description && (
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            {description}
          </p>
        )}

        {/* Interactive Step Content */}
        <div className="space-y-4">
          {step?.type === "acknowledge-document" && (
            <>
              <div className="aspect-video rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-muted-foreground">Document preview area</p>
                </div>
              </div>
              <Label className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <Checkbox checked={isCompleted} onCheckedChange={() => !isCompleted && onComplete()} />
                <span>I have read and acknowledge this document</span>
              </Label>
            </>
          )}

          {step?.type === "upload-document" && (
            <>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-12 text-center">
                <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Drag and drop your file here
                </p>
                <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                <Button variant="outline" onClick={onComplete} disabled={isCompleted}>
                  {isCompleted ? "Document Uploaded" : "Select File"}
                </Button>
              </div>
            </>
          )}

          {step?.type === "fill-form" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sample Field 1</Label>
                <Input placeholder="Enter value..." />
              </div>
              <div className="space-y-2">
                <Label>Sample Field 2</Label>
                <Input placeholder="Enter value..." />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea placeholder="Enter notes..." rows={3} />
              </div>
            </div>
          )}

          {step?.type === "instructions" && (
            <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-none">
                  <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">Welcome!</h3>
                  <p className="text-amber-800 dark:text-amber-300">
                    This is where your welcome message or instructions will appear. 
                    Use this step to help new hires feel welcomed and oriented.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {(step?.type === "equipment-checklist" || step?.type === "system-access" || step?.type === "training-assignment" || step?.type === "compliance-training") && (
            <div className="space-y-3">
              {["Item 1", "Item 2", "Item 3"].map((item, i) => (
                <Label key={i} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <Checkbox />
                  <span>{item}</span>
                </Label>
              ))}
            </div>
          )}

          {/* Other step types - generic content */}
          {!["acknowledge-document", "upload-document", "fill-form", "instructions", "equipment-checklist", "system-access", "training-assignment", "compliance-training"].includes(step?.type || "") && (
            <Card className="p-6 bg-slate-50 dark:bg-slate-800">
              <p className="text-muted-foreground">
                Interactive content for this step type will be displayed here during actual onboarding.
              </p>
            </Card>
          )}
        </div>

        {/* Action Button */}
        {!isCompleted && (
          <Button 
            onClick={onComplete}
            className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 py-6 text-lg"
          >
            {stepIndex === totalSteps - 1 ? "Complete Onboarding" : "Mark Complete & Continue"}
            <ArrowRight className="w-5 h-5" />
          </Button>
        )}

        {isCompleted && (
          <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Step completed!</span>
          </div>
        )}
      </div>
    </Card>
  );
}

export default OnboardingSimulator;








