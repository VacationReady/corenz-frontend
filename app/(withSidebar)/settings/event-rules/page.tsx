"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Trash2
} from "lucide-react";
import { format } from "date-fns";

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
  const [testEmployee, setTestEmployee] = useState<string>("");
  const [testDate, setTestDate] = useState<Date>(new Date());
  const [newBlackoutDate, setNewBlackoutDate] = useState<Date>(new Date());
  const [newBlackoutCategories, setNewBlackoutCategories] = useState<string[]>([]);
  const [allEventsBlackout, setAllEventsBlackout] = useState(false);
  const [currentOverride, setCurrentOverride] = useState<EventRuleOverride>({
    eventCategoryId: '',
    staffingDensityEnabled: false,
    staffingDensityBehavior: 'DENY'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, ruleRes, blackoutRes, empRes, deptRes, overrideRes] = await Promise.all([
        fetch("/api/event-categories"),
        fetch("/api/event-rules"),
        fetch("/api/blackout-days/get"),
        fetch("/api/employees?limit=100"),
        fetch("/api/departments"),
        fetch("/api/event-rule-overrides")
      ]);
      
      const catData: EventCategory[] = await catRes.json();
      const ruleData: EventRule[] = await ruleRes.json();
      const blackoutData: BlackoutDay[] = await blackoutRes.json();
      const empData = await empRes.json();
      const deptData = await deptRes.json();
      const overrideData: EventRuleOverride[] = await overrideRes.json();

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
          maxCarryoverDays: null,
          carryoverExpiryMonths: null,
          maxConcurrentMode: "HARD_BLOCK",
          maxBookingLengthMode: "HARD_BLOCK",
          notes: ""
        };
        openState[cat.id] = false;
      });

      setCategories(catData);
      setRules(merged);
      setBlackoutDays(blackoutData);
      setEmployees(empData.employees || []);
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

  const updateRule = (categoryId: string, field: keyof EventRule, value: any) => {
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
          employeeId: testEmployee || undefined,
          testDate: testDate.toISOString()
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
          companyId: "default-company-id" // This should come from session
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
    try {
      const method = currentOverride.id ? 'PUT' : 'POST';
      const url = currentOverride.id ? `/api/event-rule-overrides/${currentOverride.id}` : '/api/event-rule-overrides';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentOverride)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Override ${currentOverride.id ? 'updated' : 'created'} successfully`,
        });
        setOverrideDialogOpen(false);
        resetOverrideForm();
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save override",
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

  const deleteOverride = async (overrideId: string) => {
    if (!confirm('Are you sure you want to delete this override?')) return;

    try {
      const response = await fetch(`/api/event-rule-overrides/${overrideId}`, {
        method: 'DELETE'
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
      eventCategoryId: '',
      staffingDensityEnabled: false,
      staffingDensityBehavior: 'DENY'
    });
  };

  const getOverridesForCategory = (categoryId: string) => {
    return overrides.filter(o => o.eventCategoryId === categoryId);
  };

  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return 'Company-wide';
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'Unknown Department';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Event Rules</h1>
          <p className="text-muted-foreground">
            Configure booking constraints, notice periods, and enforcement modes for leave types
          </p>
        </div>
        <div className="flex gap-2">
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
                  Simulate employee/department/date scenarios to see computed values and enforcement behavior
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <Label>Event Category *</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
                  <Label>Employee (Optional)</Label>
                  <Select value={testEmployee} onValueChange={setTestEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All employees</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.user?.firstName} {emp.user?.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Test Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
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
                        <div className="text-sm text-orange-700">Soft Gates</div>
                      </CardContent>
                    </Card>
                  </div>

                  {testResults.scenarios.map((scenario: TestScenario, index: number) => (
                    <Card key={index} className={getResultColor(scenario.result)}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3 mb-2">
                          {getResultIcon(scenario.result)}
                          <div className="font-semibold">{scenario.title}</div>
                          <Badge variant={scenario.mode === "HARD_BLOCK" ? "destructive" : "secondary"}>
                            {scenario.mode}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {scenario.description}
                        </div>
                        <div className="text-sm">{scenario.message}</div>
                      </CardContent>
                    </Card>
                  ))}

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
                          {testResults.blackoutDays.map((blackout: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span>{format(new Date(blackout.date), "PPP")}</span>
                              <Badge variant={blackout.allEvents ? "destructive" : "secondary"}>
                                {blackout.allEvents ? "All Events" : "Specific Categories"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={blackoutDialogOpen} onOpenChange={setBlackoutDialogOpen}>
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
                        <Button variant="outline" className="w-full justify-start">
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
                          <div key={cat.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`cat-${cat.id}`}
                              checked={newBlackoutCategories.includes(cat.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewBlackoutCategories([...newBlackoutCategories, cat.id]);
                                } else {
                                  setNewBlackoutCategories(newBlackoutCategories.filter(id => id !== cat.id));
                                }
                              }}
                            />
                            <Label htmlFor={`cat-${cat.id}`} className="text-sm">
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
                                {blackout.allEvents ? "All events blocked" : `${blackout.eventCategoryIds.length} categories blocked`}
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
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules">Event Rules</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
          <TabsTrigger value="density">Staffing Density</TabsTrigger>
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
                        Notice: {rule.noticePeriodDays} days • 
                        Max Length: {rule.maxBookingLength || "Unlimited"} days • 
                        Max Concurrent: {rule.maxConcurrent || "Unlimited"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={rule.enforceEntitlement ? "default" : "secondary"}>
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
                      <TabsTrigger value="enforcement">Enforcement</TabsTrigger>
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
                                parseInt(e.target.value) || 0
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
                                parseInt(e.target.value) || null
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
                                parseInt(e.target.value) || null
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
                            updateRule(category.id, "enforceEntitlement", checked)
                          }
                        />
                        <Label>
                          Enforce Entitlement
                        </Label>
                      </div>
                    </TabsContent>

                    <TabsContent value="enforcement" className="space-y-4 mt-4">
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
                                onValueChange={(value: "HARD_BLOCK" | "SOFT_GATE") =>
                                  updateRule(category.id, "maxConcurrentMode", value)
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
                                onValueChange={(value: "HARD_BLOCK" | "SOFT_GATE") =>
                                  updateRule(category.id, "maxBookingLengthMode", value)
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
                              <strong>Hard Block:</strong> Completely prevents the action<br/>
                              <strong>Soft Gate:</strong> Allows the action but requires additional approval
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
                                parseInt(e.target.value) || null
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
                                parseInt(e.target.value) || null
                              )
                            }
                            placeholder="Never expires"
                          />
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Configure how unused leave from previous periods can be carried over.
                        Leave blank for no carryover restrictions.
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
                Create department-specific overrides that inherit and modify base rules
              </p>
            </div>
            <Button onClick={openCreateOverrideDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Create Override
            </Button>
          </div>

          {overrides.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="text-lg font-semibold mb-2">No overrides configured</h4>
                  <p className="text-muted-foreground mb-4">
                    Create department-specific rule overrides to customize behavior
                  </p>
                  <Button onClick={openCreateOverrideDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Override
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {overrides.map((override) => {
                const category = categories.find(c => c.id === override.eventCategoryId);
                return (
                  <Card key={override.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category?.color || "#6b7280" }}
                          />
                          <div>
                            <CardTitle>{category?.name} - {getDepartmentName(override.departmentId)}</CardTitle>
                            <CardDescription>
                              {override.staffingDensityEnabled && (
                                <span className="text-orange-600">
                                  Staffing density: {(override.staffingDensityThreshold! * 100).toFixed(0)}% - {override.staffingDensityBehavior}
                                </span>
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
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Notice Period:</span>{' '}
                          {override.noticePeriodDays !== undefined ? `${override.noticePeriodDays} days` : 'Inherited'}
                        </div>
                        <div>
                          <span className="font-medium">Max Concurrent:</span>{' '}
                          {override.maxConcurrent !== undefined ? override.maxConcurrent : 'Inherited'}
                        </div>
                        <div>
                          <span className="font-medium">Max Length:</span>{' '}
                          {override.maxBookingLength !== undefined ? `${override.maxBookingLength} days` : 'Inherited'}
                        </div>
                        <div>
                          <span className="font-medium">Enforcement:</span>{' '}
                          {override.enforceEntitlement !== undefined ? (override.enforceEntitlement ? 'Yes' : 'No') : 'Inherited'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="density" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Staffing Density Constraints</h3>
            <p className="text-muted-foreground">
              Configure staffing density thresholds to prevent too many employees from being absent simultaneously
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                How Staffing Density Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Hierarchical Resolution</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Company-wide rules apply to all employees</li>
                      <li>• Department overrides apply to department members</li>
                      <li>• Team overrides apply to team members (highest priority)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Density Calculation</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Percentage of employees absent on the same day</li>
                      <li>• Includes approved leave requests</li>
                      <li>• Configurable threshold per event category</li>
                    </ul>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm text-blue-800">
                    <strong>Example:</strong> If your development team has 10 people and you set a 30% density threshold,
                    no more than 3 developers can be on leave simultaneously. The 4th request would be denied or require approval.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {categories.map((category) => {
              const categoryOverrides = getOverridesForCategory(category.id);
              const hasStaffingDensity = categoryOverrides.some(o => o.staffingDensityEnabled);
              
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
                            {hasStaffingDensity ? 'Has staffing density constraints' : 'No density constraints'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={hasStaffingDensity ? "default" : "secondary"}>
                        {hasStaffingDensity ? 'Configured' : 'Not Configured'}
                      </Badge>
                    </div>
                  </CardHeader>
                  {hasStaffingDensity && (
                    <CardContent>
                      <div className="space-y-2">
                        {categoryOverrides
                          .filter(o => o.staffingDensityEnabled)
                          .map((override) => (
                            <div key={override.id} className="flex items-center justify-between p-3 border rounded">
                              <div>
                                <span className="font-medium">{getDepartmentName(override.departmentId)}</span>
                                <span className="text-muted-foreground ml-2">
                                  {(override.staffingDensityThreshold! * 100).toFixed(0)}% threshold
                                </span>
                              </div>
                              <Badge variant={override.staffingDensityBehavior === 'DENY' ? 'destructive' : 'secondary'}>
                                {override.staffingDensityBehavior === 'DENY' ? 'Hard Block' : 'Require Approval'}
                              </Badge>
                            </div>
                          ))
                        }
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Override Dialog */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {currentOverride.id ? 'Edit' : 'Create'} Rule Override
            </DialogTitle>
            <DialogDescription>
              Create department-specific overrides that inherit and modify base event rules
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Category *</Label>
                <Select
                  value={currentOverride.eventCategoryId}
                  onValueChange={(value) => setCurrentOverride({ ...currentOverride, eventCategoryId: value })}
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
                <Label>Department</Label>
                <Select
                  value={currentOverride.departmentId || ''}
                  onValueChange={(value) => setCurrentOverride({ ...currentOverride, departmentId: value || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Company-wide (no department)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Company-wide</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={currentOverride.staffingDensityEnabled}
                onChange={(checked) => setCurrentOverride({ ...currentOverride, staffingDensityEnabled: checked })}
              />
              <Label>Enable staffing density constraints</Label>
            </div>

            {currentOverride.staffingDensityEnabled && (
              <div className="space-y-4">
                <div>
                  <Label>Density Threshold (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={(currentOverride.staffingDensityThreshold || 0) * 100}
                    onChange={(e) => setCurrentOverride({
                      ...currentOverride,
                      staffingDensityThreshold: parseInt(e.target.value) / 100
                    })}
                    placeholder="30"
                  />
                  <div className="text-sm text-muted-foreground mt-1">
                    Maximum percentage of employees that can be absent simultaneously
                  </div>
                </div>
                <div>
                  <Label>Behavior when threshold exceeded</Label>
                  <Select
                    value={currentOverride.staffingDensityBehavior}
                    onValueChange={(value: "DENY" | "REQUIRE_APPROVAL") => 
                      setCurrentOverride({ ...currentOverride, staffingDensityBehavior: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DENY">Deny request (Hard Block)</SelectItem>
                      <SelectItem value="REQUIRE_APPROVAL">Require additional approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={saveOverride}
                disabled={!currentOverride.eventCategoryId}
              >
                {currentOverride.id ? 'Update' : 'Create'} Override
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}