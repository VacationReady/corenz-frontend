"use client";

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
  Settings,
  Upload,
  Shield,
  FileText,
  Info,
  Calendar,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

const systemSettings = [
  {
    title: "CSV Import",
    href: "/settings/system/csv-import",
    icon: <Upload className="h-5 w-5" />,
    description: "Import employee data, departments, and other master data via CSV files",
    status: "active",
  },
  {
    title: "Audit Log",
    href: "/settings/system/audit-log",
    icon: <FileText className="h-5 w-5" />,
    description: "Track all changes to system configuration and settings",
    status: "active",
  },
  {
    title: "Notifications",
    href: "/settings/system/notifications",
    icon: <Shield className="h-5 w-5" />,
    description: "Configure system-wide notification preferences and channels",
    status: "active",
  },
  {
    title: "Calendar Integrations",
    href: "/settings/system/calendar-integrations",
    icon: <Calendar className="h-5 w-5" />,
    description:
      "Plug HR events like exit interviews, 1-2-1s, and holidays into Google & Outlook calendars",
    status: "beta",
  },
  {
    title: "Xero Integration",
    href: "/settings/system/xero-integration",
    icon: <Zap className="h-5 w-5" />,
    description:
      "Connect to Xero for seamless payroll synchronization and accounting integration",
    status: "beta",
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    case "beta":
      return <Badge className="bg-blue-100 text-blue-800">Beta</Badge>;
    case "coming-soon":
      return <Badge className="bg-gray-100 text-gray-800">Coming Soon</Badge>;
    default:
      return null;
  }
}

export default function SystemSettingsPage() {
  return (
    <PageShell
      title="System Settings"
      description="Core platform settings and administrative controls"
      breadcrumbs={breadcrumbConfigs.settingsSection("System Settings")}
      showHomeIcon={false}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Manage core platform settings, data imports, and administrative controls
          </p>
          <Badge variant="outline" className="text-xs">
            <Info className="h-3 w-3 mr-1" />
            System Administrator Access Required
          </Badge>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 [@media(min-width:1920px)]:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
          {systemSettings.map(({ title, href, icon, description, status }) => (
            <Card
              key={title}
              className="group relative overflow-hidden border-transparent bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 shadow-sm ring-1 ring-transparent transition duration-300 hover:ring-primary/40 hover:shadow-2xl hover:shadow-primary/20 motion-safe:duration-300 before:absolute before:inset-0 before:content-[''] before:bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] before:from-primary/20 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 before:pointer-events-none hover:before:opacity-100"
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
                      <CardDescription className="text-xs sm:text-sm">
                        {description}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(status)}
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
      </div>
    </PageShell>
  );
}
