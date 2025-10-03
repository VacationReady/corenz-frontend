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
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Checkbox,
  CheckboxGroup,
} from "@/components/ui/Checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import {
  Send,
  Users,
  Calendar,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Filter,
  Search,
  UserCheck,
  Building,
  Briefcase,
  User,
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

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName?: string;
  jobRoleName?: string;
}

export default function SendSurveyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [surveyName, setSurveyName] = useState("");
  const [surveyDescription, setSurveyDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  
  // Target audience
  const [targetType, setTargetType] = useState<"all" | "departments" | "roles" | "individuals">("all");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  
  // Data
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [templatesRes, departmentsRes, jobRolesRes, employeesRes] = await Promise.all([
          fetch("/api/forms?type=SURVEY"),
          fetch("/api/departments"),
          fetch("/api/job-roles"),
          fetch("/api/employees"),
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

        if (employeesRes.ok) {
          const employeesData = await employeesRes.json();
          setEmployees(employeesData.employees || []);
          setFilteredEmployees(employeesData.employees || []);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        toast.error("Failed to load survey data");
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    // Filter employees based on search term
    if (searchTerm) {
      const filtered = employees.filter(emp => 
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [searchTerm, employees]);

  const getSelectedTemplate = () => {
    return templates.find(t => t.id === selectedTemplate);
  };

  const getTargetEmployeeCount = () => {
    switch (targetType) {
      case "all":
        return employees.length;
      case "departments":
        return employees.filter(emp => 
          selectedDepartments.some(deptId => 
            departments.find(d => d.id === deptId)?.name === emp.departmentName
          )
        ).length;
      case "roles":
        return employees.filter(emp => 
          selectedRoles.some(roleId => 
            jobRoles.find(r => r.id === roleId)?.name === emp.jobRoleName
          )
        ).length;
      case "individuals":
        return selectedEmployees.length;
      default:
        return 0;
    }
  };

  const handleSendSurvey = async () => {
    if (!selectedTemplate || !surveyName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const targetAudience: any = {};
      
      if (targetType === "departments") {
        targetAudience.departments = selectedDepartments;
      } else if (targetType === "roles") {
        targetAudience.jobRoles = selectedRoles;
      } else if (targetType === "individuals") {
        targetAudience.employees = selectedEmployees;
      } else {
        targetAudience.allEmployees = true;
      }

      const response = await fetch("/api/surveys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formId: selectedTemplate,
          name: surveyName,
          description: surveyDescription,
          deadline: deadline || null,
          targetAudience,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Survey sent to ${result.recipients} employees successfully!`);
        router.push("/surveys/active");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to send survey");
      }
    } catch (error) {
      console.error("Error sending survey:", error);
      toast.error("Failed to send survey");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Select Survey Template</CardTitle>
              <CardDescription>
                Choose a survey template to send to your employees
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template">Survey Template *</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
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

              <div className="space-y-2">
                <Label htmlFor="name">Survey Name *</Label>
                <Input
                  id="name"
                  value={surveyName}
                  onChange={(e) => setSurveyName(e.target.value)}
                  placeholder="Enter survey name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={surveyDescription}
                  onChange={(e) => setSurveyDescription(e.target.value)}
                  placeholder="Enter survey description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline (Optional)</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Select Target Audience</CardTitle>
              <CardDescription>
                Choose who should receive this survey
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Target Audience</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      targetType === "all" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setTargetType("all")}
                  >
                    <div className="flex flex-col items-center text-center">
                      <Users className="h-6 w-6 mb-2" />
                      <span className="font-medium">All Employees</span>
                      <span className="text-sm text-muted-foreground">{employees.length} people</span>
                    </div>
                  </div>

                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      targetType === "departments" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setTargetType("departments")}
                  >
                    <div className="flex flex-col items-center text-center">
                      <Building className="h-6 w-6 mb-2" />
                      <span className="font-medium">Departments</span>
                      <span className="text-sm text-muted-foreground">{departments.length} departments</span>
                    </div>
                  </div>

                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      targetType === "roles" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setTargetType("roles")}
                  >
                    <div className="flex flex-col items-center text-center">
                      <Briefcase className="h-6 w-6 mb-2" />
                      <span className="font-medium">Job Roles</span>
                      <span className="text-sm text-muted-foreground">{jobRoles.length} roles</span>
                    </div>
                  </div>

                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      targetType === "individuals" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setTargetType("individuals")}
                  >
                    <div className="flex flex-col items-center text-center">
                      <User className="h-6 w-6 mb-2" />
                      <span className="font-medium">Individuals</span>
                      <span className="text-sm text-muted-foreground">Select specific people</span>
                    </div>
                  </div>
                </div>
              </div>

              {targetType === "departments" && (
                <div className="space-y-3">
                  <Label>Select Departments</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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

              {targetType === "individuals" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label>Select Employees</Label>
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search employees..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    {filteredEmployees.map((employee) => (
                      <div key={employee.id} className="flex items-center space-x-2 p-3 hover:bg-gray-50">
                        <Checkbox
                          id={`emp-${employee.id}`}
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEmployees([...selectedEmployees, employee.id]);
                            } else {
                              setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                            }
                          }}
                        />
                        <Label htmlFor={`emp-${employee.id}`} className="flex-1 text-sm">
                          <div className="flex justify-between">
                            <span>{employee.firstName} {employee.lastName}</span>
                            <span className="text-muted-foreground">
                              {employee.departmentName} • {employee.jobRoleName}
                            </span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Survey will be sent to {getTargetEmployeeCount()} employees
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Review & Send</CardTitle>
              <CardDescription>
                Review your survey details before sending
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Survey Name</Label>
                  <p className="text-lg font-semibold">{surveyName}</p>
                </div>

                {surveyDescription && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p className="text-sm">{surveyDescription}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Template</Label>
                  <p className="text-sm">{getSelectedTemplate()?.name}</p>
                </div>

                {deadline && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Deadline</Label>
                    <p className="text-sm">{new Date(deadline).toLocaleString()}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Target Audience</Label>
                  <p className="text-sm">
                    {targetType === "all" && "All Employees"}
                    {targetType === "departments" && `${selectedDepartments.length} selected departments`}
                    {targetType === "roles" && `${selectedRoles.length} selected job roles`}
                    {targetType === "individuals" && `${selectedEmployees.length} selected employees`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total recipients: {getTargetEmployeeCount()} employees
                  </p>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">
                    Ready to send survey
                  </span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Employees will receive this survey as an action item in their dashboard.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <PageShell
      title="Send Survey"
      description="Create and distribute surveys to your employees"
      icon={<Send className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Surveys", href: "/surveys" },
          { label: "Send Survey", isCurrentPage: true },
        ],
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Progress Steps */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-200 text-gray-600"
                  }`}>
                    {stepNum}
                  </div>
                  {stepNum < 3 && (
                    <div className={`w-16 h-1 mx-2 ${
                      step > stepNum ? "bg-blue-600" : "bg-gray-200"
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>Template</span>
              <span>Audience</span>
              <span>Review</span>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (step > 1) {
                setStep(step - 1);
              } else {
                router.back();
              }
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step > 1 ? "Previous" : "Back"}
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && (!selectedTemplate || !surveyName)) ||
                (step === 2 && getTargetEmployeeCount() === 0)
              }
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSendSurvey}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Survey
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
