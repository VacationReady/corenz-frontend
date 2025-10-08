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
import { Users, Calendar, Shield, Mail } from "lucide-react";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string | null;
  jobRoleId: string | null;
  isActive: boolean;
}

interface CreateReviewCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateReviewCycleDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateReviewCycleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [jobRoles, setJobRoles] = useState<{ id: string; name: string }[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"ANNUAL" | "QUARTERLY" | "PROBATION" | "PROJECT_BASED">("ANNUAL");
  const [templateId, setTemplateId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selfReviewDeadline, setSelfReviewDeadline] = useState("");
  const [managerReviewDeadline, setManagerReviewDeadline] = useState("");
  const [peerReviewDeadline, setPeerReviewDeadline] = useState("");
  const [isAnonymousPeer, setIsAnonymousPeer] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  // Participant selection
  const [selectionMode, setSelectionMode] = useState<"individual" | "filtered">("filtered");
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
      const templateRes = await fetch("/api/performance/templates?type=REVIEW");
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
    if (!name.trim()) {
      toast.error("Please enter a cycle name");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    if (participantIds.length === 0) {
      toast.error("Please select at least one participant");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name,
        description,
        type,
        templateId: templateId || undefined,
        startDate,
        endDate,
        selfReviewDeadline: selfReviewDeadline || undefined,
        managerReviewDeadline: managerReviewDeadline || undefined,
        peerReviewDeadline: peerReviewDeadline || undefined,
        isAnonymousPeer,
        participantIds,
        settings: {
          sendEmailNotifications: sendEmail,
        },
      };

      const res = await fetch("/api/performance/review-cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create review cycle");
      }

      const { cycle } = await res.json();

      // Send email notifications if enabled
      if (sendEmail) {
        await fetch("/api/notifications/review-cycle-created", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cycleId: cycle.id,
            participantIds,
          }),
        }).catch(console.error); // Don't fail if email fails
      }

      toast.success("Review cycle created successfully");
      
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Failed to create review cycle:", error);
      toast.error(error.message || "Failed to create review cycle");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setType("ANNUAL");
    setTemplateId("");
    setStartDate("");
    setEndDate("");
    setSelfReviewDeadline("");
    setManagerReviewDeadline("");
    setPeerReviewDeadline("");
    setIsAnonymousPeer(true);
    setSendEmail(true);
    setSelectionMode("filtered");
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
            <Users className="h-5 w-5" />
            Create 360° Review Cycle
          </DialogTitle>
          <DialogDescription>
            Launch a comprehensive performance review cycle with self, manager, and peer reviews
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Cycle Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q4 2025 Performance Review"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional cycle description"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="type">Review Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNUAL">Annual Review</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly Review</SelectItem>
                  <SelectItem value="PROBATION">Probation Review</SelectItem>
                  <SelectItem value="PROJECT_BASED">Project-Based Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {templates.length > 0 && (
              <div>
                <Label htmlFor="template">Review Template (Optional)</Label>
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

          {/* Dates & Deadlines */}
          <div className="space-y-4 border-t pt-4">
            <div>
              <Label className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Cycle Timeline
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Review Deadlines (Optional)</p>
              
              <div>
                <Label htmlFor="selfReviewDeadline">Self-Review Deadline</Label>
                <Input
                  id="selfReviewDeadline"
                  type="date"
                  value={selfReviewDeadline}
                  onChange={(e) => setSelfReviewDeadline(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="managerReviewDeadline">Manager Review Deadline</Label>
                <Input
                  id="managerReviewDeadline"
                  type="date"
                  value={managerReviewDeadline}
                  onChange={(e) => setManagerReviewDeadline(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="peerReviewDeadline">Peer Review Deadline</Label>
                <Input
                  id="peerReviewDeadline"
                  type="date"
                  value={peerReviewDeadline}
                  onChange={(e) => setPeerReviewDeadline(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-3 border-t pt-4">
            <Label className="font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy Settings
            </Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymousPeer"
                checked={isAnonymousPeer}
                onCheckedChange={(checked) => setIsAnonymousPeer(checked as boolean)}
              />
              <Label htmlFor="anonymousPeer">
                Make peer reviews anonymous
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Peer reviewers' identities will be hidden from the person being reviewed
            </p>
          </div>

          {/* Participant Selection */}
          <div className="space-y-4 border-t pt-4">
            <div>
              <Label className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Select Participants *
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Choose employees who will be part of this review cycle
              </p>

              <RadioGroup value={selectionMode} onValueChange={(v: any) => setSelectionMode(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="filtered" id="filtered" />
                  <Label htmlFor="filtered">Select by filters (recommended for large teams)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual">Select individuals manually</Label>
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
                Send email notifications to participants
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Participants will receive notifications when the review cycle starts and reminders before deadlines
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
            {loading ? "Creating..." : "Create Review Cycle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
