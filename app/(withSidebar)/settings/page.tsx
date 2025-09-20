"use client";

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
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const holidaySettings = [
  {
    title: "Working Patterns",
    href: "/settings/working-patterns",
    icon: <Clock className="h-5 w-5 text-primary" />,
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

const systemSettings = [
  {
    title: "Platform Settings",
    href: "/settings/system",
    icon: <Cog className="h-5 w-5 text-primary" />,
  },
  {
    title: "Permissions",
    href: "/settings/permissions",
    icon: <Shield className="h-5 w-5 text-primary" />,
  },
];

function SettingSection({
  id,
  label,
  items,
  icon,
  description,
}: {
  id: string;
  label: string;
  items: { title: string; href: string; icon: React.ReactNode }[];
  icon: React.ReactNode;
  description?: string;
}) {
  return (
    <AccordionItem
      value={id}
      className="border border-enhanced rounded-xl bg-card shadow-sm hover:shadow-md transition-all duration-200"
    >
      <AccordionTrigger className="px-6 py-5 hover:no-underline group">
        <div className="flex items-center gap-4 text-left">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <div className="text-primary w-5 h-5">{icon}</div>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
              {label}
            </h3>
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
          {items.map(({ title, href, icon }) => (
            <Card
              key={title}
              className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-enhanced"
            >
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3 text-lg font-semibold text-foreground">
                  <div className="text-primary group-hover:scale-110 transition-transform">
                    {icon}
                  </div>
                  {title}
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
  return (
    <PageShell
      title="Settings"
      description="Configure and manage your system settings across all modules"
      icon={<Cog className="w-6 h-6" />}
      breadcrumbs={breadcrumbConfigs.settings}
      showHomeIcon={false}
    >
      <Accordion type="multiple" className="space-y-4" defaultValue={['holidays', 'system']}>
        <SettingSection
          id="holidays"
          label="Holidays & Absence"
          description="Manage leave policies, working patterns, and absence tracking"
          icon={<Plane className="w-5 h-5" />}
          items={holidaySettings}
        />
        <SettingSection
          id="onboarding"
          label="Onboarding"
          description="Configure employee onboarding templates and workflows"
          icon={<UserPlus className="w-5 h-5" />}
          items={onboardingSettings}
        />
        <SettingSection
          id="documents"
          label="Documents"
          description="Set up document types and management policies"
          icon={<FileStack className="w-5 h-5" />}
          items={documentSettings}
        />
        <SettingSection
          id="workflows"
          label="Workflows"
          description="Create and manage automated business processes"
          icon={<Workflow className="w-5 h-5" />}
          items={workflowSettings}
        />
        <SettingSection
          id="forms"
          label="Forms & Surveys"
          description="Design and deploy custom forms and employee surveys"
          icon={<ClipboardList className="w-5 h-5" />}
          items={formSettings}
        />
        <SettingSection
          id="system"
          label="System"
          description="Core platform settings and administrative controls"
          icon={<Settings className="w-5 h-5" />}
          items={systemSettings}
        />
      </Accordion>
    </PageShell>
  );
}
