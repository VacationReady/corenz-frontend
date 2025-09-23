"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Progress } from "@/components/ui/progress";
import OnboardingStepRenderer from "@/components/onboarding/OnboardingStepRenderer";
import { OnboardingStep } from "@prisma/client";
import { GlassSpinner } from "@/components/ui/LoadingSpinner";
import { CheckCircle, Clock, Circle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";

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
  const canAssignTemplate =
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  const fetchOnboarding = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/onboarding/instances/${employeeId}`);
      if (!res.ok) {
        setError((await res.json()).error || "Failed to load onboarding.");
        setInstance(null);
      } else {
        setInstance(await res.json());
      }
    } catch {
      setError("Network error.");
      setInstance(null);
    }
    setLoading(false);
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
      alert("Please select a template.");
      return;
    }
    setAssigning(true);
    try {
      // Fetch employee to get userId
      const empRes = await fetch(`/api/employees/${employeeId}`);
      const emp = await empRes.json();

      await fetch("/api/onboarding/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate,
          userId: emp.userId,
          employeeId,
        }),
      });

      await fetchOnboarding();
    } catch (err) {
      console.error("Failed to assign onboarding:", err);
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
              We couldn't load your onboarding.
            </h2>
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Try again below. If the issue persists, please refresh the page or
            contact your administrator.
          </p>
          <Button variant="secondary" onClick={fetchOnboarding}>
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
              {templates.length === 1 ? (
                <p className="text-xs text-muted-foreground -mt-2 mb-4">
                  Automatically selected because it's the only template.
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
                <Link href="/settings/onboarding">Open template builder</Link>
              </Button>
            </Card>
          )
        ) : (
          <Card className="max-w-xl mx-auto">
            <EmptyState
              title="No onboarding yet"
              description="Your onboarding isn't ready just yet. Please reach out to your HR team if you believe this is a mistake or need assistance getting started."
            />
          </Card>
        )}
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
      const res = await fetch(`/api/onboarding/step/${stepId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data || {}),
      });

      if (!res.ok) {
        console.error(`Failed to complete step ${stepId}:`, await res.text());
      }
      await fetchOnboarding();
    } catch (err) {
      console.error("Error completing onboarding step:", err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <Card className="p-6 mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome to Your Onboarding!</h1>
        <p className="mb-4">
          You're nearly ready to get started. Complete each step below to finish
          onboarding.
        </p>
        <div className="mb-2 font-semibold">
          Onboarding: {instance.template?.name}
        </div>
        <Progress value={percent} className="h-2 mb-3" />
        <div className="text-sm text-muted-foreground mb-2">
          {totalSteps ? `${percent}% complete` : "0% complete"}
        </div>
      </Card>
      <Card className="mb-8">
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
          />
        ) : (
          <div className="p-6 text-center">
            <div className="text-lg font-bold text-green-700 mb-4">
              🎉 Onboarding Complete!
            </div>
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        )}
      </Card>
      <Card className="mb-6">
        <div className="space-y-4 text-xs text-muted-foreground">
          <div className="font-semibold uppercase tracking-wide">Step summary</div>
          <ul className="space-y-3">
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
                <li key={step.id} className="flex items-start gap-3 leading-tight">
                  <Icon
                    className={`mt-0.5 h-4 w-4 flex-shrink-0 opacity-80 ${iconClass}`}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium text-foreground">{title}</div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">
                      {statusLabel}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Card>
      <div className="text-sm text-center text-muted-foreground mb-2">
        {activeStep
          ? `${currentIdx + 1} / ${totalSteps} steps`
          : `${totalSteps} / ${totalSteps} steps`}
      </div>
    </div>
  );
}
