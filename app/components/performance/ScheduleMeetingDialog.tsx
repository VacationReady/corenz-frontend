"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Label } from "@/components/ui/Label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import { Calendar, Users, Clock, Mail } from "lucide-react";

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

export function ScheduleMeetingDialog({
  open,
  onOpenChange,
  onSuccess,
}: ScheduleMeetingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [jobRoles, setJobRoles] = useState<{ id: string; name: string }[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  
  // Recurrence
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  // Participant selection
  const [selectionMode, setSelectionMode] = useState<"individual" | "filtered">("individual");
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  
  // Filters
  const [filterDepartments, setFilterDepartments] = useState<string[]>([]);
  const [filterJobRoles, setFilterJobRoles] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      // Load employees
      const empRes = await fetch("/api/employees");
      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(data.employees || []);
      }

      // Load departments
      const deptRes = await fetch("/api/departments");
      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(data.departments || []);
      }

      // Load job roles
      const roleRes = await fetch("/api/job-roles");
      if (roleRes.ok) {
        const data = await roleRes.json();
        setJobRoles(data.jobRoles || []);
      }

      // Load templates
      const templateRes = await fetch("/api/performance/templates?type=ONE_TO_ONE");
      if (templateRes.ok) {
        const data = await templateRes.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Status filter
      if (filterStatus === "active" && !emp.isActive) return false;
      if (filterStatus === "inactive" && emp.isActive) return false;

      // Department filter
      if (filterDepartments.length > 0 && emp.departmentId) {
        if (!filterDepartments.includes(emp.departmentId)) return false;
      }

      // Job role filter
      if (filterJobRoles.length > 0 && emp.jobRoleId) {
        if (!filterJobRoles.includes(emp.jobRoleId)) return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const email = emp.email.toLowerCase();
        if (!fullName.includes(query) && !email.includes(query)) return false;
      }

      return true;
    });
  }, [employees, filterStatus, filterDepartments, filterJobRoles, searchQuery]);

  const participantIds = useMemo(() => {
    if (selectionMode === "individual") {
      return Array.from(selectedParticipants);
    } else {
      // Filtered mode - use all filtered employees
      return filteredEmployees.map(e => e.id);
    }
  }, [selectionMode, selectedParticipants, filteredEmployees]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }

    if (!scheduledAt) {
      toast.error("Please select a date and time");
      return;
    }

    if (participantIds.length === 0) {
      toast.error("Please select at least one participant");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title,
        description,
        templateId: templateId || undefined,
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

      // Send email notifications if enabled
      if (sendEmail) {
        await fetch("/api/notifications/meeting-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingId: meeting.id,
            participantIds,
          }),
        }).catch(console.error); // Don't fail if email fails
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

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTemplateId("");
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
    setFilterDepartments([]);
    setFilterJobRoles([]);
    setFilterStatus("active");
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule 1-2-1 Meeting
          </DialogTitle>
          <DialogDescription>
            Create one-time or recurring performance conversations with your team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Meeting Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Weekly 1-2-1 Check-in"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional meeting description"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduledAt">Date & Time *</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Conference Room A"
                />
              </div>

              <div>
                <Label htmlFor="meetingUrl">Meeting URL</Label>
                <Input
                  id="meetingUrl"
                  type="url"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            </div>

            {templates.length > 0 && (
              <div>
                <Label htmlFor="template">Meeting Template (Optional)</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No template</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Recurrence Options */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
              />
              <Label htmlFor="recurring" className="font-semibold">
                <Clock className="inline h-4 w-4 mr-1" />
                Make this a recurring meeting
              </Label>
            </div>

            {isRecurring && (
              <div className="ml-6 space-y-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Recurrence Pattern</Label>
                  <RadioGroup value={recurrenceType} onValueChange={(v: any) => setRecurrenceType(v)}>
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
                      <Label htmlFor="biweekly">Bi-weekly (every 2 weeks)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="monthly" id="monthly" />
                      <Label htmlFor="monthly">Monthly</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="recurrenceEndDate">End Date (Optional)</Label>
                  <Input
                    id="recurrenceEndDate"
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to continue indefinitely
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Participant Selection */}
          <div className="space-y-4 border-t pt-4">
            <div>
              <Label className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Select Participants *
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Choose who should attend this meeting
              </p>

              <RadioGroup value={selectionMode} onValueChange={(v: any) => setSelectionMode(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual">Select individuals manually</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="filtered" id="filtered" />
                  <Label htmlFor="filtered">Select by filters (department, role, etc.)</Label>
                </div>
              </RadioGroup>
            </div>

            {selectionMode === "filtered" && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        <SelectItem value="active">Active Only</SelectItem>
                        <SelectItem value="inactive">Inactive Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {departments.length > 0 && (
                    <div>
                      <Label>Departments</Label>
                      <Select
                        value={filterDepartments.length === 0 ? "all" : filterDepartments[0]}
                        onValueChange={(v) =>
                          setFilterDepartments(v === "all" ? [] : [v])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All departments" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {jobRoles.length > 0 && (
                  <div>
                    <Label>Job Role</Label>
                    <Select
                      value={filterJobRoles.length === 0 ? "all" : filterJobRoles[0]}
                      onValueChange={(v) =>
                        setFilterJobRoles(v === "all" ? [] : [v])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {jobRoles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="pt-2">
                  <Badge variant="secondary">
                    {filteredEmployees.length} employee(s) match these filters
                  </Badge>
                </div>
              </div>
            )}

            {selectionMode === "individual" && (
              <div className="max-h-64 overflow-y-auto border rounded-lg p-3 space-y-2">
                {employees
                  .filter((e) => e.isActive)
                  .map((emp) => (
                    <div key={emp.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`emp-${emp.id}`}
                        checked={selectedParticipants.has(emp.id)}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedParticipants);
                          if (checked) {
                            newSet.add(emp.id);
                          } else {
                            newSet.delete(emp.id);
                          }
                          setSelectedParticipants(newSet);
                        }}
                      />
                      <Label htmlFor={`emp-${emp.id}`} className="flex-1 cursor-pointer">
                        {emp.firstName} {emp.lastName}
                        <span className="text-sm text-muted-foreground ml-2">
                          ({emp.email})
                        </span>
                      </Label>
                    </div>
                  ))}
              </div>
            )}

            {participantIds.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{participantIds.length} participant(s) selected</span>
              </div>
            )}
          </div>

          {/* Email Notification */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendEmail"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked as boolean)}
              />
              <Label htmlFor="sendEmail" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Send email invitations to participants
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Participants will receive calendar invitations and meeting details
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Scheduling..." : isRecurring ? "Create Recurring Meetings" : "Schedule Meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
