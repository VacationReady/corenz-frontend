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

  // Replace heavy reconciliation components with very small renderers.
  if (request === "@/components/reconciliation") {
    return {
      __esModule: true,
      ReconciliationStats: () => React.createElement("div", null, "Stats loaded"),
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

test("Reconciliation: shows inline stats error + retry when weekly stats fetch fails", async () => {
  let statsFetchCount = 0;

  global.fetch = async (url: RequestInfo | URL) => {
    const urlStr = url.toString();

    if (urlStr.includes("/api/reconciliation/stats")) {
      statsFetchCount++;

      if (statsFetchCount === 1) {
        return new Response(JSON.stringify({ error: "Boom" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

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
      return Response.json({
        date: new Date("2025-01-01T00:00:00.000Z").toISOString(),
        shifts: [],
        unmatchedClockEntries: [],
        totalShifts: 0,
        matchedCount: 0,
        pendingCount: 0,
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
    await new Promise((r) => setTimeout(r, 80));
  });

  // Inline banner should be visible
  assert.ok(
    (document.body.textContent || "").includes("Unable to load weekly stats"),
    "Expected stats error banner",
  );

  // Retry should be visible
  const retry = findButtonByText("Retry stats");
  assert.ok(retry, "Expected Retry stats button");

  // Toast should be fired with Boom
  assert.ok(
    toastCalls.some((c) => (c.description || "").includes("Boom")),
    "Expected stats error toast",
  );

  await act(async () => {
    retry.click();
    await new Promise((r) => setTimeout(r, 80));
  });

  // Error should be gone and stats component should render
  assert.ok(
    !(document.body.textContent || "").includes("Unable to load weekly stats"),
    "Expected stats error banner to clear after retry",
  );
  assert.ok(
    (document.body.textContent || "").includes("Stats loaded"),
    "Expected stats to render after successful retry",
  );

  root.unmount();
});
