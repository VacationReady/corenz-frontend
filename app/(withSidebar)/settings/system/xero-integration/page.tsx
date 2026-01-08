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
  AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function XeroIntegrationPage() {
  const searchParams = useSearchParams();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    // Fetch connection status
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/xero/status");
        const data = await res.json();
        if (data.connected) {
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Failed to fetch Xero status:", error);
      }
    };

    fetchStatus();

    // Check for OAuth callback parameters
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      setIsConnected(true);
      setStatusMessage({
        type: "success",
        message: "Successfully connected to Xero!",
      });
      window.history.replaceState({}, "", "/settings/system/xero-integration");
    } else if (error) {
      setStatusMessage({
        type: "error",
        message: `Connection failed: ${error.replace(/_/g, " ")}`,
      });
      setTimeout(() => {
        window.history.replaceState({}, "", "/settings/system/xero-integration");
      }, 100);
    }
  }, [searchParams]);

  const handleConnect = async () => {
    setIsConnecting(true);
    // Redirect to OAuth flow
    window.location.href = "/api/xero/connect";
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect from Xero? This will remove all stored credentials.")) {
      return;
    }

    try {
      const res = await fetch("/api/xero/disconnect", {
        method: "POST",
      });

      if (res.ok) {
        setIsConnected(false);
        setStatusMessage({
          type: "success",
          message: "Successfully disconnected from Xero",
        });
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      setStatusMessage({
        type: "error",
        message: "Failed to disconnect from Xero",
      });
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/xero/test");
      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: "success",
          message: `Connection successful! Connected to: ${data.organization?.Name || "Xero"}`,
        });
      } else {
        throw new Error(data.error || "Test failed");
      }
    } catch (error) {
      console.error("Test error:", error);
      setStatusMessage({
        type: "error",
        message: `Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsTesting(false);
    }
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
        {/* Status Message */}
        {statusMessage && (
          <div
            className={`rounded-lg p-4 border ${
              statusMessage.type === "success"
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <p
                className={`text-sm ${
                  statusMessage.type === "success"
                    ? "text-green-800 dark:text-green-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                {statusMessage.message}
              </p>
            </div>
          </div>
        )}

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
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="flex items-center gap-2"
                    >
                      {isTesting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Settings className="h-4 w-4" />
                          Test Connection
                        </>
                      )}
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
