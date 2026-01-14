"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  Send,
  Users,
  Calendar,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Filter,
  Search,
  UserCheck,
  Building,
  Briefcase,
  User,
  Sparkles,
  Settings,
  FileText,
  Shield,
  Eye,
  EyeOff,
  Zap,
  ChevronRight,
  X,
  Check,
  Loader2,
  Mail,
  Edit3,
  Globe,
  Lock,
  UserX,
  Rocket,
  PartyPopper,
  MousePointerClick,
} from "lucide-react";
import { toast } from "sonner";
import { ensureDefaultSurveyTemplates, findTemplateMetaBySlug } from "@/lib/survey-templates";
import { cn } from "@/lib/utils";

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

const steps = [
  { id: 1, title: "Template", description: "Choose your survey", icon: FileText },
  { id: 2, title: "Audience", description: "Select recipients", icon: Users },
  { id: 3, title: "Review", description: "Confirm & send", icon: Rocket },
];

const anonymizationOptions = [
  {
    value: "public",
    label: "Public",
    description: "Responses visible with names",
    icon: Eye,
    gradient: "from-emerald-500 to-teal-500",
    bgLight: "from-emerald-50 to-teal-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
  {
    value: "department",
    label: "By Department",
    description: "Show department, hide names",
    icon: Building,
    gradient: "from-blue-500 to-indigo-500",
    bgLight: "from-blue-50 to-indigo-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  {
    value: "location",
    label: "By Location",
    description: "Show location, hide names",
    icon: Globe,
    gradient: "from-violet-500 to-purple-500",
    bgLight: "from-violet-50 to-purple-50",
    border: "border-violet-200",
    text: "text-violet-700",
  },
  {
    value: "full",
    label: "Anonymous",
    description: "Complete privacy",
    icon: Lock,
    gradient: "from-slate-600 to-slate-800",
    bgLight: "from-slate-50 to-slate-100",
    border: "border-slate-300",
    text: "text-slate-700",
  },
];

const targetingOptions = [
  { 
    type: "all" as const, 
    icon: Users, 
    label: "Everyone", 
    description: "All active employees",
    gradient: "from-emerald-500 to-teal-600",
    bgLight: "bg-gradient-to-br from-emerald-50 to-teal-50",
  },
  { 
    type: "departments" as const, 
    icon: Building, 
    label: "Departments", 
    description: "By team or division",
    gradient: "from-blue-500 to-indigo-600",
    bgLight: "bg-gradient-to-br from-blue-50 to-indigo-50",
  },
  { 
    type: "roles" as const, 
    icon: Briefcase, 
    label: "Job Roles", 
    description: "By position",
    gradient: "from-violet-500 to-purple-600",
    bgLight: "bg-gradient-to-br from-violet-50 to-purple-50",
  },
  { 
    type: "locations" as const, 
    icon: Globe, 
    label: "Locations", 
    description: "By office or region",
    gradient: "from-amber-500 to-orange-600",
    bgLight: "bg-gradient-to-br from-amber-50 to-orange-50",
  },
  { 
    type: "individuals" as const, 
    icon: User, 
    label: "Individuals", 
    description: "Hand-pick recipients",
    gradient: "from-pink-500 to-rose-600",
    bgLight: "bg-gradient-to-br from-pink-50 to-rose-50",
  },
];

function SendSurveyPageContent() {
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
  const [showExcludePanel, setShowExcludePanel] = useState(false);
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
          fetch("/api/employees?limit=100&status=active"),
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
          const employeesList = Array.isArray(employeesData) ? employeesData : (employeesData?.data || []);
          setEmployees(employeesList);
          setFilteredEmployees(employeesList);
          setFilteredExcludedEmployees(employeesList);
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
      
      if (excludedEmployees.length > 0) {
        targetAudience.excludedEmployees = excludedEmployees;
      }

      const createBody = {
        formId: selectedTemplate,
        name: surveyName,
        description: surveyDescription || undefined,
        deadline: deadline && deadline.trim() !== "" ? deadline : undefined,
        targetAudience,
        anonymizationLevel,
      };
      
      const createResponse = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createBody),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        toast.error(error.error || "Failed to create survey");
        return;
      }

      const createdSurvey = await createResponse.json();

      const sendBody = {
        targetAudience,
        deadline: deadline && deadline.trim() !== "" ? deadline : undefined,
        sendImmediately: true,
      };

      const sendResponse = await fetch(`/api/surveys/${createdSurvey.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendBody),
      });

      if (!sendResponse.ok) {
        const error = await sendResponse.json();
        toast.error(error.error || "Failed to send survey to recipients");
        return;
      }

      const sendResult = await sendResponse.json();
      toast.success(`Survey successfully sent to ${sendResult.recipients} employee${sendResult.recipients !== 1 ? 's' : ''}!`);
      router.push("/surveys/active");
    } catch (error) {
      console.error("Error sending survey:", error);
      toast.error("Failed to send survey");
    } finally {
      setLoading(false);
    }
  };

  // Minimum recipients for anonymous surveys
  const MINIMUM_ANONYMOUS_RECIPIENTS = 3;
  
  const isAnonymousSurvey = anonymizationLevel !== "public";
  const targetCount = getTargetEmployeeCount();
  const hasInsufficientRecipientsForAnonymous = isAnonymousSurvey && targetCount < MINIMUM_ANONYMOUS_RECIPIENTS && targetCount > 0;

  const canProceed = useMemo(() => {
    if (step === 1) return selectedTemplate && surveyName.trim().length > 0;
    if (step === 2) {
      if (getTargetEmployeeCount() === 0) return false;
      if (targetType === "departments" && selectedDepartments.length === 0) return false;
      if (targetType === "roles" && selectedRoles.length === 0) return false;
      if (targetType === "locations" && selectedLocations.length === 0) return false;
      if (targetType === "individuals" && selectedEmployees.length === 0) return false;
      // For anonymous surveys, require minimum recipients
      if (isAnonymousSurvey && getTargetEmployeeCount() < MINIMUM_ANONYMOUS_RECIPIENTS) return false;
      return true;
    }
    return true;
  }, [step, selectedTemplate, surveyName, targetType, selectedDepartments, selectedRoles, selectedLocations, selectedEmployees, employees, excludedEmployees, isAnonymousSurvey]);

  const selectedTemplateData = getSelectedTemplate();
  const selectedTemplateMeta = findTemplateMetaBySlug(selectedTemplateData?.slug);
  const currentAnonymization = anonymizationOptions.find(o => o.value === anonymizationLevel);
  const currentTargeting = targetingOptions.find(o => o.type === targetType);

  // Get selection summary for audience step
  const getSelectionSummary = () => {
    switch (targetType) {
      case "departments":
        return selectedDepartments.map(id => departments.find(d => d.id === id)?.name).filter(Boolean);
      case "roles":
        return selectedRoles.map(id => jobRoles.find(r => r.id === id)?.name).filter(Boolean);
      case "locations":
        return selectedLocations.map(id => locations.find(l => l.id === id)?.name).filter(Boolean);
      case "individuals":
        return selectedEmployees.slice(0, 3).map(id => {
          const emp = employees.find(e => e.id === id);
          return emp ? `${emp.firstName} ${emp.lastName}` : null;
        }).filter(Boolean);
      default:
        return [];
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
      <div className="max-w-5xl mx-auto">
        {/* Premium Stepper */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-primary/5 rounded-2xl blur-xl" />
            
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl shadow-slate-200/50 p-6 md:p-8">
              <div className="flex items-center justify-between">
                {steps.map((s, index) => {
                  const Icon = s.icon;
                  const isActive = step === s.id;
                  const isCompleted = step > s.id;
                  
                  return (
                    <div key={s.id} className="flex items-center flex-1">
                      <div className="flex flex-col items-center relative z-10">
                        <motion.div
                          initial={false}
                          animate={{
                            scale: isActive ? 1.1 : 1,
                            backgroundColor: isCompleted ? "rgb(34, 197, 94)" : isActive ? "rgb(99, 102, 241)" : "rgb(241, 245, 249)",
                          }}
                          className={cn(
                            "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                            isActive && "shadow-lg shadow-primary/30 ring-4 ring-primary/20",
                            isCompleted && "shadow-lg shadow-green-500/30"
                          )}
                        >
                          {isCompleted ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                              <Check className="w-6 h-6 text-white" />
                            </motion.div>
                          ) : (
                            <Icon className={cn(
                              "w-5 h-5 md:w-6 md:h-6 transition-colors",
                              isActive ? "text-white" : "text-slate-400"
                            )} />
                          )}
                        </motion.div>
                        <div className="mt-3 text-center">
                          <p className={cn(
                            "text-sm font-semibold transition-colors",
                            isActive ? "text-slate-900" : isCompleted ? "text-green-600" : "text-slate-400"
                          )}>
                            {s.title}
                          </p>
                          <p className={cn(
                            "text-xs mt-0.5 hidden md:block transition-colors",
                            isActive ? "text-slate-600" : "text-slate-400"
                          )}>
                            {s.description}
                          </p>
                        </div>
                      </div>
                      
                      {index < steps.length - 1 && (
                        <div className="flex-1 mx-4 hidden md:block">
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: step > s.id ? "100%" : "0%" }}
                              transition={{ duration: 0.5, ease: "easeInOut" }}
                              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* ===== STEP 1: TEMPLATE ===== */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Template Selection */}
                <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-br from-slate-50 via-white to-purple-50/30 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white shadow-lg shadow-primary/30">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Choose Your Template</CardTitle>
                        <CardDescription className="mt-1">
                          Select a survey template to send to your team
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Template Dropdown */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Survey Template</Label>
                      <Select
                        value={selectedTemplate}
                        onValueChange={handleTemplateChange}
                        disabled={initializing || templates.length === 0}
                      >
                        <SelectTrigger className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all">
                          <SelectValue placeholder={initializing ? "Loading templates..." : "Select a survey template"}>
                            {selectedTemplate && (() => {
                              const template = templates.find(t => t.id === selectedTemplate);
                              const meta = findTemplateMetaBySlug(template?.slug);
                              return (
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">{meta?.emoji ?? "📝"}</span>
                                  <span className="font-medium">{template?.name}</span>
                                </div>
                              );
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          {templates.map((template) => {
                            const meta = findTemplateMetaBySlug(template.slug);
                            return (
                              <SelectItem key={template.id} value={template.id} className="py-3 px-4 cursor-pointer">
                                <div className="flex items-start gap-3">
                                  <span className="text-2xl">{meta?.emoji ?? "📝"}</span>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-900">{template.name}</span>
                                    <span className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                      {meta?.description ?? template.description ?? "Custom survey"}
                                    </span>
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5" />
                        Need tweaks? Edit templates in settings before sending.
                      </p>
                    </div>

                    {/* Selected Template Preview */}
                    <AnimatePresence>
                      {selectedTemplateData && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-purple-50/50 to-pink-50/30 border border-primary/10 p-5"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
                          <div className="relative flex items-start gap-4">
                            <div className={cn(
                              "flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl",
                              "bg-gradient-to-br shadow-lg",
                              selectedTemplateMeta?.accentGradient || "from-slate-100 to-slate-200"
                            )}>
                              {selectedTemplateMeta?.emoji ?? "📝"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900">{selectedTemplateData.name}</h4>
                              <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                {selectedTemplateMeta?.description || selectedTemplateData.description}
                              </p>
                              {selectedTemplateMeta?.highlights?.length ? (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                  {selectedTemplateMeta.highlights.slice(0, 4).map((highlight) => (
                                    <Badge key={highlight} variant="secondary" className="bg-white/80 text-xs font-medium">
                                      {highlight}
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTemplate("");
                                setTemplatePrefilled(false);
                              }}
                              className="flex-shrink-0 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Survey Details */}
                    <div className="grid gap-5 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-slate-700">Survey Name</Label>
                        <Input
                          id="name"
                          value={surveyName}
                          onChange={(e) => setSurveyName(e.target.value)}
                          placeholder="e.g., Q4 Employee Engagement Survey"
                          className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                          Description <span className="text-slate-400 font-normal">(Optional)</span>
                        </Label>
                        <Textarea
                          id="description"
                          value={surveyDescription}
                          onChange={(e) => setSurveyDescription(e.target.value)}
                          placeholder="Add context about this survey..."
                          rows={3}
                          className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="deadline" className="text-sm font-medium text-slate-700">
                            Deadline <span className="text-slate-400 font-normal">(Optional)</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="deadline"
                              type="datetime-local"
                              value={deadline}
                              onChange={(e) => setDeadline(e.target.value)}
                              className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-primary/20 pl-11"
                            />
                            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Anonymization Selection */}
                <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-br from-slate-50 via-white to-blue-50/30 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-lg shadow-slate-500/30">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Response Privacy</CardTitle>
                        <CardDescription>How should responses be attributed?</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {anonymizationOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = anonymizationLevel === option.value;
                        return (
                          <motion.div
                            key={option.value}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setAnonymizationLevel(option.value as any)}
                            className={cn(
                              "relative cursor-pointer rounded-xl p-4 transition-all duration-200",
                              isSelected
                                ? `bg-gradient-to-br ${option.bgLight} ${option.border} border-2 shadow-lg`
                                : "bg-slate-50/50 border border-slate-200 hover:border-slate-300 hover:shadow-md"
                            )}
                          >
                            {isSelected && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center shadow-lg"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                              isSelected ? `bg-gradient-to-br ${option.gradient}` : "bg-slate-100"
                            )}>
                              <Icon className={cn("w-5 h-5", isSelected ? "text-white" : "text-slate-500")} />
                            </div>
                            <h4 className={cn(
                              "font-semibold text-sm",
                              isSelected ? option.text : "text-slate-700"
                            )}>
                              {option.label}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              {option.description}
                            </p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ===== STEP 2: AUDIENCE ===== */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Audience Header Card */}
                <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Select Your Audience</CardTitle>
                          <CardDescription className="mt-1">
                            Choose who should receive this survey
                          </CardDescription>
                        </div>
                      </div>
                      
                      {/* Live Counter */}
                      <motion.div 
                        layout
                        className="hidden sm:flex items-center gap-3 bg-gradient-to-r from-primary/10 to-purple-100/50 rounded-full px-4 py-2"
                      >
                        <Users className="w-4 h-4 text-primary" />
                        <motion.span 
                          key={getTargetEmployeeCount()}
                          initial={{ scale: 1.2, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-lg font-bold text-primary"
                        >
                          {getTargetEmployeeCount()}
                        </motion.span>
                        <span className="text-sm text-slate-600">recipients</span>
                      </motion.div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6 space-y-6">
                    {/* Targeting Method Selection */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {targetingOptions.map(({ type, icon: Icon, label, description, gradient, bgLight }) => {
                        const isSelected = targetType === type;
                        const count = type === "all" ? employees.length 
                          : type === "departments" ? departments.length 
                          : type === "roles" ? jobRoles.length 
                          : type === "locations" ? locations.length 
                          : employees.length;
                        
                        return (
                          <motion.div
                            key={type}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setTargetType(type)}
                            className={cn(
                              "relative p-4 rounded-2xl cursor-pointer transition-all duration-200",
                              isSelected
                                ? `${bgLight} border-2 border-primary/30 shadow-xl shadow-primary/10`
                                : "bg-slate-50/80 border border-slate-200 hover:border-slate-300 hover:shadow-lg"
                            )}
                          >
                            {isSelected && (
                              <motion.div 
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center shadow-lg z-10"
                              >
                                <Check className="w-3.5 h-3.5 text-white" />
                              </motion.div>
                            )}
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all",
                              isSelected 
                                ? `bg-gradient-to-br ${gradient} shadow-lg` 
                                : "bg-slate-100"
                            )}>
                              <Icon className={cn("w-6 h-6", isSelected ? "text-white" : "text-slate-500")} />
                            </div>
                            <h4 className={cn(
                              "font-bold text-sm",
                              isSelected ? "text-slate-900" : "text-slate-700"
                            )}>{label}</h4>
                            <p className="text-xs text-slate-500 mt-0.5 hidden md:block">{description}</p>
                            <p className={cn(
                              "text-xs mt-2 font-medium",
                              isSelected ? "text-primary" : "text-slate-400"
                            )}>{count} available</p>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Selection Details */}
                    <AnimatePresence mode="wait">
                      {/* All Employees - Special Treatment */}
                      {targetType === "all" && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 text-white"
                        >
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),_transparent_50%)]" />
                          <div className="absolute bottom-0 right-0 opacity-10">
                            <Users className="w-40 h-40 -mb-10 -mr-10" />
                          </div>
                          <div className="relative flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <Users className="w-8 h-8" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold flex items-center gap-2">
                                Everyone's Invited
                                <Sparkles className="w-5 h-5 text-emerald-200" />
                              </h3>
                              <p className="text-emerald-100 mt-1">
                                Survey will be sent to all <span className="font-semibold">{employees.length}</span> active employees in your organisation
                              </p>
                            </div>
                            <div className="hidden lg:flex flex-col items-center">
                              <div className="text-4xl font-bold">{employees.length}</div>
                              <div className="text-sm text-emerald-200">people</div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Departments Selection */}
                      {targetType === "departments" && departments.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700">Select Departments</Label>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              {selectedDepartments.length} selected
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {departments.map((dept, index) => {
                              const isSelected = selectedDepartments.includes(dept.id);
                              const count = employees.filter(e => e.departmentName === dept.name).length;
                              return (
                                <motion.div
                                  key={dept.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.03 }}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedDepartments(selectedDepartments.filter(id => id !== dept.id));
                                    } else {
                                      setSelectedDepartments([...selectedDepartments, dept.id]);
                                    }
                                  }}
                                  className={cn(
                                    "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all",
                                    isSelected
                                      ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-lg shadow-blue-100"
                                      : "bg-white border border-slate-200 hover:border-blue-200 hover:shadow-md"
                                  )}
                                >
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                    isSelected ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-slate-100"
                                  )}>
                                    {isSelected ? (
                                      <Check className="w-5 h-5 text-white" />
                                    ) : (
                                      <Building className="w-5 h-5 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-semibold text-sm text-slate-900 block truncate">{dept.name}</span>
                                    <span className="text-xs text-slate-500">{count} employees</span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}

                      {/* Roles Selection */}
                      {targetType === "roles" && jobRoles.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700">Select Job Roles</Label>
                            <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                              {selectedRoles.length} selected
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {jobRoles.map((role, index) => {
                              const isSelected = selectedRoles.includes(role.id);
                              const count = employees.filter(e => e.jobRoleName === role.name).length;
                              return (
                                <motion.div
                                  key={role.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.03 }}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedRoles(selectedRoles.filter(id => id !== role.id));
                                    } else {
                                      setSelectedRoles([...selectedRoles, role.id]);
                                    }
                                  }}
                                  className={cn(
                                    "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all",
                                    isSelected
                                      ? "bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-300 shadow-lg shadow-violet-100"
                                      : "bg-white border border-slate-200 hover:border-violet-200 hover:shadow-md"
                                  )}
                                >
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                    isSelected ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-slate-100"
                                  )}>
                                    {isSelected ? (
                                      <Check className="w-5 h-5 text-white" />
                                    ) : (
                                      <Briefcase className="w-5 h-5 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-semibold text-sm text-slate-900 block truncate">{role.name}</span>
                                    <span className="text-xs text-slate-500">{count} employees</span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}

                      {/* Locations Selection */}
                      {targetType === "locations" && locations.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700">Select Locations</Label>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                              {selectedLocations.length} selected
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {locations.map((location, index) => {
                              const isSelected = selectedLocations.includes(location.id);
                              const count = employees.filter(e => e.locationName === location.name).length;
                              return (
                                <motion.div
                                  key={location.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.03 }}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedLocations(selectedLocations.filter(id => id !== location.id));
                                    } else {
                                      setSelectedLocations([...selectedLocations, location.id]);
                                    }
                                  }}
                                  className={cn(
                                    "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all",
                                    isSelected
                                      ? "bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 shadow-lg shadow-amber-100"
                                      : "bg-white border border-slate-200 hover:border-amber-200 hover:shadow-md"
                                  )}
                                >
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                    isSelected ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-slate-100"
                                  )}>
                                    {isSelected ? (
                                      <Check className="w-5 h-5 text-white" />
                                    ) : (
                                      <Globe className="w-5 h-5 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-semibold text-sm text-slate-900 block truncate">{location.name}</span>
                                    <span className="text-xs text-slate-500">{count} employees</span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}

                      {/* Individuals Selection */}
                      {targetType === "individuals" && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700">Select Employees</Label>
                            <div className="flex items-center gap-2">
                              {selectedEmployees.length > 0 && (
                                <button
                                  onClick={() => setSelectedEmployees([])}
                                  className="text-xs text-slate-500 hover:text-slate-700"
                                >
                                  Clear all
                                </button>
                              )}
                              <Badge variant="secondary" className="bg-pink-100 text-pink-700">
                                {selectedEmployees.length} selected
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              placeholder="Search by name or email..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white"
                            />
                          </div>
                          
                          <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                            {filteredEmployees.map((emp, index) => {
                              const isSelected = selectedEmployees.includes(emp.id);
                              return (
                                <motion.div
                                  key={emp.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: Math.min(index * 0.02, 0.3) }}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                                    } else {
                                      setSelectedEmployees([...selectedEmployees, emp.id]);
                                    }
                                  }}
                                  className={cn(
                                    "flex items-center gap-4 p-4 cursor-pointer transition-all border-b border-slate-100 last:border-0",
                                    isSelected ? "bg-pink-50" : "hover:bg-slate-50"
                                  )}
                                >
                                  <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all font-medium text-sm",
                                    isSelected 
                                      ? "bg-gradient-to-br from-pink-500 to-rose-600 text-white" 
                                      : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600"
                                  )}>
                                    {isSelected ? (
                                      <Check className="w-4 h-4" />
                                    ) : (
                                      `${emp.firstName?.[0] || '?'}${emp.lastName?.[0] || '?'}`
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-sm text-slate-900 block">
                                      {emp.firstName} {emp.lastName}
                                    </span>
                                    <span className="text-xs text-slate-500 truncate block">
                                      {emp.departmentName} • {emp.jobRoleName}
                                    </span>
                                  </div>
                                  <Checkbox checked={isSelected} className="pointer-events-none" />
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Selection Summary Chips */}
                    {targetType !== "all" && getSelectionSummary().length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {getSelectionSummary().map((name, i) => (
                          <Badge key={i} variant="secondary" className="bg-primary/10 text-primary px-3 py-1">
                            {name}
                          </Badge>
                        ))}
                        {targetType === "individuals" && selectedEmployees.length > 3 && (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 px-3 py-1">
                            +{selectedEmployees.length - 3} more
                          </Badge>
                        )}
                      </motion.div>
                    )}

                    {/* Exclude Employees Section */}
                    <div className="pt-4 border-t border-slate-200">
                      <button
                        onClick={() => setShowExcludePanel(!showExcludePanel)}
                        className="flex items-center gap-3 text-sm text-slate-600 hover:text-slate-900 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                          <UserX className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="font-medium">Exclude specific employees</span>
                        {excludedEmployees.length > 0 && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                            {excludedEmployees.length} excluded
                          </Badge>
                        )}
                        <ChevronRight className={cn(
                          "w-4 h-4 text-slate-400 transition-transform ml-auto",
                          showExcludePanel && "rotate-90"
                        )} />
                      </button>

                      <AnimatePresence>
                        {showExcludePanel && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 space-y-3 overflow-hidden"
                          >
                            <div className="relative">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input
                                placeholder="Search employees to exclude..."
                                value={excludedSearchTerm}
                                onChange={(e) => setExcludedSearchTerm(e.target.value)}
                                className="pl-11 h-11 bg-orange-50/50 border-orange-200 focus:bg-white"
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto rounded-xl border border-orange-200 bg-orange-50/30">
                              {filteredExcludedEmployees.map((emp) => {
                                const isExcluded = excludedEmployees.includes(emp.id);
                                return (
                                  <div
                                    key={emp.id}
                                    onClick={() => {
                                      if (isExcluded) {
                                        setExcludedEmployees(excludedEmployees.filter(id => id !== emp.id));
                                      } else {
                                        setExcludedEmployees([...excludedEmployees, emp.id]);
                                      }
                                    }}
                                    className={cn(
                                      "flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-orange-100 last:border-0",
                                      isExcluded ? "bg-orange-100/70" : "hover:bg-orange-100/40"
                                    )}
                                  >
                                    <Checkbox checked={isExcluded} className="pointer-events-none" />
                                    <div className="flex-1 min-w-0">
                                      <span className="font-medium text-sm text-slate-900">
                                        {emp.firstName} {emp.lastName}
                                      </span>
                                      <span className="text-xs text-slate-500 ml-2">
                                        {emp.departmentName}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Minimum Recipients Warning for Anonymous Surveys */}
                    {hasInsufficientRecipientsForAnonymous && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-amber-900">Minimum Recipients Required</h4>
                            <p className="text-sm text-amber-700 mt-1">
                              Anonymous surveys require at least <span className="font-bold">{MINIMUM_ANONYMOUS_RECIPIENTS} recipients</span> to ensure privacy. 
                              You currently have <span className="font-bold">{targetCount}</span> selected.
                            </p>
                            <p className="text-xs text-amber-600 mt-2">
                              This prevents individual responses from being identified in small groups.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Mobile Summary */}
                    <div className="sm:hidden">
                      <motion.div
                        layout
                        className="bg-gradient-to-r from-primary/10 via-purple-100/50 to-pink-100/30 rounded-2xl p-5 border border-primary/20"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
                            <Target className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <span className="text-2xl font-bold text-slate-900">{getTargetEmployeeCount()}</span>
                            <span className="text-slate-600 ml-2">recipients</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ===== STEP 3: REVIEW ===== */}
            {step === 3 && (
              <div className="space-y-6">
                {/* Review Header */}
                <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-br from-slate-50 via-white to-green-50/30 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Review & Launch</CardTitle>
                        <CardDescription className="mt-1">
                          Everything looks good? Let's send your survey!
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6 space-y-6">
                    {/* Summary Grid */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Survey Details Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 p-5 border border-slate-200 hover:shadow-lg transition-shadow"
                      >
                        <button 
                          onClick={() => setStep(1)}
                          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/80 border border-slate-200 flex items-center justify-center hover:bg-white">
                            <Edit3 className="w-4 h-4 text-slate-500" />
                          </div>
                        </button>
                        
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl">
                            {selectedTemplateMeta?.emoji ?? "📝"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Survey</p>
                            <h4 className="font-bold text-lg text-slate-900 mt-1 truncate">{surveyName}</h4>
                            <p className="text-sm text-slate-600 mt-1">{selectedTemplateData?.name}</p>
                          </div>
                        </div>
                        
                        {surveyDescription && (
                          <p className="text-sm text-slate-600 mt-4 pt-4 border-t border-slate-200/60 line-clamp-2">
                            {surveyDescription}
                          </p>
                        )}
                      </motion.div>

                      {/* Audience Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-purple-50 to-pink-50/30 p-5 border border-primary/20 hover:shadow-lg transition-shadow"
                      >
                        <button 
                          onClick={() => setStep(2)}
                          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/80 border border-primary/20 flex items-center justify-center hover:bg-white">
                            <Edit3 className="w-4 h-4 text-primary" />
                          </div>
                        </button>
                        
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center",
                            `bg-gradient-to-br ${currentTargeting?.gradient}`
                          )}>
                            {currentTargeting && <currentTargeting.icon className="w-7 h-7 text-white" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Audience</p>
                            <h4 className="font-bold text-lg text-slate-900 mt-1">
                              {targetType === "all" && "All Employees"}
                              {targetType === "departments" && `${selectedDepartments.length} Departments`}
                              {targetType === "roles" && `${selectedRoles.length} Job Roles`}
                              {targetType === "locations" && `${selectedLocations.length} Locations`}
                              {targetType === "individuals" && `${selectedEmployees.length} Individuals`}
                            </h4>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-primary/10 flex items-center justify-between">
                          <div>
                            <span className="text-3xl font-bold text-primary">{getTargetEmployeeCount()}</span>
                            <span className="text-slate-600 ml-2">recipients</span>
                          </div>
                          {excludedEmployees.length > 0 && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                              {excludedEmployees.length} excluded
                            </Badge>
                          )}
                        </div>
                      </motion.div>

                      {/* Privacy Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className={cn(
                          "relative overflow-hidden rounded-2xl p-5",
                          "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white"
                        )}
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              `bg-gradient-to-br ${currentAnonymization?.gradient}`
                            )}>
                              {currentAnonymization && <currentAnonymization.icon className="w-5 h-5 text-white" />}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Privacy Level</p>
                              <h4 className="font-bold text-lg mt-0.5">{currentAnonymization?.label}</h4>
                            </div>
                          </div>
                          <p className="text-sm text-slate-400">
                            {currentAnonymization?.description}
                          </p>
                        </div>
                      </motion.div>

                      {/* Deadline Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100/50 p-5 border border-amber-200"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <Calendar className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Deadline</p>
                          </div>
                        </div>
                        {deadline ? (
                          <div>
                            <h4 className="font-bold text-lg text-slate-900">
                              {new Date(deadline).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </h4>
                            <p className="text-sm text-amber-700 mt-1">
                              at {new Date(deadline).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <h4 className="font-bold text-lg text-slate-900">No deadline</h4>
                            <p className="text-sm text-amber-700 mt-1">Survey remains open indefinitely</p>
                          </div>
                        )}
                      </motion.div>
                    </div>

                    {/* Launch Banner */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 p-6 text-white"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),_transparent_50%)]" />
                      <div className="absolute -bottom-10 -right-10 opacity-10">
                        <Rocket className="w-48 h-48" />
                      </div>
                      
                      <div className="relative flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <PartyPopper className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-xl flex items-center gap-2">
                            Ready for Launch!
                            <Sparkles className="w-5 h-5 text-emerald-200 animate-pulse" />
                          </h4>
                          <p className="text-emerald-100 mt-1">
                            Recipients will see this survey as an action item in their dashboard
                          </p>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-emerald-200">
                          <MousePointerClick className="w-5 h-5" />
                          <span className="text-sm font-medium">Click to send</span>
                        </div>
                      </div>
                    </motion.div>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Footer */}
        <motion.div 
          layout
          className="mt-8 flex items-center justify-between"
        >
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : router.back()}
            className="h-12 px-6 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step > 1 ? "Previous" : "Back"}
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
              title={
                !canProceed && step === 2 && hasInsufficientRecipientsForAnonymous
                  ? `Anonymous surveys require at least ${MINIMUM_ANONYMOUS_RECIPIENTS} recipients`
                  : !canProceed && step === 2
                  ? "Please select recipients to continue"
                  : !canProceed && step === 1
                  ? "Please select a template and enter a survey name"
                  : undefined
              }
              className={cn(
                "h-12 px-8 text-white shadow-lg transition-all",
                canProceed
                  ? "bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 shadow-primary/30"
                  : "bg-slate-300 shadow-none cursor-not-allowed"
              )}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSendSurvey}
              disabled={loading}
              className="h-12 px-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Launch Survey
                </>
              )}
            </Button>
          )}
        </motion.div>
      </div>
    </PageShell>
  );
}

export default function SendSurveyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <SendSurveyPageContent />
    </Suspense>
  );
}
