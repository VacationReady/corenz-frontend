"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/Badge";
import { 
  Calendar, 
  Users, 
  FileText, 
  Shield, 
  Workflow, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  Sparkles,
  Target,
  Zap,
  TrendingUp,
  Award,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SmartTooltip } from "@/components/ui/SmartTooltip";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SetupWizard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  estimatedTime: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  progress: number;
  steps: {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    action?: () => void;
  }[];
  benefits: string[];
  prerequisites?: string[];
}

interface QuickSetupHubProps {
  companySize?: "small" | "medium" | "large";
  industry?: string;
  onWizardComplete?: (wizardId: string) => void;
}

export function QuickSetupHub({ 
  companySize = "medium", 
  industry = "general",
  onWizardComplete 
}: QuickSetupHubProps) {
  const router = useRouter();
  const [wizards, setWizards] = useState<SetupWizard[]>([]);
  const [selectedWizard, setSelectedWizard] = useState<SetupWizard | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showAllWizards, setShowAllWizards] = useState(false);

  useEffect(() => {
    // Load wizard completion status from localStorage
    const savedProgress = localStorage.getItem("setupWizardProgress");
    const progress = savedProgress ? JSON.parse(savedProgress) : {};

    const initialWizards: SetupWizard[] = [
      {
        id: "basic-leave",
        title: "Set Up Basic Leave Policy",
        description: "Configure annual leave entitlements and accrual rules in minutes",
        icon: <Calendar className="h-5 w-5" />,
        estimatedTime: "5 min",
        difficulty: "beginner",
        category: "Leave Management",
        priority: "high",
        completed: progress["basic-leave"] || false,
        progress: progress["basic-leave-progress"] || 0,
        steps: [
          {
            id: "select-types",
            title: "Select Leave Types",
            description: "Choose which types of leave your company offers",
            completed: false,
          },
          {
            id: "set-accrual",
            title: "Set Accrual Rates",
            description: "Define how employees earn leave over time",
            completed: false,
          },
          {
            id: "configure-approval",
            title: "Configure Approval Process",
            description: "Set up who approves leave requests",
            completed: false,
          },
        ],
        benefits: [
          "Automated leave calculations",
          "Clear employee entitlements",
          "Reduced HR queries by 60%"
        ],
      },
      {
        id: "document-expiry",
        title: "Configure Document Expiry Alerts",
        description: "Never miss important document renewals with automated reminders",
        icon: <FileText className="h-5 w-5" />,
        estimatedTime: "3 min",
        difficulty: "beginner",
        category: "Compliance",
        priority: "high",
        completed: progress["document-expiry"] || false,
        progress: progress["document-expiry-progress"] || 0,
        steps: [
          {
            id: "select-documents",
            title: "Select Document Types",
            description: "Choose which documents to track",
            completed: false,
          },
          {
            id: "set-reminders",
            title: "Set Reminder Timing",
            description: "Configure when to send alerts",
            completed: false,
          },
          {
            id: "choose-recipients",
            title: "Choose Recipients",
            description: "Select who gets notified",
            completed: false,
          },
        ],
        benefits: [
          "100% compliance tracking",
          "Automated reminder system",
          "Prevent legal issues"
        ],
      },
      {
        id: "onboarding-template",
        title: "Create First Onboarding Template",
        description: "Streamline new employee onboarding with a reusable template",
        icon: <Users className="h-5 w-5" />,
        estimatedTime: "10 min",
        difficulty: "intermediate",
        category: "Onboarding",
        priority: "medium",
        completed: progress["onboarding-template"] || false,
        progress: progress["onboarding-template-progress"] || 0,
        steps: [
          {
            id: "define-steps",
            title: "Define Onboarding Steps",
            description: "List tasks for new employees",
            completed: false,
          },
          {
            id: "assign-owners",
            title: "Assign Task Owners",
            description: "Specify who's responsible for each step",
            completed: false,
          },
          {
            id: "set-timeline",
            title: "Set Timeline",
            description: "Define deadlines for each task",
            completed: false,
          },
          {
            id: "add-resources",
            title: "Add Resources",
            description: "Attach documents and forms",
            completed: false,
          },
        ],
        benefits: [
          "50% faster onboarding",
          "Consistent experience",
          "Nothing falls through cracks"
        ],
        prerequisites: ["basic-leave"],
      },
      {
        id: "automation-rule",
        title: "Build Your First Automation",
        description: "Automate a repetitive HR task to save hours every week",
        icon: <Workflow className="h-5 w-5" />,
        estimatedTime: "7 min",
        difficulty: "intermediate",
        category: "Automation",
        priority: "medium",
        completed: progress["automation-rule"] || false,
        progress: progress["automation-rule-progress"] || 0,
        steps: [
          {
            id: "choose-trigger",
            title: "Choose a Trigger",
            description: "Select what starts the automation",
            completed: false,
          },
          {
            id: "add-conditions",
            title: "Add Conditions (Optional)",
            description: "Set rules for when to run",
            completed: false,
          },
          {
            id: "configure-actions",
            title: "Configure Actions",
            description: "Define what happens automatically",
            completed: false,
          },
          {
            id: "test-automation",
            title: "Test Automation",
            description: "Run a test to ensure it works",
            completed: false,
          },
        ],
        benefits: [
          "Save 5+ hours per week",
          "Eliminate manual errors",
          "Instant notifications"
        ],
      },
      {
        id: "permissions",
        title: "Set Up Role Permissions",
        description: "Control who can access and modify different parts of the system",
        icon: <Shield className="h-5 w-5" />,
        estimatedTime: "8 min",
        difficulty: "advanced",
        category: "Security",
        priority: "low",
        completed: progress["permissions"] || false,
        progress: progress["permissions-progress"] || 0,
        steps: [
          {
            id: "define-roles",
            title: "Define User Roles",
            description: "Create role hierarchy",
            completed: false,
          },
          {
            id: "set-permissions",
            title: "Set Permissions",
            description: "Configure access levels",
            completed: false,
          },
          {
            id: "assign-users",
            title: "Assign Users",
            description: "Map employees to roles",
            completed: false,
          },
        ],
        benefits: [
          "Enhanced security",
          "Clear access control",
          "Audit compliance"
        ],
        prerequisites: ["basic-leave", "document-expiry"],
      },
    ];

    setWizards(initialWizards);
  }, []);

  const completedCount = wizards.filter(w => w.completed).length;
  const totalProgress = Math.round((completedCount / wizards.length) * 100);

  const priorityWizards = wizards
    .filter(w => !w.completed && w.priority === "high")
    .slice(0, 3);

  const handleStartWizard = (wizard: SetupWizard) => {
    setSelectedWizard(wizard);
    setCurrentStep(0);
    
    // Navigate to appropriate settings page based on wizard
    const routes: Record<string, string> = {
      "basic-leave": "/settings/leave-policies",
      "document-expiry": "/settings/expiry-alerts",
      "onboarding-template": "/settings/onboarding",
      "automation-rule": "/settings/automation-rules",
      "permissions": "/settings/permissions",
    };

    if (routes[wizard.id]) {
      // Store wizard context for the target page
      sessionStorage.setItem("activeWizard", JSON.stringify({
        wizardId: wizard.id,
        currentStep: 0,
        steps: wizard.steps,
      }));
      
      router.push(routes[wizard.id]);
      toast.success(`Starting ${wizard.title}`, {
        description: "Follow the guided steps to complete setup",
      });
    }
  };

  const handleCompleteWizard = (wizardId: string) => {
    const updatedWizards = wizards.map(w => 
      w.id === wizardId ? { ...w, completed: true, progress: 100 } : w
    );
    setWizards(updatedWizards);

    // Save progress to localStorage
    const progress = updatedWizards.reduce((acc, w) => ({
      ...acc,
      [w.id]: w.completed,
      [`${w.id}-progress`]: w.progress,
    }), {});
    localStorage.setItem("setupWizardProgress", JSON.stringify(progress));

    onWizardComplete?.(wizardId);
    toast.success("Setup completed! 🎉", {
      description: "You've successfully configured this feature.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-600" />
                HR Quick Setup Hub
              </CardTitle>
              <CardDescription className="text-base">
                Get your HR system configured in minutes with guided wizards
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{totalProgress}%</div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={totalProgress} className="h-2" />
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">{completedCount} Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm">{wizards.length - completedCount} Remaining</span>
              </div>
            </div>
            {completedCount === wizards.length && (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <Award className="h-3 w-3 mr-1" />
                All Setup Complete!
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Priority Wizards */}
      {priorityWizards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Recommended Next Steps
            </h3>
            <SmartTooltip
              title="Smart Recommendations"
              description="Based on your company size and industry, these are the most impactful configurations to complete first."
              tips={[
                "Complete high-priority items first",
                "Each wizard saves significant time",
                "You can always come back later"
              ]}
            >
              <Badge variant="outline" className="cursor-help">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Recommended
              </Badge>
            </SmartTooltip>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {priorityWizards.map((wizard) => (
              <Card 
                key={wizard.id} 
                className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/50"
                onClick={() => handleStartWizard(wizard)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "p-2 rounded-lg",
                      wizard.priority === "high" ? "bg-red-100 dark:bg-red-950/20" :
                      wizard.priority === "medium" ? "bg-orange-100 dark:bg-orange-950/20" :
                      "bg-blue-100 dark:bg-blue-950/20"
                    )}>
                      {wizard.icon}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {wizard.estimatedTime}
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-3">{wizard.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {wizard.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Benefits */}
                    <div className="space-y-1">
                      {wizard.benefits.slice(0, 2).map((benefit, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <Button className="w-full" size="sm">
                      <Zap className="h-4 w-4 mr-2" />
                      Start Setup
                      <ArrowRight className="h-4 w-4 ml-auto" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Wizards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">All Setup Wizards</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllWizards(!showAllWizards)}
          >
            {showAllWizards ? "Show Less" : "Show All"}
            <ChevronRight className={cn(
              "h-4 w-4 ml-2 transition-transform",
              showAllWizards && "rotate-90"
            )} />
          </Button>
        </div>

        {showAllWizards && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wizards.map((wizard) => (
              <Card 
                key={wizard.id}
                className={cn(
                  "transition-all duration-200",
                  wizard.completed ? "opacity-60" : "hover:shadow-md cursor-pointer"
                )}
                onClick={() => !wizard.completed && handleStartWizard(wizard)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        {wizard.icon}
                      </div>
                      <div>
                        <CardTitle className="text-base">{wizard.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {wizard.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {wizard.estimatedTime}
                          </span>
                        </div>
                      </div>
                    </div>
                    {wizard.completed && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {wizard.description}
                  </p>
                  {wizard.progress > 0 && wizard.progress < 100 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>Progress</span>
                        <span>{wizard.progress}%</span>
                      </div>
                      <Progress value={wizard.progress} className="h-1" />
                    </div>
                  )}
                  {!wizard.completed && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                    >
                      {wizard.progress > 0 ? "Continue Setup" : "Start Setup"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Achievement Banner */}
      {completedCount >= 3 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold">Great Progress!</p>
                <p className="text-sm text-muted-foreground">
                  You've completed {completedCount} configurations. Your HR system is {totalProgress}% optimized.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              View Report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
