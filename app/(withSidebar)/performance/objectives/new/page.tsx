"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { 
  Target, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle,
  AlertCircle,
  Calendar,
  Flag,
  Layers,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProfileUpdateSuccessAnimation } from "@/components/animations";

interface KeyResult {
  id: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
  dueDate?: string;
}

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

export default function CreateObjectivePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const employeeId = searchParams?.get("employeeId");

  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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
        unit: "%",
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
      setShowSuccess(true);
      
      setTimeout(() => {
        if (employeeId) {
          router.push(`/employees/${employeeId}/performance?tab=objectives`);
        } else {
          router.push("/performance?tab=objectives");
        }
      }, 1500);
    } catch (error: any) {
      console.error("Error creating objective:", error);
      toast.error(error.message || "Failed to create objective");
    } finally {
      setLoading(false);
    }
  };

  const priorityConfig = {
    LOW: { color: "bg-slate-100 text-slate-700 border-slate-200", label: "Low Priority" },
    MEDIUM: { color: "bg-sky-100 text-sky-700 border-sky-200", label: "Medium Priority" },
    HIGH: { color: "bg-amber-100 text-amber-700 border-amber-200", label: "High Priority" },
    CRITICAL: { color: "bg-rose-100 text-rose-700 border-rose-200", label: "Critical Priority" },
  };

  if (!session) {
    return (
      <PageShell
        title="Create Objective"
        description="Set goals and track progress"
        icon={<Target className="h-6 w-6" />}
      >
        <div className="flex flex-col items-center justify-center py-24">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary mb-6"
          />
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Create Objective"
      description={employeeId ? "Create a personal objective for this employee" : "Set organizational goals and track progress"}
      icon={<Target className="h-6 w-6" />}
    >
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => router.back()}
              disabled={loading}
              className="rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Badge className={cn("text-xs", priorityConfig[priority].color)}>
              <Flag className="h-3 w-3 mr-1" />
              {priorityConfig[priority].label}
            </Badge>
          </motion.div>

          {/* Spotlight Banner */}
          <motion.div 
            variants={itemVariants}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/60"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500" />
            <div className="p-5 pl-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
                  <Sparkles className="h-3 w-3" /> Create New Objective
                </div>
              </div>
              <h2 className="text-base font-semibold text-slate-900 mb-1">
                Define clear, measurable goals
              </h2>
              <p className="text-xs text-slate-600 max-w-lg">
                Set objectives with key results to track progress and drive alignment across your organization.
              </p>
            </div>
          </motion.div>

          {/* Main Form */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Objective Details</CardTitle>
                    <CardDescription>Define the objective, its priority, and timeline</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Title <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g., Increase customer satisfaction by 20%"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide context and details about this objective"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="rounded-xl resize-none"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-sm font-medium">Type</Label>
                    <Select
                      value={type}
                      onValueChange={(value: any) => setType(value)}
                      disabled={!!employeeId}
                    >
                      <SelectTrigger id="type" className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {canManageTemplates && (
                          <>
                            <SelectItem value="company">
                              <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-violet-500" />
                                Company
                              </div>
                            </SelectItem>
                            <SelectItem value="team">
                              <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-sky-500" />
                                Team
                              </div>
                            </SelectItem>
                          </>
                        )}
                        <SelectItem value="personal">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-emerald-500" />
                            Personal
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
                    <Select
                      value={priority}
                      onValueChange={(value: any) => setPriority(value)}
                    >
                      <SelectTrigger id="priority" className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">
                          <Badge variant="outline" className={priorityConfig.LOW.color}>Low</Badge>
                        </SelectItem>
                        <SelectItem value="MEDIUM">
                          <Badge variant="outline" className={priorityConfig.MEDIUM.color}>Medium</Badge>
                        </SelectItem>
                        <SelectItem value="HIGH">
                          <Badge variant="outline" className={priorityConfig.HIGH.color}>High</Badge>
                        </SelectItem>
                        <SelectItem value="CRITICAL">
                          <Badge variant="outline" className={priorityConfig.CRITICAL.color}>Critical</Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                    <Select
                      value={status}
                      onValueChange={(value: any) => setStatus(value)}
                    >
                      <SelectTrigger id="status" className="h-11 rounded-xl">
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
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Start Date
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate" className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Due Date
                    </Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Key Results */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Key Results</CardTitle>
                      <CardDescription>Define measurable outcomes that indicate success</CardDescription>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addKeyResult}
                    className="rounded-xl hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Key Result
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <AnimatePresence mode="popLayout">
                  {keyResults.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center justify-center py-12 text-center"
                    >
                      <div className="p-4 rounded-full bg-emerald-100 mb-4">
                        <TrendingUp className="h-8 w-8 text-emerald-500" />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">No key results yet</h3>
                      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                        Key results help you measure progress toward your objective with specific, quantifiable targets.
                      </p>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={addKeyResult}
                        className="rounded-xl"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Key Result
                      </Button>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {keyResults.map((kr, index) => (
                        <motion.div 
                          key={kr.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          layout
                          className="rounded-xl border border-slate-200 p-5 space-y-4 bg-white hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-sm">
                                {index + 1}
                              </div>
                              <h4 className="text-sm font-semibold text-slate-900">Key Result {index + 1}</h4>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeKeyResult(kr.id)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                              <Label className="text-xs">
                                Title <span className="text-rose-500">*</span>
                              </Label>
                              <Input
                                placeholder="e.g., Achieve NPS score of 8.5"
                                value={kr.title}
                                onChange={(e) => updateKeyResult(kr.id, "title", e.target.value)}
                                className="h-10 rounded-xl"
                              />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                              <Label className="text-xs">Description</Label>
                              <Textarea
                                placeholder="Additional details about this key result"
                                value={kr.description || ""}
                                onChange={(e) => updateKeyResult(kr.id, "description", e.target.value)}
                                rows={2}
                                className="rounded-xl resize-none"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">Target Value</Label>
                              <Input
                                type="number"
                                value={kr.targetValue}
                                onChange={(e) =>
                                  updateKeyResult(kr.id, "targetValue", Number(e.target.value))
                                }
                                className="h-10 rounded-xl"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">Current Value</Label>
                              <Input
                                type="number"
                                value={kr.currentValue}
                                onChange={(e) =>
                                  updateKeyResult(kr.id, "currentValue", Number(e.target.value))
                                }
                                className="h-10 rounded-xl"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">Unit</Label>
                              <Input
                                placeholder="e.g., %, points, users"
                                value={kr.unit || ""}
                                onChange={(e) => updateKeyResult(kr.id, "unit", e.target.value)}
                                className="h-10 rounded-xl"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">Due Date</Label>
                              <Input
                                type="date"
                                value={kr.dueDate || ""}
                                onChange={(e) => updateKeyResult(kr.id, "dueDate", e.target.value)}
                                className="h-10 rounded-xl"
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Submit Actions */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900">Ready to create?</p>
                    <p className="text-xs text-muted-foreground">
                      {!title.trim() && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertCircle className="h-3 w-3" />
                          Title is required
                        </span>
                      )}
                      {title.trim() && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="h-3 w-3" />
                          All required fields are complete
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={loading}
                      className="rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading || !title.trim()}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg rounded-xl"
                    >
                      {loading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="mr-2"
                          >
                            <Sparkles className="h-4 w-4" />
                          </motion.div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Create Objective
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </form>

      {/* Success Animation */}
      <ProfileUpdateSuccessAnimation
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        fieldName="Objective"
      />
    </PageShell>
  );
}
