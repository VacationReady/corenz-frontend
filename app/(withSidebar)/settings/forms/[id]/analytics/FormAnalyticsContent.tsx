"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Activity, FileText, TrendingUp, Users } from "lucide-react";

export interface FormAnalyticsSummary {
  form: {
    id: string;
    name: string;
    type: string | null;
    isActive: boolean;
    createdAt: string;
  };
  metrics: {
    totalSubmissions: number;
    uniqueSubmitters: number;
    completionRate: number | null;
    totalAssignments: number;
    overdueAssignments: number;
    recentSubmissions: number;
  };
  trends: {
    submissionsByDate: Record<string, number>;
    last30Days: number;
  };
  breakdowns: {
    byDepartment: { name: string; count: number }[];
    byJobRole: { name: string; count: number }[];
  };
  recentActivity: {
    id: string;
    submitterName: string;
    submitterEmail?: string | null;
    department?: string | null;
    jobRole?: string | null;
    submittedAt: string;
  }[];
  generatedAt: string;
}

type FetchAnalyticsSummary = (
  formId: string,
  signal: AbortSignal,
) => Promise<FormAnalyticsSummary>;

const fetchFormAnalyticsSummary: FetchAnalyticsSummary = async (
  formId,
  signal,
) => {
  const response = await fetch(`/api/forms/${formId}/analytics/summary`, {
    signal,
  });
  const payload = await response.json();

  if (!response.ok) {
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : "Failed to load form analytics.";
    throw new Error(message);
  }

  return payload as FormAnalyticsSummary;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function FormAnalyticsContent({
  formId,
  fetchAnalytics = fetchFormAnalyticsSummary,
}: {
  formId: string;
  fetchAnalytics?: FetchAnalyticsSummary;
}) {
  const [summary, setSummary] = useState<FormAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formId) {
      setSummary(null);
      setIsLoading(false);
      setError("Invalid form identifier.");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    fetchAnalytics(formId, controller.signal)
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
      })
      .catch((err: Error) => {
        if (cancelled || err.name === "AbortError") return;
        setSummary(null);
        setError(err.message || "Failed to load form analytics.");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [formId, fetchAnalytics]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" showText text="Loading analytics" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Unable to load analytics</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please refresh the page to try again. If the problem persists, contact
            your administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return <FormAnalyticsView summary={summary} />;
}

export function FormAnalyticsView({
  summary,
}: {
  summary: FormAnalyticsSummary;
}) {
  const { metrics, breakdowns, recentActivity, trends, form, generatedAt } =
    summary;

  const trendEntries = useMemo(
    () =>
      Object.entries(trends.submissionsByDate).sort(
        ([a], [b]) => new Date(a).getTime() - new Date(b).getTime(),
      ),
    [trends.submissionsByDate],
  );

  const summaryCards = useMemo(
    () =>
      [
        {
          title: "Total Submissions",
          icon: FileText,
          value: formatNumber(metrics.totalSubmissions),
          description:
            metrics.totalSubmissions === 0
              ? "No submissions yet"
              : `${formatNumber(metrics.recentSubmissions)} in the last 30 days`,
          testId: "analytics-card-total-submissions",
        },
        {
          title: "Unique Submitters",
          icon: Users,
          value: formatNumber(metrics.uniqueSubmitters),
          description:
            metrics.uniqueSubmitters === 0
              ? "No unique submitters yet"
              : "Distinct employees have responded",
          testId: "analytics-card-unique-submitters",
        },
        {
          title: "Completion Rate",
          icon: TrendingUp,
          value:
            metrics.completionRate === null
              ? "—"
              : `${metrics.completionRate.toFixed(0)}%`,
          description:
            metrics.totalAssignments === 0
              ? "No assignments tracked"
              : `${formatNumber(metrics.overdueAssignments)} overdue of ${formatNumber(metrics.totalAssignments)}`,
          testId: "analytics-card-completion-rate",
        },
        {
          title: "Recent Submissions (30d)",
          icon: Activity,
          value: formatNumber(trends.last30Days),
          description:
            trends.last30Days === 0
              ? "No submissions this month yet"
              : "In the last 30 days",
          testId: "analytics-card-recent-submissions",
        },
      ] as const,
    [
      metrics.totalSubmissions,
      metrics.recentSubmissions,
      metrics.uniqueSubmitters,
      metrics.completionRate,
      metrics.totalAssignments,
      metrics.overdueAssignments,
      trends.last30Days,
    ],
  );

  return (
    <div className="space-y-8">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Analytics generated {formatDateTime(generatedAt)}
          </p>
          <h2 className="text-2xl font-semibold text-foreground">
            {form.name || "Form"}
          </h2>
          {form.type && (
            <p className="text-sm text-muted-foreground">
              Form type: {form.type}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ icon: Icon, title, value, description, testId }) => (
            <div
              key={title}
              data-testid={testId}
              className="glass rounded-3xl shadow-glass h-full transition-glass hover-glass hover-lift"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
              </CardContent>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Submission trend (last 30 days)</CardTitle>
              <CardDescription>
                {trends.last30Days === 0
                  ? "We haven’t seen any submissions in the past 30 days."
                  : `${formatNumber(trends.last30Days)} submissions in the last 30 days.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendEntries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Submissions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trendEntries.map(([date, count]) => (
                      <TableRow key={date}>
                        <TableCell>{formatDateTime(date)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(count)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No submission trend data available yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Latest ten submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitter</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivity.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {activity.submitterName || "Unknown"}
                            </span>
                            {activity.submitterEmail && (
                              <span className="text-xs text-muted-foreground">
                                {activity.submitterEmail}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{activity.department || "—"}</TableCell>
                        <TableCell>{activity.jobRole || "—"}</TableCell>
                        <TableCell className="text-right">
                          {formatDateTime(activity.submittedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent activity to show yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Department breakdown</CardTitle>
              <CardDescription>
                {breakdowns.byDepartment.length === 0
                  ? "Departments will appear once submissions are received."
                  : "Submission counts grouped by department."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {breakdowns.byDepartment.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Submissions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdowns.byDepartment.map((item) => (
                      <TableRow key={item.name}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(item.count)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No department insights yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Role breakdown</CardTitle>
              <CardDescription>
                {breakdowns.byJobRole.length === 0
                  ? "Roles will display here after submissions are collected."
                  : "Submission counts grouped by job role."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {breakdowns.byJobRole.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Submissions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdowns.byJobRole.map((item) => (
                      <TableRow key={item.name}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(item.count)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No role insights yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}

