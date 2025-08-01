'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Progress } from '@/components/ui/progress';
import OnboardingStepRenderer from '@/components/onboarding/OnboardingStepRenderer';
import { OnboardingStep } from '@prisma/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

type Step = {
  id: string;
  instanceStepId?: string;
  type: string;
  status: string;
  order: number;
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

export default function EmployeeOnboardingPage({ employeeId, canComplete = true }: Props) {
  const [loading, setLoading] = useState(true);
  const [instance, setInstance] = useState<OnboardingInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

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

  const fetchTemplates = async () => {
    const res = await fetch('/api/onboarding/templates');
    const data = await res.json();
    setTemplates(data || []);
  };

  useEffect(() => {
    fetchOnboarding();
    fetchTemplates();
    // eslint-disable-next-line
  }, [employeeId]);

  const handleAssignOnboarding = async () => {
    if (!selectedTemplate) {
      alert('Please select a template.');
      return;
    }
    setAssigning(true);
    try {
      // Fetch employee to get userId
      const empRes = await fetch(`/api/employees/${employeeId}`);
      const emp = await empRes.json();

      await fetch('/api/onboarding/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          userId: emp.userId,
          employeeId,
        }),
      });

      await fetchOnboarding();
    } catch (err) {
      console.error('Failed to assign onboarding:', err);
    }
    setAssigning(false);
  };

  if (loading) {
    return <div className="p-8 text-lg">Loading onboarding…</div>;
  }

  if (!instance) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4">No onboarding currently assigned.</p>
        {templates.length > 0 ? (
          <>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
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
            <Button onClick={handleAssignOnboarding} disabled={assigning}>
              {assigning ? 'Assigning...' : 'Assign Onboarding'}
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground">No templates available.</p>
        )}
      </div>
    );
  }

  const steps = instance.steps.sort((a, b) => a.order - b.order);
  const completeCount = steps.filter((s) => s.status === 'completed').length;
  const percent = Math.round((completeCount / steps.length) * 100);
  const activeStep = steps.find((s) => s.status !== 'completed');
  const currentIdx = activeStep ? steps.findIndex((s) => s.id === activeStep.id) : steps.length;

  const handleComplete = async (stepId: string, data?: any) => {
    try {
      const res = await fetch(`/api/onboarding/step/${stepId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      });

      if (!res.ok) {
        console.error(`Failed to complete step ${stepId}:`, await res.text());
      }
      await fetchOnboarding();
    } catch (err) {
      console.error('Error completing onboarding step:', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <Card className="p-6 mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome to Your Onboarding!</h1>
        <p className="mb-4">
          You're nearly ready to get started. Complete each step below to finish onboarding.
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
      employeeId={employeeId}
      onComplete={
        canComplete
          ? (data: any) => handleComplete(activeStep.instanceStepId || activeStep.id, data)
          : () => {}
      }
    />
  ) : (
    <div className="p-6 text-center">
      <div className="text-lg font-bold text-green-700 mb-4">
        🎉 Onboarding Complete!
      </div>
      <Button onClick={() => window.location.href = "/dashboard"}>
        Go to Dashboard
      </Button>
    </div>
  )}
</Card>
      <div className="text-sm text-center text-muted-foreground mb-2">
        {activeStep ? `${currentIdx + 1} / ${steps.length} steps` : `${steps.length} / ${steps.length} steps`}
      </div>
    </div>
  );
}
