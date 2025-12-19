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
  if (request === "framer-motion") {
    const stripMotionProps = (props: any) => {
      const {
        initial,
        animate,
        exit,
        variants,
        transition,
        whileHover,
        whileTap,
        layout,
        layoutId,
        ...rest
      } = props ?? {};
      return rest;
    };

    const motion = new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          return React.forwardRef<any, any>((props, ref) =>
            React.createElement(
              prop,
              { ...stripMotionProps(props), ref },
              props?.children,
            ),
          );
        },
      },
    );

    return {
      __esModule: true,
      motion,
      AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
    };
  }

  if (request === "@/hooks/use-toast" || request === "@/app/hooks/use-toast") {
    return {
      useToast: () => ({
        toast: (args: any) => {
          toastCalls.push(args);
        },
      }),
    };
  }

  if (request === "@/components/reconciliation") {
    return {
      __esModule: true,
      ReconciliationStats: () => null,
      ShiftActualComparison: () => null,
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

function findFirstCheckbox() {
  return document.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
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

test("Reconciliation: clears selection after 'No Entries to Approve' bulk approve error", async () => {
  global.fetch = async (url: RequestInfo | URL) => {
    const urlStr = url.toString();

    if (urlStr.includes("/api/reconciliation/stats")) {
      return Response.json({
        stats: {
          totalShifts: 1,
          matchedShifts: 0,
          pendingReconciliation: 1,
          approvedCount: 0,
          flaggedCount: 0,
          noShowCount: 0,
          averageVarianceMinutes: 0,
          totalScheduledHours: 0,
          totalActualHours: 0,
        },
      });
    }

    if (urlStr.includes("/api/reconciliation/day/")) {
      return Response.json({
        date: new Date().toISOString(),
        shifts: [
          {
            shift: {
              id: "shift-1",
              employeeId: "emp-1",
              startTime: new Date("2025-01-01T09:00:00.000Z").toISOString(),
              endTime: new Date("2025-01-01T17:00:00.000Z").toISOString(),
              breakDuration: 30,
              role: "Cashier",
              attendanceStatus: "PRESENT",
              isPublished: true,
              employee: {
                id: "emp-1",
                User: {
                  name: "Test User",
                  firstName: "Test",
                  lastName: "User",
                  email: "test@example.com",
                  profileImageUrl: null,
                },
              },
            },
            clockEntry: {
              id: "clock-1",
              clockInTime: new Date("2025-01-01T09:01:00.000Z").toISOString(),
              clockOutTime: new Date("2025-01-01T17:02:00.000Z").toISOString(),
              matchConfidence: 0.9,
              shiftId: "shift-1",
            },
            timesheetEntry: null,
            variance: {
              minutes: 0,
              type: "ON_TIME",
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

    return new Response("Not found", { status: 404 });
  };

  const mod = await loadPage();
  const Page = (mod as any).default;

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(Page));
    await new Promise((r) => setTimeout(r, 120));
  });

  const checkbox = findFirstCheckbox();
  assert.ok(checkbox, "Expected a selectable checkbox to render");

  await act(async () => {
    checkbox!.click();
    await new Promise((r) => setTimeout(r, 30));
  });

  assert.ok(
    (document.body.textContent || "").includes("1 selected"),
    "Expected selection toolbar to show '1 selected'",
  );

  const bulkApprove = findButtonByText("Bulk Approve");
  assert.ok(bulkApprove, "Expected Bulk Approve button to render");

  // The UI may disable this button when nothing is approvable.
  // For this test we force-enable it to exercise the handler's error path.
  bulkApprove!.disabled = false;
  bulkApprove!.removeAttribute("disabled");

  await act(async () => {
    bulkApprove!.click();
    await new Promise((r) => setTimeout(r, 30));
  });

  assert.ok(
    toastCalls.some((c) => c.title === "No Entries to Approve"),
    "Expected 'No Entries to Approve' toast",
  );

  assert.ok(
    !(document.body.textContent || "").includes("1 selected"),
    "Expected selection toolbar to be removed after error path clears selection",
  );

  const checkboxAfter = findFirstCheckbox();
  assert.ok(checkboxAfter, "Expected checkbox to still exist");
  assert.equal(checkboxAfter!.checked, false, "Expected checkbox to be unchecked after selection clear");
});
