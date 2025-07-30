// /app/employees/[id]/onboarding/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Progress } from '@/components/ui/progress';

type Step = {
  id: string;
  type: string;
  status: string;
  order: number;
  // Add fields as needed
};

type OnboardingInstance = {
  id: string;
  template: { name: string };
  steps: Step[];
};

export default function EmployeeOnboardingPage({ params }: { params: { id: string } }) {
  const employeeId = params.id;
  const [loading, setLoading] = useState(true);
  const [instance, setInstance] = useState<OnboardingInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOnboarding() {
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
    }
    fetchOnboarding();
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

  const steps = instance.steps.sort((a, b) => a.order - b.order);
  const completeCount = steps.filter(s => s.status === 'completed').length;
  const percent = Math.round((completeCount / steps.length) * 100);

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
      <ul className="space-y-4">
        {steps.map((step, idx) => (
          <li key={step.id}>
            <Card className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">Step {idx + 1}</div>
                <div className="text-base">
                  {step.type === 'ack' && 'Acknowledge Document'}
                  {step.type === 'form' && 'Complete Form'}
                  {step.type === 'upload' && 'Upload File'}
                  {/* Add more types as needed */}
                </div>
                <div className="text-xs text-muted-foreground">
                  Status: <span className={step.status === 'completed' ? 'text-green-600' : 'text-yellow-700'}>{step.status}</span>
                </div>
              </div>
              <Button
                disabled={step.status === 'completed'}
                variant={step.status === 'completed' ? 'ghost' : 'default'}
                // onClick={() => handleCompleteStep(step.id)} // implement later
              >
                {step.status === 'completed' ? 'Completed' : 'Mark as Complete'}
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
