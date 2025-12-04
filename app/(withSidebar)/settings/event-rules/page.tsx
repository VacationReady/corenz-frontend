"use client";

import React, { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "@/hooks/use-toast";
import {
  Settings,
  TestTube,
  Calendar as CalendarIcon,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Clock,
  HelpCircle,
  Plus,
  Trash2,
  Edit,
  Check,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";

interface EventCategory {
  id: string;
  name: string;
  color?: string;
}

interface EventRule {
  id?: string;
  eventCategoryId: string;
  eventCategory?: EventCategory;
  enforceEntitlement: boolean;
  noticePeriodDays: number;
  maxConcurrent: number | null;
  maxBookingLength?: number | null;
  maxCarryoverDays?: number | null;
  carryoverExpiryMonths?: number | null;
  maxConcurrentMode: "HARD_BLOCK" | "SOFT_GATE";
  maxBookingLengthMode: "HARD_BLOCK" | "SOFT_GATE";
  notes?: string;
  // Rolling maximum days limit (e.g., max 5 days compassionate leave over 12 months)
  maxDaysPerPeriod?: number | null;
  periodMonths?: number | null;
}

interface TestScenario {
  type: string;
  title: string;
  description: string;
  result: "BLOCKED" | "REQUIRES_APPROVAL" | "ALLOWED" | "DEPENDS_ON_BALANCE";
  mode: "HARD_BLOCK" | "SOFT_GATE";
  message: string;
}

interface BlackoutDay {
  id: string;
  date: string;
  allEvents: boolean;
  eventCategoryIds: string[];
}

interface EventRuleOverride {
  id?: string;
  eventCategoryId: string;
  departmentId?: string;
  teamId?: string;
  enforceEntitlement?: boolean;
  noticePeriodDays?: number;
  maxConcurrent?: number;
  maxBookingLength?: number;
  maxConcurrentMode?: "HARD_BLOCK" | "SOFT_GATE";
  maxBookingLengthMode?: "HARD_BLOCK" | "SOFT_GATE";
  staffingDensityEnabled: boolean;
  staffingDensityThreshold?: number;
  staffingDensityBehavior: "DENY" | "REQUIRE_APPROVAL";
  escalationApproverId?: string; // Who provides additional approval
  escalationApproverType?: "USER" | "MANAGER_OF_MANAGER" | "HR_ADMIN";
}

interface Department {
  id: string;
  name: string;
}

export default function EventRulesPage() {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [rules, setRules] = useState<Record<string, EventRule>>({});
  const [blackoutDays, setBlackoutDays] = useState<BlackoutDay[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [overrides, setOverrides] = useState<EventRuleOverride[]>([]);
  const [loading, setLoading] = useState(false);
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<any>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [blackoutDialogOpen, setBlackoutDialogOpen] = useState(false);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [testEmployee, setTestEmployee] = useState<string>("ALL_EMPLOYEES");
  const [testDate, setTestDate] = useState<Date>(new Date());
  const [employeeComboboxOpen, setEmployeeComboboxOpen] = useState(false);
  const [newBlackoutDate, setNewBlackoutDate] = useState<Date>(new Date());
  const [newBlackoutCategories, setNewBlackoutCategories] = useState<string[]>(
    [],
  );
  const [allEventsBlackout, setAllEventsBlackout] = useState(false);
  const [currentOverride, setCurrentOverride] = useState<EventRuleOverride>({
    eventCategoryId: "",
    staffingDensityEnabled: false,
    staffingDensityBehavior: "DENY",
    escalationApproverType: "MANAGER_OF_MANAGER",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, ruleRes, blackoutRes, empRes, deptRes, overrideRes] =
        await Promise.all([
          fetch("/api/event-categories"),
          fetch("/api/event-rules"),
          fetch("/api/blackout-days/get"),
          fetch("/api/employees?limit=100"),
          fetch("/api/departments"),
          fetch("/api/event-rule-overrides"),
        ]);

      const catDataRaw = await catRes.json();
      const ruleData: EventRule[] = await ruleRes.json();
      const blackoutData: BlackoutDay[] = await blackoutRes.json();
      const empData = await empRes.json();
      const deptData = await deptRes.json();
      const overrideDataRaw = await overrideRes.json();
      
      // Filter out any null/undefined entries from API responses
      const catData: EventCategory[] = (Array.isArray(catDataRaw) ? catDataRaw : []).filter((c): c is EventCategory => c != null && typeof c.id === 'string' && typeof c.name === 'string');
      const overrideData: EventRuleOverride[] = (Array.isArray(overrideDataRaw) ? overrideDataRaw : []).filter((o): o is EventRuleOverride => o != null && typeof o.eventCategoryId === 'string');

      console.log("Employee API Response:", empData);
      console.log("Employees array:", empData.data || empData.employees || empData);

      const merged: Record<string, EventRule> = {};
      const openState: Record<string, boolean> = {};

      catData.forEach((cat) => {
        const existingRule = ruleData.find((r) => r.eventCategoryId === cat.id);
        merged[cat.id] = existingRule || {
          eventCategoryId: cat.id,
          eventCategory: cat,
          enforceEntitlement: true,
          noticePeriodDays: 0,
          maxConcurrent: null,
          maxBookingLength: 14,
          maxDaysPerPeriod: null,
          periodMonths: null,
          maxCarryoverDays: null,
          carryoverExpiryMonths: null,
          maxConcurrentMode: "HARD_BLOCK",
          maxBookingLengthMode: "HARD_BLOCK",
          notes: "",
        };
        openState[cat.id] = false;
      });

      // Handle multiple response formats:
      // 1. { data: [...] } - paginated response
      // 2. { employees: [...] } - legacy format
      // 3. [...] - direct array
      const employeeList = Array.isArray(empData) 
        ? empData 
        : (empData.data || empData.employees || []);
      console.log("Setting employees:", employeeList);

      setCategories(catData);
      setRules(merged);
      setBlackoutDays(blackoutData);
      setEmployees(employeeList);
      setDepartments(deptData);
      setOverrides(overrideData);
      setOpenCards(openState);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    }
  };

  const updateRule = (
    categoryId: string,
    field: keyof EventRule,
    value: any,
  ) => {
    setRules((prev) => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], [field]: value },
    }));
  };

  const saveRule = async (categoryId: string) => {
    setLoading(true);
    try {
      const rule = rules[categoryId];
      const response = await fetch("/api/event-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rule,
          companyId: "default-company-id", // This should come from session
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Event rule saved successfully",
        });
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save rule",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runTestScenario = async () => {
    if (!selectedCategory) {
      toast({
        title: "Error",
        description: "Please select an event category",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/event-rules/test-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCategoryId: selectedCategory,
          employeeId: testEmployee && testEmployee !== "ALL_EMPLOYEES" ? testEmployee : undefined,
          testDate: testDate.toISOString(),
        }),
      });

      if (response.ok) {
        const results = await response.json();
        setTestResults(results);
      } else {
        toast({
          title: "Error",
          description: "Failed to run test scenario",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const addBlackoutDay = async () => {
    try {
      const response = await fetch("/api/blackout-days/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newBlackoutDate.toISOString(),
          allEvents: allEventsBlackout,
          eventCategoryIds: allEventsBlackout ? [] : newBlackoutCategories,
          companyId: "default-company-id", // This should come from session
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Blackout day added successfully",
        });
        setBlackoutDialogOpen(false);
        setNewBlackoutCategories([]);
        setAllEventsBlackout(false);
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to add blackout day",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const removeBlackoutDay = async (blackoutId: string) => {
    try {
      const response = await fetch("/api/blackout-days/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: blackoutId }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Blackout day removed successfully",
        });
        fetchData();
      } else {
        toast({
          title: "Error",
          description: "Failed to remove blackout day",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case "BLOCKED":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "REQUIRES_APPROVAL":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "ALLOWED":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <HelpCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case "BLOCKED":
        return "bg-red-50 border-red-200";
      case "REQUIRES_APPROVAL":
        return "bg-orange-50 border-orange-200";
      case "ALLOWED":
        return "bg-green-50 border-green-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const saveOverride = async () => {
    console.log("Current override state:", currentOverride);
    
    // Validate required fields
    if (!currentOverride.eventCategoryId) {
      toast({
        title: "Validation Error",
        description: "Please select an event category",
        variant: "destructive",
      });
      return;
    }

    // Validate staffing density fields if enabled
    if (currentOverride.staffingDensityEnabled) {
      if (!currentOverride.staffingDensityThreshold || currentOverride.staffingDensityThreshold <= 0) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid density threshold (1-100%)",
          variant: "destructive",
        });
        return;
      }

      // If require approval with specific user, must select a user
      if (currentOverride.staffingDensityBehavior === "REQUIRE_APPROVAL" && 
          currentOverride.escalationApproverType === "USER" && 
          !currentOverride.escalationApproverId) {
        toast({
          title: "Validation Error",
          description: "Please select a specific approver or choose a different escalation type",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const method = currentOverride.id ? "PUT" : "POST";
      const url = currentOverride.id
        ? `/api/event-rule-overrides/${currentOverride.id}`
        : "/api/event-rule-overrides";

      // Prepare the data - remove undefined departmentId if it's the sentinel value
      const dataToSend = {
        eventCategoryId: currentOverride.eventCategoryId,
        staffingDensityEnabled: currentOverride.staffingDensityEnabled,
        staffingDensityBehavior: currentOverride.staffingDensityBehavior,
        // Optional fields - only include if defined
        ...(currentOverride.departmentId && currentOverride.departmentId !== "COMPANY_WIDE" && {
          departmentId: currentOverride.departmentId,
        }),
        ...(currentOverride.teamId && { teamId: currentOverride.teamId }),
        ...(currentOverride.staffingDensityThreshold !== undefined && {
          staffingDensityThreshold: currentOverride.staffingDensityThreshold,
        }),
        ...(currentOverride.escalationApproverType && {
          escalationApproverType: currentOverride.escalationApproverType,
        }),
        ...(currentOverride.escalationApproverId && {
          escalationApproverId: currentOverride.escalationApproverId,
        }),
        ...(currentOverride.enforceEntitlement !== undefined && {
          enforceEntitlement: currentOverride.enforceEntitlement,
        }),
        ...(currentOverride.noticePeriodDays !== undefined && {
          noticePeriodDays: currentOverride.noticePeriodDays,
        }),
        ...(currentOverride.maxConcurrent !== undefined && {
          maxConcurrent: currentOverride.maxConcurrent,
        }),
        ...(currentOverride.maxBookingLength !== undefined && {
          maxBookingLength: currentOverride.maxBookingLength,
        }),
        ...(currentOverride.maxConcurrentMode && {
          maxConcurrentMode: currentOverride.maxConcurrentMode,
        }),
        ...(currentOverride.maxBookingLengthMode && {
          maxBookingLengthMode: currentOverride.maxBookingLengthMode,
        }),
      };

      console.log("Sending override data:", dataToSend);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Override ${currentOverride.id ? "updated" : "created"} successfully`,
        });
        setOverrideDialogOpen(false);
        resetOverrideForm();
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || error.details?.fieldErrors?.eventCategoryId?.[0] || "Failed to save override",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Save override error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteOverride = async (overrideId: string) => {
    if (!confirm("Are you sure you want to delete this override?")) return;

    try {
      const response = await fetch(`/api/event-rule-overrides/${overrideId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Override deleted successfully",
        });
        fetchData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete override",
        variant: "destructive",
      });
    }
  };

  const openCreateOverrideDialog = () => {
    resetOverrideForm();
    setOverrideDialogOpen(true);
  };

  const openEditOverrideDialog = (override: EventRuleOverride) => {
    setCurrentOverride(override);
    setOverrideDialogOpen(true);
  };

  const resetOverrideForm = () => {
    setCurrentOverride({
      eventCategoryId: "",
      staffingDensityEnabled: false,
      staffingDensityBehavior: "DENY",
      escalationApproverType: "MANAGER_OF_MANAGER",
    });
  };

  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return "Company-wide";
    const dept = departments.find((d) => d.id === departmentId);
    return dept?.name || "Unknown Department";
  };

  return (
    <PageShell
      title="Event Rules"
      description="Configure booking constraints, notice periods, and enforcement modes for leave types"
      breadcrumbs={breadcrumbConfigs.settingsSection('Event Rules')}
      showHomeIcon={false}
    >
      <div className="flex justify-end gap-2 mb-4">
          <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <TestTube className="w-4 h-4 mr-2" />
                Test Scenario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Test Scenario Panel</DialogTitle>
                <DialogDescription>
                  Simulate employee/department/date scenarios to see computed
                  values and enforcement behavior
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <Label>Event Category *</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Employee (Optional) {employees.length > 0 && <span className="text-xs text-muted-foreground">({employees.length} available)</span>}</Label>
                  <Popover open={employeeComboboxOpen} onOpenChange={setEmployeeComboboxOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-left text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <span className="truncate">
                          {(() => {
                            if (testEmployee === "ALL_EMPLOYEES") return "All employees";
                            const selectedEmp = employees.find(emp => emp.id === testEmployee);
                            if (!selectedEmp) return "Select employee";
                            const firstName = selectedEmp.user?.firstName || selectedEmp.User?.firstName || '';
                            const lastName = selectedEmp.user?.lastName || selectedEmp.User?.lastName || '';
                            const fullName = `${firstName} ${lastName}`.trim();
                            return fullName || `Employee ${selectedEmp.id}`;
                          })()}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search employees..." />
                        <CommandList>
                          <CommandEmpty>
                            {employees.length === 0 
                              ? "No employees loaded. Check console for errors."
                              : "No employees found matching your search."}
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              key="all-employees"
                              value="All employees"
                              onSelect={() => {
                                setTestEmployee("ALL_EMPLOYEES");
                                setEmployeeComboboxOpen(false);
                              }}
                            >
                              <span>All employees</span>
                              {testEmployee === "ALL_EMPLOYEES" && <Check className="ml-auto h-4 w-4" />}
                            </CommandItem>
                            {employees.map((emp) => {
                              // Handle both lowercase 'user' and uppercase 'User' from API
                              const firstName = emp.user?.firstName || emp.User?.firstName || '';
                              const lastName = emp.user?.lastName || emp.User?.lastName || '';
                              const fullName = `${firstName} ${lastName}`.trim();
                              return (
                                <CommandItem
                                  key={emp.id}
                                  value={fullName}
                                  onSelect={() => {
                                    setTestEmployee(emp.id);
                                    setEmployeeComboboxOpen(false);
                                  }}
                                >
                                  <span>{fullName || `Employee ${emp.id}`}</span>
                                  {testEmployee === emp.id && <Check className="ml-auto h-4 w-4" />}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Test Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(testDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={testDate}
                        onSelect={(date) => date && setTestDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button onClick={runTestScenario} className="mb-6">
                <TestTube className="w-4 h-4 mr-2" />
                Run Simulation
              </Button>

              {testResults && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-blue-600">
                          {testResults.summary.totalRules}
                        </div>
                        <div className="text-sm text-blue-700">Total Rules</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50 border-red-200">
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-red-600">
                          {testResults.summary.hardBlocks}
                        </div>
                        <div className="text-sm text-red-700">Hard Blocks</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-orange-50 border-orange-200">
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-orange-600">
                          {testResults.summary.softGates}
                        </div>
                        <div className="text-sm text-orange-700">
                          Soft Gates
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {testResults.scenarios.map(
                    (scenario: TestScenario, index: number) => (
                      <Card
                        key={index}
                        className={getResultColor(scenario.result)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3 mb-2">
                            {getResultIcon(scenario.result)}
                            <div className="font-semibold">
                              {scenario.title}
                            </div>
                            <Badge
                              variant={
                                scenario.mode === "HARD_BLOCK"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {scenario.mode}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {scenario.description}
                          </div>
                          <div className="text-sm">{scenario.message}</div>
                        </CardContent>
                      </Card>
                    ),
                  )}

                  {testResults.blackoutDays.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          Upcoming Blackout Days
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {testResults.blackoutDays.map(
                            (blackout: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center justify-between text-sm"
                              >
                                <span>
                                  {format(new Date(blackout.date), "PPP")}
                                </span>
                                <Badge
                                  variant={
                                    blackout.allEvents
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {blackout.allEvents
                                    ? "All Events"
                                    : "Specific Categories"}
                                </Badge>
                              </div>
                            ),
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog
            open={blackoutDialogOpen}
            onOpenChange={setBlackoutDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Manage Blackouts
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Blackout Days Management</DialogTitle>
                <DialogDescription>
                  Add and manage blackout dates that prevent leave bookings
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="add" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="add">Add Blackout</TabsTrigger>
                  <TabsTrigger value="list">Current Blackouts</TabsTrigger>
                </TabsList>

                <TabsContent value="add" className="space-y-4">
                  <div>
                    <Label>Blackout Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(newBlackoutDate, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newBlackoutDate}
                          onSelect={(date) => date && setNewBlackoutDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={allEventsBlackout}
                      onChange={setAllEventsBlackout}
                    />
                    <Label>Block all event types</Label>
                  </div>

                  {!allEventsBlackout && (
                    <div>
                      <Label>Select Event Categories</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {categories.map((cat) => (
                          <div
                            key={cat.id}
                            className="flex items-center space-x-2"
                          >
                            <input
                              type="checkbox"
                              id={`cat-${cat.id}`}
                              checked={newBlackoutCategories.includes(cat.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewBlackoutCategories([
                                    ...newBlackoutCategories,
                                    cat.id,
                                  ]);
                                } else {
                                  setNewBlackoutCategories(
                                    newBlackoutCategories.filter(
                                      (id) => id !== cat.id,
                                    ),
                                  );
                                }
                              }}
                            />
                            <Label
                              htmlFor={`cat-${cat.id}`}
                              className="text-sm"
                            >
                              {cat.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={addBlackoutDay} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Blackout Day
                  </Button>
                </TabsContent>

                <TabsContent value="list" className="space-y-4">
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {blackoutDays.map((blackout) => (
                      <Card key={blackout.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                {format(new Date(blackout.date), "PPP")}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {blackout.allEvents
                                  ? "All events blocked"
                                  : `${blackout.eventCategoryIds.length} categories blocked`}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeBlackoutDay(blackout.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {blackoutDays.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No blackout days configured
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rules">Event Rules</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {categories.map((category) => {
            const rule = rules[category.id];
            const isOpen = openCards[category.id];

            return (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color || "#6b7280" }}
                      />
                      <div>
                        <CardTitle>{category.name}</CardTitle>
                        <CardDescription>
                          Notice: {rule.noticePeriodDays} days • Max Length:{" "}
                          {rule.maxBookingLength || "Unlimited"} days • Max
                          Concurrent: {rule.maxConcurrent || "Unlimited"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          rule.enforceEntitlement ? "default" : "secondary"
                        }
                      >
                        {rule.enforceEntitlement ? "Enforced" : "Not Enforced"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setOpenCards((prev) => ({
                            ...prev,
                            [category.id]: !prev[category.id],
                          }))
                        }
                      >
                        <Settings className="w-4 h-4" />
                        {isOpen ? "Close" : "Configure"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isOpen && (
                  <CardContent>
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="basic">Basic Rules</TabsTrigger>
                        <TabsTrigger value="enforcement">
                          Enforcement
                        </TabsTrigger>
                        <TabsTrigger value="carryover">Carryover</TabsTrigger>
                      </TabsList>

                      <TabsContent value="basic" className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor={`notice-${category.id}`}>
                              Notice Period (days)
                            </Label>
                            <Input
                              id={`notice-${category.id}`}
                              type="number"
                              min="0"
                              value={rule.noticePeriodDays}
                              onChange={(e) =>
                                updateRule(
                                  category.id,
                                  "noticePeriodDays",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor={`maxBooking-${category.id}`}>
                              Max Booking Length (days)
                            </Label>
                            <Input
                              id={`maxBooking-${category.id}`}
                              type="number"
                              min="1"
                              value={rule.maxBookingLength || ""}
                              onChange={(e) =>
                                updateRule(
                                  category.id,
                                  "maxBookingLength",
                                  parseInt(e.target.value) || null,
                                )
                              }
                              placeholder="Unlimited"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`maxConcurrent-${category.id}`}>
                              Max Concurrent Bookings
                            </Label>
                            <Input
                              id={`maxConcurrent-${category.id}`}
                              type="number"
                              min="1"
                              value={rule.maxConcurrent || ""}
                              onChange={(e) =>
                                updateRule(
                                  category.id,
                                  "maxConcurrent",
                                  parseInt(e.target.value) || null,
                                )
                              }
                              placeholder="Unlimited"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={rule.enforceEntitlement}
                            onChange={(checked) =>
                              updateRule(
                                category.id,
                                "enforceEntitlement",
                                checked,
                              )
                            }
                          />
                          <Label>Enforce Entitlement</Label>
                        </div>

                        {/* Rolling Maximum Days Limit - for non-entitlement tracked leave */}
                        <div className="mt-6 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Rolling Maximum Days Limit
                          </h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Set a maximum number of days that can be booked over a rolling period. 
                            Useful for leave types like Compassionate Leave (e.g., max 5 days over 12 months).
                            Leave both fields empty for no limit.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`maxDaysPerPeriod-${category.id}`}>
                                Max Days Allowed
                              </Label>
                              <Input
                                id={`maxDaysPerPeriod-${category.id}`}
                                type="number"
                                min="1"
                                value={rule.maxDaysPerPeriod || ""}
                                onChange={(e) =>
                                  updateRule(
                                    category.id,
                                    "maxDaysPerPeriod",
                                    parseInt(e.target.value) || null,
                                  )
                                }
                                placeholder="No limit"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`periodMonths-${category.id}`}>
                                Over Period (months)
                              </Label>
                              <Input
                                id={`periodMonths-${category.id}`}
                                type="number"
                                min="1"
                                value={rule.periodMonths || ""}
                                onChange={(e) =>
                                  updateRule(
                                    category.id,
                                    "periodMonths",
                                    parseInt(e.target.value) || null,
                                  )
                                }
                                placeholder="e.g., 12"
                              />
                            </div>
                          </div>
                          {rule.maxDaysPerPeriod && rule.periodMonths && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                              <div className="text-sm text-blue-800">
                                <strong>Current Setting:</strong> Maximum {rule.maxDaysPerPeriod} day(s) of {category.name} allowed per rolling {rule.periodMonths} month period.
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="enforcement"
                        className="space-y-4 mt-4"
                      >
                        <div className="space-y-6">
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              Enforcement Modes
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label>Max Concurrent Mode</Label>
                                <Select
                                  value={rule.maxConcurrentMode}
                                  onValueChange={(
                                    value: "HARD_BLOCK" | "SOFT_GATE",
                                  ) =>
                                    updateRule(
                                      category.id,
                                      "maxConcurrentMode",
                                      value,
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="HARD_BLOCK">
                                      Hard Block (Deny)
                                    </SelectItem>
                                    <SelectItem value="SOFT_GATE">
                                      Soft Gate (Require Approval)
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Max Booking Length Mode</Label>
                                <Select
                                  value={rule.maxBookingLengthMode}
                                  onValueChange={(
                                    value: "HARD_BLOCK" | "SOFT_GATE",
                                  ) =>
                                    updateRule(
                                      category.id,
                                      "maxBookingLengthMode",
                                      value,
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="HARD_BLOCK">
                                      Hard Block (Deny)
                                    </SelectItem>
                                    <SelectItem value="SOFT_GATE">
                                      Soft Gate (Require Approval)
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                              <div className="text-sm text-blue-800">
                                <strong>Hard Block:</strong> Completely prevents
                                the action
                                <br />
                                <strong>Soft Gate:</strong> Allows the action
                                but requires additional approval
                              </div>
                            </div>
                          </div>

                          <div>
                            <Label htmlFor={`notes-${category.id}`}>
                              Notes & Help Text
                            </Label>
                            <Textarea
                              id={`notes-${category.id}`}
                              value={rule.notes || ""}
                              onChange={(e) =>
                                updateRule(category.id, "notes", e.target.value)
                              }
                              placeholder="Optional notes or help text for this event category"
                              rows={3}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="carryover" className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`maxCarryover-${category.id}`}>
                              Max Carryover Days
                            </Label>
                            <Input
                              id={`maxCarryover-${category.id}`}
                              type="number"
                              min="0"
                              value={rule.maxCarryoverDays || ""}
                              onChange={(e) =>
                                updateRule(
                                  category.id,
                                  "maxCarryoverDays",
                                  parseInt(e.target.value) || null,
                                )
                              }
                              placeholder="Unlimited"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`carryoverExpiry-${category.id}`}>
                              Carryover Expiry (months)
                            </Label>
                            <Input
                              id={`carryoverExpiry-${category.id}`}
                              type="number"
                              min="1"
                              value={rule.carryoverExpiryMonths || ""}
                              onChange={(e) =>
                                updateRule(
                                  category.id,
                                  "carryoverExpiryMonths",
                                  parseInt(e.target.value) || null,
                                )
                              }
                              placeholder="Never expires"
                            />
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Configure how unused leave from previous periods can
                          be carried over. Leave blank for no carryover
                          restrictions.
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end pt-4 border-t mt-6">
                      <Button
                        onClick={() => saveRule(category.id)}
                        disabled={loading}
                      >
                        {loading ? "Saving..." : "Save Rule"}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="overrides" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Rule Overrides</h3>
              <p className="text-muted-foreground">
                Create department-specific overrides for notice periods, booking limits, enforcement modes, and staffing density
              </p>
            </div>
            <Button onClick={() => openCreateOverrideDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Override
            </Button>
          </div>

          {overrides.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="text-lg font-semibold mb-2">
                    No overrides configured
                  </h4>
                  <p className="text-muted-foreground mb-4">
                    Create department-specific overrides to customize notice periods, 
                    booking limits, enforcement modes, and staffing density
                  </p>
                  <Button onClick={() => openCreateOverrideDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Override
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {overrides.map((override) => {
                if (!override || !override.eventCategoryId) return null;
                const category = categories.find(
                  (c) => c && c.id === override.eventCategoryId,
                );
                return (
                  <Card key={override.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{
                              backgroundColor: category?.color || "#6b7280",
                            }}
                          />
                          <div>
                            <CardTitle>
                              {category?.name} -{" "}
                              {getDepartmentName(override.departmentId)}
                            </CardTitle>
                            <CardDescription>
                              {override.staffingDensityEnabled && (
                                <div className="space-y-1">
                                  <span className="text-orange-600">
                                    Staffing density:{" "}
                                    {(
                                      override.staffingDensityThreshold! * 100
                                    ).toFixed(0)}
                                    % - {override.staffingDensityBehavior === "DENY" ? "Hard Block" : "Require Approval"}
                                  </span>
                                  {override.staffingDensityBehavior === "REQUIRE_APPROVAL" && override.escalationApproverType && (
                                    <div className="text-xs text-muted-foreground">
                                      Escalates to: {
                                        override.escalationApproverType === "MANAGER_OF_MANAGER" ? "Manager's Manager" :
                                        override.escalationApproverType === "HR_ADMIN" ? "HR/Admin" :
                                        "Specific User"
                                      }
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditOverrideDialog(override)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteOverride(override.id!)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Notice Period:</span>{" "}
                            <span className={override.noticePeriodDays !== undefined ? "text-blue-600 font-semibold" : ""}>
                              {override.noticePeriodDays !== undefined
                                ? `${override.noticePeriodDays} days`
                                : "Inherited"}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Max Concurrent:</span>{" "}
                            <span className={override.maxConcurrent !== undefined ? "text-blue-600 font-semibold" : ""}>
                              {override.maxConcurrent !== undefined
                                ? override.maxConcurrent
                                : "Inherited"}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Max Length:</span>{" "}
                            <span className={override.maxBookingLength !== undefined ? "text-blue-600 font-semibold" : ""}>
                              {override.maxBookingLength !== undefined
                                ? `${override.maxBookingLength} days`
                                : "Inherited"}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Enforcement:</span>{" "}
                            <span className={override.enforceEntitlement !== undefined ? "text-blue-600 font-semibold" : ""}>
                              {override.enforceEntitlement !== undefined
                                ? override.enforceEntitlement
                                  ? "Yes"
                                  : "No"
                                : "Inherited"}
                            </span>
                          </div>
                        </div>
                        {(override.maxConcurrentMode || override.maxBookingLengthMode) && (
                          <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
                            {override.maxConcurrentMode && (
                              <div>
                                <span className="font-medium text-muted-foreground">Concurrent Mode:</span>{" "}
                                <Badge variant={override.maxConcurrentMode === "HARD_BLOCK" ? "destructive" : "secondary"}>
                                  {override.maxConcurrentMode === "HARD_BLOCK" ? "Hard Block" : "Soft Gate"}
                                </Badge>
                              </div>
                            )}
                            {override.maxBookingLengthMode && (
                              <div>
                                <span className="font-medium text-muted-foreground">Length Mode:</span>{" "}
                                <Badge variant={override.maxBookingLengthMode === "HARD_BLOCK" ? "destructive" : "secondary"}>
                                  {override.maxBookingLengthMode === "HARD_BLOCK" ? "Hard Block" : "Soft Gate"}
                                </Badge>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Override Dialog */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {currentOverride.id ? "Edit" : "Create"} Rule Override
            </DialogTitle>
            <DialogDescription>
              Override base event rules for specific departments. Leave fields blank to inherit from the base rule, 
              or set values to customize for this department.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-red-600">Event Category *</Label>
                <Select
                  value={currentOverride.eventCategoryId || undefined}
                  onValueChange={(value) => {
                    console.log("Selected category ID:", value);
                    setCurrentOverride({
                      ...currentOverride,
                      eventCategoryId: value,
                    });
                  }}
                >
                  <SelectTrigger className={!currentOverride.eventCategoryId ? "border-red-300" : ""}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No categories available
                      </div>
                    ) : (
                      categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {!currentOverride.eventCategoryId && (
                  <p className="text-xs text-red-600 mt-1">
                    Event category is required
                  </p>
                )}
              </div>
              <div>
                <Label>Department</Label>
                <Select
                  value={currentOverride.departmentId || "COMPANY_WIDE"}
                  onValueChange={(value) =>
                    setCurrentOverride({
                      ...currentOverride,
                      departmentId: value === "COMPANY_WIDE" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Company-wide (no department)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPANY_WIDE">Company-wide</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {currentOverride.eventCategoryId && rules[currentOverride.eventCategoryId] && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm text-blue-800">
                  <strong>Base Rule:</strong> Notice: {rules[currentOverride.eventCategoryId].noticePeriodDays} days • 
                  Max Concurrent: {rules[currentOverride.eventCategoryId].maxConcurrent || "Unlimited"} • 
                  Max Length: {rules[currentOverride.eventCategoryId].maxBookingLength || "Unlimited"} days
                  <br />
                  <span className="text-xs">Override values below to customize for this department</span>
                </div>
              </div>
            )}

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Overrides</TabsTrigger>
                <TabsTrigger value="enforcement">Enforcement</TabsTrigger>
                <TabsTrigger value="density">Staffing Density</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Notice Period (days)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={currentOverride.noticePeriodDays ?? ""}
                      onChange={(e) =>
                        setCurrentOverride({
                          ...currentOverride,
                          noticePeriodDays: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      placeholder="Inherited"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave blank to inherit from base rule
                    </p>
                  </div>
                  <div>
                    <Label>Max Concurrent Bookings</Label>
                    <Input
                      type="number"
                      min="1"
                      value={currentOverride.maxConcurrent ?? ""}
                      onChange={(e) =>
                        setCurrentOverride({
                          ...currentOverride,
                          maxConcurrent: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      placeholder="Inherited"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave blank to inherit from base rule
                    </p>
                  </div>
                  <div>
                    <Label>Max Booking Length (days)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={currentOverride.maxBookingLength ?? ""}
                      onChange={(e) =>
                        setCurrentOverride({
                          ...currentOverride,
                          maxBookingLength: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      placeholder="Inherited"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave blank to inherit from base rule
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="override-enforcement"
                    checked={currentOverride.enforceEntitlement !== undefined}
                    onChange={(e) =>
                      setCurrentOverride({
                        ...currentOverride,
                        enforceEntitlement: e.target.checked ? true : undefined,
                      })
                    }
                  />
                  <Label htmlFor="override-enforcement" className="cursor-pointer">
                    Override entitlement enforcement
                  </Label>
                </div>
                {currentOverride.enforceEntitlement !== undefined && (
                  <div className="ml-6">
                    <Switch
                      checked={currentOverride.enforceEntitlement}
                      onChange={(checked) =>
                        setCurrentOverride({
                          ...currentOverride,
                          enforceEntitlement: checked,
                        })
                      }
                    />
                    <Label className="ml-2">Enforce Entitlement</Label>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="enforcement" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Max Concurrent Mode</Label>
                    <Select
                      value={currentOverride.maxConcurrentMode || "INHERIT"}
                      onValueChange={(value) =>
                        setCurrentOverride({
                          ...currentOverride,
                          maxConcurrentMode: value === "INHERIT" ? undefined : value as "HARD_BLOCK" | "SOFT_GATE",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INHERIT">Inherit from base rule</SelectItem>
                        <SelectItem value="HARD_BLOCK">Hard Block (Deny)</SelectItem>
                        <SelectItem value="SOFT_GATE">Soft Gate (Require Approval)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Max Booking Length Mode</Label>
                    <Select
                      value={currentOverride.maxBookingLengthMode || "INHERIT"}
                      onValueChange={(value) =>
                        setCurrentOverride({
                          ...currentOverride,
                          maxBookingLengthMode: value === "INHERIT" ? undefined : value as "HARD_BLOCK" | "SOFT_GATE",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INHERIT">Inherit from base rule</SelectItem>
                        <SelectItem value="HARD_BLOCK">Hard Block (Deny)</SelectItem>
                        <SelectItem value="SOFT_GATE">Soft Gate (Require Approval)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm text-blue-800">
                    <strong>Hard Block:</strong> Completely prevents the action
                    <br />
                    <strong>Soft Gate:</strong> Allows the action but requires additional approval
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="density" className="space-y-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentOverride.staffingDensityEnabled}
                    onChange={(checked) =>
                      setCurrentOverride({
                        ...currentOverride,
                        staffingDensityEnabled: checked,
                      })
                    }
                  />
                  <Label>Enable staffing density constraints</Label>
                </div>

                {currentOverride.staffingDensityEnabled && (
                  <div className="space-y-4">
                    <div>
                      <Label>Density Threshold (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={
                          currentOverride.staffingDensityThreshold !== undefined
                            ? currentOverride.staffingDensityThreshold * 100
                            : ""
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          setCurrentOverride({
                            ...currentOverride,
                            staffingDensityThreshold:
                              value === "" ? undefined : parseInt(value) / 100,
                          });
                        }}
                        placeholder="30"
                      />
                      <div className="text-sm text-muted-foreground mt-1">
                        Maximum percentage of employees that can be absent
                        simultaneously
                      </div>
                    </div>
                    <div>
                      <Label>Behavior when threshold exceeded</Label>
                      <Select
                        value={currentOverride.staffingDensityBehavior}
                        onValueChange={(value: "DENY" | "REQUIRE_APPROVAL") =>
                          setCurrentOverride({
                            ...currentOverride,
                            staffingDensityBehavior: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DENY">
                            Deny request (Hard Block)
                          </SelectItem>
                          <SelectItem value="REQUIRE_APPROVAL">
                            Require additional approval
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {currentOverride.staffingDensityBehavior === "REQUIRE_APPROVAL" && (
                      <div className="space-y-4 border-l-4 border-orange-300 pl-4 bg-orange-50 p-4 rounded">
                        <div className="flex items-center gap-2 text-orange-800">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-semibold">Who approves when density threshold is exceeded?</span>
                        </div>
                        
                        <div>
                          <Label>Escalation Approver Type</Label>
                          <Select
                            value={currentOverride.escalationApproverType || "MANAGER_OF_MANAGER"}
                            onValueChange={(value: "USER" | "MANAGER_OF_MANAGER" | "HR_ADMIN") =>
                              setCurrentOverride({
                                ...currentOverride,
                                escalationApproverType: value,
                                // Clear user selection if switching away from USER type
                                escalationApproverId: value === "USER" ? currentOverride.escalationApproverId : undefined,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MANAGER_OF_MANAGER">
                                Manager's Manager (auto-escalate)
                              </SelectItem>
                              <SelectItem value="HR_ADMIN">
                                HR/Admin (any admin user)
                              </SelectItem>
                              <SelectItem value="USER">
                                Specific User
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            {currentOverride.escalationApproverType === "MANAGER_OF_MANAGER" && 
                              "Automatically routes to the employee's manager's manager"}
                            {currentOverride.escalationApproverType === "HR_ADMIN" && 
                              "Routes to any user with Admin role"}
                            {currentOverride.escalationApproverType === "USER" && 
                              "Routes to a specific user you select below"}
                          </p>
                        </div>

                        {currentOverride.escalationApproverType === "USER" && (
                          <div>
                            <Label className="text-red-600">Select Specific Approver *</Label>
                            <Select
                              value={currentOverride.escalationApproverId || undefined}
                              onValueChange={(value) =>
                                setCurrentOverride({
                                  ...currentOverride,
                                  escalationApproverId: value,
                                })
                              }
                            >
                              <SelectTrigger className={!currentOverride.escalationApproverId ? "border-red-300" : ""}>
                                <SelectValue placeholder="Select an approver" />
                              </SelectTrigger>
                              <SelectContent>
                                {employees
                                  .filter(emp => emp.user?.role === "ADMIN" || emp.user?.role === "MANAGER")
                                  .map((emp) => (
                                    <SelectItem key={emp.id} value={emp.user?.id || ""}>
                                      {emp.user?.firstName} {emp.user?.lastName} ({emp.user?.role})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            {!currentOverride.escalationApproverId && (
                              <p className="text-xs text-red-600 mt-1">
                                You must select a specific approver
                              </p>
                            )}
                          </div>
                        )}

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="text-sm text-blue-800">
                            <strong>How it works:</strong> Normal leave requests follow the standard approval flow (employee → manager). 
                            When density threshold is exceeded, an additional approval stage is added with your selected escalation approver.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setOverrideDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={saveOverride}
                disabled={!currentOverride.eventCategoryId || loading}
                className={!currentOverride.eventCategoryId ? "opacity-50 cursor-not-allowed" : ""}
              >
                {loading ? "Saving..." : currentOverride.id ? "Update Override" : "Create Override"}
              </Button>
            </div>
            {!currentOverride.eventCategoryId && (
              <p className="text-xs text-muted-foreground text-center -mt-2">
                Please select an event category to continue
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
