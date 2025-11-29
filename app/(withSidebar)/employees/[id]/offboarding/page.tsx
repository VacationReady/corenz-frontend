"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  User,
  Mail,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  RefreshCw,
  Package,
  MapPin,
  Sparkles,
  CalendarDays,
  MessageSquare,
  Building2,
  Briefcase,
  ChevronRight,
  Eye,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { formatLondon, formatLondonDate, formatLondonTime } from "@/lib/time";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import FormSubmissionViewer from "@/components/forms/FormSubmissionViewer";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils";

interface OffboardingData {
  id: string;
  status: string;
  initiatedAt: string;
  completedAt?: string;

  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    jobRole?: string;
    isActive: boolean;
  };

  initiatedBy: {
    id: string;
    name: string;
    email: string;
  };

  exitInterview: {
    date?: string;
    endTime?: string;
    interviewer: {
      id?: string;
      name: string;
      email: string;
    };
    location?: string;
    notes?: string;
    sendForm: boolean;
    formTemplate?: {
      id: string;
      name: string;
      description?: string;
      schemaJson?: any;
    };
    formTiming?: string;
    completionStatus: string;
    inviteLastSentAt?: string;
    scheduledSendAt?: string;
  };

  formSubmissions: Array<{
    id: string;
    templateName: string;
    templateSchema?: any;
    submittedAt?: string;
    submittedBy?: string;
    answersJson?: Record<string, any>;
  }>;

  createdAt: string;
  updatedAt: string;

  assetsToReturn?: { name: string; returned: boolean }[];
  assetsReturned?: boolean;
  assetsReturnedAt?: string;

  // Key dates and details
  resignationDate?: string;
  lastWorkingDate?: string;
  noticePeriodDays?: number;
  offboardingType?: string;
  offboardingReason?: string;
  isVoluntary?: boolean;
}

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  SCHEDULED: {
    label: "Scheduled",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/50",
    icon: CalendarDays,
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-100 dark:bg-amber-900/50",
    icon: Clock,
  },
  COMPLETED: {
    label: "Completed",
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-rose-700 dark:text-rose-300",
    bgColor: "bg-rose-100 dark:bg-rose-900/50",
    icon: XCircle,
  },
};

const completionStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING: {
    label: "Pending",
    color: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-100 dark:bg-slate-900/50",
  },
  STARTED: {
    label: "Started",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/50",
  },
  SUBMITTED: {
    label: "Submitted",
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
  },
};

export default function EmployeeOffboardingPage() {
  const params = useParams();
  const employeeId = params?.id as string;

  const [offboarding, setOffboarding] = useState<OffboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [sendingFormInvite, setSendingFormInvite] = useState(false);

  useEffect(() => {
    if (employeeId) {
      fetchOffboardingData();
    }
  }, [employeeId]);

  const fetchOffboardingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/offboarding/${employeeId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch offboarding data");
      }

      const data = await response.json();
      if (Array.isArray(data.assetsToReturn)) {
        data.assetsToReturn = data.assetsToReturn.map((a: any) =>
          typeof a === "string" ? { name: a, returned: false } : a
        );
      }
      setOffboarding(data);
    } catch (error) {
      console.error("Error fetching offboarding data:", error);
      toast.error("Failed to load offboarding information");
    } finally {
      setLoading(false);
    }
  };

  const handleAssetToggle = async (index: number) => {
    if (!offboarding) return;

    const updatedAssets = (offboarding.assetsToReturn || []).map((asset, i) =>
      i === index ? { ...asset, returned: !asset.returned } : asset
    );

    setOffboarding({ ...offboarding, assetsToReturn: updatedAssets });

    try {
      await fetch(`/api/offboarding/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetsToReturn: updatedAssets }),
      });
    } catch (error) {
      console.error("Error updating assets:", error);
      toast.error("Failed to update assets");
    }
  };

  const handleSendInvite = async () => {
    if (!offboarding) return;

    try {
      setSendingInvite(true);
      const response = await fetch("/api/offboarding/send-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offboardingId: offboarding.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invite");
      }

      toast.success("Exit interview confirmation sent successfully");
      fetchOffboardingData();
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send invite"
      );
    } finally {
      setSendingInvite(false);
    }
  };

  const handleSendFormInvite = async () => {
    if (!offboarding) return;

    try {
      setSendingFormInvite(true);
      const response = await fetch("/api/offboarding/send-form-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offboardingId: offboarding.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send form invite");
      }

      toast.success("Exit interview form invitation sent successfully");
      fetchOffboardingData();
    } catch (error) {
      console.error("Error sending form invite:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send form invite"
      );
    } finally {
      setSendingFormInvite(false);
    }
  };

  // Calculate progress
  const assetsReturned = offboarding?.assetsToReturn?.filter((a) => a.returned).length || 0;
  const totalAssets = offboarding?.assetsToReturn?.length || 0;
  const assetsProgress = totalAssets > 0 ? Math.round((assetsReturned / totalAssets) * 100) : 0;

  if (loading) {
    return (
      <PageShell
        title="Offboarding Details"
        description="Employee offboarding information"
      >
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <RefreshCw className="w-8 h-8 text-primary" />
          </motion.div>
        </div>
      </PageShell>
    );
  }

  if (!offboarding) {
    return (
      <PageShell
        title="Offboarding Details"
        description="Employee offboarding information"
      >
        <motion.div
          initial="initial"
          animate="animate"
          variants={fadeInUp}
        >
          <Card className="overflow-hidden">
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No offboarding record found
              </h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                This employee does not have an active offboarding record.
              </p>
            </div>
          </Card>
        </motion.div>
      </PageShell>
    );
  }

  const status = statusConfig[offboarding.status] || statusConfig.IN_PROGRESS;
  const StatusIcon = status.icon;
  const completionStatus = completionStatusConfig[offboarding.exitInterview.completionStatus] || completionStatusConfig.PENDING;
  const daysUntilInterview = offboarding.exitInterview.date
    ? differenceInDays(new Date(offboarding.exitInterview.date), new Date())
    : null;

  return (
    <PageShell
      title={`Offboarding - ${offboarding.employee.firstName} ${offboarding.employee.lastName}`}
      description="Employee offboarding information and exit interview details"
    >
      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="space-y-6"
      >
        {/* Header Card with Employee Info */}
        <motion.div variants={fadeInUp}>
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background to-muted/20">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-3xl" />

            <div className="relative p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Employee Info */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary/25">
                      {offboarding.employee.firstName?.charAt(0)}
                      {offboarding.employee.lastName?.charAt(0)}
                    </div>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center",
                      status.bgColor
                    )}>
                      <StatusIcon className={cn("w-3 h-3", status.color)} />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {offboarding.employee.firstName} {offboarding.employee.lastName}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {offboarding.employee.email}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {offboarding.employee.jobRole && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>{offboarding.employee.jobRole}</span>
                        </div>
                      )}
                      {offboarding.employee.department && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{offboarding.employee.department}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status & Meta */}
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={cn("text-sm px-3 py-1", status.bgColor, status.color)}>
                    <StatusIcon className="w-4 h-4 mr-1.5" />
                    {status.label}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    <span>Initiated </span>
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(offboarding.initiatedAt), { addSuffix: true })}
                    </span>
                    <span> by </span>
                    <span className="font-medium">{offboarding.initiatedBy.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Exit Interview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Exit Interview Card */}
            <motion.div variants={fadeInUp}>
              <Card className="overflow-hidden border-border/50">
                <CardHeader className="bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border-b border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10">
                        <CalendarDays className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Exit Interview</CardTitle>
                        {offboarding.exitInterview.date && daysUntilInterview !== null && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {daysUntilInterview === 0
                              ? "Today"
                              : daysUntilInterview === 1
                              ? "Tomorrow"
                              : daysUntilInterview > 0
                              ? `In ${daysUntilInterview} days`
                              : `${Math.abs(daysUntilInterview)} days ago`}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={handleSendInvite}
                      disabled={sendingInvite || !offboarding.exitInterview.date}
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                    >
                      {sendingInvite ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          {offboarding.exitInterview.inviteLastSentAt ? "Resend Invite" : "Send Invite"}
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {offboarding.exitInterview.date ? (
                    <div className="space-y-6">
                      {/* Schedule Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-muted/30">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Date</span>
                          </div>
                          <p className="font-semibold">
                            {formatLondonDate(offboarding.exitInterview.date)}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Time</span>
                          </div>
                          <p className="font-semibold">
                            {formatLondonTime(offboarding.exitInterview.date)}
                            {offboarding.exitInterview.endTime && (
                              <span> - {formatLondonTime(offboarding.exitInterview.endTime)}</span>
                            )}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <User className="w-3.5 h-3.5" />
                            <span>Interviewer</span>
                          </div>
                          <p className="font-semibold">
                            {offboarding.exitInterview.interviewer.name}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Location</span>
                          </div>
                          <p className="font-semibold">
                            {offboarding.exitInterview.location || "Not specified"}
                          </p>
                        </div>
                      </div>

                      {/* Notes */}
                      {offboarding.exitInterview.notes && (
                        <div className="p-4 rounded-xl bg-muted/30">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Notes</span>
                          </div>
                          <p className="text-sm">{offboarding.exitInterview.notes}</p>
                        </div>
                      )}

                      {/* Last sent info */}
                      {offboarding.exitInterview.inviteLastSentAt && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3.5 h-3.5" />
                          <span>Last invite sent: {formatLondon(offboarding.exitInterview.inviteLastSentAt)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-muted/50 flex items-center justify-center">
                        <CalendarDays className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No exit interview scheduled</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Exit Interview Form Card */}
            {offboarding.exitInterview.sendForm && (
              <motion.div variants={fadeInUp}>
                <Card className="overflow-hidden border-border/50">
                  <CardHeader className="bg-gradient-to-r from-emerald-500/5 to-green-500/5 border-b border-border/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10">
                          <FileText className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Exit Interview Form</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {offboarding.exitInterview.formTemplate?.name || "Form"}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn("text-xs", completionStatus.bgColor, completionStatus.color)}>
                        {completionStatus.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Form Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-muted/30">
                          <div className="text-xs text-muted-foreground mb-1">Timing</div>
                          <p className="font-semibold">
                            {offboarding.exitInterview.formTiming === "NOW" ? "Sent immediately" : "On interview date"}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30">
                          <div className="text-xs text-muted-foreground mb-1">Submissions</div>
                          <p className="font-semibold">{offboarding.formSubmissions.length} received</p>
                        </div>
                      </div>

                      {/* Submissions List */}
                      {offboarding.formSubmissions.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold">Completed Submissions</h4>
                          {offboarding.formSubmissions.map((submission) => (
                            <div
                              key={submission.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10">
                                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{submission.templateName}</p>
                                  {submission.submittedAt && (
                                    <p className="text-xs text-muted-foreground">
                                      Submitted {formatLondon(submission.submittedAt)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {submission.answersJson && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="rounded-xl">
                                      <Eye className="w-4 h-4 mr-1.5" />
                                      View
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent title="Form Submission" className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                    <FormSubmissionViewer
                                      schema={
                                        submission.templateSchema ||
                                        offboarding.exitInterview.formTemplate?.schemaJson
                                      }
                                      answers={submission.answersJson}
                                    />
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Send Form Button */}
                      {["ON_DATE", "NOW"].includes(offboarding.exitInterview.formTiming || "") &&
                        offboarding.exitInterview.completionStatus !== "SUBMITTED" && (
                          <div className="pt-4 border-t border-border/30">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                {offboarding.exitInterview.formTiming === "NOW"
                                  ? "Resend the form invitation"
                                  : "Manually send the form now"}
                              </p>
                              <Button
                                onClick={handleSendFormInvite}
                                disabled={sendingFormInvite}
                                size="sm"
                                variant="outline"
                                className="rounded-xl"
                              >
                                {sendingFormInvite ? (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <Send className="mr-2 h-4 w-4" />
                                    {offboarding.exitInterview.formTiming === "NOW" ? "Resend Form" : "Send Form Now"}
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Key Dates & Details Card */}
            <motion.div variants={fadeInUp}>
              <Card className="overflow-hidden border-border/50">
                <CardHeader className="bg-gradient-to-r from-indigo-500/5 to-violet-500/5 border-b border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10">
                      <Calendar className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Key Dates & Details</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Important offboarding information
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Last Working Date */}
                    <div className="p-4 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Last Working Date</span>
                      </div>
                      <p className="font-semibold">
                        {offboarding.lastWorkingDate 
                          ? formatLondonDate(offboarding.lastWorkingDate)
                          : "Not set"}
                      </p>
                    </div>

                    {/* Resignation Date */}
                    <div className="p-4 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Resignation Date</span>
                      </div>
                      <p className="font-semibold">
                        {offboarding.resignationDate 
                          ? formatLondonDate(offboarding.resignationDate)
                          : "Not applicable"}
                      </p>
                    </div>

                    {/* Notice Period */}
                    <div className="p-4 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Notice Period</span>
                      </div>
                      <p className="font-semibold">
                        {offboarding.noticePeriodDays !== undefined && offboarding.noticePeriodDays !== null
                          ? `${offboarding.noticePeriodDays} days`
                          : "Not specified"}
                      </p>
                    </div>

                    {/* Offboarding Type */}
                    <div className="p-4 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Type</span>
                      </div>
                      <p className="font-semibold capitalize">
                        {offboarding.offboardingType 
                          ? offboarding.offboardingType.toLowerCase().replace(/_/g, ' ')
                          : "Not specified"}
                      </p>
                    </div>

                    {/* Voluntary/Involuntary */}
                    <div className="p-4 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <User className="w-3.5 h-3.5" />
                        <span>Exit Type</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {offboarding.isVoluntary !== undefined
                            ? offboarding.isVoluntary ? "Voluntary" : "Involuntary"
                            : "Not specified"}
                        </p>
                        {offboarding.isVoluntary !== undefined && (
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            offboarding.isVoluntary ? "bg-emerald-500" : "bg-amber-500"
                          )} />
                        )}
                      </div>
                    </div>

                    {/* Reason */}
                    {offboarding.offboardingReason && (
                      <div className="p-4 rounded-xl bg-muted/30 col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Reason</span>
                        </div>
                        <p className="font-semibold text-sm">
                          {offboarding.offboardingReason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Time until last working date */}
                  {offboarding.lastWorkingDate && (
                    <div className="mt-4 pt-4 border-t border-border/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Time until last working day
                        </span>
                        <span className={cn(
                          "text-sm font-semibold",
                          differenceInDays(new Date(offboarding.lastWorkingDate), new Date()) < 0
                            ? "text-muted-foreground"
                            : differenceInDays(new Date(offboarding.lastWorkingDate), new Date()) <= 7
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-indigo-600 dark:text-indigo-400"
                        )}>
                          {differenceInDays(new Date(offboarding.lastWorkingDate), new Date()) < 0
                            ? `${Math.abs(differenceInDays(new Date(offboarding.lastWorkingDate), new Date()))} days ago`
                            : differenceInDays(new Date(offboarding.lastWorkingDate), new Date()) === 0
                            ? "Today"
                            : `${differenceInDays(new Date(offboarding.lastWorkingDate), new Date())} days remaining`}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - Assets & Timeline */}
          <div className="space-y-6">
            {/* Assets Card */}
            <motion.div variants={fadeInUp}>
              <Card className="overflow-hidden border-border/50">
                <CardHeader className="bg-gradient-to-r from-orange-500/5 to-amber-500/5 border-b border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-orange-500/10">
                        <Package className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Assets to Return</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {assetsReturned} of {totalAssets} returned
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {assetsProgress}%
                      </p>
                    </div>
                  </div>
                  <Progress value={assetsProgress} className="mt-3 h-2" />
                </CardHeader>
                <CardContent className="p-4">
                  {offboarding.assetsToReturn && offboarding.assetsToReturn.length > 0 ? (
                    <div className="space-y-2">
                      {offboarding.assetsToReturn.map((asset, idx) => (
                        <motion.div
                          key={asset.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer",
                            asset.returned
                              ? "bg-emerald-500/5 border border-emerald-500/20"
                              : "bg-muted/30 hover:bg-muted/50"
                          )}
                          onClick={() => handleAssetToggle(idx)}
                        >
                          <Checkbox
                            id={`asset-${idx}`}
                            checked={asset.returned}
                            onCheckedChange={() => handleAssetToggle(idx)}
                            className="pointer-events-none"
                          />
                          <span className={cn(
                            "text-sm flex-1",
                            asset.returned && "line-through text-muted-foreground"
                          )}>
                            {asset.name}
                          </span>
                          {asset.returned && (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          )}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No assets listed</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Timeline Card */}
            <motion.div variants={fadeInUp}>
              <Card className="overflow-hidden border-border/50">
                <CardHeader className="bg-gradient-to-r from-violet-500/5 to-purple-500/5 border-b border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-violet-500/10">
                      <Clock className="w-5 h-5 text-violet-500" />
                    </div>
                    <CardTitle className="text-lg">Timeline</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="relative space-y-4">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gradient-to-b from-violet-500 via-blue-500 to-emerald-500" />

                    {/* Timeline Items */}
                    <div className="relative flex items-start gap-4 pl-2">
                      <div className="relative z-10 p-1.5 rounded-full bg-violet-500">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Offboarding Initiated</p>
                        <p className="text-xs text-muted-foreground">
                          {formatLondon(offboarding.initiatedAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {offboarding.initiatedBy.name}
                        </p>
                      </div>
                    </div>

                    {offboarding.exitInterview.date && (
                      <div className="relative flex items-start gap-4 pl-2">
                        <div className={cn(
                          "relative z-10 p-1.5 rounded-full",
                          new Date(offboarding.exitInterview.date) <= new Date()
                            ? "bg-blue-500"
                            : "bg-muted"
                        )}>
                          <CalendarDays className={cn(
                            "w-3 h-3",
                            new Date(offboarding.exitInterview.date) <= new Date()
                              ? "text-white"
                              : "text-muted-foreground"
                          )} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Exit Interview</p>
                          <p className="text-xs text-muted-foreground">
                            {formatLondonDate(offboarding.exitInterview.date)}
                          </p>
                          {daysUntilInterview !== null && daysUntilInterview > 0 && (
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              In {daysUntilInterview} days
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {offboarding.formSubmissions.length > 0 && (
                      <div className="relative flex items-start gap-4 pl-2">
                        <div className="relative z-10 p-1.5 rounded-full bg-emerald-500">
                          <FileText className="w-3 h-3 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Form Submitted</p>
                          {offboarding.formSubmissions[0]?.submittedAt && (
                            <p className="text-xs text-muted-foreground">
                              {formatLondon(offboarding.formSubmissions[0].submittedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {offboarding.completedAt && (
                      <div className="relative flex items-start gap-4 pl-2">
                        <div className="relative z-10 p-1.5 rounded-full bg-emerald-500">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Offboarding Complete</p>
                          <p className="text-xs text-muted-foreground">
                            {formatLondon(offboarding.completedAt)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </PageShell>
  );
}
