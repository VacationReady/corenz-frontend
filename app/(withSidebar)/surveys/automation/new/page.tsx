"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Repeat,
  Calendar,
  Users,
  Clock,
  Target,
  ArrowLeft,
  Save,
  Zap,
  Brain,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

interface SurveyTemplate {
  id: string;
  name: string;
  description?: string;
  formType: string;
  schema: any;
}

interface Department {
  id: string;
  name: string;
  employeeCount: number;
}

interface JobRole {
  id: string;
  name: string;
  employeeCount: number;
}

export default function CreateAutomationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form data
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formId, setFormId] = useState("");
  const [trigger, setTrigger] = useState<"SCHEDULED" | "ONBOARDING_COMPLETE" | "ANNIVERSARY" | "PERFORMANCE_REVIEW" | "CUSTOM">("SCHEDULED");
  const [frequency, setFrequency] = useState<"WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "CUSTOM">("MONTHLY");
  const [scheduleConfig, setScheduleConfig] = useState<any>({});
  
  // Target audience
  const [targetType, setTargetType] = useState<"all" | "departments" | "roles">("all");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  
  // Data
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [templatesRes, departmentsRes, jobRolesRes] = await Promise.all([
          fetch("/api/forms?type=SURVEY"),
          fetch("/api/departments"),
          fetch("/api/job-roles"),
        ]);

        if (templatesRes.ok) {
          const templatesData = await templatesRes.json();
          setTemplates(templatesData.forms || []);
        }

        if (departmentsRes.ok) {
          const departmentsData = await departmentsRes.json();
          setDepartments(departmentsData.departments || []);
        }

        if (jobRolesRes.ok) {
          const jobRolesData = await jobRolesRes.json();
          setJobRoles(jobRolesData.jobRoles || []);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        toast.error("Failed to load automation data");
      }
    };

    loadData();
  }, []);

  const getSelectedTemplate = () => {
    return templates.find(t => t.id === formId);
  };

  const getTargetEmployeeCount = () => {
    switch (targetType) {
      case "all":
        return "All employees";
      case "departments":
        return `${selectedDepartments.length} selected departments`;
      case "roles":
        return `${selectedRoles.length} selected job roles`;
      default:
        return "Unknown";
    }
  };

  const calculateNextRun = () => {
    if (trigger !== "SCHEDULED") return "Based on trigger events";
    
    const now = new Date();
    switch (frequency) {
      case "WEEKLY":
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString();
      case "MONTHLY":
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toLocaleDateString();
      case "QUARTERLY":
        return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()).toLocaleDateString();
      case "ANNUALLY":
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toLocaleDateString();
      default:
        return "Custom schedule";
    }
  };

  const handleSave = async () => {
    if (!name || !formId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const targetAudience: any = {};
      
      if (targetType === "departments") {
        targetAudience.departments = selectedDepartments;
      } else if (targetType === "roles") {
        targetAudience.jobRoles = selectedRoles;
      } else {
        targetAudience.allEmployees = true;
      }

      const response = await fetch("/api/surveys/automation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          formId,
          trigger,
          frequency: trigger === "SCHEDULED" ? frequency : null,
          scheduleConfig,
          targetAudience,
          isActive: true,
        }),
      });

      if (response.ok) {
        toast.success("Automation rule created successfully!");
        router.push("/surveys/automation");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create automation rule");
      }
    } catch (error) {
      console.error("Error creating automation:", error);
      toast.error("Failed to create automation rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title="Create Automation Rule"
      description="Set up automated survey distribution based on triggers and schedules"
      icon={<Repeat className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Surveys", href: "/surveys" },
          { label: "Automation", href: "/surveys/automation" },
          { label: "Create", isCurrentPage: true },
        ],
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Set up the basic details for your automation rule
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Rule Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Monthly Employee Satisfaction"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this automation does..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template">Survey Template *</Label>
                  <Select value={formId} onValueChange={setFormId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a survey template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{template.name}</span>
                            {template.description && (
                              <span className="text-sm text-muted-foreground">
                                {template.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Trigger Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Trigger Configuration
                </CardTitle>
                <CardDescription>
                  Choose when this automation should run
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <Select value={trigger} onValueChange={(value: any) => setTrigger(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCHEDULED">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Scheduled (Recurring)
                        </div>
                      </SelectItem>
                      <SelectItem value="ONBOARDING_COMPLETE">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Onboarding Complete
                        </div>
                      </SelectItem>
                      <SelectItem value="ANNIVERSARY">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Work Anniversary
                        </div>
                      </SelectItem>
                      <SelectItem value="PERFORMANCE_REVIEW">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Performance Review
                        </div>
                      </SelectItem>
                      <SelectItem value="CUSTOM">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Custom Trigger
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {trigger === "SCHEDULED" && (
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                        <SelectItem value="ANNUALLY">Annually</SelectItem>
                        <SelectItem value="CUSTOM">Custom Schedule</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {trigger !== "SCHEDULED" && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Event-Based Trigger</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      This automation will run automatically when the specified event occurs for eligible employees.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Target Audience */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Target Audience
                </CardTitle>
                <CardDescription>
                  Choose who should receive the automated surveys
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Target Type</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        targetType === "all" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setTargetType("all")}
                    >
                      <div className="flex flex-col items-center text-center">
                        <Users className="h-6 w-6 mb-2" />
                        <span className="font-medium">All Employees</span>
                      </div>
                    </div>

                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        targetType === "departments" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setTargetType("departments")}
                    >
                      <div className="flex flex-col items-center text-center">
                        <Users className="h-6 w-6 mb-2" />
                        <span className="font-medium">Departments</span>
                      </div>
                    </div>

                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        targetType === "roles" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setTargetType("roles")}
                    >
                      <div className="flex flex-col items-center text-center">
                        <Users className="h-6 w-6 mb-2" />
                        <span className="font-medium">Job Roles</span>
                      </div>
                    </div>
                  </div>
                </div>

                {targetType === "departments" && (
                  <div className="space-y-3">
                    <Label>Select Departments</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {departments.map((dept) => (
                        <div key={dept.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`dept-${dept.id}`}
                            checked={selectedDepartments.includes(dept.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedDepartments([...selectedDepartments, dept.id]);
                              } else {
                                setSelectedDepartments(selectedDepartments.filter(id => id !== dept.id));
                              }
                            }}
                          />
                          <Label htmlFor={`dept-${dept.id}`} className="text-sm">
                            {dept.name} ({dept.employeeCount})
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {targetType === "roles" && (
                  <div className="space-y-3">
                    <Label>Select Job Roles</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {jobRoles.map((role) => (
                        <div key={role.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`role-${role.id}`}
                            checked={selectedRoles.includes(role.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRoles([...selectedRoles, role.id]);
                              } else {
                                setSelectedRoles(selectedRoles.filter(id => id !== role.id));
                              }
                            }}
                          />
                          <Label htmlFor={`role-${role.id}`} className="text-sm">
                            {role.name} ({role.employeeCount})
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Preview
                </CardTitle>
                <CardDescription>
                  Review your automation rule
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Rule Name</Label>
                  <p className="text-sm font-semibold">{name || "Untitled Rule"}</p>
                </div>

                {description && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p className="text-sm">{description}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Survey Template</Label>
                  <p className="text-sm">{getSelectedTemplate()?.name || "No template selected"}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Trigger</Label>
                  <p className="text-sm">
                    {trigger === "SCHEDULED" && `${frequency.toLowerCase()} schedule`}
                    {trigger === "ONBOARDING_COMPLETE" && "Onboarding complete"}
                    {trigger === "ANNIVERSARY" && "Work anniversary"}
                    {trigger === "PERFORMANCE_REVIEW" && "Performance review"}
                    {trigger === "CUSTOM" && "Custom trigger"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Target Audience</Label>
                  <p className="text-sm">{getTargetEmployeeCount()}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Next Run</Label>
                  <p className="text-sm">{calculateNextRun()}</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900">
                      Ready to activate
                    </span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    This automation will run automatically based on your configuration.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setName("Monthly Employee Satisfaction");
                    setDescription("Send satisfaction survey to all employees monthly");
                    setTrigger("SCHEDULED");
                    setFrequency("MONTHLY");
                    setTargetType("all");
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Monthly Satisfaction
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setName("90-Day New Hire Check-in");
                    setDescription("Send onboarding feedback survey 90 days after start date");
                    setTrigger("ONBOARDING_COMPLETE");
                    setTargetType("all");
                  }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  New Hire Check-in
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setName("Annual Performance Review");
                    setDescription("Send performance feedback survey on work anniversary");
                    setTrigger("ANNIVERSARY");
                    setTargetType("all");
                  }}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Anniversary Review
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || !name || !formId}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Automation
              </>
            )}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
