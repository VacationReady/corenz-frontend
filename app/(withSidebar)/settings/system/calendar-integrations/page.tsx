"use client";

import { useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link as LinkIcon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface IntegrationState {
  connected: boolean;
  autoSync: boolean;
  defaultCalendar: string;
  syncWindow: string;
  lastSync?: string;
  serviceAccount?: string;
}

interface EventSyncSetting {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  calendar: string;
  reminder: string;
  visibility: "private" | "default" | "public";
}

const calendarOptions = [
  "People Operations",
  "HR Team",
  "Company Holidays",
  "Leadership",
  "Personal",
];

const reminderOptions = [
  "No reminder",
  "15 minutes before",
  "30 minutes before",
  "1 hour before",
  "24 hours before",
  "3 days before",
];

export default function CalendarIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Record<string, IntegrationState>>({
    google: {
      connected: true,
      autoSync: true,
      defaultCalendar: "People Operations",
      syncWindow: "60",
      lastSync: "Synced 12 minutes ago",
      serviceAccount: "service-account@yourdomain.iam.gserviceaccount.com",
    },
    outlook: {
      connected: false,
      autoSync: false,
      defaultCalendar: "HR Team",
      syncWindow: "48",
    },
  });

  const [eventSync, setEventSync] = useState<EventSyncSetting[]>([
    {
      key: "exit-interview",
      label: "Exit Interviews",
      description:
        "Generate calendar invites for scheduled exit interviews with departing employees.",
      enabled: true,
      calendar: "People Operations",
      reminder: "24 hours before",
      visibility: "private",
    },
    {
      key: "one-to-one",
      label: "1-2-1 Check-ins",
      description:
        "Sync recurring manager 1-2-1s so they appear alongside personal agendas.",
      enabled: true,
      calendar: "HR Team",
      reminder: "1 hour before",
      visibility: "default",
    },
    {
      key: "holiday",
      label: "Approved Leave & Holidays",
      description:
        "Block out approved holidays and leave so team availability is always current.",
      enabled: true,
      calendar: "Company Holidays",
      reminder: "3 days before",
      visibility: "public",
    },
    {
      key: "probation-review",
      label: "Probation Reviews",
      description:
        "Keep probation review conversations on track with automatic reminders.",
      enabled: false,
      calendar: "People Operations",
      reminder: "24 hours before",
      visibility: "private",
    },
  ]);

  const connectionHealth = useMemo(() => {
    const total = Object.values(integrations).length;
    const connected = Object.values(integrations).filter((item) => item.connected).length;

    if (connected === total) {
      return {
        label: "All providers connected",
        variant: "success" as const,
        icon: <CheckCircle2 className="h-4 w-4" />,
      };
    }

    if (connected === 0) {
      return {
        label: "No providers connected",
        variant: "warning" as const,
        icon: <AlertTriangle className="h-4 w-4" />,
      };
    }

    return {
      label: `${connected} of ${total} providers connected`,
      variant: "info" as const,
      icon: <Clock className="h-4 w-4" />,
    };
  }, [integrations]);

  const toggleIntegrationConnection = (provider: string) => {
    setIntegrations((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        connected: !prev[provider].connected,
      },
    }));
  };

  const updateIntegration = (
    provider: string,
    field: keyof IntegrationState,
    value: string | boolean
  ) => {
    setIntegrations((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value,
      },
    }));
  };

  const updateEventSetting = (
    key: string,
    field: keyof EventSyncSetting,
    value: EventSyncSetting[keyof EventSyncSetting]
  ) => {
    setEventSync((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const systemBreadcrumb = breadcrumbConfigs.settingsSection("System Settings");
  const breadcrumbs = {
    items: [
      ...systemBreadcrumb.items.slice(0, -1),
      { label: "System Settings", href: "/settings/system" },
      { label: "Calendar Integrations", isCurrentPage: true },
    ],
  };

  return (
    <PageShell
      title="Calendar Integrations"
      description="Connect Google Workspace and Microsoft 365 so exit interviews, check-ins, holidays, and more are instantly available in your team's calendars."
      breadcrumbs={breadcrumbs}
      showHomeIcon={false}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="outline"
            className="flex items-center gap-1 border-primary/30 bg-primary/10 text-primary"
          >
            <Calendar className="h-3.5 w-3.5" />
            Unified Scheduling
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Plug &amp; Play
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-1 border-sky-200 bg-sky-50 text-sky-700"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure OAuth
          </Badge>
        </div>

        <Card className="border-dashed">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Provider Connections</CardTitle>
              <CardDescription>
                Connect your HR events to enterprise calendars in a couple of clicks. We handle the OAuth flow and sync
                rules for you.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={`flex items-center gap-1 text-xs uppercase ${
                connectionHealth.variant === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : connectionHealth.variant === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-sky-200 bg-sky-50 text-sky-700"
              }`}
            >
              {connectionHealth.icon}
              {connectionHealth.label}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(integrations).map(([provider, state]) => (
              <div
                key={provider}
                className="flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <LinkIcon className="h-3.5 w-3.5" />
                      {provider === "google" ? "Google Workspace" : "Microsoft Outlook"}
                    </Badge>
                    {state.connected ? (
                      <Badge className="bg-emerald-100 text-emerald-800">Connected</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800">Disconnected</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {provider === "google"
                      ? "Sync events into any shared Google Calendar using your existing Workspace tenant."
                      : "Sync directly to Microsoft 365 calendars with Azure AD consent and granular scopes."}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" /> Sync window: {state.syncWindow} hours
                    </span>
                    {state.lastSync && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {state.lastSync}
                      </span>
                    )}
                    {state.serviceAccount && (
                      <span className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> {state.serviceAccount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:items-end">
                  <div className="flex items-center gap-3">
                    <Switch
                      id={`${provider}-autosync`}
                      checked={state.autoSync}
                      onCheckedChange={(checked) =>
                        updateIntegration(provider, "autoSync", checked)
                      }
                    />
                    <Label htmlFor={`${provider}-autosync`} className="text-sm">
                      Auto sync every {state.syncWindow} hours
                    </Label>
                  </div>
                  <Select
                    value={state.defaultCalendar}
                    onValueChange={(value) =>
                      updateIntegration(provider, "defaultCalendar", value)
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[220px]">
                      <SelectValue placeholder="Select calendar" />
                    </SelectTrigger>
                    <SelectContent>
                      {calendarOptions.map((calendar) => (
                        <SelectItem key={calendar} value={calendar}>
                          {calendar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant={state.connected ? "outline" : "default"}
                    onClick={() => toggleIntegrationConnection(provider)}
                  >
                    {state.connected ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Sync Rules</CardTitle>
            <CardDescription>
              Choose which HR events should automatically create calendar entries and control how they appear in people&rsquo;s diaries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {eventSync.map((event) => (
              <div
                key={event.key}
                className="flex flex-col gap-4 rounded-lg border border-border/60 p-4 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,240px)] sm:items-start sm:gap-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{event.label}</h3>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                    <Switch
                      checked={event.enabled}
                      onCheckedChange={(checked) =>
                        updateEventSetting(event.key, "enabled", checked)
                      }
                    />
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <Badge variant="outline" className="bg-muted text-xs">
                      {event.visibility === "public"
                        ? "Visible to attendees"
                        : event.visibility === "private"
                        ? "Private"
                        : "Default visibility"}
                    </Badge>
                    {event.enabled ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Sync enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> Not syncing
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs uppercase text-muted-foreground">
                      Target calendar
                    </Label>
                    <Select
                      value={event.calendar}
                      onValueChange={(value) =>
                        updateEventSetting(event.key, "calendar", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {calendarOptions.map((calendar) => (
                          <SelectItem key={calendar} value={calendar}>
                            {calendar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs uppercase text-muted-foreground">
                      Reminder
                    </Label>
                    <Select
                      value={event.reminder}
                      onValueChange={(value) =>
                        updateEventSetting(event.key, "reminder", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {reminderOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs uppercase text-muted-foreground">
                      Event visibility
                    </Label>
                    <Select
                      value={event.visibility}
                      onValueChange={(value) =>
                        updateEventSetting(
                          event.key,
                          "visibility",
                          value as EventSyncSetting["visibility"]
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private (hide details)</SelectItem>
                        <SelectItem value="default">Default (calendar default)</SelectItem>
                        <SelectItem value="public">Public (share details)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>How plug &amp; play works</CardTitle>
              <CardDescription>
                Follow the guided flow to authenticate, grant consent, and map calendars without any engineering effort.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 text-center text-xs font-semibold leading-6 text-primary">
                    1
                  </span>
                  Launch the OAuth wizard to sign in with a Google Workspace admin or Microsoft 365 Global Admin and approve the secure scopes we request.
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 text-center text-xs font-semibold leading-6 text-primary">
                    2
                  </span>
                  Pick the shared calendars you want to push events into &mdash; for example people operations, leadership, or shared holiday calendars.
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 text-center text-xs font-semibold leading-6 text-primary">
                    3
                  </span>
                  Decide which event types sync automatically and configure reminders so people get timely nudges before key conversations.
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 text-center text-xs font-semibold leading-6 text-primary">
                    4
                  </span>
                  The integration service keeps calendars up-to-date in real time &mdash; every approval, change, or cancellation is mirrored instantly.
                </li>
              </ol>
              <Button className="mt-6" variant="secondary">
                View technical setup guide
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 via-white to-white">
            <CardHeader>
              <CardTitle>Sync health monitor</CardTitle>
              <CardDescription>
                Understand recent sync jobs and troubleshoot issues fast.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3 rounded-md border border-primary/20 bg-white/80 p-3">
                <div>
                  <p className="font-medium">Exit interview (Hannah Patel)</p>
                  <p className="text-xs text-muted-foreground">
                    Created 12 mins ago &bull; Google Calendar &bull; Reminder sent
                  </p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800">Success</Badge>
              </div>
              <div className="flex items-start justify-between gap-3 rounded-md border border-primary/20 bg-white/80 p-3">
                <div>
                  <p className="font-medium">1-2-1 (Lee Jones &amp; Manager)</p>
                  <p className="text-xs text-muted-foreground">
                    Updated 37 mins ago &bull; Microsoft Outlook &bull; Rescheduled
                  </p>
                </div>
                <Badge className="bg-sky-100 text-sky-800">Synced</Badge>
              </div>
              <div className="flex items-start justify-between gap-3 rounded-md border border-primary/20 bg-white/80 p-3">
                <div>
                  <p className="font-medium">Holiday (Marketing Team)</p>
                  <p className="text-xs text-muted-foreground">
                    Failed 2 hours ago &bull; Google Calendar &bull; Permission expired
                  </p>
                </div>
                <Badge className="bg-amber-100 text-amber-800">Action needed</Badge>
              </div>
              <Button variant="ghost" className="w-full">
                Download sync report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
