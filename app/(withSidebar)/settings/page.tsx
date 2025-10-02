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
import {
  Calendar,
  Bell,
  ClipboardList,
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
  HelpCircle,
  Info,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ContextualHelpAssistant } from "@/components/settings/ContextualHelpAssistant";
import { SmartTooltip, QuickHelp } from "@/components/ui/SmartTooltip";
import { Badge } from "@/components/ui/Badge";
import { useSession } from "next-auth/react";

const holidaySettings = [
  {
    title: "Working Patterns",
    href: "/settings/working-patterns",
    icon: <Clock className="h-5 w-5" />,
    description: "Define schedules and contracted hours for every team",
  },
  {
    title: "Public Holiday Templates",
    href: "/settings/public-holidays",
    icon: <Calendar className="h-5 w-5" />,
    description: "Sync region-specific statutory holidays automatically",
  },
  {
    title: "Expiry Alerts",
    href: "/settings/expiry-alerts",
    icon: <AlertTriangle className="h-5 w-5" />,
    description: "Automate reminders before important dates lapse",
  },
  {
    title: "Event Rules",
    href: "/settings/event-rules",
    icon: <Shield className="h-5 w-5" />,
    description: "Configure triggers that keep people informed",
  },
  {
    title: "Event Manager",
    href: "/settings/event-manager",
    icon: <Bell className="h-5 w-5" />,
    description: "Orchestrate notifications for key company events",
  },
  {
    title: "Leave Policies",
    href: "/settings/leave-policies",
    icon: <FileText className="h-5 w-5" />,
    description: "Control entitlements, carryover rules, and approvals",
  },
  {
    title: "Multi-stage Approvals",
    href: "/settings/multi-stage-approvals",
    icon: <Share2 className="h-5 w-5" />,
    description: "Design layered approval chains for complex workflows",
  },
];

const formSettings = [
  {
    title: "Forms & Surveys",
    href: "/settings/forms",
    icon: <ClipboardList className="h-5 w-5" />,
    description: "Build custom forms to capture the data you need",
  },
];

const onboardingSettings = [
  {
    title: "Onboarding Templates",
    href: "/settings/onboarding",
    icon: <Users className="h-5 w-5" />,
    description: "Guide new hires through a curated first-week journey",
  },
];

const documentSettings = [
  {
    title: "Document Types",
    href: "/settings/document-types",
    icon: <FolderKanban className="h-5 w-5" />,
    description: "Organise, categorise, and secure uploaded files",
  },
];

const workflowSettings = [
  {
    title: "Automation Rules",
    href: "/settings/automation-rules",
    icon: <Repeat className="h-5 w-5" />,
    description: "Automate repetitive tasks with smart triggers",
  },
  {
    title: "Transactional Notifications",
    href: "/settings/workflows/notifications",
    icon: <Bell className="h-5 w-5" />,
    description: "Personalise the operational messages employees receive",
  },
];

function getSystemSettings(role?: string) {
  const base = [
    {
      title: "Platform Settings",
      href: "/settings/system",
      icon: <Cog className="h-5 w-5" />,
      description: "Manage tenant-wide preferences, branding, and access",
    },
  ];
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
  items: {
    title: string;
    href: string;
    icon: React.ReactNode;
    description?: string;
    helpPreset?: string;
  }[];
  icon: React.ReactNode;
  description?: string;
  completionStatus?: { completed: number; total: number };
}) {
  const completionPercent =
    completionStatus && completionStatus.total > 0
      ? Math.round((completionStatus.completed / completionStatus.total) * 100)
      : 0;

  return (
    <AccordionItem
      value={id}
      className="relative overflow-hidden rounded-xl border border-transparent border-enhanced bg-card shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md data-[state=open]:bg-gradient-to-br data-[state=open]:from-primary/15 data-[state=open]:via-white/80 data-[state=open]:to-transparent data-[state=open]:shadow-primary/20 dark:data-[state=open]:via-slate-900/70 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-gradient-to-br before:from-primary/20 before:via-primary/5 before:to-transparent before:opacity-0 before:transition-opacity data-[state=open]:before:opacity-100 after:pointer-events-none after:absolute after:inset-0 after:-z-20 after:rounded-[inherit] after:bg-primary/10 after:blur-3xl after:opacity-0 after:transition-opacity data-[state=open]:after:opacity-80"
    >
      <AccordionTrigger className="px-6 py-5 hover:no-underline group">
        <div className="flex items-center gap-4 text-left w-full">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center transition-colors transition-transform duration-300 group-hover:bg-primary/20 group-data-[state=open]:scale-110">
            <div className="text-primary w-5 h-5">{icon}</div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                {label}
              </h3>
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
            {completionStatus && (
              <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2">
                <div className="mt-3 h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary via-sky-500 to-indigo-500 animate-[pulse_6s_ease-in-out_infinite]"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-6 data-[state=open]:animate-in data-[state=open]:fade-in-80 data-[state=open]:slide-in-from-top-2">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 [@media(min-width:1920px)]:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] pt-2">
          {items.map(({ title, href, icon, helpPreset, description }) => (
            <Card
              key={title}
              className="group relative overflow-hidden border-transparent bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 shadow-sm ring-1 ring-transparent transition duration-300 hover:scale-[1.015] hover:-translate-y-1 hover:ring-primary/40 hover:shadow-2xl hover:shadow-primary/20 motion-safe:duration-300 before:absolute before:inset-0 before:content-[''] before:bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] before:from-primary/20 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 before:pointer-events-none hover:before:opacity-100"
            >
              <CardHeader
                transparent
                className="relative z-10 border-none bg-transparent p-5 pb-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary transition-colors group-hover:bg-primary/20 group-hover:text-primary-foreground">
                      {icon}
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-base">{title}</CardTitle>
                      {description && (
                        <CardDescription className="text-xs sm:text-sm">
                          {description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  {helpPreset && <QuickHelp preset={helpPreset as any} />}
                </div>
              </CardHeader>
              <CardContent
                noPadding
                className="relative z-10 flex flex-col gap-4 p-5 pt-4"
              >
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="mt-auto bg-gradient-to-r from-primary via-indigo-500 to-sky-500 text-white shadow-lg shadow-primary/20 hover:bg-transparent hover:shadow-primary/40 focus-visible:ring-primary/40"
                >
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
  const [completionData, setCompletionData] = useState<
    Record<string, { completed: number; total: number }>
  >({});

  useEffect(() => {
    const savedProgress = localStorage.getItem("settingsProgress");
    if (savedProgress) {
      setCompletionData(JSON.parse(savedProgress));
    } else {
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

  const holidaySettingsWithHelp = holidaySettings.map((item) => ({
    ...item,
    helpPreset:
      item.title === "Working Patterns"
        ? "workingPattern"
        : item.title === "Public Holiday Templates"
        ? "publicHolidays"
        : item.title === "Expiry Alerts"
        ? "expiryAlerts"
        : item.title === "Event Rules"
        ? "eventRules"
        : item.title === "Event Manager"
        ? "eventManager"
        : item.title === "Leave Policies"
        ? "leavePolicy"
        : item.title === "Multi-stage Approvals"
        ? "approvalWorkflow"
        : undefined,
  }));

  const workflowSettingsWithHelp = workflowSettings.map((item) => ({
    ...item,
    helpPreset:
      item.title === "Automation Rules"
        ? "automation"
        : item.title === "Transactional Notifications"
        ? "notifications"
        : undefined,
  }));

  const onboardingSettingsWithHelp = onboardingSettings.map((item) => ({
    ...item,
    helpPreset:
      item.title === "Onboarding Templates" ? "onboardingTemplates" : undefined,
  }));

  const documentSettingsWithHelp = documentSettings.map((item) => ({
    ...item,
    helpPreset: item.title === "Document Types" ? "documentTypes" : undefined,
  }));

  return (
    <>
      <PageShell
        title="Settings"
        description="Configure and manage your HR system with intelligent assistance"
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
                "Hover over (?) icons for explanations",
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
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Configure advanced settings and fine-tune your HR system
            </p>
            <Badge variant="outline" className="text-xs">
              <Info className="h-3 w-3 mr-1" />
              Hover over settings for help
            </Badge>
          </div>

          <Accordion
            type="multiple"
            className="space-y-4"
            defaultValue={["holidays", "system"]}
          >
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
        </div>
      </PageShell>

      <ContextualHelpAssistant pageContext="/settings" userRole="hr" />
    </>
  );
}
