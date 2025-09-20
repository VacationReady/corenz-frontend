import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import Module from "module";
import {
  PerformanceReview,
  buildPayloadFromForm,
  createEmptyFormState,
  createFormStateFromReview,
} from "../app/(withSidebar)/employees/[id]/performance/helpers";

async function loadPerformanceModule() {
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === "next/navigation") {
      return {
        useParams: () => ({ id: "emp1" }),
      };
    }
    return originalLoad(request, parent, isMain);
  };
  try {
    return await import(
      `../app/(withSidebar)/employees/[id]/performance/page?test=${Math.random()}`
    );
  } finally {
    (Module as any)._load = originalLoad;
  }
}

test("createEmptyFormState returns blank fields", () => {
  const state = createEmptyFormState();
  assert.equal(state.reviewDate, "");
  assert.equal(state.rating, "");
  assert.equal(state.summary, "");
  assert.equal(state.strengths, "");
  assert.equal(state.areasForImprovement, "");
  assert.equal(state.goals, "");
});

test("buildPayloadFromForm normalises rating and goals", () => {
  const payload = buildPayloadFromForm({
    reviewDate: "2024-07-01",
    rating: "4 ",
    summary: "  Highlights ",
    strengths: " Collaboration ",
    areasForImprovement: " Improve focus  ",
    goals: "Launch\nCoach team\n",
  });
  assert.equal(payload.reviewDate, "2024-07-01");
  assert.equal(payload.rating, 4);
  assert.equal(payload.summary, "Highlights");
  assert.equal(payload.strengths, "Collaboration");
  assert.equal(payload.areasForImprovement, "Improve focus");
  assert.deepEqual(payload.goals, ["Launch", "Coach team"]);
});

test("createFormStateFromReview hydrates edit state", async () => {
  const mod = await loadPerformanceModule();
  const review: PerformanceReview = {
    id: "rev1",
    employeeId: "emp1",
    companyId: "c1",
    reviewerId: "u-admin",
    reviewDate: "2024-07-02T00:00:00.000Z",
    rating: 5,
    summary: "Great progress",
    strengths: "Leadership",
    areasForImprovement: "Time management",
    goals: ["Goal A", "Goal B"],
    createdAt: "2024-07-03T00:00:00.000Z",
    updatedAt: "2024-07-04T00:00:00.000Z",
    reviewer: { id: "u-admin", firstName: "Jamie", lastName: "Lee" },
  };
  const state = createFormStateFromReview(review);
  assert.equal(state.reviewDate, "2024-07-02");
  assert.equal(state.rating, "5");
  assert.equal(state.summary, "Great progress");
  assert.equal(state.strengths, "Leadership");
  assert.equal(state.areasForImprovement, "Time management");
  assert.equal(state.goals, "Goal A\nGoal B");
});

test("PerformancePage SSR renders shell", async () => {
  const mod = await loadPerformanceModule();
  const html = renderToString(React.createElement(mod.default));
  assert.ok(html.includes("Performance Reviews"));
  assert.ok(html.includes("Log review"));
});
