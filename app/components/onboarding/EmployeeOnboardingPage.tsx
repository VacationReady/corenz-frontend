"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Circle,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

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

export default function EmployeeOnboardingPage({
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
  const canAssignTemplate =
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

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

  const handleAssignOnboarding = async () => {
    if (!selectedTemplate) {
      setAssignError("Select a template before assigning.");
      return;
    }
    setAssignError(null);
    setAssignSuccess(false);
    setAssigning(true);
    try {
      // Fetch employee to get userId
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
      <div className="p-8 flex items-center justify-center">
        <GlassSpinner size="lg" showText text="Loading onboarding…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Card className="max-w-xl w-full p-6 text-center space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">
              We couldn&apos;t load your onboarding.
            </h2>
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Try again below. If the issue persists, please refresh the page or
            contact your administrator.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              void fetchOnboarding();
            }}
          >
            Retry loading onboarding
          </Button>
        </Card>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4">No onboarding currently assigned.</p>
        {canAssignTemplate ? (
          templates.length > 0 ? (
            <>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger className="w-full max-w-sm mx-auto mb-4">
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
              {assignError ? (
                <div className="text-xs text-destructive mb-3" role="alert">
                  {assignError}
                </div>
              ) : null}
              {templates.length === 1 ? (
                <p className="text-xs text-muted-foreground -mt-2 mb-4">
                  Automatically selected because it&apos;s the only template.
                </p>
              ) : null}
              <Button onClick={handleAssignOnboarding} disabled={assigning}>
                {assigning ? "Assigning..." : "Assign Onboarding"}
              </Button>
            </>
          ) : (
            <Card className="max-w-xl mx-auto p-6 text-center space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No onboarding templates yet</h3>
                <p className="text-sm text-muted-foreground">
                  We can&apos;t assign onboarding because no templates are available. Set
                  up your first template to get new hires started.
                </p>
                <p className="text-sm text-muted-foreground">
                  Create your first template to assign onboarding here.
                </p>
              </div>
              <Button asChild>
                <Link
                  href="/settings/onboarding"
                  className="text-lg font-bold text-primary hover:text-primary-dark"
                >
                  Open template builder
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Card>
          )
        ) : (
          <Card className="max-w-xl mx-auto">
            <EmptyState
              title="No onboarding yet"
              description="Your onboarding isn't ready just yet. Please reach out to your HR team if you believe this is a mistake or need assistance getting started."
              className="p-8"
            />
          </Card>
        )
      }
      </div>
    );
  }

  const steps = instance.steps.sort((a, b) => a.order - b.order);
  const totalSteps = steps.length;
  const completeCount = steps.filter((s) => s.status === "completed").length;
  const percent = totalSteps
    ? Math.round((completeCount / totalSteps) * 100)
    : 0;
  const activeStep = steps.find((s) => s.status !== "completed");
  const currentIdx = activeStep
    ? steps.findIndex((s) => s.id === activeStep.id)
    : totalSteps;

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
        toast.error("We couldn&apos;t save your progress. Please try again.");
      }
      toast.success("Step completed.");
      await fetchOnboarding({ silent: true });
    } catch (err) {
      console.error("Error completing onboarding step:", err);
      toast.error("Unexpected error completing step.");
    }
    setCompletingStepId(null);
    setRefreshing(false);
  };

  const percentLabel = totalSteps
    ? `${percent}% complete`
    : "No steps configured yet";

  const activeStepKey = activeStep?.instanceStepId || activeStep?.id;
  const isCompletingActive =
    !!activeStepKey && completingStepId === activeStepKey;

  const statusCopy = useMemo(() => {
    if (!activeStep) return "All steps completed";
    const position = currentIdx + 1;
    return `Next step ${position} of ${totalSteps}: ${
      activeStep.title || activeStep.label || "Untitled"
    }`;
  }, [activeStep, currentIdx, totalSteps]);

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <section
        className="grid gap-4 lg:grid-cols-[1fr_auto] items-start"
        aria-live="polite"
      >
        <Card className="p-6 glass-subtle">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3 w-3" /> Ready to go
              </div>
              <h1 className="mt-3 text-2xl font-semibold">Welcome aboard!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Complete each task so we can activate your employee profile.
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {instance.template?.name || "Onboarding"}
            </Badge>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">
                {percentLabel}
              </span>
              <span className="text-xs text-muted-foreground">
                {activeStep ? statusCopy : "You&apos;re all set"}
              </span>
            </div>
            <Progress value={percent} className="h-2" aria-label="Onboarding progress" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {totalSteps ? `${completeCount} of ${totalSteps} tasks complete` : "No tasks available"}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1"
                  onClick={async () => {
                    setRefreshing(true);
                    await fetchOnboarding({ silent: true });
                    setRefreshing(false);
                  }}
                  disabled={refreshing}
                >
                  <RefreshCcw className="h-4 w-4" />
                  {refreshing ? "Refreshing" : "Refresh"}
                </Button>
                {assignSuccess ? (
                  <Badge variant="secondary" className="text-xs">
                    Onboarding assigned
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-6 lg:min-w-[220px]">
          <div className="space-y-3">
            <div className="text-4xl font-semibold text-foreground">
              {percent}%
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>{completeCount} completed</div>
              <div>{totalSteps - completeCount} remaining</div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full gap-1"
              onClick={() => router.push("/dashboard")}
            >
              Go to dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </section>

      <Card className="p-0 overflow-hidden">
        {activeStep ? (
          <OnboardingStepRenderer
            step={activeStep}
            readOnly={!canComplete}
            employeeId={employeeId}
            onComplete={
              canComplete
                ? (data: any) =>
                    handleComplete(
                      activeStep.instanceStepId || activeStep.id,
                      data,
                    )
                : () => {}
            }
            isCompleting={isCompletingActive}
          />
        ) : (
          <div className="p-8 text-center space-y-4">
            <div className="text-lg font-semibold text-green-600">
              🎉 Onboarding Complete!
            </div>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              You&apos;ve wrapped up every task. Welcome to the team!
            </p>
            <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Step summary
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Track what&apos;s done, in progress, or still pending.
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {activeStep ? `${currentIdx + 1}/${totalSteps} active` : `${totalSteps}/${totalSteps} complete`}
            </Badge>
          </div>
          <ul className="space-y-3" aria-live="polite">
            {steps.map((step, index) => {
              const isCompleted = step.status === "completed";
              const isActive =
                !isCompleted &&
                (step.status === "active" ||
                  step.status === "in_progress" ||
                  step.id === activeStep?.id);
              const Icon = isCompleted ? CheckCircle : isActive ? Clock : Circle;
              const iconClass = isCompleted
                ? "text-emerald-500"
                : isActive
                  ? "text-primary"
                  : "text-muted-foreground";
              const title =
                step.title ||
                step.label ||
                step.description ||
                `Step ${index + 1}`;
              const statusLabel = isCompleted
                ? "Completed"
                : isActive
                  ? "In progress"
                  : "Pending";

              return (
                <li
                  key={step.id}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-4 shadow-sm"
                >
                  <Icon
                    className={`mt-0.5 h-5 w-5 flex-shrink-0 ${iconClass}`}
                    aria-hidden="true"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {title}
                      </span>
                      <Badge
                        variant={isCompleted ? "secondary" : isActive ? "default" : "outline"}
                        className="uppercase tracking-wide text-[10px]"
                      >
                        {statusLabel}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {step.description || step.label || "Awaiting completion"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Card>
    </div>
  );
}
