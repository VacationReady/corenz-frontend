'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Progress } from '@/components/ui/progress';
import OnboardingStepRenderer from '@/components/onboarding/OnboardingStepRenderer';
import { OnboardingStep } from '@prisma/client';

type Step = {
  id: string;
  type: string;
  status: string;
  order: number;
  title?: string;
  description?: string;
  formFields?: any[];
};

type OnboardingInstance = {
  id: string;
  template: { name: string; steps?: OnboardingStep[] }; // added steps optional for typing
  steps: Step[]; // instance-specific steps (with status)
};

type Props = {
  employeeId: string; 
  canComplete?: boolean;
};

export default function EmployeeOnboardingPage({ employeeId, canComplete = true }: Props) {
  const [loading, setLoading] = useState(true);
  const [instance, setInstance] = useState<OnboardingInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch onboarding data for this employee
  const fetchOnboarding = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/onboarding/instances/${employeeId}`);
      if (!res.ok) {
        setError((await res.json()).error || 'Failed to load onboarding.');
        setInstance(null);
      } else {
        setInstance(await res.json());
      }
    } catch {
      setError('Network error.');
      setInstance(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOnboarding();
    // eslint-disable-next-line
  }, [employeeId]);

  if (loading) {
    return <div className="p-8 text-lg">Loading onboarding…</div>;
  }
  if (error) {
    return <div className="p-8 text-destructive text-lg">{error}</div>;
  }
  if (!instance) {
    return <div className="p-8">No onboarding found.</div>;
  }

  // ✅ Merge template steps with instance step statuses
  const steps = instance.steps.sort((a, b) => a.order - b.order);

const completeCount = steps.filter(s => s.status === 'completed').length;
const percent = Math.round((completeCount / steps.length) * 100);
const activeStep = steps.find(s => s.status !== 'completed');
const currentIdx = activeStep ? steps.findIndex(s => s.id === activeStep.id) : steps.length;

  return (
    <div className="max-w-2xl mx-auto py-10">
      <Card className="p-6 mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome to Your Onboarding!</h1>
        <p className="mb-4">
          {`You're nearly ready to get started. Complete each step below to finish onboarding.`}
        </p>
        <div className="mb-2 font-semibold">Onboarding: {instance.template?.name}</div>
        <Progress value={percent} className="h-2 mb-3" />
        <div className="text-sm text-muted-foreground mb-2">{percent}% complete</div>
      </Card>
      <Card className="mb-8">
        {activeStep ? (
          <OnboardingStepRenderer
            step={activeStep}
            readOnly={!canComplete}
            onComplete={canComplete
              ? async (data: any) => {
                  await fetch(`/api/onboarding/step/${activeStep.id}/complete`, {
                    method: "POST",
                    body: JSON.stringify(data || {}),
                    headers: { "Content-Type": "application/json" },
                  });
                  await fetchOnboarding();
                }
              : () => {}}
          />
        ) : (
          <div className="p-6 text-center text-lg font-bold text-green-700">
            🎉 Onboarding Complete!
          </div>
        )}
      </Card>
      <div className="text-sm text-center text-muted-foreground mb-2">
        {activeStep ? `${currentIdx + 1} / ${mergedSteps.length} steps` : `${mergedSteps.length} / ${mergedSteps.length} steps`}
      </div>
    </div>
  );
}
