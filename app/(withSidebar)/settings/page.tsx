"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  Calendar,
  Bell,
  ClipboardList,
  AlarmClock,
  FileText,
  FolderKanban,
  Repeat,
  Settings,
  Plane,
  UserPlus,
  Workflow,
  FileStack,
  Cog,
  Shield,
  Clock,
  AlertTriangle,
  Users,
  Share2,
  Sparkles,
  HelpCircle,
  Info,
  Lightbulb,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { QuickSetupHub } from "@/components/settings/QuickSetupHub";
import { ContextualHelpAssistant } from "@/components/settings/ContextualHelpAssistant";
import { SmartTooltip, QuickHelp } from "@/components/ui/SmartTooltip";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";

const holidaySettings = [
  {
    title: "Working Patterns",
    href: "/settings/working-patterns",
    icon: <Clock className="h-5 w-5 text-primary" />,
  },
  {
    title: "Public Holiday Templates",
    href: "/settings/public-holidays",
    icon: <Calendar className="h-5 w-5 text-primary" />,
  },
  {
    title: "Expiry Alerts",
    href: "/settings/expiry-alerts",
    icon: <AlertTriangle className="h-5 w-5 text-primary" />,
  },
  {
    title: "Event Rules",
    href: "/settings/event-rules",
    icon: <Shield className="h-5 w-5 text-primary" />,
  },
  {
    title: "Event Manager",
    href: "/settings/event-manager",
    icon: <Bell className="h-5 w-5 text-primary" />,
  },
  {
    title: "Leave Policies",
    href: "/settings/leave-policies",
    icon: <FileText className="h-5 w-5 text-primary" />,
  },
  {
    title: "Multi-stage Approvals",
    href: "/settings/multi-stage-approvals",
    icon: <Share2 className="h-5 w-5 text-primary" />,
  },
];

const formSettings = [
  {
    title: "Forms & Surveys",
    href: "/settings/forms",
    icon: <ClipboardList className="h-5 w-5 text-primary" />,
  },
];

const onboardingSettings = [
  {
    title: "Onboarding Templates",
    href: "/settings/onboarding",
    icon: <Users className="h-5 w-5 text-primary" />,
  },
];

const documentSettings = [
  {
    title: "Document Types",
    href: "/settings/document-types",
    icon: <FolderKanban className="h-5 w-5 text-primary" />,
  },
];

const workflowSettings = [
  {
    title: "Automation Rules",
    href: "/settings/automation-rules",
    icon: <Repeat className="h-5 w-5 text-primary" />,
  },
  {
    title: "Transactional Notifications",
    href: "/settings/workflows/notifications",
    icon: <Bell className="h-5 w-5 text-primary" />,
  },
];

function getSystemSettings(role?: string) {
  const base = [
    {
      title: "Platform Settings",
      href: "/settings/system",
      icon: <Cog className="h-5 w-5 text-primary" />,
    },
  ];
  // Intentionally removed global Permissions UI; per-employee settings take precedence
  return base;
}

function SettingSection({
  id,
  label,
  items,
  icon,
  description,
  completionStatus,
}: {
  id: string;
  label: string;
  items: { title: string; href: string; icon: React.ReactNode; helpPreset?: string }[];
  icon: React.ReactNode;
  description?: string;
  completionStatus?: { completed: number; total: number };
}) {
  const completionPercent = completionStatus 
    ? Math.round((completionStatus.completed / completionStatus.total) * 100)
    : 0;

  return (
    <AccordionItem
      value={id}
      className="border border-enhanced rounded-xl bg-card shadow-sm hover:shadow-md transition-all duration-200"
    >
      <AccordionTrigger className="px-6 py-5 hover:no-underline group">
        <div className="flex items-center gap-4 text-left w-full">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <div className="text-primary w-5 h-5">{icon}</div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                {label}
              </h3>
              {completionStatus && completionPercent < 100 && (
                <Badge variant="outline" className="text-xs">
                  {completionPercent}% configured
                </Badge>
              )}
              {completionStatus && completionPercent === 100 && (
                <Badge className="bg-green-100 text-green-800 text-xs">
                  ✓ Complete
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {items.map(({ title, href, icon, helpPreset }) => (
            <Card
              key={title}
              className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-enhanced"
            >
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-lg font-semibold text-foreground">
                    <div className="text-primary group-hover:scale-110 transition-transform">
                      {icon}
                    </div>
                    {title}
                  </div>
                  {helpPreset && (
                    <QuickHelp preset={helpPreset as any} />
                  )}
                </div>
                <Button asChild variant="outline" size="sm" className="mt-auto">
                  <Link
                    href={href}
                    className="flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Manage
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function SettingsIndexPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [activeTab, setActiveTab] = useState("quick-setup");
  const [completionData, setCompletionData] = useState<Record<string, { completed: number; total: number }>>({});
  const [showFirstTimeWelcome, setShowFirstTimeWelcome] = useState(false);

  useEffect(() => {
    // Check if this is the user's first time
    const hasVisitedSettings = localStorage.getItem("hasVisitedSettings");
    if (!hasVisitedSettings) {
      setShowFirstTimeWelcome(true);
      localStorage.setItem("hasVisitedSettings", "true");
    }

    // Load completion data
    const savedProgress = localStorage.getItem("settingsProgress");
    if (savedProgress) {
      setCompletionData(JSON.parse(savedProgress));
    } else {
      // Initialize with mock data - in production, this would come from the API
      setCompletionData({
        holidays: { completed: 2, total: 7 },
        onboarding: { completed: 0, total: 1 },
        documents: { completed: 0, total: 1 },
        workflows: { completed: 1, total: 2 },
        forms: { completed: 0, total: 1 },
        system: { completed: 1, total: 2 },
      });
    }
  }, []);

  // Add help presets to items
  const holidaySettingsWithHelp = holidaySettings.map(item => ({
    ...item,
    helpPreset:
      item.title === "Working Patterns" ? "workingPattern" :
      item.title === "Public Holiday Templates" ? "publicHolidays" :
      item.title === "Expiry Alerts" ? "expiryAlerts" :
      item.title === "Event Rules" ? "eventRules" :
      item.title === "Event Manager" ? "eventManager" :
      item.title === "Leave Policies" ? "leavePolicy" :
      item.title === "Multi-stage Approvals" ? "approvalWorkflow" : undefined
  }));

  const workflowSettingsWithHelp = workflowSettings.map(item => ({
    ...item,
    helpPreset:
      item.title === "Automation Rules" ? "automation" :
      item.title === "Transactional Notifications" ? "notifications" : undefined
  }));

  const onboardingSettingsWithHelp = onboardingSettings.map(item => ({
    ...item,
    helpPreset: item.title === "Onboarding Templates" ? "onboardingTemplates" : undefined
  }));

  const documentSettingsWithHelp = documentSettings.map(item => ({
    ...item,
    helpPreset: item.title === "Document Types" ? "documentTypes" : undefined
  }));

  return (
    <>
      <PageShell
        title="Settings"
        description="Configure and manage your HR system with guided setup wizards and intelligent assistance"
        icon={<Cog className="w-6 h-6" />}
        breadcrumbs={breadcrumbConfigs.settings}
        showHomeIcon={false}
        action={
          <div className="flex items-center gap-2">
            <SmartTooltip
              title="Need Help?"
              description="Our AI assistant can guide you through any configuration"
              tips={[
                "Click the chat bubble for instant help",
                "Use Quick Setup for guided wizards",
                "Hover over (?) icons for explanations"
              ]}
            >
              <Button variant="outline" size="sm">
                <HelpCircle className="h-4 w-4 mr-2" />
                Help Guide
              </Button>
            </SmartTooltip>
          </div>
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="quick-setup" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Quick Setup
            </TabsTrigger>
            <TabsTrigger value="all-settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              All Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick-setup" className="space-y-6">
            {showFirstTimeWelcome && (
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-full">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Welcome to HR Settings! 👋</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        We've created guided wizards to help you configure everything quickly and correctly.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFirstTimeWelcome(false)}
                  >
                    Dismiss
                  </Button>
                </CardContent>
              </Card>
            )}
            <QuickSetupHub 
              onWizardComplete={(wizardId) => {
                // Update completion data when a wizard is completed
                const category = wizardId.includes("leave") ? "holidays" :
                               wizardId.includes("onboarding") ? "onboarding" :
                               wizardId.includes("document") ? "documents" :
                               wizardId.includes("automation") ? "workflows" :
                               wizardId.includes("permissions") ? "system" : "forms";
                
                setCompletionData(prev => ({
                  ...prev,
                  [category]: {
                    ...prev[category],
                    completed: Math.min((prev[category]?.completed || 0) + 1, prev[category]?.total || 1)
                  }
                }));
              }}
            />
          </TabsContent>

          <TabsContent value="all-settings" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Configure advanced settings and fine-tune your HR system
              </p>
              <Badge variant="outline" className="text-xs">
                <Info className="h-3 w-3 mr-1" />
                Hover over settings for help
              </Badge>
            </div>
            
            <Accordion type="multiple" className="space-y-4" defaultValue={['holidays', 'system']}>
              <SettingSection
                id="holidays"
                label="Holidays & Absence"
                description="Manage leave policies, working patterns, and absence tracking"
                icon={<Plane className="w-5 h-5" />}
                items={holidaySettingsWithHelp}
                completionStatus={completionData.holidays}
              />
              <SettingSection
                id="onboarding"
                label="Onboarding"
                description="Configure employee onboarding templates and workflows"
                icon={<UserPlus className="w-5 h-5" />}
                items={onboardingSettingsWithHelp}
                completionStatus={completionData.onboarding}
              />
              <SettingSection
                id="documents"
                label="Documents"
                description="Set up document types and management policies"
                icon={<FileStack className="w-5 h-5" />}
                items={documentSettingsWithHelp}
                completionStatus={completionData.documents}
              />
              <SettingSection
                id="workflows"
                label="Workflows"
                description="Create and manage automated business processes"
                icon={<Workflow className="w-5 h-5" />}
                items={workflowSettingsWithHelp}
                completionStatus={completionData.workflows}
              />
              <SettingSection
                id="forms"
                label="Forms & Surveys"
                description="Design and deploy custom forms and employee surveys"
                icon={<ClipboardList className="w-5 h-5" />}
                items={formSettings}
                completionStatus={completionData.forms}
              />
              <SettingSection
                id="system"
                label="System"
                description="Core platform settings and administrative controls"
                icon={<Settings className="w-5 h-5" />}
                items={getSystemSettings(role)}
                completionStatus={completionData.system}
              />
            </Accordion>
          </TabsContent>
        </Tabs>
      </PageShell>

      {/* Contextual Help Assistant - Always Available */}
      <ContextualHelpAssistant 
        pageContext="/settings"
        userRole="hr"
      />
    </>
  );
}
