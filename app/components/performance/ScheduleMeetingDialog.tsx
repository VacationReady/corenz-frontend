"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/Badge";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { toast } from "sonner";
import { Calendar, Users, Clock, Mail, Filter } from "lucide-react";
import { usePerformanceReferenceData } from "@/hooks/usePerformanceReferenceData";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string | null;
  jobRoleId: string | null;
  isActive: boolean;
}

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const wizardSteps = [
  {
    key: "details" as const,
    title: "Meeting details",
    description: "Set the context, timing, and recurrence for this conversation.",
  },
  {
    key: "audience" as const,
    title: "Audience",
    description: "Search, filter, or bulk target employees to include in the meeting.",
  },
  {
    key: "review" as const,
    title: "Review & notifications",
    description: "Double-check participants and communication settings before scheduling.",
  },
];

type WizardStep = (typeof wizardSteps)[number]["key"];

export function ScheduleMeetingDialog({ open, onOpenChange, onSuccess }: ScheduleMeetingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const { employees, departments, jobRoles, templates, employeesLoading } = usePerformanceReferenceData({
    enabled: open,
    templateType: "ONE_TO_ONE",
    includeEmployees: true,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState<string>("none");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  const [selectionMode, setSelectionMode] = useState<"individual" | "filtered">("individual");
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());

  const [filterDepartments, setFilterDepartments] = useState<string[]>(["all"]);
  const [filterJobRoles, setFilterJobRoles] = useState<string[]>(["all"]);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [participantPage, setParticipantPage] = useState(0);
  const pageSize = 25;

  const departmentOptions = useMemo(
    () =>
      departments.map((department) => ({
        label: department.name,
        value: department.id,
      })),
    [departments]
  );

  const jobRoleOptions = useMemo(
    () =>
      jobRoles.map((role) => ({
        label: role.name,
        value: role.id,
      })),
    [jobRoles]
  );

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp: Employee) => {
      if (filterStatus === "active" && !emp.isActive) return false;
      if (filterStatus === "inactive" && emp.isActive) return false;

      if (!filterDepartments.includes("all")) {
        if (!emp.departmentId || !filterDepartments.includes(emp.departmentId)) {
          return false;
        }
      }

      if (!filterJobRoles.includes("all")) {
        if (!emp.jobRoleId || !filterJobRoles.includes(emp.jobRoleId)) {
          return false;
        }
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const email = emp.email.toLowerCase();
        if (!fullName.includes(q) && !email.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [employees, filterStatus, filterDepartments, filterJobRoles, searchQuery]);

  const participantIds = useMemo(() => {
    if (selectionMode === "individual") {
      return Array.from(selectedParticipants);
    }
    return filteredEmployees.map((employee) => employee.id);
  }, [selectionMode, selectedParticipants, filteredEmployees]);

  const paginatedEmployees = useMemo(() => {
    const pages: Employee[][] = [];
    for (let i = 0; i < filteredEmployees.length; i += pageSize) {
      pages.push(filteredEmployees.slice(i, i + pageSize));
    }
    return pages;
  }, [filteredEmployees]);

  const currentEmployeesPage = paginatedEmployees[participantPage] ?? [];

  const step = wizardSteps[currentStepIndex];

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTemplateId("none");
    setScheduledAt("");
    setDuration(60);
    setLocation("");
    setMeetingUrl("");
    setSendEmail(true);
    setIsRecurring(false);
    setRecurrenceType("weekly");
    setRecurrenceEndDate("");
    setSelectionMode("individual");
    setSelectedParticipants(new Set());
    setFilterDepartments(["all"]);
    setFilterJobRoles(["all"]);
    setFilterStatus("active");
    setSearchQuery("");
    setParticipantPage(0);
    setCurrentStepIndex(0);
  };

  const validateStep = (stepKey: WizardStep) => {
    if (stepKey === "details") {
      if (!title.trim()) {
        toast.error("Please enter a meeting title");
        return false;
      }
      if (!scheduledAt) {
        toast.error("Please select a date and time");
        return false;
      }
    }

    if (stepKey === "audience") {
      if (participantIds.length === 0) {
        toast.error("Please select at least one participant");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep("audience")) {
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title,
        description,
        templateId: templateId === "none" ? undefined : templateId,
        participantIds,
        scheduledAt,
        duration,
        location,
        meetingUrl: meetingUrl || undefined,
        isRecurring,
      };

      if (isRecurring) {
        payload.recurrence = {
          type: recurrenceType,
          endDate: recurrenceEndDate || undefined,
        };
      }

      const res = await fetch("/api/performance/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create meeting");
      }

      const { meeting } = await res.json();

      if (sendEmail) {
        await fetch("/api/notifications/meeting-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingId: meeting.id,
            participantIds,
          }),
        }).catch(console.error);
      }

      toast.success(
        isRecurring
          ? "Recurring meetings created successfully"
          : "Meeting scheduled successfully"
      );

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Failed to schedule meeting:", error);
      toast.error(error.message || "Failed to schedule meeting");
    } finally {
      setLoading(false);
    }
  };

  const goToNextStep = () => {
    const currentKey = wizardSteps[currentStepIndex].key;
    if (!validateStep(currentKey)) {
      return;
    }

    if (currentStepIndex === wizardSteps.length - 1) {
      void handleSubmit();
      return;
    }

    setCurrentStepIndex((index) => Math.min(index + 1, wizardSteps.length - 1));
  };

  const goToPreviousStep = () => {
    setCurrentStepIndex((index) => Math.max(index - 1, 0));
  };

  const toggleParticipant = (employeeId: string) => {
    setSelectedParticipants((prev) => {
      const updated = new Set(prev);
      if (updated.has(employeeId)) {
        updated.delete(employeeId);
      } else {
        updated.add(employeeId);
      }
      return updated;
    });
  };

  const selectAllFiltered = () => {
    setSelectionMode("individual");
    setSelectedParticipants(new Set(filteredEmployees.map((employee) => employee.id)));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule 1-2-1 Meeting
          </DialogTitle>
          <DialogDescription>
            {wizardSteps.map((wizardStep, index) => (
              <div key={wizardStep.key} className="mt-2 flex items-center gap-2 text-sm">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    index === currentStepIndex
                      ? "bg-primary text-primary-foreground"
                      : index < currentStepIndex
                      ? "bg-green-100 text-green-700"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium">{wizardStep.title}</p>
                  <p className="text-xs text-muted-foreground">{wizardStep.description}</p>
                </div>
              </div>
            ))}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {step.key === "details" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Meeting Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g., Weekly 1-2-1 Check-in"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template">Meeting Template</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger id="template">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional meeting description"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="scheduledAt">Date & Time *</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[15, 30, 45, 60, 90].map((minutes) => (
                        <SelectItem key={minutes} value={minutes.toString()}>
                          {minutes} minutes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="e.g., Conference Room A"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetingUrl">Meeting URL</Label>
                  <Input
                    id="meetingUrl"
                    type="url"
                    value={meetingUrl}
                    onChange={(event) => setMeetingUrl(event.target.value)}
                    placeholder="https://meet.google.com/..."
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recurring"
                    checked={isRecurring}
                    onCheckedChange={(checked) => setIsRecurring(!!checked)}
                  />
                  <Label htmlFor="recurring" className="font-semibold">
                    <Clock className="mr-1 inline h-4 w-4" /> Make this a recurring meeting
                  </Label>
                </div>

                {isRecurring && (
                  <div className="ml-6 space-y-4 rounded-lg bg-muted/50 p-4">
                    <div>
                      <Label>Recurrence pattern</Label>
                      <RadioGroup value={recurrenceType} onValueChange={(value: any) => setRecurrenceType(value)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="daily" id="daily" />
                          <Label htmlFor="daily">Daily</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="weekly" id="weekly" />
                          <Label htmlFor="weekly">Weekly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="biweekly" id="biweekly" />
                          <Label htmlFor="biweekly">Bi-weekly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="monthly" id="monthly" />
                          <Label htmlFor="monthly">Monthly</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recurrenceEnd">End date</Label>
                      <Input
                        id="recurrenceEnd"
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(event) => setRecurrenceEndDate(event.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step.key === "audience" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Selection strategy</Label>
                  <RadioGroup value={selectionMode} onValueChange={(value: "individual" | "filtered") => setSelectionMode(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="individual" id="individual" />
                      <Label htmlFor="individual">Manually pick participants</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="filtered" id="filtered" />
                      <Label htmlFor="filtered">Use filters to target participants</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="statusFilter">Employment status</Label>
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger id="statusFilter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All employees</SelectItem>
                      <SelectItem value="active">Active employees</SelectItem>
                      <SelectItem value="inactive">Inactive employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search by name or email"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setParticipantPage(0);
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Departments</Label>
                  <MultiSelect
                    options={departmentOptions}
                    selected={filterDepartments}
                    onChange={(values) => {
                      setFilterDepartments(values.length ? values : ["all"]);
                      setParticipantPage(0);
                    }}
                    placeholder="All departments"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Roles</Label>
                  <MultiSelect
                    options={jobRoleOptions}
                    selected={filterJobRoles}
                    onChange={(values) => {
                      setFilterJobRoles(values.length ? values : ["all"]);
                      setParticipantPage(0);
                    }}
                    placeholder="All job roles"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>
                    {filteredEmployees.length} employees match the filters. {participantIds.length} selected.
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={selectAllFiltered}>
                  Select all matches
                </Button>
              </div>

              {selectionMode === "individual" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Participants</h4>
                    <Badge variant="outline">Page {participantPage + 1}</Badge>
                  </div>
                  <div className="rounded-lg border">
                    {employeesLoading ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">Loading employees…</div>
                    ) : currentEmployeesPage.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No employees match these filters</div>
                    ) : (
                      currentEmployeesPage.map((employee) => {
                        const checked = selectedParticipants.has(employee.id);
                        return (
                          <label
                            key={employee.id}
                            className="flex cursor-pointer items-center justify-between border-b px-4 py-3 last:border-b-0 hover:bg-muted/60"
                          >
                            <div>
                              <p className="font-medium">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{employee.email}</p>
                            </div>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleParticipant(employee.id)}
                            />
                          </label>
                        );
                      })
                    )}
                  </div>

                  {paginatedEmployees.length > 1 && (
                    <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                      <span>
                        Showing {participantPage * pageSize + 1}-
                        {Math.min((participantPage + 1) * pageSize, filteredEmployees.length)} of {filteredEmployees.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={participantPage === 0}
                          onClick={() => setParticipantPage((page) => Math.max(page - 1, 0))}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={participantPage >= paginatedEmployees.length - 1}
                          onClick={() =>
                            setParticipantPage((page) =>
                              Math.min(page + 1, paginatedEmployees.length - 1)
                            )
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectionMode === "filtered" && (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                  All employees who match the filters above will be included automatically. Changes to employee data will be
                  reflected each time the recurring series is generated.
                </div>
              )}
            </div>
          )}

          {step.key === "review" && (
            <div className="space-y-6">
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold">Meeting summary</h4>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Title</span>
                    <span className="font-medium">{title || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Scheduled for</span>
                    <span className="font-medium">{scheduledAt ? new Date(scheduledAt).toLocaleString() : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{duration} minutes</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Participants</span>
                    <span className="font-medium">{participantIds.length}</span>
                  </div>
                  {isRecurring && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Recurrence</span>
                      <span className="font-medium">
                        {recurrenceType} {recurrenceEndDate && `(until ${recurrenceEndDate})`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <h4 className="font-semibold">Notifications</h4>
                <div className="flex items-center space-x-3">
                  <Checkbox id="sendEmail" checked={sendEmail} onCheckedChange={(checked) => setSendEmail(!!checked)} />
                  <Label htmlFor="sendEmail" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Send email invitations to participants
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Participants receive a calendar invite with meeting details, location, and any linked template agenda items.
                </p>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
                By confirming, you acknowledge that meeting invites will be sent to the selected recipients and any recurring
                series will follow the defined cadence. You can make changes or cancel individual occurrences from the meeting
                list.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={currentStepIndex === 0 || loading} onClick={goToPreviousStep}>
              Back
            </Button>
            <Button onClick={goToNextStep} disabled={loading}>
              {currentStepIndex === wizardSteps.length - 1 ? "Schedule meeting" : "Continue"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
