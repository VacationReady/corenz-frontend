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
import { Badge } from "@/components/ui/Badge";
import {
  Zap,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Users,
  DollarSign,
  FileText,
  Settings,
} from "lucide-react";
import { useState } from "react";

export default function XeroIntegrationPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    // Redirect to OAuth flow
    window.location.href = "/api/integrations/xero/auth";
  };

  const handleDisconnect = async () => {
    // TODO: Implement disconnect logic
    setIsConnected(false);
  };

  const systemBreadcrumb = breadcrumbConfigs.settingsSection("System Settings");
  const breadcrumbs = {
    items: [
      ...systemBreadcrumb.items.slice(0, -1),
      { label: "System Settings", href: "/settings/system" },
      { label: "Xero Integration", isCurrentPage: true },
    ],
  };

  const features = [
    {
      icon: <Users className="h-5 w-5" />,
      title: "Employee Sync",
      description: "Automatically sync employee data between PeopleCore and Xero Payroll",
    },
    {
      icon: <DollarSign className="h-5 w-5" />,
      title: "Payroll Integration",
      description: "Seamlessly transfer payroll data including pay runs and pay items",
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "Accounting Settings",
      description: "Access and manage accounting settings for payroll processing",
    },
    {
      icon: <RefreshCw className="h-5 w-5" />,
      title: "Real-time Sync",
      description: "Keep data synchronized in real-time with automatic updates",
    },
  ];

  return (
    <PageShell
      title="Xero Integration"
      description="Connect PeopleCore with Xero for seamless payroll and accounting integration"
      breadcrumbs={breadcrumbs}
      showHomeIcon={false}
    >
      <div className="space-y-6">
        {/* Connection Status Card */}
        <Card className="border-transparent bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3 text-primary">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Connection Status</CardTitle>
                  <CardDescription>
                    Manage your Xero integration connection
                  </CardDescription>
                </div>
              </div>
              {isConnected ? (
                <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Not Connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isConnected ? (
                <>
                  <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4 border border-green-200 dark:border-green-900">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Your Xero account is successfully connected. Employee and payroll data will sync automatically.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleDisconnect}
                      className="flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Disconnect
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Sync Settings
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200 dark:border-blue-900">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Connect your Xero account to enable payroll synchronization and accounting integration.
                    </p>
                  </div>
                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="bg-gradient-to-r from-primary via-indigo-500 to-sky-500 text-white shadow-lg shadow-primary/20 hover:shadow-primary/40"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Connect to Xero
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Integration Features</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-transparent bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 shadow-sm"
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      {feature.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{feature.title}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Documentation */}
        <Card className="border-transparent bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Documentation & Support</CardTitle>
            <CardDescription>
              Learn more about setting up and using the Xero integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                asChild
              >
                <a
                  href="https://developer.xero.com/documentation/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Xero API Documentation
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                asChild
              >
                <a
                  href="https://central.xero.com/s/topic/0TO1N000000MFi3WAG/payroll"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Xero Payroll Help Center
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
