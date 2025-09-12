"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type Step = {
  id: string;
  type: string;
  status: string;
  order: number;
  completedAt?: string | null;
};

type Instance = {
  id: string;
  template: { name: string };
  startedAt: string;
  completedAt?: string | null;
  status: string;
  steps: Step[];
};

export default function OnboardingAdminTab({
  employeeId,
}: {
  employeeId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInstances() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/onboarding/instances/employee/${employeeId}`,
        );
        if (!res.ok) {
          setError(
            (await res.json()).error || "Failed to load onboarding instances.",
          );
          setInstances([]);
        } else {
          setInstances(await res.json());
        }
      } catch {
        setError("Network error.");
        setInstances([]);
      }
      setLoading(false);
    }
    fetchInstances();
  }, [employeeId]);

  if (loading) return <div className="p-8">Loading onboarding history…</div>;
  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!instances.length)
    return (
      <div className="p-8">No onboarding history found for this employee.</div>
    );

  return (
    <div className="space-y-8">
      {instances.map((instance, i) => (
        <Card key={instance.id} className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold">
                {instance.template?.name || "Unknown Template"}
              </div>
              <div className="text-xs text-muted-foreground">
                Started: {new Date(instance.startedAt).toLocaleString()}
                {instance.completedAt && (
                  <>
                    {" | "}Completed:{" "}
                    {new Date(instance.completedAt).toLocaleString()}
                  </>
                )}
              </div>
            </div>
            <Badge
              variant={
                instance.status === "completed"
                  ? "default"
                  : instance.status === "cancelled"
                    ? "outline"
                    : "outline"
              }
            >
              {instance.status.charAt(0).toUpperCase() +
                instance.status.slice(1)}
            </Badge>
          </div>
          <ul className="space-y-2 mt-4">
            {instance.steps.map((step, idx) => (
              <li key={step.id} className="flex items-center gap-4">
                <div className="font-medium">
                  Step {idx + 1}: {step.type === "ack" && "Acknowledge"}
                  {step.type === "form" && "Form"}
                  {step.type === "upload" && "Upload"}
                </div>
                <Badge
                  variant={step.status === "completed" ? "default" : "outline"}
                >
                  {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                </Badge>
                {step.completedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(step.completedAt).toLocaleString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
