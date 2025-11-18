"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Target, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface KeyResult {
  id: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
  dueDate?: string;
}

export default function CreateObjectivePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const employeeId = searchParams?.get("employeeId");

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"company" | "team" | "personal">(
    employeeId ? "personal" : "company"
  );
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [status, setStatus] = useState<"NOT_STARTED" | "IN_PROGRESS" | "AT_RISK" | "COMPLETED" | "CANCELLED" | "DEFERRED">("NOT_STARTED");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);

  const canManageTemplates =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "MANAGER";

  useEffect(() => {
    if (session && !canManageTemplates && type !== "personal") {
      toast.error("You don't have permission to create company or team objectives");
      router.push("/performance");
    }
  }, [session, canManageTemplates, type, router]);

  const addKeyResult = () => {
    setKeyResults([
      ...keyResults,
      {
        id: crypto.randomUUID(),
        title: "",
        description: "",
        targetValue: 100,
        currentValue: 0,
        unit: "",
        dueDate: "",
      },
    ]);
  };

  const removeKeyResult = (id: string) => {
    setKeyResults(keyResults.filter((kr) => kr.id !== id));
  };

  const updateKeyResult = (id: string, field: keyof KeyResult, value: any) => {
    setKeyResults(
      keyResults.map((kr) =>
        kr.id === id ? { ...kr, [field]: value } : kr
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority,
        status,
        dueDate: dueDate || undefined,
        startDate: startDate || undefined,
        keyResults: keyResults.filter((kr) => kr.title.trim()).map((kr) => ({
          title: kr.title.trim(),
          description: kr.description?.trim() || undefined,
          targetValue: kr.targetValue,
          currentValue: kr.currentValue,
          unit: kr.unit?.trim() || undefined,
          dueDate: kr.dueDate || undefined,
        })),
      };

      if (type === "personal" && employeeId) {
        payload.employeeId = employeeId;
      }

      const response = await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create objective");
      }

      const { objective } = await response.json();
      toast.success("Objective created successfully");

      // Navigate back to performance page or employee performance page
      if (employeeId) {
        router.push(`/employees/${employeeId}/performance?tab=objectives`);
      } else {
        router.push("/performance?tab=objectives");
      }
    } catch (error: any) {
      console.error("Error creating objective:", error);
      toast.error(error.message || "Failed to create objective");
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <PageShell
        title="Create Objective"
        description="Set goals and track progress"
        icon={<Target className="h-6 w-6" />}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <LoadingSpinner size="lg" showText text="Loading..." />
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Create Objective"
      description={employeeId ? "Create a personal objective for this employee" : "Set organizational goals and track progress"}
      icon={<Target className="h-6 w-6" />}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Objective Details</CardTitle>
            <CardDescription>
              Define the objective, its priority, and timeline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Increase customer satisfaction by 20%"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide context and details about this objective"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={type}
                  onValueChange={(value: any) => setType(value)}
                  disabled={!!employeeId}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {canManageTemplates && (
                      <>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                      </>
                    )}
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value: any) => setPriority(value)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value: any) => setStatus(value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="AT_RISK">At Risk</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="DEFERRED">Deferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Key Results</CardTitle>
                <CardDescription>
                  Define measurable outcomes that indicate success
                </CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addKeyResult}>
                <Plus className="mr-2 h-4 w-4" />
                Add Key Result
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {keyResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No key results yet. Click "Add Key Result" to define measurable outcomes.
              </p>
            ) : (
              keyResults.map((kr, index) => (
                <div key={kr.id} className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Key Result {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeKeyResult(kr.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Title *</Label>
                      <Input
                        placeholder="e.g., Achieve NPS score of 8.5"
                        value={kr.title}
                        onChange={(e) => updateKeyResult(kr.id, "title", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Additional details about this key result"
                        value={kr.description || ""}
                        onChange={(e) => updateKeyResult(kr.id, "description", e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Target Value</Label>
                      <Input
                        type="number"
                        value={kr.targetValue}
                        onChange={(e) =>
                          updateKeyResult(kr.id, "targetValue", Number(e.target.value))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Current Value</Label>
                      <Input
                        type="number"
                        value={kr.currentValue}
                        onChange={(e) =>
                          updateKeyResult(kr.id, "currentValue", Number(e.target.value))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Input
                        placeholder="e.g., %, points, users"
                        value={kr.unit || ""}
                        onChange={(e) => updateKeyResult(kr.id, "unit", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={kr.dueDate || ""}
                        onChange={(e) => updateKeyResult(kr.id, "dueDate", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              "Create Objective"
            )}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
