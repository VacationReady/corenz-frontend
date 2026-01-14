import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAppBaseUrl } from "@/lib/email/template";

// Force dynamic rendering since this page uses cookies()
export const dynamic = "force-dynamic";

/**
 * Server-side fetch helper that forwards authentication cookies.
 * Uses getAppBaseUrl() for secure base URL derivation with proper fallbacks.
 */
async function fetchWithAuth(endpoint: string) {
  const baseUrl = getAppBaseUrl();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  
  const res = await fetch(`${baseUrl}${endpoint}`, {
    cache: "no-store",
    headers: {
      Cookie: cookieHeader,
    },
  });
  
  // Handle auth errors - redirect to login
  if (res.status === 401) {
    redirect("/login?callbackUrl=/onboarding");
  }
  
  if (!res.ok) {
    console.error(`[onboarding] ${endpoint} failed with status ${res.status}`);
    return { error: true };
  }
  
  return res.json();
}

async function fetchDashboard() {
  return fetchWithAuth("/api/onboarding/dashboard");
}

async function fetchTelemetry() {
  try {
    return await fetchWithAuth("/api/onboarding/telemetry");
  } catch (error) {
    console.error("Telemetry fetch error:", error);
    return { error: true };
  }
}

export default async function OnboardingDashboardPage() {
  const [dashboardData, telemetryResponse] = await Promise.all([
    fetchDashboard(),
    fetchTelemetry(),
  ]);

  const telemetry = telemetryResponse?.success ? telemetryResponse.data : null;

  if (dashboardData?.error) {
    return <div className="p-6">Failed to load onboarding dashboard.</div>;
  }

  const { summary, items } = dashboardData || {};
  const telemetrySummary = telemetry?.summary;
  const templateHotspots = telemetry?.templateHotspots ?? [];
  const recentTelemetryEvents = telemetry?.recentEvents ?? [];
  const companyCode = telemetry?.company?.code?.toLowerCase() ?? "";
  const publicHolidayRegion =
    telemetry?.company?.publicHolidayRegion?.toLowerCase() ?? "";
  const isNzTenant = Boolean(
    companyCode.includes("nz") || publicHolidayRegion.includes("nz"),
  );

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Pending">
          <div className="text-3xl font-bold">{summary?.pending ?? 0}</div>
        </Card>
        <Card title="In Progress">
          <div className="text-3xl font-bold">{summary?.in_progress ?? 0}</div>
        </Card>
        <Card title="Overdue">
          <div className="text-3xl font-bold text-red-600">
            {summary?.overdue ?? 0}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Telemetry Health" className="h-full">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-base font-semibold text-muted-foreground">
                {telemetry?.company?.name || "Unknown tenant"}
              </CardTitle>
              {isNzTenant ? (
                <Badge className="bg-emerald-600 text-white">NZ Launch Focus</Badge>
              ) : null}
              <Badge variant="outline" className="text-xs">
                {telemetrySummary?.lastUpdatedAt
                  ? new Date(telemetrySummary.lastUpdatedAt).toLocaleString("en-NZ", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Pacific/Auckland" })
                  : "No telemetry captured"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TelemetryStat
                label="Template Load Failures"
                value={telemetrySummary?.templateLoadFailures ?? 0}
                variant="error"
              />
              <TelemetryStat
                label="Metadata Mismatches"
                value={telemetrySummary?.metadataMismatches ?? 0}
                variant="warning"
              />
              <TelemetryStat
                label="Tracked Issues"
                value={telemetrySummary?.totalEvents ?? 0}
                variant="info"
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Hotspots
              </h3>
              {templateHotspots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No telemetry alerts detected for this tenant yet. Great work!
                </p>
              ) : (
                <ul className="space-y-2">
                  {templateHotspots.map((hotspot: any) => (
                    <li
                      key={hotspot.templateId}
                      className="rounded-xl border border-border/50 bg-background/60 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {hotspot.templateName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {hotspot.affectedSteps?.length
                              ? `Affected steps: ${hotspot.affectedSteps.join(", ")}`
                              : "Captured during validation"}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {hotspot.mismatchCount} mismatch
                          {hotspot.mismatchCount === 1 ? "" : "es"}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>

        <Card title="Recent Telemetry Events" className="h-full">
          <div className="overflow-x-auto">
            {recentTelemetryEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No onboarding telemetry captured yet. Run through a template to ensure
                everything is wired correctly before launch.
              </p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-3">Type</th>
                    <th className="p-3">Template</th>
                    <th className="p-3">Step</th>
                    <th className="p-3">Occurrences</th>
                    <th className="p-3">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTelemetryEvents.map((event: any) => (
                    <tr key={event.id} className="border-b align-top">
                      <td className="p-3">
                        <Badge
                          variant={event.severity === "error" ? "destructive" : "outline"}
                          className="text-xs uppercase tracking-wide"
                        >
                          {event.eventType.replace(/_/g, " ")}
                        </Badge>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {event.message}
                        </div>
                      </td>
                      <td className="p-3">
                        {event.templateName || "-"}
                      </td>
                      <td className="p-3">
                        {event.stepLabel || "-"}
                      </td>
                      <td className="p-3">{event.occurrenceCount}</td>
                      <td className="p-3">
                        {event.lastSeenAt
                          ? new Date(event.lastSeenAt).toLocaleString("en-NZ", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Pacific/Auckland" })
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      <Card title="Active Onboarding Items">
        {items && items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No active onboarding items at the moment.</p>
            <p className="text-xs mt-2">New employee onboarding journeys will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-3">Employee</th>
                  <th className="p-3">Template</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Started</th>
                  <th className="p-3">Completed</th>
                  <th className="p-3">Steps</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item: any) => {
                const formatStatus = (status: string) => {
                  return status
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
                };
                
                return (
                  <tr key={item.id} className="border-b">
                    <td className="p-3">
                      {item.employee?.user?.firstName}{" "}
                      {item.employee?.user?.lastName}
                    </td>
                    <td className="p-3">{item.template?.name}</td>
                    <td className="p-3">{formatStatus(item.status)}</td>
                    <td className="p-3">
                      {item.startedAt
                        ? new Date(item.startedAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })
                        : "-"}
                    </td>
                    <td className="p-3">
                      {item.completedAt
                        ? new Date(item.completedAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })
                        : "-"}
                    </td>
                    <td className="p-3">
                      {item.stepsCompleted}/{item.stepsTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function TelemetryStat({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "info" | "warning" | "error";
}) {
  const variantClass =
    variant === "error"
      ? "text-rose-600"
      : variant === "warning"
      ? "text-amber-600"
      : "text-primary";

  return (
    <div className="rounded-xl border border-border/50 bg-background/60 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`text-2xl font-bold ${variantClass}`}>{value}</p>
    </div>
  );
}
