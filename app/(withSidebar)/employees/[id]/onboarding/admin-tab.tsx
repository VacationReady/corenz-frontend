"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type Step = {
  id: string;
  type: string;
  label?: string | null;
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
  const formatStatusLabel = (status: string) =>
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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
                Started: {new Date(instance.startedAt).toLocaleString("en-NZ", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                {instance.completedAt && (
                  <>
                    {" | "}Completed:{" "}
                    {new Date(instance.completedAt).toLocaleString("en-NZ", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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
              {formatStatusLabel(instance.status)}
            </Badge>
          </div>
          <ul className="space-y-2 mt-4">
            {instance.steps.map((step, idx) => (
              <li key={step.id} className="flex items-center gap-4">
                <div className="font-medium">
                  Step {idx + 1}: {step.label || step.type.replace(/_/g, " ")}
                </div>
                <Badge
                  variant={step.status === "completed" ? "default" : "outline"}
                >
                  {formatStatusLabel(step.status)}
                </Badge>
                {step.completedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(step.completedAt).toLocaleString("en-NZ", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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
