"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Avatar } from "@/components/ui/Avatar";
import { 
  Target, 
  ArrowLeft, 
  Save, 
  Sparkles, 
  TrendingUp,
  Calendar,
  Flag,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  ChevronRight,
  Trophy,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { formatLondonDate } from "@/lib/time";
import { ProfileUpdateSuccessAnimation } from "@/components/animations";
import { cn } from "@/lib/utils";

interface ObjectiveDetailPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not Started", color: "bg-slate-100 text-slate-700" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { value: "AT_RISK", label: "At Risk", color: "bg-amber-100 text-amber-700" },
  { value: "COMPLETED", label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-rose-100 text-rose-700" },
  { value: "DEFERRED", label: "Deferred", color: "bg-gray-100 text-gray-700" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low", color: "bg-slate-100 text-slate-700" },
  { value: "MEDIUM", label: "Medium", color: "bg-sky-100 text-sky-700" },
  { value: "HIGH", label: "High", color: "bg-amber-100 text-amber-700" },
  { value: "CRITICAL", label: "Critical", color: "bg-rose-100 text-rose-700" },
] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  }
};

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

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "from-emerald-500 to-teal-500";
    if (progress >= 50) return "from-blue-500 to-cyan-500";
    if (progress >= 25) return "from-amber-500 to-orange-500";
    return "from-rose-500 to-pink-500";
  };

  const currentProgress = typeof objective?.progress === "number" ? objective.progress : 0;

  if (loading) {
    return (
      <PageShell
        title="Objective Details"
        description="Loading objective..."
        icon={<Target className="h-6 w-6" />}
      >
        <div className="flex flex-col items-center justify-center py-24">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary mb-6"
          />
          <p className="text-muted-foreground font-medium">Loading objective...</p>
        </div>
      </PageShell>
    );
  }

  if (!objective) {
    return null;
  }

  const statusConfig = STATUS_OPTIONS.find(s => s.value === status);
  const priorityConfig = PRIORITY_OPTIONS.find(p => p.value === priority);

  return (
    <PageShell
      title={pageTitle}
      description={pageDescription}
      icon={<Target className="h-6 w-6" />}
    >
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Performance
          </Button>
          <div className="flex items-center gap-2">
            {type && (
              <Badge variant="secondary" className="uppercase text-xs">
                <Layers className="h-3 w-3 mr-1" />
                {type}
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Hero Card */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-0 shadow-xl">
            <div className={cn(
              "p-6 text-white",
              status === "COMPLETED" 
                ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                : status === "AT_RISK"
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"
                : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
            )}>
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                      {status === "COMPLETED" ? (
                        <Trophy className="h-6 w-6" />
                      ) : status === "AT_RISK" ? (
                        <AlertCircle className="h-6 w-6" />
                      ) : (
                        <Target className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <h1 className="text-xl font-bold">{title || objective.title}</h1>
                      <p className="text-white/80 text-sm">{pageDescription}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn("border-0", statusConfig?.color)}>
                    {statusConfig?.label}
                  </Badge>
                  <Badge className={cn("border-0", priorityConfig?.color)}>
                    <Flag className="h-3 w-3 mr-1" />
                    {priorityConfig?.label}
                  </Badge>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-white/80">Progress</span>
                  <span className="font-bold text-lg">{currentProgress}%</span>
                </div>
                <div className="h-3 rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${currentProgress}%` }}
                    transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                    className={cn("h-full bg-gradient-to-r rounded-full", getProgressColor(currentProgress))}
                  />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Edit Card */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Edit Objective</CardTitle>
                  <CardDescription>Update the headline details and progress</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Title</label>
                  <Input
                    value={title}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
                    disabled={!canEdit}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select
                    value={status}
                    onValueChange={setStatus}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <Badge className={cn("text-xs", s.color)}>{s.label}</Badge>
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
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <Badge className={cn("text-xs", p.color)}>{p.label}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setStartDate(event.target.value)}
                    disabled={!canEdit}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setDueDate(event.target.value)}
                    disabled={!canEdit}
                    className="h-11 rounded-xl"
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
                  className="rounded-xl resize-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Progress (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={progressInput}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setProgressInput(event.target.value)}
                    disabled={!canEdit}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1 text-sm text-muted-foreground flex items-end pb-2">
                  <div>
                    <p>
                      Current: <span className="font-semibold text-slate-900">{currentProgress}%</span>
                    </p>
                    {objective.dueDate && (
                      <p>Due {formatLondonDate(String(objective.dueDate))}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleSave} 
                  disabled={!canEdit || saving}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg rounded-xl"
                >
                  {saving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="mr-2"
                      >
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Key Results */}
        {objective.keyResults && objective.keyResults.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Key Results</CardTitle>
                    <CardDescription>Track the measures that roll up to this objective</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {objective.keyResults.map((kr: any, index: number) => {
                  const krProgress = kr.targetValue > 0 ? Math.round((kr.currentValue / kr.targetValue) * 100) : 0;
                  return (
                    <motion.div
                      key={kr.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-xs">
                            {index + 1}
                          </div>
                          <p className="font-medium text-slate-900">{kr.title}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {kr.currentValue ?? 0} / {kr.targetValue} {kr.unit || ""}
                          </p>
                          {kr.dueDate && (
                            <p className="text-xs text-muted-foreground">
                              Due {formatLondonDate(String(kr.dueDate))}
                            </p>
                          )}
                        </div>
                      </div>
                      {kr.description && (
                        <p className="text-xs text-muted-foreground mb-3">{kr.description}</p>
                      )}
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(krProgress, 100)}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className={cn("h-full bg-gradient-to-r rounded-full", getProgressColor(krProgress))}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Updates */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-100 text-violet-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Updates</CardTitle>
                  <CardDescription>Log check-ins and progress changes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Add Update Form */}
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">New Update</label>
                  <Textarea
                    value={updateContent}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setUpdateContent(event.target.value)}
                    rows={3}
                    placeholder="What progress have you made? Any blockers or wins to share?"
                    className="rounded-xl resize-none"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3 items-end">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      New Progress (%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={updateProgressInput}
                      placeholder={String(currentProgress)}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setUpdateProgressInput(event.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <Button 
                      onClick={handleAddUpdate} 
                      disabled={updating || !updateContent.trim()}
                      className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg rounded-xl"
                    >
                      {updating ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="mr-2"
                          >
                            <Sparkles className="h-4 w-4" />
                          </motion.div>
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Update
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Updates List */}
              <AnimatePresence mode="popLayout">
                {objective.updates && objective.updates.length > 0 ? (
                  <div className="space-y-3">
                    {objective.updates.map((update: any, index: number) => (
                      <motion.div
                        key={update.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        layout
                        className="rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {update.Author && (
                              <Avatar
                                name={`${update.Author.firstName} ${update.Author.lastName}`}
                                size={28}
                              />
                            )}
                            <p className="font-medium text-sm text-slate-900">
                              {update.Author
                                ? `${update.Author.firstName} ${update.Author.lastName}`
                                : "Update"}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatLondonDate(String(update.createdAt))}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{update.content}</p>
                        {typeof update.progress === "number" && (
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Progress: {update.progress}%
                            </Badge>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-8 text-center"
                  >
                    <div className="p-3 rounded-full bg-slate-100 mb-3">
                      <MessageSquare className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No updates yet. Use the form above to log your first check-in.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <ProfileUpdateSuccessAnimation
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        fieldName="Objective"
      />
    </PageShell>
  );
}
