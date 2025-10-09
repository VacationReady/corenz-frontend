"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Sparkles,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { ensureDefaultSurveyTemplates, findTemplateMetaBySlug } from "@/lib/survey-templates";

interface SurveyTemplate {
  id: string;
  name: string;
  description?: string;
  formType: string;
  schema: any;
  slug?: string;
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

interface Location {
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
  locationName?: string;
}

export default function SendSurveyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [templatePrefilled, setTemplatePrefilled] = useState(false);
  
  // Form data
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [surveyName, setSurveyName] = useState("");
  const [surveyDescription, setSurveyDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [anonymizationLevel, setAnonymizationLevel] = useState<"public" | "department" | "location" | "full">("public");
  
  // Target audience
  const [targetType, setTargetType] = useState<"all" | "departments" | "roles" | "locations" | "individuals">("all");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [excludedEmployees, setExcludedEmployees] = useState<string[]>([]);
  
  // Data
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [filteredExcludedEmployees, setFilteredExcludedEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [excludedSearchTerm, setExcludedSearchTerm] = useState("");
  const templateFromQuery = searchParams?.get("template") || "";

  useEffect(() => {
    const loadData = async () => {
      setInitializing(true);
      try {
        const ensuredTemplates = await ensureDefaultSurveyTemplates();
        const normalizedTemplates = Array.isArray(ensuredTemplates)
          ? ensuredTemplates
          : ensuredTemplates?.forms || [];
        setTemplates(normalizedTemplates);

        const [departmentsRes, jobRolesRes, locationsRes, employeesRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/job-roles"),
          fetch("/api/locations"),
          fetch("/api/employees"),
        ]);

        if (departmentsRes.ok) {
          const departmentsData = await departmentsRes.json();
          setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
        }

        if (jobRolesRes.ok) {
          const jobRolesData = await jobRolesRes.json();
          setJobRoles(jobRolesData.jobRoles || []);
        }

        if (locationsRes.ok) {
          const locationsData = await locationsRes.json();
          setLocations(Array.isArray(locationsData) ? locationsData : []);
        }

        if (employeesRes.ok) {
          const employeesData = await employeesRes.json();
          setEmployees(Array.isArray(employeesData) ? employeesData : []);
          setFilteredEmployees(Array.isArray(employeesData) ? employeesData : []);
          setFilteredExcludedEmployees(Array.isArray(employeesData) ? employeesData : []);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        toast.error("Failed to load survey data");
      } finally {
        setInitializing(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!templateFromQuery || !templates.length || templatePrefilled) return;
    const match = templates.find((template) => template.slug === templateFromQuery);
    if (match) {
      setSelectedTemplate(match.id);
      setSurveyName(match.name);
      setSurveyDescription(match.description || "");
      setTemplatePrefilled(true);
    }
  }, [templateFromQuery, templates, templatePrefilled]);

  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    const template = templates.find((t) => t.id === value);
    if (template) {
      setSurveyName(template.name);
      setSurveyDescription(template.description || "");
    }
  };

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

  useEffect(() => {
    // Filter excluded employees based on search term
    if (excludedSearchTerm) {
      const filtered = employees.filter(emp => 
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(excludedSearchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(excludedSearchTerm.toLowerCase())
      );
      setFilteredExcludedEmployees(filtered);
    } else {
      setFilteredExcludedEmployees(employees);
    }
  }, [excludedSearchTerm, employees]);

  const getSelectedTemplate = () => {
    return templates.find(t => t.id === selectedTemplate);
  };

  const getTargetEmployeeCount = () => {
    let targetEmployees: Employee[] = [];
    
    switch (targetType) {
      case "all":
        targetEmployees = employees;
        break;
      case "departments":
        targetEmployees = employees.filter(emp => 
          selectedDepartments.some(deptId => 
            departments.find(d => d.id === deptId)?.name === emp.departmentName
          )
        );
        break;
      case "roles":
        targetEmployees = employees.filter(emp => 
          selectedRoles.some(roleId => 
            jobRoles.find(r => r.id === roleId)?.name === emp.jobRoleName
          )
        );
        break;
      case "locations":
        targetEmployees = employees.filter(emp => 
          selectedLocations.some(locId => 
            locations.find(l => l.id === locId)?.name === emp.locationName
          )
        );
        break;
      case "individuals":
        targetEmployees = employees.filter(emp => selectedEmployees.includes(emp.id));
        break;
      default:
        targetEmployees = [];
    }
    
    // Remove excluded employees
    return targetEmployees.filter(emp => !excludedEmployees.includes(emp.id)).length;
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
      } else if (targetType === "locations") {
        targetAudience.locations = selectedLocations;
      } else if (targetType === "individuals") {
        targetAudience.employees = selectedEmployees;
      } else {
        targetAudience.allEmployees = true;
      }
      
      // Add excluded employees to all targeting types
      if (excludedEmployees.length > 0) {
        targetAudience.excludedEmployees = excludedEmployees;
      }

      // Step 1: Create the survey
      const createBody = {
        formId: selectedTemplate,
        name: surveyName,
        description: surveyDescription || undefined,
        deadline: deadline && deadline.trim() !== "" ? deadline : undefined,
        targetAudience,
        anonymizationLevel,
      };
      
      console.log("Creating survey:", createBody);
      
      const createResponse = await fetch("/api/surveys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createBody),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        console.error("Survey creation error:", error);
        toast.error(error.error || "Failed to create survey");
        return;
      }

      const createdSurvey = await createResponse.json();
      console.log("Survey created:", createdSurvey);

      // Step 2: Send the survey to recipients (creates action items and recipients)
      const sendBody = {
        targetAudience,
        deadline: deadline && deadline.trim() !== "" ? deadline : undefined,
        sendImmediately: true,
      };

      console.log("Sending survey to recipients:", sendBody);

      const sendResponse = await fetch(`/api/surveys/${createdSurvey.id}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sendBody),
      });

      if (!sendResponse.ok) {
        const error = await sendResponse.json();
        console.error("Survey send error:", error);
        toast.error(error.error || "Failed to send survey to recipients");
        return;
      }

      const sendResult = await sendResponse.json();
      console.log("Survey sent:", sendResult);
      
      toast.success(`Survey successfully sent to ${sendResult.recipients} employee${sendResult.recipients !== 1 ? 's' : ''}!`);
      router.push("/surveys/active");
    } catch (error) {
      console.error("Error sending survey:", error);
      toast.error("Failed to send survey");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    const selectedTemplateData = getSelectedTemplate();
    const selectedTemplateMeta = findTemplateMetaBySlug(selectedTemplateData?.slug);
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Select Survey Template</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a survey template to send to your employees
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template">Survey Template *</Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={handleTemplateChange}
                  disabled={initializing || templates.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={initializing ? "Loading templates..." : "Select a survey template"}
                    >
                      {selectedTemplate && (() => {
                        const template = templates.find(t => t.id === selectedTemplate);
                        const meta = findTemplateMetaBySlug(template?.slug);
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{meta?.emoji ?? "📝"}</span>
                            <span className="font-medium">{template?.name}</span>
                          </div>
                        );
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => {
                      const meta = findTemplateMetaBySlug(template.slug);
                      return (
                        <SelectItem key={template.id} value={template.id} className="py-2">
                          <div className="flex flex-col gap-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{meta?.emoji ?? "📝"}</span>
                              <span className="font-medium">{template.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {meta?.description ?? template.description ?? "Custom survey"}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Need tweaks? Open any template in settings to tailor tone, branding, or follow-up prompts before sending.
                </p>
                {initializing && (
                  <p className="text-xs text-muted-foreground">Preparing curated templates…</p>
                )}
              </div>

              {selectedTemplateData && (
                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 transition">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${
                        selectedTemplateMeta?.accentGradient || "from-slate-200 via-slate-100 to-slate-200"
                      }`}
                    >
                      <span className="text-2xl">{selectedTemplateMeta?.emoji ?? "📝"}</span>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-primary">
                          {selectedTemplateData.name}
                        </h4>
                      </div>
                      {selectedTemplateMeta?.highlights?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedTemplateMeta.highlights.map((highlight) => (
                            <Badge key={highlight} variant="secondary" className="bg-white text-[11px] text-primary">
                              {highlight}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                        >
                          <Link
                            href={`/settings/surveys/${selectedTemplateData.id}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center"
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Edit template
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:bg-primary/10 flex items-center"
                          onClick={() => {
                            setSelectedTemplate("");
                            setTemplatePrefilled(false);
                          }}
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Choose another
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

              <div className="space-y-2">
                <Label htmlFor="anonymisation">Response Anonymisation</Label>
                <Select value={anonymizationLevel} onValueChange={(value: "public" | "department" | "location" | "full") => setAnonymizationLevel(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select anonymisation level">
                      {anonymizationLevel && (
                        <div className="flex flex-col text-left">
                          <span className="font-medium">
                            {anonymizationLevel === "public" && "Public"}
                            {anonymizationLevel === "department" && "Anonymise by Department"}
                            {anonymizationLevel === "location" && "Anonymise by Location"}
                            {anonymizationLevel === "full" && "Fully Anonymous"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {anonymizationLevel === "public" && "Responses are visible with employee names"}
                            {anonymizationLevel === "department" && "Show department but hide individual names"}
                            {anonymizationLevel === "location" && "Show location but hide individual names"}
                            {anonymizationLevel === "full" && "Hide all identifying information"}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex flex-col">
                        <span className="font-medium">Public</span>
                        <span className="text-sm text-muted-foreground">
                          Responses are visible with employee names
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="department">
                      <div className="flex flex-col">
                        <span className="font-medium">Anonymise by Department</span>
                        <span className="text-sm text-muted-foreground">
                          Show department but hide individual names
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="location">
                      <div className="flex flex-col">
                        <span className="font-medium">Anonymise by Location</span>
                        <span className="text-sm text-muted-foreground">
                          Show location but hide individual names
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="full">
                      <div className="flex flex-col">
                        <span className="font-medium">Fully Anonymous</span>
                        <span className="text-sm text-muted-foreground">
                          Hide all identifying information
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                      targetType === "locations" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setTargetType("locations")}
                  >
                    <div className="flex flex-col items-center text-center">
                      <Building className="h-6 w-6 mb-2" />
                      <span className="font-medium">Locations</span>
                      <span className="text-sm text-muted-foreground">{locations.length} locations</span>
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
                    {departments.map((dept) => {
                      const employeeCount = employees.filter(emp => emp.departmentName === dept.name).length;
                      return (
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
                            {dept.name} ({employeeCount})
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {targetType === "roles" && (
                <div className="space-y-3">
                  <Label>Select Job Roles</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {jobRoles.map((role) => {
                      const employeeCount = employees.filter(emp => emp.jobRoleName === role.name).length;
                      return (
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
                            {role.name} ({employeeCount})
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {targetType === "locations" && (
                <div className="space-y-3">
                  <Label>Select Locations</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {locations.map((location) => {
                      const employeeCount = employees.filter(emp => emp.locationName === location.name).length;
                      return (
                        <div key={location.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`loc-${location.id}`}
                            checked={selectedLocations.includes(location.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedLocations([...selectedLocations, location.id]);
                              } else {
                                setSelectedLocations(selectedLocations.filter(id => id !== location.id));
                              }
                            }}
                          />
                          <Label htmlFor={`loc-${location.id}`} className="text-sm">
                            {location.name} ({employeeCount})
                          </Label>
                        </div>
                      );
                    })}
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

              {/* Excluded Employees Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label>Exclude Specific Employees (Optional)</Label>
                  <span className="text-xs text-muted-foreground">
                    {excludedEmployees.length} excluded
                  </span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees to exclude..."
                    value={excludedSearchTerm}
                    onChange={(e) => setExcludedSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-lg">
                  {filteredExcludedEmployees.map((employee) => (
                    <div key={employee.id} className="flex items-center space-x-2 p-3 hover:bg-gray-50">
                      <Checkbox
                        id={`exclude-emp-${employee.id}`}
                        checked={excludedEmployees.includes(employee.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setExcludedEmployees([...excludedEmployees, employee.id]);
                          } else {
                            setExcludedEmployees(excludedEmployees.filter(id => id !== employee.id));
                          }
                        }}
                      />
                      <Label htmlFor={`exclude-emp-${employee.id}`} className="flex-1 text-sm">
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

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Survey will be sent to {getTargetEmployeeCount()} employees
                    {excludedEmployees.length > 0 && (
                      <span className="text-blue-700"> (excluding {excludedEmployees.length})</span>
                    )}
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
                  <Label className="text-sm font-medium text-muted-foreground">Anonymization Level</Label>
                  <p className="text-sm">
                    {anonymizationLevel === "public" && "Public - Responses visible with names"}
                    {anonymizationLevel === "department" && "Department-level anonymization"}
                    {anonymizationLevel === "location" && "Location-level anonymization"}
                    {anonymizationLevel === "full" && "Fully anonymous responses"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Target Audience</Label>
                  <p className="text-sm">
                    {targetType === "all" && "All Employees"}
                    {targetType === "departments" && `${selectedDepartments.length} selected departments`}
                    {targetType === "roles" && `${selectedRoles.length} selected job roles`}
                    {targetType === "locations" && `${selectedLocations.length} selected locations`}
                    {targetType === "individuals" && `${selectedEmployees.length} selected employees`}
                  </p>
                  {excludedEmployees.length > 0 && (
                    <p className="text-sm text-orange-600">
                      Excluding {excludedEmployees.length} employees
                    </p>
                  )}
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
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step > 1 ? "Previous" : "Back"}
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && (!selectedTemplate || !surveyName)) ||
                (step === 2 && (
                  getTargetEmployeeCount() === 0 ||
                  (targetType === "departments" && selectedDepartments.length === 0) ||
                  (targetType === "roles" && selectedRoles.length === 0) ||
                  (targetType === "locations" && selectedLocations.length === 0) ||
                  (targetType === "individuals" && selectedEmployees.length === 0)
                ))
              }
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSendSurvey}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 flex items-center"
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
