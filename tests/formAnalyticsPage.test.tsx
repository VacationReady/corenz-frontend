import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";

import type { FormAnalyticsSummary } from "../app/(withSidebar)/settings/forms/[id]/analytics/FormAnalyticsContent";
import { FormAnalyticsView } from "../app/(withSidebar)/settings/forms/[id]/analytics/FormAnalyticsContent";

test("renders analytics metrics from summary response", () => {
  const summary: FormAnalyticsSummary = {
    form: {
      id: "form-123",
      name: "Onboarding Survey",
      type: "survey",
      isActive: true,
      createdAt: new Date("2024-01-01T12:00:00Z").toISOString(),
    },
    metrics: {
      totalSubmissions: 24,
      uniqueSubmitters: 17,
      completionRate: 75,
      totalAssignments: 30,
      overdueAssignments: 2,
      recentSubmissions: 5,
    },
    trends: {
      submissionsByDate: {
        "2024-01-03": 2,
        "2024-01-05": 3,
      },
      last30Days: 5,
    },
    breakdowns: {
      byDepartment: [
        { name: "Engineering", count: 12 },
        { name: "HR", count: 6 },
      ],
      byJobRole: [
        { name: "Developer", count: 10 },
        { name: "Manager", count: 4 },
      ],
    },
    recentActivity: [
      {
        id: "sub-1",
        submitterName: "Alice Example",
        submitterEmail: "alice@example.com",
        department: "Engineering",
        jobRole: "Developer",
        submittedAt: new Date("2024-01-05T15:30:00Z").toISOString(),
      },
    ],
    generatedAt: new Date("2024-01-06T10:00:00Z").toISOString(),
  };

  const html = renderToString(<FormAnalyticsView summary={summary} />);

  assert.ok(html.includes("Total Submissions"));
  assert.ok(html.includes("<div class=\"text-2xl font-bold\">24</div>"));
  assert.ok(html.includes("Unique Submitters"));
  assert.ok(html.includes("<div class=\"text-2xl font-bold\">17</div>"));
  assert.ok(html.includes("75%"));
  assert.ok(html.includes("2 overdue of 30"));
  assert.ok(html.includes("Engineering"));
  assert.ok(html.includes("Alice Example"));
});

test("degrades gracefully when analytics are empty", () => {
  const summary: FormAnalyticsSummary = {
    form: {
      id: "form-000",
      name: "Pulse Check",
      type: null,
      isActive: false,
      createdAt: new Date("2024-02-01T12:00:00Z").toISOString(),
    },
    metrics: {
      totalSubmissions: 0,
      uniqueSubmitters: 0,
      completionRate: null,
      totalAssignments: 0,
      overdueAssignments: 0,
      recentSubmissions: 0,
    },
    trends: {
      submissionsByDate: {},
      last30Days: 0,
    },
    breakdowns: {
      byDepartment: [],
      byJobRole: [],
    },
    recentActivity: [],
    generatedAt: new Date("2024-02-02T09:00:00Z").toISOString(),
  };

  const html = renderToString(<FormAnalyticsView summary={summary} />);

  assert.ok(html.includes("No submissions yet"));
  assert.ok(html.includes("No unique submitters yet"));
  assert.ok(html.includes("No assignments tracked"));
  assert.ok(html.includes("No submissions this month yet"));
  assert.ok(html.includes("No submission trend data available yet."));
  assert.ok(html.includes("No recent activity to show yet."));
  assert.ok(html.includes("No department insights yet."));
  assert.ok(html.includes("No role insights yet."));
});
