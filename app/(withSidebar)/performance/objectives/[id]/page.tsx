"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Target, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { formatLondonDate } from "@/lib/time";
import { ProfileUpdateSuccessAnimation } from "@/components/animations";

interface ObjectiveDetailPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_OPTIONS = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "AT_RISK",
  "COMPLETED",
  "CANCELLED",
  "DEFERRED",
] as const;

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export default function ObjectiveDetailPage({ params }: ObjectiveDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [objectiveId, setObjectiveId] = useState<string | null>(null);
  const [objective, setObjective] = useState<any | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("NOT_STARTED");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [progressInput, setProgressInput] = useState("");

  const [updateContent, setUpdateContent] = useState("");
  const [updateProgressInput, setUpdateProgressInput] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const canManageObjectives = useMemo(() => {
    const role = session?.user?.role as string | undefined;
    return role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER" || role === "HR";
  }, [session?.user?.role]);

  const canEdit = useMemo(() => {
    if (!type) return false;
    if (type === "personal") return Boolean(session?.user);
    return canManageObjectives;
  }, [type, session?.user, canManageObjectives]);

  const fromParam = searchParams.get("from");
  const employeeIdParam = searchParams.get("employeeId");

  useEffect(() => {
    params.then((resolved) => {
      setObjectiveId(resolved.id);
    });
  }, [params]);

  useEffect(() => {
    if (!objectiveId) return;

    const loadObjective = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/objectives/${objectiveId}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Objective not found");
          } else {
            const error = await res.json().catch(() => ({}));
            toast.error(error.error || "Failed to load objective");
          }
          handleBack();
          return;
        }

        const data = await res.json();
        const obj = data.objective;
        setObjective(obj);
        setType(data.type || null);

        setTitle(obj.title || "");
        setDescription(obj.description || "");
        setStatus(obj.status || "NOT_STARTED");
        setPriority(obj.priority || "MEDIUM");
        setDueDate(obj.dueDate ? String(obj.dueDate).slice(0, 10) : "");
        setStartDate(obj.startDate ? String(obj.startDate).slice(0, 10) : "");
        setProgressInput(
          typeof obj.progress === "number" && !Number.isNaN(obj.progress)
            ? String(obj.progress)
            : ""
        );
      } catch (error) {
        toast.error("Failed to load objective");
        handleBack();
      } finally {
        setLoading(false);
      }
    };

    loadObjective();
  }, [objectiveId]);

  const handleBack = () => {
    if (fromParam) {
      try {
        const decoded = decodeURIComponent(fromParam);
        if (decoded.startsWith("/")) {
          router.push(decoded);
          return;
        }
      } catch {
        // fall through
      }
    }
    if (employeeIdParam) {
      router.push(`/employees/${employeeIdParam}/performance?tab=objectives`);
      return;
    }
    router.push("/performance?tab=objectives");
  };

  const handleSave = async () => {
    if (!objectiveId) return;
    setSaving(true);
    try {
      const payload: any = {};

      if (title.trim()) payload.title = title.trim();
      payload.description = description.trim();

      if (status) payload.status = status;
      if (priority) payload.priority = priority;

      payload.dueDate = dueDate ? dueDate : null;
      payload.startDate = startDate ? startDate : null;

      const trimmedProgress = progressInput.trim();
      if (trimmedProgress !== "") {
        const parsed = Number(trimmedProgress);
        if (!Number.isNaN(parsed)) {
          payload.progress = parsed;
        }
      }

      const res = await fetch(`/api/objectives/${objectiveId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || "Failed to update objective");
        return;
      }

      const data = await res.json();
      const updated = data.objective;
      setObjective((prev: any) => ({ ...(updated || prev), type: prev?.type }));

      setTitle(updated.title || "");
      setDescription(updated.description || "");
      setStatus(updated.status || "NOT_STARTED");
      setPriority(updated.priority || "MEDIUM");
      setDueDate(updated.dueDate ? String(updated.dueDate).slice(0, 10) : "");
      setStartDate(updated.startDate ? String(updated.startDate).slice(0, 10) : "");
      setProgressInput(
        typeof updated.progress === "number" && !Number.isNaN(updated.progress)
          ? String(updated.progress)
          : ""
      );

      setShowSuccess(true);
    } catch (error) {
      toast.error("Failed to update objective");
    } finally {
      setSaving(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!objectiveId) return;
    if (!updateContent.trim()) {
      toast.error("Update content is required");
      return;
    }

    setUpdating(true);
    try {
      const payload: any = { content: updateContent.trim() };
      const trimmedProgress = updateProgressInput.trim();
      if (trimmedProgress !== "") {
        const parsed = Number(trimmedProgress);
        if (!Number.isNaN(parsed)) {
          payload.progress = parsed;
        }
      }

      const res = await fetch(`/api/objectives/${objectiveId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || "Failed to add update");
        return;
      }

      const data = await res.json();
      const newUpdate = data.update;

      setObjective((prev: any) => {
        if (!prev) return prev;
        const nextUpdates = [newUpdate, ...(prev.updates || [])];
        const next = { ...prev, updates: nextUpdates };
        if (typeof newUpdate.progress === "number") {
          next.progress = newUpdate.progress;
        }
        return next;
      });

      if (typeof data.update.progress === "number") {
        setProgressInput(String(data.update.progress));
      }

      setUpdateContent("");
      setUpdateProgressInput("");
      setShowSuccess(true);
    } catch (error) {
      toast.error("Failed to add update");
    } finally {
      setUpdating(false);
    }
  };

  const pageTitle = objective ? objective.title || "Objective" : "Objective";
  const pageDescription =
    type === "personal"
      ? "Personal objective"
      : type === "team"
      ? "Team objective"
      : type === "company"
      ? "Company objective"
      : "Objective details";

  if (loading) {
    return (
      <PageShell
        title="Objective details"
        description="Loading objective..."
        icon={<Target className="h-6 w-6" />}
      >
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" showText text="Loading objective" />
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (!objective) {
    return null;
  }

  return (
    <PageShell
      title={pageTitle}
      description={pageDescription}
      icon={<Target className="h-6 w-6" />}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Performance
          </Button>
          {type && (
            <Badge variant="secondary" className="uppercase text-xs">
              {type}
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit objective</CardTitle>
            <CardDescription>Update the headline details and progress.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Title</label>
                <Input
                  value={title}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select
                  value={status}
                  onValueChange={setStatus}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select
                  value={priority}
                  onValueChange={setPriority}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Start date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setStartDate(event.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Due date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setDueDate(event.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea
                value={description}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value)}
                rows={4}
                disabled={!canEdit}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Progress (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={progressInput}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setProgressInput(event.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  Last updated progress: {typeof objective.progress === "number" ? `${objective.progress}%` : "N/A"}
                </p>
                {objective.dueDate && (
                  <p>Due {formatLondonDate(String(objective.dueDate))}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={!canEdit || saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {objective.keyResults && objective.keyResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Key results</CardTitle>
              <CardDescription>Track the measures that roll up to this objective.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {objective.keyResults.map((kr: any) => (
                <div
                  key={kr.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{kr.title}</p>
                    {kr.description && (
                      <p className="text-xs text-muted-foreground">{kr.description}</p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>
                      {kr.currentValue ?? 0} / {kr.targetValue} {kr.unit || ""}
                    </p>
                    {kr.dueDate && (
                      <p>Due {formatLondonDate(String(kr.dueDate))}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Updates</CardTitle>
            <CardDescription>Log check-ins and progress changes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">New update</label>
              <Textarea
                value={updateContent}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setUpdateContent(event.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3 items-end">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Progress (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={updateProgressInput}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setUpdateProgressInput(event.target.value)}
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={handleAddUpdate} disabled={updating}>
                  {updating ? "Adding update..." : "Add update"}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {objective.updates && objective.updates.length > 0 ? (
                objective.updates.map((update: any) => (
                  <div
                    key={update.id}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">
                        {update.Author
                          ? `${update.Author.firstName} ${update.Author.lastName}`
                          : "Update"}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatLondonDate(String(update.createdAt))}
                      </span>
                    </div>
                    <p className="text-sm">{update.content}</p>
                    {typeof update.progress === "number" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Progress set to {update.progress}%
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No updates yet. Use the form above to log the first check-in.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ProfileUpdateSuccessAnimation
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        fieldName="Objective"
      />
    </PageShell>
  );
}
