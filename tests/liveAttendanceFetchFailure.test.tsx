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

const toastCalls: string[] = [];

const originalLoad = (Module as any)._load;
const originalFetch = global.fetch;

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "sonner") {
    return {
      toast: {
        error: (msg: string) => toastCalls.push(msg),
        success: () => {},
      },
    };
  }

  if (request === "lucide-react") {
    return new Proxy(
      {},
      {
        get: () => () => null,
      },
    );
  }

  if (request === "@/components/ui/Card") {
    return {
      Card: (props: any) => React.createElement("div", props, props.children),
      CardHeader: (props: any) => React.createElement("div", props, props.children),
      CardContent: (props: any) => React.createElement("div", props, props.children),
      CardTitle: (props: any) => React.createElement("div", props, props.children),
    };
  }

  if (request === "@/components/ui/Badge") {
    return {
      Badge: (props: any) => React.createElement("span", props, props.children),
    };
  }

  if (request === "@/components/ui/Button") {
    return {
      __esModule: true,
      default: (props: any) => React.createElement("button", props, props.children),
    };
  }

  if (request === "@/components/ui/Select") {
    const Pass = (props: any) => React.createElement("div", props, props.children);
    return {
      Select: Pass,
      SelectContent: Pass,
      SelectItem: Pass,
      SelectTrigger: Pass,
      SelectValue: Pass,
    };
  }

  if (request === "@/components/ui/tabs") {
    const Pass = (props: any) => React.createElement("div", props, props.children);
    return {
      Tabs: Pass,
      TabsContent: Pass,
      TabsList: Pass,
      TabsTrigger: Pass,
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};

let Page: any;
async function loadPage() {
  if (!Page) {
    const mod = await import("../app/(withSidebar)/admin/live-attendance/page");
    Page = (mod as any).default;
  }
  return Page;
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

test("Live Attendance: does not overwrite last-good rows when refresh returns non-2xx", async () => {
  let callCount = 0;

  global.fetch = async () => {
    callCount++;

    if (callCount === 1) {
      return Response.json({
        summary: {
          totalEmployees: 1,
          totalClockedIn: 1,
          totalClockedOut: 0,
          attendanceRate: "100.0",
        },
        employees: [
          {
            id: "emp-1",
            name: "Alice",
            email: "alice@example.com",
            status: "CLOCKED_IN",
            clockInTime: new Date("2025-01-01T00:00:00.000Z").toISOString(),
            hoursWorked: 1,
          },
        ],
        recentActivity: [],
        timestamp: new Date("2025-01-01T00:00:00.000Z").toISOString(),
      });
    }

    if (callCount === 2) {
      return new Response(JSON.stringify({ error: "Server down" }), {
        status: 500,
        headers: {
          "content-type": "application/json",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  };

  const Component = await loadPage();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(Component));
    await new Promise((r) => setTimeout(r, 60));
  });

  assert.ok(document.body.textContent?.includes("Alice"), "Expected last-good employee to render");

  await act(async () => {
    findButtonByText("Refresh Now")?.click();
    await new Promise((r) => setTimeout(r, 60));
  });

  assert.ok(
    document.body.textContent?.includes("Alice"),
    "Expected employee rows not to be overwritten/cleared by failed refresh",
  );

  assert.ok(
    toastCalls.some((m) => m.includes("Server down")),
    "Expected error toast to include server error detail",
  );

  root.unmount();
});

test("Live Attendance: does not overwrite last-good rows when refresh fetch rejects", async () => {
  let callCount = 0;

  global.fetch = async () => {
    callCount++;

    if (callCount === 1) {
      return Response.json({
        summary: {
          totalEmployees: 1,
          totalClockedIn: 0,
          totalClockedOut: 1,
          attendanceRate: "0.0",
        },
        employees: [
          {
            id: "emp-2",
            name: "Bob",
            email: "bob@example.com",
            status: "CLOCKED_OUT",
          },
        ],
        recentActivity: [],
        timestamp: new Date("2025-01-01T00:00:00.000Z").toISOString(),
      });
    }

    if (callCount === 2) {
      throw new Error("Network failed");
    }

    return new Response("Not found", { status: 404 });
  };

  const Component = await loadPage();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(Component));
    await new Promise((r) => setTimeout(r, 60));
  });

  assert.ok(document.body.textContent?.includes("Bob"), "Expected last-good employee to render");

  await act(async () => {
    findButtonByText("Refresh Now")?.click();
    await new Promise((r) => setTimeout(r, 60));
  });

  assert.ok(
    document.body.textContent?.includes("Bob"),
    "Expected employee rows not to be overwritten/cleared by rejected fetch",
  );

  assert.ok(
    toastCalls.some((m) => m.toLowerCase().includes("network failed")),
    "Expected error toast to include network failure message",
  );

  root.unmount();
});
