"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Repeat,
  Plus,
  Calendar,
  Users,
  Settings,
  Play,
  Pause,
  Trash2,
  Edit,
  Clock,
  CheckCircle,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  surveyTemplate: string;
  frequency: "weekly" | "monthly" | "quarterly" | "annually" | "custom";
  trigger: "onboarding_complete" | "anniversary" | "performance_review" | "scheduled";
  targetAudience: string;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  totalRuns: number;
}

export default function SurveyAutomationPage() {
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAutomations = async () => {
      try {
        // TODO: Replace with actual API call
        // const res = await fetch("/api/surveys/automation");
        
        // Mock data for now
        setAutomations([
          {
            id: "1",
            name: "Monthly Employee Satisfaction",
            description: "Send satisfaction survey to all employees on the 1st of each month",
            surveyTemplate: "Employee Satisfaction Survey",
            frequency: "monthly",
            trigger: "scheduled",
            targetAudience: "All employees",
            isActive: true,
            lastRun: "2024-01-01",
            nextRun: "2024-02-01",
            totalRuns: 12,
          },
          {
            id: "2",
            name: "90-Day New Hire Check-in",
            description: "Send onboarding feedback survey 90 days after start date",
            surveyTemplate: "Onboarding Experience Survey",
            frequency: "custom",
            trigger: "onboarding_complete",
            targetAudience: "New hires (90 days)",
            isActive: true,
            lastRun: "2024-01-15",
            nextRun: "2024-01-25",
            totalRuns: 8,
          },
          {
            id: "3",
            name: "Annual Performance Review",
            description: "Send performance feedback survey on work anniversary",
            surveyTemplate: "Performance Review Survey",
            frequency: "annually",
            trigger: "anniversary",
            targetAudience: "All employees",
            isActive: false,
            lastRun: "2023-12-15",
            nextRun: "2024-12-15",
            totalRuns: 1,
          },
        ]);
      } catch (error) {
        toast.error("Failed to load automation rules");
      } finally {
        setLoading(false);
      }
    };

    loadAutomations();
  }, []);

  const handleToggleAutomation = async (automationId: string, isActive: boolean) => {
    try {
      // TODO: Implement toggle automation API call
      setAutomations(prev => prev.map(auto => 
        auto.id === automationId ? { ...auto, isActive: !isActive } : auto
      ));
      toast.success(`Automation ${isActive ? 'paused' : 'activated'} successfully`);
    } catch (error) {
      toast.error("Failed to update automation");
    }
  };

  const handleDeleteAutomation = async (automationId: string) => {
    if (!confirm("Are you sure you want to delete this automation rule?")) return;
    
    try {
      // TODO: Implement delete automation API call
      setAutomations(prev => prev.filter(auto => auto.id !== automationId));
      toast.success("Automation rule deleted successfully");
    } catch (error) {
      toast.error("Failed to delete automation rule");
    }
  };

  const getFrequencyBadge = (frequency: string) => {
    const colors = {
      weekly: "bg-blue-100 text-blue-800",
      monthly: "bg-green-100 text-green-800",
      quarterly: "bg-purple-100 text-purple-800",
      annually: "bg-orange-100 text-orange-800",
      custom: "bg-gray-100 text-gray-800",
    };
    
    return (
      <Badge variant="secondary" className={colors[frequency as keyof typeof colors]}>
        {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
      </Badge>
    );
  };

  const getTriggerBadge = (trigger: string) => {
    const labels = {
      onboarding_complete: "Onboarding Complete",
      anniversary: "Work Anniversary",
      performance_review: "Performance Review",
      scheduled: "Scheduled",
    };
    
    return (
      <Badge variant="outline">
        {labels[trigger as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <PageShell
      title="Survey Automation"
      description="Set up recurring surveys and automated triggers"
      icon={<Repeat className="w-6 h-6" />}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Surveys", href: "/surveys" },
          { label: "Automation", isCurrentPage: true },
        ],
      }}
      action={
        <Button asChild variant="primary">
          <Link href="/surveys/automation/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Automation
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
              <Repeat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{automations.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {automations.filter(a => a.isActive).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {automations.reduce((sum, a) => sum + a.totalRuns, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Run</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {automations.filter(a => a.isActive && a.nextRun).length}
              </div>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
        </div>

        {/* Automation Rules */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Repeat className="h-8 w-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading automation rules...</p>
              </div>
            </CardContent>
          </Card>
        ) : automations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Repeat className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No automation rules
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Set up automated surveys to run on schedules, anniversaries, or other triggers. 
                This saves time and ensures consistent feedback collection.
              </p>
              <Button asChild variant="primary">
                <Link href="/surveys/automation/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Automation
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {automations.map((automation) => (
              <Card key={automation.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{automation.name}</CardTitle>
                        <Badge variant={automation.isActive ? "default" : "secondary"}>
                          {automation.isActive ? "Active" : "Paused"}
                        </Badge>
                        {getFrequencyBadge(automation.frequency)}
                        {getTriggerBadge(automation.trigger)}
                      </div>
                      
                      <CardDescription className="mb-4">
                        {automation.description}
                      </CardDescription>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Survey Template</div>
                          <div className="font-medium">{automation.surveyTemplate}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Target Audience</div>
                          <div className="font-medium">{automation.targetAudience}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Last Run</div>
                          <div className="font-medium">
                            {automation.lastRun 
                              ? new Date(automation.lastRun).toLocaleDateString()
                              : "Never"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Next Run</div>
                          <div className="font-medium">
                            {automation.nextRun 
                              ? new Date(automation.nextRun).toLocaleDateString()
                              : "Not scheduled"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Total runs: {automation.totalRuns}</span>
                        {automation.isActive && automation.nextRun && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Next: {new Date(automation.nextRun).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleAutomation(automation.id, automation.isActive)}
                      >
                        {automation.isActive ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Activate
                          </>
                        )}
                      </Button>
                      
                      <DropdownMenu
                        trigger={
                          <Button variant="outline" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem asChild>
                          <Link href={`/surveys/automation/${automation.id}/edit`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Rule
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteAutomation(automation.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Start Guide */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Quick Start Guide</CardTitle>
            <CardDescription className="text-blue-700">
              Common automation patterns to get you started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded-lg border border-blue-200">
                <h4 className="font-semibold text-sm mb-2">Monthly Satisfaction</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Send satisfaction surveys to all employees monthly
                </p>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/surveys/automation/new?template=monthly-satisfaction">
                    <Calendar className="w-3 h-3 mr-1" />
                    Create
                  </Link>
                </Button>
              </div>

              <div className="p-3 bg-white rounded-lg border border-blue-200">
                <h4 className="font-semibold text-sm mb-2">New Hire Check-in</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Send onboarding surveys 90 days after start date
                </p>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/surveys/automation/new?template=new-hire-checkin">
                    <Users className="w-3 h-3 mr-1" />
                    Create
                  </Link>
                </Button>
              </div>

              <div className="p-3 bg-white rounded-lg border border-blue-200">
                <h4 className="font-semibold text-sm mb-2">Anniversary Reviews</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Send performance surveys on work anniversaries
                </p>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/surveys/automation/new?template=anniversary-review">
                    <Clock className="w-3 h-3 mr-1" />
                    Create
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
