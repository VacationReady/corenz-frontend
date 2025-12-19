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

const toastCalls: Array<{ type: string; message: string }> = [];

let swrMutateCalls = 0;

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next-auth/react") {
    return {
      useSession: () => ({
        data: { user: { companyId: "test-company", id: "user-1" } },
        status: "authenticated",
      }),
    };
  }

  if (request === "sonner") {
    return {
      toast: {
        success: (msg: string) => toastCalls.push({ type: "success", message: msg }),
        error: (msg: string) => toastCalls.push({ type: "error", message: msg }),
      },
    };
  }

  if (request === "swr") {
    return {
      __esModule: true,
      default: (key: any) => {
        if (typeof key === "string" && key.startsWith("/api/action-items")) {
          return {
            data: {
              success: true,
              data: [
                {
                  id: "ai-1",
                  type: "TASK",
                  title: "Test action item",
                  status: "PENDING",
                  priority: "LOW",
                  dueDate: null,
                  relatedEmployee: null,
                  metadata: {},
                  createdAt: new Date().toISOString(),
                },
              ],
            },
            mutate: () => {
              swrMutateCalls += 1;
            },
          };
        }

        // Any other SWR calls should be treated as "no data" for this test
        return { data: null, mutate: () => {} };
      },
    };
  }

  // UnifiedActionItems imports lucide icons; keep as real.
  return originalLoad(request, parent, isMain);
};

let UnifiedActionItems: any;
async function loadComponent() {
  if (!UnifiedActionItems) {
    UnifiedActionItems = (await import("../app/components/dashboard/UnifiedActionItems"))
      .UnifiedActionItems;
  }
  return UnifiedActionItems;
}

test.after(() => {
  (Module as any)._load = originalLoad;
  global.fetch = originalFetch;
  dom.window.close();
});

test.beforeEach(() => {
  document.body.innerHTML = "";
  toastCalls.length = 0;
  swrMutateCalls = 0;
  global.fetch = originalFetch;
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("Dashboard Action Items: shows error toast when Complete returns non-OK and disables while in-flight", async () => {
  const deferred = createDeferred<Response>();

  global.fetch = ((url: any, init?: any) => {
    if (url === "/api/action-items" && init?.method === "PATCH") {
      return deferred.promise;
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({}),
      text: async () => "{}",
    } as Response);
  }) as any;

  const Comp = await loadComponent();

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(Comp, { employeeId: "emp-1" }));
  });

  // There should be a "Complete" button for the action item
  const button = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === "Complete",
  ) as HTMLButtonElement | undefined;

  assert.ok(button, "Expected to find Complete button");
  assert.equal(button.disabled, false);

  // Click complete, should disable immediately while fetch is pending
  await act(async () => {
    button.click();
  });

  assert.equal(button.disabled, true, "Complete button should be disabled while request in-flight");

  // Resolve with non-OK response
  deferred.resolve({
    ok: false,
    status: 500,
    text: async () => JSON.stringify({ error: "Server blew up" }),
    json: async () => ({ error: "Server blew up" }),
  } as any);

  // Allow state to flush
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

  assert.ok(
    toastCalls.some((c) => c.type === "error" && c.message.includes("Server blew up")),
    "Expected error toast to contain server error message",
  );

  assert.equal(swrMutateCalls, 0, "Should not mutate action items on failed completion");

  // Should re-enable after completion
  assert.equal(button.disabled, false, "Complete button should be re-enabled after request finishes");
});
