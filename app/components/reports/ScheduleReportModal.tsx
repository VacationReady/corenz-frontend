"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Mail,
  Users,
  Building2,
  FileText,
  FileSpreadsheet,
  Table2,
  Play,
  Pause,
  Trash2,
  ChevronDown,
  Check,
  Loader2,
  Info,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistance } from "date-fns";

interface ScheduleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: number;
  reportName: string;
  existingSchedule?: ReportSchedule;
  onSuccess?: () => void;
}

interface ReportSchedule {
  id: number;
  name: string;
  description?: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay: string;
  timezone: string;
  format: "PDF" | "EXCEL" | "CSV";
  recipientType: "custom" | "department" | "job_role";
  recipients: string[];
  departmentIds: string[];
  jobRoleIds: string[];
  includeMessage: boolean;
  customMessage?: string;
  isActive: boolean;
  nextRunAt?: string;
  lastRunAt?: string;
  lastRunStatus?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily", icon: Calendar },
  { value: "weekly", label: "Weekly", icon: CalendarDays },
  { value: "monthly", label: "Monthly", icon: Calendar },
  { value: "quarterly", label: "Quarterly", icon: Calendar },
];

const FORMAT_OPTIONS = [
  { value: "PDF", label: "PDF", icon: FileText },
  { value: "EXCEL", label: "Excel", icon: FileSpreadsheet },
  { value: "CSV", label: "CSV", icon: Table2 },
];

const TIMEZONES = [
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "America/New_York", label: "New York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "UTC", label: "UTC" },
];

export function ScheduleReportModal({
  isOpen,
  onClose,
  reportId,
  reportName,
  existingSchedule,
  onSuccess,
}: ScheduleReportModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form state
  const [name, setName] = useState(existingSchedule?.name || `${reportName} - Scheduled`);
  const [description, setDescription] = useState(existingSchedule?.description || "");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "quarterly">(
    existingSchedule?.frequency || "weekly"
  );
  const [dayOfWeek, setDayOfWeek] = useState(existingSchedule?.dayOfWeek ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(existingSchedule?.dayOfMonth ?? 1);
  const [timeOfDay, setTimeOfDay] = useState(existingSchedule?.timeOfDay || "09:00");
  const [timezone, setTimezone] = useState(existingSchedule?.timezone || "Pacific/Auckland");
  const [fileFormat, setFileFormat] = useState<"PDF" | "EXCEL" | "CSV">(
    existingSchedule?.format || "PDF"
  );
  const [recipientEmails, setRecipientEmails] = useState(
    existingSchedule?.recipients?.join(", ") || ""
  );
  const [includeMessage, setIncludeMessage] = useState(existingSchedule?.includeMessage ?? false);
  const [customMessage, setCustomMessage] = useState(existingSchedule?.customMessage || "");
  const [isActive, setIsActive] = useState(existingSchedule?.isActive ?? true);

  const handleSave = async () => {
    const emailList = recipientEmails
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emailList.length === 0) {
      toast({
        title: "Recipients required",
        description: "Please add at least one recipient email.",
        variant: "destructive",
      });
      return;
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailList.filter((e) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      toast({
        title: "Invalid email addresses",
        description: `Please fix: ${invalidEmails.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        reportId,
        name,
        description: description || undefined,
        frequency,
        dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
        dayOfMonth: ["monthly", "quarterly"].includes(frequency) ? dayOfMonth : undefined,
        timeOfDay,
        timezone,
        format: fileFormat,
        recipientType: "custom" as const,
        recipients: emailList,
        includeMessage,
        customMessage: includeMessage ? customMessage : undefined,
        isActive,
      };

      const url = existingSchedule
        ? `/api/reports/schedule/${existingSchedule.id}`
        : "/api/reports/schedule";
      
      const res = await fetch(url, {
        method: existingSchedule ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save schedule");
      }

      toast({
        title: existingSchedule ? "Schedule updated" : "Schedule created",
        description: `Report will be delivered ${frequency} at ${timeOfDay}.`,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: "Failed to save schedule",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingSchedule) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/reports/schedule/${existingSchedule.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete schedule");
      }

      toast({
        title: "Schedule deleted",
        description: "The schedule has been removed.",
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: "Failed to delete schedule",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {existingSchedule ? "Edit Schedule" : "Schedule Report"}
          </DialogTitle>
          <DialogDescription>
            Automatically deliver "{reportName}" to recipients on a schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Schedule Name */}
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Schedule Name</Label>
            <Input
              id="schedule-name"
              placeholder="e.g., Weekly Team Update"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>Frequency</Label>
            <div className="grid grid-cols-4 gap-2">
              {FREQUENCY_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = frequency === option.value;
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFrequency(option.value as typeof frequency)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isSelected && "text-primary")} />
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day Selection */}
          {frequency === "weekly" && (
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={String(dayOfWeek)} onValueChange={(v: string) => setDayOfWeek(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {["monthly", "quarterly"].includes(frequency) && (
            <div className="space-y-2">
              <Label>Day of Month</Label>
              <Select value={String(dayOfMonth)} onValueChange={(v: string) => setDayOfMonth(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Time and Timezone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={timeOfDay}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimeOfDay(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>File Format</Label>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = fileFormat === option.value;
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFileFormat(option.value as typeof fileFormat)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isSelected && "text-primary")} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipients */}
          <div className="space-y-2">
            <Label htmlFor="recipients">Recipients</Label>
            <Textarea
              id="recipients"
              placeholder="email@example.com, another@example.com"
              value={recipientEmails}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRecipientEmails(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Enter email addresses separated by commas
            </p>
          </div>

          {/* Custom Message */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="include-message">Include Custom Message</Label>
              <Switch
                id="include-message"
                checked={includeMessage}
                onCheckedChange={setIncludeMessage}
              />
            </div>
            <AnimatePresence>
              {includeMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Textarea
                    placeholder="Add a custom message to include in the email..."
                    value={customMessage}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomMessage(e.target.value)}
                    rows={3}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {isActive ? (
                <Play className="w-5 h-5 text-emerald-600" />
              ) : (
                <Pause className="w-5 h-5 text-amber-600" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {isActive ? "Schedule Active" : "Schedule Paused"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isActive
                    ? "Reports will be delivered automatically"
                    : "Delivery is paused until enabled"}
                </p>
              </div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Next Run Info */}
          {existingSchedule?.nextRunAt && isActive && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Next delivery: {format(new Date(existingSchedule.nextRunAt), "PPP 'at' p")} (
                {formatDistance(new Date(existingSchedule.nextRunAt), new Date(), { addSuffix: true })})
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {existingSchedule && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="mr-auto"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span className="ml-2">Delete</span>
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={isSaving || isDeleting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isDeleting}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : existingSchedule ? (
              "Update Schedule"
            ) : (
              "Create Schedule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleReportModal;

