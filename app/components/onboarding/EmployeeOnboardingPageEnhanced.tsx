"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Progress } from "@/components/ui/progress";
import OnboardingStepRenderer from "@/components/onboarding/OnboardingStepRenderer";
import { OnboardingStep } from "@prisma/client";
import { GlassSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Circle,
  RefreshCcw,
  Sparkles,
  Rocket,
  Trophy,
  Star,
  Zap,
  Users,
  PartyPopper,
  ChevronRight,
  ChevronLeft,
  Play,
  Home,
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
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { OnboardingCompleteAnimation } from "@/components/animations";

type Step = {
  id: string;
  instanceStepId?: string;
  type: string;
  status: string;
  order: number;
  label?: string;
  title?: string;
  description?: string;
  formFields?: any[];
};

type OnboardingInstance = {
  id: string;
  template: { name: string; steps?: OnboardingStep[] };
  steps: Step[];
};

type Props = {
  employeeId: string;
  canComplete?: boolean;
};

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "acknowledge-document": FileText,
  "acknowledge_document": FileText,
  "upload-document": UploadCloud,
  "upload_document": UploadCloud,
  "collect-document": UploadCloud,
  "collect_document": UploadCloud,
  "fill-form": FileEdit,
  "fill_form": FileEdit,
  "instructions": Info,
  "training-assignment": ShieldCheck,
  "training_assignment": ShieldCheck,
  "equipment-checklist": Wrench,
  "equipment_checklist": Wrench,
  "system-access": KeySquare,
  "system_access": KeySquare,
  "manager-checkin": CalendarClock,
  "manager_checkin": CalendarClock,
  "buddy-introduction": UserRoundPlus,
  "buddy_introduction": UserRoundPlus,
  "compliance-training": ShieldCheck,
  "compliance_training": ShieldCheck,
  "payroll-setup": Wallet,
  "payroll_setup": Wallet,
  "benefits-enrollment": HeartPulse,
  "benefits_enrollment": HeartPulse,
  "probation-goals": Target,
  "probation_goals": Target,
  "welcome-survey": Smile,
  "welcome_survey": Smile,
  "journey-automation": Workflow,
  "journey_automation": Workflow,
};

const STEP_COLORS: Record<string, string> = {
  "acknowledge-document": "from-blue-500 to-indigo-600",
  "acknowledge_document": "from-blue-500 to-indigo-600",
  "upload-document": "from-emerald-500 to-teal-600",
  "upload_document": "from-emerald-500 to-teal-600",
  "collect-document": "from-cyan-500 to-blue-600",
  "collect_document": "from-cyan-500 to-blue-600",
  "fill-form": "from-purple-500 to-violet-600",
  "fill_form": "from-purple-500 to-violet-600",
  "instructions": "from-amber-500 to-orange-600",
  "training-assignment": "from-rose-500 to-pink-600",
  "training_assignment": "from-rose-500 to-pink-600",
  "equipment-checklist": "from-slate-500 to-gray-600",
  "equipment_checklist": "from-slate-500 to-gray-600",
  "system-access": "from-indigo-500 to-blue-600",
  "system_access": "from-indigo-500 to-blue-600",
  "manager-checkin": "from-teal-500 to-cyan-600",
  "manager_checkin": "from-teal-500 to-cyan-600",
  "buddy-introduction": "from-green-500 to-emerald-600",
  "buddy_introduction": "from-green-500 to-emerald-600",
  "compliance-training": "from-red-500 to-rose-600",
  "compliance_training": "from-red-500 to-rose-600",
  "payroll-setup": "from-yellow-500 to-amber-600",
  "payroll_setup": "from-yellow-500 to-amber-600",
  "benefits-enrollment": "from-pink-500 to-rose-600",
  "benefits_enrollment": "from-pink-500 to-rose-600",
  "probation-goals": "from-violet-500 to-purple-600",
  "probation_goals": "from-violet-500 to-purple-600",
  "welcome-survey": "from-orange-500 to-red-600",
  "welcome_survey": "from-orange-500 to-red-600",
  "journey-automation": "from-blue-600 to-indigo-700",
  "journey_automation": "from-blue-600 to-indigo-700",
};

export default function EmployeeOnboardingPageEnhanced({
  employeeId,
  canComplete = true,
}: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [instance, setInstance] = useState<OnboardingInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [completingStepId, setCompletingStepId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleteAnimation, setShowCompleteAnimation] = useState(false);
  const [celebratedMilestones, setCelebratedMilestones] = useState<Set<number>>(new Set());
  const prevActiveStepRef = useRef<Step | undefined>(undefined);
  const canAssignTemplate =
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  const fireConfetti = (type: "step" | "milestone" | "complete" = "step") => {
    const colors = type === "complete" 
      ? ["#fbbf24", "#f59e0b", "#22c55e", "#10b981", "#3b82f6", "#6366f1"]
      : type === "milestone"
      ? ["#6366f1", "#8b5cf6", "#a855f7"]
      : ["#22c55e", "#10b981"];
    
    confetti({
      particleCount: type === "complete" ? 150 : type === "milestone" ? 80 : 30,
      spread: type === "complete" ? 100 : 70,
      origin: { y: 0.6 },
      colors,
      startVelocity: type === "complete" ? 45 : 30,
      gravity: 0.8,
      ticks: 200,
      zIndex: 9999,
    });
  };

  const fetchOnboarding = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(`/api/onboarding/instances/${employeeId}`);
      if (!res.ok) {
        const errors = await res.json().catch(() => ({}));
        const message = errors?.error || "Failed to load onboarding.";
        setError(message);
        toast.error(message);
        setInstance(null);
      } else {
        setInstance(await res.json());
      }
    } catch {
      setError("Network error.");
      toast.error("Network error while loading onboarding.");
      setInstance(null);
    }
    if (!options?.silent) {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    const res = await fetch("/api/onboarding/templates");
    if (res.ok) {
      const data = await res.json();
      const templatesData = Array.isArray(data) ? data : [];
      setTemplates(templatesData);
      if (canAssignTemplate && templatesData.length === 1) {
        const templateId = templatesData[0]?.id;
        if (templateId) {
          setSelectedTemplate((prev) => prev || templateId);
        }
      }
    }
  };

  useEffect(() => {
    fetchOnboarding();
    if (canAssignTemplate) {
      fetchTemplates();
    }
  }, [employeeId, canAssignTemplate]);

  // Effect to detect onboarding completion - must be at top level before any early returns
  const steps = [...(instance?.steps ?? [])].sort((a, b) => a.order - b.order);
  const activeStep = steps.find((s) => s.status !== "completed");

  useEffect(() => {
    if (prevActiveStepRef.current && !activeStep && !loading) {
      setShowCompleteAnimation(true);
    }
    prevActiveStepRef.current = activeStep;
  }, [activeStep, loading]);

  const handleAssignOnboarding = async () => {
    if (!selectedTemplate) {
      setAssignError("Select a template before assigning.");
      return;
    }
    setAssignError(null);
    setAssignSuccess(false);
    setAssigning(true);
    try {
      const empRes = await fetch(`/api/employees/${employeeId}`);
      if (!empRes.ok) {
        throw new Error("Failed to look up employee details");
      }
      const emp = await empRes.json();

      const assignRes = await fetch("/api/onboarding/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate,
          userId: emp.userId,
          employeeId,
        }),
      });
      if (!assignRes.ok) {
        const payload = await assignRes.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to assign onboarding");
      }

      setAssignSuccess(true);
      toast.success("Onboarding assigned successfully.");
      await fetchOnboarding();
    } catch (err) {
      console.error("Failed to assign onboarding:", err);
      const message =
        err instanceof Error ? err.message : "Failed to assign onboarding.";
      setAssignError(message);
      toast.error(message);
    }
    setAssigning(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-900/20 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl"
              initial={{ 
                x: Math.random() * 100 - 50 + "%", 
                y: Math.random() * 100 - 50 + "%",
                scale: 0.5,
                opacity: 0 
              }}
              animate={{ 
                x: [null, Math.random() * 20 - 10 + "%"],
                y: [null, Math.random() * 20 - 10 + "%"],
                scale: [0.5, 1, 0.8],
                opacity: [0, 0.6, 0.4]
              }}
              transition={{ 
                duration: 4 + i * 0.5, 
                repeat: Infinity, 
                repeatType: "reverse",
                delay: i * 0.3 
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center relative z-10"
        >
          {/* Animated rocket with orbit */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            {/* Orbital rings */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-indigo-200/30 dark:border-indigo-700/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border-2 border-purple-200/40 dark:border-purple-700/40"
              animate={{ rotate: -360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Orbiting particles */}
            {[0, 120, 240].map((angle, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500"
                style={{ top: "50%", left: "50%", marginTop: -6, marginLeft: -6 }}
                animate={{
                  x: [
                    Math.cos((angle * Math.PI) / 180) * 50,
                    Math.cos(((angle + 360) * Math.PI) / 180) * 50,
                  ],
                  y: [
                    Math.sin((angle * Math.PI) / 180) * 50,
                    Math.sin(((angle + 360) * Math.PI) / 180) * 50,
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
              />
            ))}

            {/* Central rocket */}
            <motion.div
              className="absolute inset-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40"
              animate={{ 
                y: [-4, 4, -4],
                rotate: [-2, 2, -2]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Rocket className="w-10 h-10 text-white" />
              </motion.div>
            </motion.div>
          </div>

          {/* Text content */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-3"
          >
            Commencing Onboarding
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-slate-600 dark:text-slate-400 mb-6 flex items-center justify-center gap-2"
          >
            <span>Hang tight</span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ✨
            </motion.span>
          </motion.p>

          {/* Loading bar */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.6 }}
            className="w-48 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto overflow-hidden"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-red-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-red-900/20 p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="max-w-lg w-full p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              We couldn&apos;t load your onboarding
            </h2>
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-sm text-muted-foreground">
              Try again below. If the issue persists, please contact your administrator.
            </p>
            <Button
              variant="secondary"
              onClick={() => fetchOnboarding()}
              className="gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Retry
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-900/20 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-lg"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 mb-6"
          >
            <Clock className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
          </motion.div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            No onboarding assigned yet
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {canAssignTemplate
              ? "Select a template below to start the onboarding journey"
              : "Your onboarding isn't ready just yet. Please contact HR for assistance."}
          </p>
          
          {canAssignTemplate && templates.length > 0 && (
            <div className="space-y-4">
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger className="w-full max-w-sm mx-auto">
                  <SelectValue placeholder="Select an onboarding template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignError && (
                <p className="text-sm text-destructive">{assignError}</p>
              )}
              <Button 
                onClick={handleAssignOnboarding} 
                disabled={assigning}
                className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Rocket className="w-4 h-4" />
                {assigning ? "Assigning..." : "Start Onboarding"}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // Note: steps and activeStep are computed earlier (before early returns) to satisfy hook rules
  const totalSteps = steps.length;
  const completeCount = steps.filter((s) => s.status === "completed").length;
  const percent = totalSteps ? Math.round((completeCount / totalSteps) * 100) : 0;
  const currentIdx = activeStep ? steps.findIndex((s) => s.id === activeStep.id) : totalSteps;

  const handleComplete = async (stepId: string, data?: any) => {
    try {
      setCompletingStepId(stepId);
      const res = await fetch(`/api/onboarding/step/${stepId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data || {}),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`Failed to complete step ${stepId}:`, text);
        toast.error("We couldn't save your progress. Please try again.");
      } else {
        const responseData = await res.json().catch(() => ({}));
        
        // Check for dropped fields (admin-only fields that couldn't be saved)
        if (responseData.droppedFields && responseData.droppedFields.length > 0) {
          const fieldNameMap: Record<string, string> = {
            'salary': 'Salary',
            'salaryAmount': 'Salary Amount',
            'annualSalary': 'Annual Salary',
            'hourlyRate': 'Hourly Rate',
            'payRate': 'Pay Rate',
            'kiwiSaverEmployerRate': 'Employer KiwiSaver Rate',
            'employerKiwiSaverRate': 'Employer KiwiSaver Rate',
          };
          const fieldNames = responseData.droppedFields
            .map((f: string) => fieldNameMap[f] || f)
            .join(', ');
          
          toast.warning('Some fields require admin completion', {
            description: `The following fields were not saved and require an administrator to complete: ${fieldNames}`,
            duration: 8000,
          });
        }
        
        toast.success("Step completed!");
        fireConfetti("step");
        
        // Check for milestone celebrations (25%, 50%, 75%)
        const newCompleteCount = completeCount + 1;
        const newPercent = Math.round((newCompleteCount / totalSteps) * 100);
        const milestones = [25, 50, 75];
        
        for (const milestone of milestones) {
          if (newPercent >= milestone && percent < milestone && !celebratedMilestones.has(milestone)) {
            setTimeout(() => {
              fireConfetti("milestone");
              toast.success(`🎉 ${milestone}% complete!`, {
                description: "You're making great progress!"
              });
              setCelebratedMilestones(prev => new Set([...prev, milestone]));
            }, 500);
            break;
          }
        }
      }
      await fetchOnboarding({ silent: true });
    } catch (err) {
      console.error("Error completing onboarding step:", err);
      toast.error("Unexpected error completing step.");
    }
    setCompletingStepId(null);
    setRefreshing(false);
  };

  const activeStepKey = activeStep?.instanceStepId || activeStep?.id;
  const isCompletingActive = !!activeStepKey && completingStepId === activeStepKey;

  const employeeName = session?.user?.name || "there";
  const firstName = employeeName.split(" ")[0];

  return (
    <>
      <OnboardingCompleteAnimation
        isOpen={showCompleteAnimation}
        onClose={() => setShowCompleteAnimation(false)}
        employeeName={employeeName}
        completedSteps={totalSteps}
        onGoToDashboard={() => router.push("/dashboard")}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-900/20">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b sticky top-0 z-40"
        >
          <div className="max-w-5xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25"
                >
                  <Rocket className="w-7 h-7 text-white" />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                      Welcome, {firstName}!
                    </h1>
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                      {instance.template?.name || "Onboarding"}
                    </Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Complete each task to finish your onboarding journey
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setRefreshing(true);
                    await fetchOnboarding({ silent: true });
                    setRefreshing(false);
                  }}
                  disabled={refreshing}
                  className="gap-1.5"
                >
                  <RefreshCcw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                  {refreshing ? "Refreshing" : "Refresh"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  className="gap-1.5"
                >
                  <Home className="w-4 h-4" />
                  Dashboard
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {completeCount} of {totalSteps} tasks complete
                </span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {percent}%
                </span>
              </div>
              <div className="relative">
                <Progress value={percent} className="h-3" />
                {/* Milestone markers */}
                <div className="absolute top-0 left-0 right-0 h-full flex items-center pointer-events-none">
                  {[25, 50, 75].map((milestone) => (
                    <div
                      key={milestone}
                      className="absolute w-0.5 h-full bg-white/50 dark:bg-slate-800/50"
                      style={{ left: `${milestone}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-between mt-1">
                {[0, 25, 50, 75, 100].map((milestone) => (
                  <span 
                    key={milestone} 
                    className={cn(
                      "text-xs",
                      percent >= milestone 
                        ? "text-indigo-600 dark:text-indigo-400 font-medium" 
                        : "text-slate-400"
                    )}
                  >
                    {milestone}%
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Step List - Left Side */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1"
            >
              <Card className="overflow-hidden sticky top-32">
                <div className="px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    Your Journey
                  </h3>
                </div>
                <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
                  {steps.map((step, index) => {
                    const isCompleted = step.status === "completed";
                    const isActive = !isCompleted && step.id === activeStep?.id;
                    const Icon = STEP_ICONS[step.type?.toLowerCase()] || FileText;
                    const color = STEP_COLORS[step.type?.toLowerCase()] || "from-gray-500 to-gray-600";

                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-all",
                          isActive && "bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800",
                          isCompleted && "bg-emerald-50/50 dark:bg-emerald-900/20",
                          !isActive && !isCompleted && "hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        {/* Status */}
                        <div className={cn(
                          "flex-none w-8 h-8 rounded-lg flex items-center justify-center",
                          isCompleted && "bg-emerald-100 dark:bg-emerald-900/50",
                          isActive && "bg-indigo-100 dark:bg-indigo-900/50",
                          !isCompleted && !isActive && "bg-slate-100 dark:bg-slate-800"
                        )}>
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : isActive ? (
                            <Play className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <span className="text-sm font-medium text-slate-400">
                              {index + 1}
                            </span>
                          )}
                        </div>

                        {/* Icon */}
                        <div className={cn(
                          "flex-none w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center opacity-75",
                          color
                        )}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            isActive && "text-indigo-700 dark:text-indigo-300",
                            isCompleted && "text-emerald-700 dark:text-emerald-300",
                            !isActive && !isCompleted && "text-slate-600 dark:text-slate-400"
                          )}>
                            {step.title || step.label || `Step ${index + 1}`}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>

            {/* Active Step - Right Side */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2"
            >
              <AnimatePresence mode="wait">
                {activeStep ? (
                  <motion.div
                    key={activeStep.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="overflow-hidden">
                      {/* Step Header */}
                      <div className={cn(
                        "px-6 py-5 bg-gradient-to-r",
                        STEP_COLORS[activeStep.type?.toLowerCase()] || "from-gray-500 to-gray-600"
                      )}>
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            {(() => {
                              const Icon = STEP_ICONS[activeStep.type?.toLowerCase()] || FileText;
                              return <Icon className="w-7 h-7 text-white" />;
                            })()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                                Step {currentIdx + 1} of {totalSteps}
                              </Badge>
                            </div>
                            <h2 className="text-xl font-bold text-white">
                              {activeStep.title || activeStep.label || "Current Task"}
                            </h2>
                          </div>
                        </div>
                      </div>

                      {/* Step Content */}
                      <div className="p-0">
                        <OnboardingStepRenderer
                          step={activeStep}
                          readOnly={!canComplete}
                          employeeId={employeeId}
                          onComplete={
                            canComplete
                              ? (data: any) => handleComplete(
                                  activeStep.instanceStepId || activeStep.id,
                                  data
                                )
                              : () => {}
                          }
                          isCompleting={isCompletingActive}
                        />
                      </div>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    key="complete"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Card className="overflow-hidden">
                      <div className="p-12 text-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", delay: 0.2 }}
                          className="relative inline-block mb-6"
                        >
                          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                            <Trophy className="w-12 h-12 text-white" />
                          </div>
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
                        <h2 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-3">
                          🎉 You&apos;re All Set!
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                          Congratulations! You&apos;ve completed all your onboarding tasks.
                          Welcome to the team!
                        </p>
                        <Button 
                          onClick={() => router.push("/dashboard")}
                          className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25"
                        >
                          Go to Dashboard
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}






