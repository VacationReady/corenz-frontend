import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import React from "react";
import { JSDOM } from "jsdom";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
});

(globalThis as any).window = dom.window as any;
(globalThis as any).document = dom.window.document as any;
(globalThis as any).navigator = dom.window.navigator;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).CustomEvent = dom.window.CustomEvent;
(globalThis as any).Event = dom.window.Event;
(globalThis as any).React = React;
(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(() => cb(Date.now()), 0);
(globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id as any);

if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const toastCalls: Array<{ title?: string; description?: string; variant?: string }> = [];

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "@/hooks/use-toast" || request === "@/app/hooks/use-toast") {
    return {
      useToast: () => ({
        toast: (args: any) => {
          toastCalls.push(args);
        },
      }),
    };
  }

  // Replace heavy reconciliation components with very small renderers.
  // We only care that shift IDs are rendered when dayData exists.
  if (request === "@/components/reconciliation") {
    return {
      __esModule: true,
      ReconciliationStats: () => null,
      ShiftActualComparison: (props: any) => {
        return React.createElement(
          "div",
          { "data-testid": `shift-${props.shift?.id}` },
          props.shift?.id,
        );
      },
      ReconciliationActions: () => null,
      AdjustmentDialog: () => null,
      VarianceBadge: () => null,
      ReconciliationAddEntryDialog: () => null,
      EditClockEntryDialog: () => null,
      StatsDetailModal: () => null,
      LinkToShiftDialog: () => null,
    };
  }

  return originalLoad(request, parent, isMain);
};

const originalFetch = global.fetch;

let pageMod: any;
async function loadPage() {
  if (!pageMod) {
    pageMod = await import("../app/(withSidebar)/admin/reconciliation/page");
  }
  return pageMod;
}

function findButtonByText(text: string) {
  return Array.from(document.querySelectorAll("button")).find((btn) =>
    (btn.textContent || "").includes(text),
  ) as HTMLButtonElement | undefined;
}

function findDayButtonByText(text: string) {
  // Day buttons include weekday labels and the day number; textContent includes the day number.
  return Array.from(document.querySelectorAll("button")).find((btn) =>
    (btn.textContent || "").trim() === text,
  ) as HTMLButtonElement | undefined;
}

test.after(() => {
  (Module as any)._load = originalLoad;
  global.fetch = originalFetch;
  dom.window.close();
});

test.beforeEach(() => {
  document.body.innerHTML = "";
  toastCalls.length = 0;
  global.fetch = originalFetch;
});

test("Reconciliation: clears stale day data and shows retry UI when day fetch fails", async () => {
  // Sequence:
  // - stats fetch ok
  // - initial day fetch ok with one shift id 'shift-1'
  // - subsequent day fetch fails
  let dayFetchCount = 0;

  global.fetch = async (url: RequestInfo | URL) => {
    const urlStr = url.toString();

    if (urlStr.includes("/api/reconciliation/stats")) {
      return Response.json({
        stats: {
          totalShifts: 1,
          matchedShifts: 1,
          pendingReconciliation: 0,
          approvedCount: 1,
          flaggedCount: 0,
          noShowCount: 0,
          averageVarianceMinutes: 0,
          totalScheduledHours: 0,
          totalActualHours: 0,
        },
      });
    }

    if (urlStr.includes("/api/reconciliation/day/")) {
      dayFetchCount++;
      if (dayFetchCount === 1) {
        return Response.json({
          date: new Date("2025-01-01T00:00:00.000Z").toISOString(),
          shifts: [
            {
              shift: {
                id: "shift-1",
                employeeId: null,
                startTime: new Date("2025-01-01T09:00:00.000Z").toISOString(),
                endTime: new Date("2025-01-01T17:00:00.000Z").toISOString(),
                breakDuration: 0,
                role: null,
                attendanceStatus: "SCHEDULED",
                isPublished: true,
              },
              clockEntry: null,
              timesheetEntry: null,
              variance: {
                minutes: 0,
                type: "NONE",
                startVarianceMinutes: 0,
                endVarianceMinutes: 0,
              },
              reconciliationStatus: "PENDING",
            },
          ],
          unmatchedClockEntries: [],
          totalShifts: 1,
          matchedCount: 0,
          pendingCount: 1,
        });
      }

      return new Response("fail", { status: 500 });
    }

    return new Response("Not found", { status: 404 });
  };

  const mod = await loadPage();
  const Page = (mod as any).default;

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(Page));
    await new Promise((r) => setTimeout(r, 80));
  });

  // Initial successful day load should render shift-1
  assert.ok(document.querySelector('[data-testid="shift-shift-1"]'), "Expected initial shift to render");

  // Trigger refresh -> should call fetchDayData again and fail
  await act(async () => {
    findButtonByText("Refresh")?.click();
    await new Promise((r) => setTimeout(r, 80));
  });

  // Stale shift should be cleared
  assert.ok(
    !document.querySelector('[data-testid="shift-shift-1"]'),
    "Expected stale shift to be cleared when day fetch fails",
  );

  // Retry UI should show
  assert.ok(findButtonByText("Retry"), "Expected Retry button to be visible");

  // Toast should have been fired
  assert.ok(
    toastCalls.some((c) => (c.description || "").includes("Failed to load reconciliation data")),
    "Expected error toast",
  );

  root.unmount();
});
