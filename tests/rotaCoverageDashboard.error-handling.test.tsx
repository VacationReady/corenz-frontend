import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import React from "react";
import { JSDOM } from "jsdom";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/rota/coverage?groupId=group-1",
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
(globalThis as any).cancelAnimationFrame = (id: number) =>
  clearTimeout(id as any);

if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const originalLoad = (Module as any)._load;
const originalFetch = global.fetch;

let currentSearchParams: URLSearchParams = new URLSearchParams("groupId=group-1");

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next/navigation") {
    return {
      useSearchParams: () => currentSearchParams,
    };
  }

  if (request === "next/link") {
    return {
      __esModule: true,
      default: function LinkMock(props: any) {
        return React.createElement("a", { href: props.href }, props.children);
      },
    };
  }

  return originalLoad(request, parent, isMain);
};

let CoverageDashboardPage: any;
async function loadComponent() {
  if (!CoverageDashboardPage) {
    CoverageDashboardPage = (await import(
      "../app/(withSidebar)/rota/coverage/page"
    )).default;
  }
  return CoverageDashboardPage;
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
  global.fetch = originalFetch;
  currentSearchParams = new URLSearchParams("groupId=group-1");
});

test("Rota coverage dashboard: shows error alert when fetch fails and retries successfully", async () => {
  const Page = await loadComponent();

  let callCount = 0;
  global.fetch = async (url: RequestInfo | URL) => {
    const urlStr = url.toString();
    if (!urlStr.includes("/api/rota-groups/group-1/coverage")) {
      return new Response("Not found", { status: 404 });
    }

    callCount += 1;

    if (callCount === 1) {
      return Response.json({ error: "Boom" }, { status: 500 });
    }

    return Response.json({
      weekStart: "2025-01-06",
      weekEnd: "2025-01-12",
      rotaGroup: { id: "group-1", name: "Group One", icon: "📋" },
      summary: { totalGaps: 0, criticalGaps: 0, highGaps: 0, totalRequirements: 10 },
      gaps: [],
    });
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(Page));
    await new Promise((r) => setTimeout(r, 50));
  });

  const initialContent = document.body.textContent || "";
  assert.ok(
    initialContent.includes("Couldn’t load coverage analysis") ||
      initialContent.includes("Couldn't load coverage analysis"),
    "Should render an error alert heading when fetch fails",
  );
  assert.ok(initialContent.includes("Boom"), "Should show server-provided error message");

  await act(async () => {
    findButtonByText("Retry")?.click();
    await new Promise((r) => setTimeout(r, 50));
  });

  const afterRetryContent = document.body.textContent || "";
  assert.ok(
    afterRetryContent.includes("Perfect Coverage!") || afterRetryContent.includes("Coverage Analysis"),
    "Should render success UI after retry",
  );

  root.unmount();
});
