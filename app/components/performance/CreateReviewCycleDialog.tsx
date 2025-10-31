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
import { Users, Shield, Mail, Filter } from "lucide-react";
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

interface CreateReviewCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const wizardSteps = [
  {
    key: "details" as const,
    title: "Cycle details",
    description: "Define the cadence, template, and timelines for this review cycle.",
  },
  {
    key: "audience" as const,
    title: "Participants",
    description: "Target the employees who should take part in this cycle.",
  },
  {
    key: "review" as const,
    title: "Review & notifications",
    description: "Confirm participants, anonymity, and communications before launch.",
  },
];

type WizardStep = (typeof wizardSteps)[number]["key"];

const NO_TEMPLATE_VALUE = "__NO_TEMPLATE__";

export function CreateReviewCycleDialog({ open, onOpenChange, onSuccess }: CreateReviewCycleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const { employees, departments, jobRoles, templates, employeesLoading } = usePerformanceReferenceData({
    enabled: open,
    templateType: "REVIEW",
    includeEmployees: true,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"PROBATION" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL" | "AD_HOC">("ANNUAL");
  const [templateId, setTemplateId] = useState<string>(NO_TEMPLATE_VALUE);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selfReviewDeadline, setSelfReviewDeadline] = useState("");
  const [managerReviewDeadline, setManagerReviewDeadline] = useState("");
  const [peerReviewDeadline, setPeerReviewDeadline] = useState("");
  const [isAnonymousPeer, setIsAnonymousPeer] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const [selectionMode, setSelectionMode] = useState<"individual" | "filtered">("filtered");
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
    setName("");
    setDescription("");
    setType("ANNUAL");
    setTemplateId(NO_TEMPLATE_VALUE);
    setStartDate("");
    setEndDate("");
    setSelfReviewDeadline("");
    setManagerReviewDeadline("");
    setPeerReviewDeadline("");
    setIsAnonymousPeer(true);
    setSendEmail(true);
    setSelectionMode("filtered");
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
      if (!name.trim()) {
        toast.error("Please enter a cycle name");
        return false;
      }
      if (!startDate || !endDate) {
        toast.error("Please select start and end dates");
        return false;
      }
      if (new Date(startDate) > new Date(endDate)) {
        toast.error("End date must be after the start date");
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
        name,
        description,
        type,
        templateId: templateId === NO_TEMPLATE_VALUE ? undefined : templateId,
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
            <Users className="h-5 w-5" />
            Create Review Cycle
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
                  <Label htmlFor="name">Cycle name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g., H1 2025 Performance Reviews"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Cycle type</Label>
                  <Select value={type} onValueChange={(value: any) => setType(value)}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROBATION">Probation</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="SEMI_ANNUAL">Semi-annual</SelectItem>
                      <SelectItem value="ANNUAL">Annual</SelectItem>
                      <SelectItem value="AD_HOC">Ad hoc</SelectItem>
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
                  placeholder="Outline objectives and expectations for this review cycle"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="template">Template</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger id="template">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_TEMPLATE_VALUE}>No template</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selfReview">Self review deadline</Label>
                  <Input
                    id="selfReview"
                    type="date"
                    value={selfReviewDeadline}
                    onChange={(event) => setSelfReviewDeadline(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="managerDeadline">Manager review deadline</Label>
                  <Input
                    id="managerDeadline"
                    type="date"
                    value={managerReviewDeadline}
                    onChange={(event) => setManagerReviewDeadline(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="peerDeadline">Peer review deadline</Label>
                  <Input
                    id="peerDeadline"
                    type="date"
                    value={peerReviewDeadline}
                    onChange={(event) => setPeerReviewDeadline(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="anonymousPeers"
                    checked={isAnonymousPeer}
                    onCheckedChange={(checked) => setIsAnonymousPeer(!!checked)}
                  />
                  <Label htmlFor="anonymousPeers" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Keep peer review responses anonymous
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Peers can share candid feedback without attribution. Manager and self reviews remain identifiable.
                </p>
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
                      <RadioGroupItem value="individual" id="participants-individual" />
                      <Label htmlFor="participants-individual">Manually select employees</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="filtered" id="participants-filtered" />
                      <Label htmlFor="participants-filtered">Use filters and auto-include</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Employment status</Label>
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger id="status">
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
                  <Label>Job roles</Label>
                  <MultiSelect
                    options={jobRoleOptions}
                    selected={filterJobRoles}
                    onChange={(values) => {
                      setFilterJobRoles(values.length ? values : ["all"]);
                      setParticipantPage(0);
                    }}
                    placeholder="All roles"
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
                  All employees who match the filters above will be enrolled automatically. Updates to employee data or org
                  structures will be respected on launch day.
                </div>
              )}
            </div>
          )}

          {step.key === "review" && (
            <div className="space-y-6">
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold">Cycle summary</h4>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{name || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">{type.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Schedule</span>
                    <span className="font-medium">
                      {startDate || "—"} → {endDate || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Participants</span>
                    <span className="font-medium">{participantIds.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Peer anonymity</span>
                    <span className="font-medium">{isAnonymousPeer ? "Enabled" : "Disabled"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <h4 className="font-semibold">Notifications</h4>
                <div className="flex items-center space-x-3">
                  <Checkbox id="sendEmail" checked={sendEmail} onCheckedChange={(checked) => setSendEmail(!!checked)} />
                  <Label htmlFor="sendEmail" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Send launch emails to all participants
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Participants receive kickoff instructions and their relevant deadlines. Reminder emails follow the schedule
                  configured in your notification settings.
                </p>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
                Once launched, this cycle will appear in the performance workspace and progress tracking dashboards. You can
                make adjustments or pause the cycle from the review management page at any time.
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
              {currentStepIndex === wizardSteps.length - 1 ? "Launch cycle" : "Continue"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
