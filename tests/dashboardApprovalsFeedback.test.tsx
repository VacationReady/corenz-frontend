import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import React from "react";
import { JSDOM } from "jsdom";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/dashboard/approvals",
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
let patchResult: { success: boolean; error?: Error } = {
  success: false,
  error: new Error("Approval failed"),
};

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "sonner") {
    return {
      toast: {
        success: (msg: string) => toastCalls.push({ type: "success", message: msg }),
        error: (msg: string) => toastCalls.push({ type: "error", message: msg }),
        loading: () => "loading",
        dismiss: () => {},
      },
    };
  }

  if (request === "canvas-confetti") {
    return () => {};
  }

  if (request === "framer-motion") {
    const Noop: any = ({ children, ...props }: any) =>
      React.createElement("div", props, children);
    return {
      __esModule: true,
      motion: new Proxy(
        {},
        {
          get: () => Noop,
        },
      ),
      AnimatePresence: ({ children }: any) =>
        React.createElement(React.Fragment, null, children),
    };
  }

  if (request === "@/hooks/useApi") {
    return {
      __esModule: true,
      useApi: (url: string) => {
        if (url === "/api/dashboard/metrics") {
          return { data: { canViewAllApprovals: true } };
        }
        if (url === "/api/leave-request") {
          return {
            data: {
              success: true,
              data: [
                {
                  id: "req-1",
                  type: "Annual",
                  startDate: new Date().toISOString(),
                  endDate: new Date().toISOString(),
                  reason: null,
                  approvalStatus: "PENDING",
                  employee: { user: { name: "Test User", email: "test@example.com" } },
                  approvalStages: [],
                  myDecision: { id: "dec-1", stageId: "stage-1", mode: "SINGLE" },
                },
              ],
            },
            isLoading: false,
            mutate: () => {},
          };
        }
        if (url === "/api/departments") {
          return { data: [] };
        }
        return { data: undefined, isLoading: false, mutate: () => {} };
      },
    };
  }

  if (request === "@/hooks/useMutationWithRefresh") {
    return {
      __esModule: true,
      usePatchMutation: () => ({
        trigger: async () => patchResult,
        isMutating: false,
      }),
    };
  }

  return originalLoad(request, parent, isMain);
};

const Page = (await import(
  "../app/(withSidebar)/dashboard/approvals/page"
)).default as React.ComponentType;

test.after(() => {
  (Module as any)._load = originalLoad;
  global.fetch = originalFetch;
  dom.window.close();
});

test.beforeEach(() => {
  toastCalls.length = 0;
  patchResult = { success: false, error: new Error("Approval failed"), };
  document.body.innerHTML = "";
  global.fetch = originalFetch;
});

test("shows toast error when approve mutation returns success:false", async () => {
  patchResult = { success: false, error: new Error("No permission") };

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(Page));
    await new Promise((r) => setTimeout(r, 0));
  });

  const approveButton = Array.from(document.querySelectorAll("button")).find((b) =>
    (b.textContent || "").includes("Approve"),
  ) as HTMLButtonElement | undefined;

  assert.ok(approveButton, "Approve button should be present");

  await act(async () => {
    approveButton!.dispatchEvent(
      new dom.window.MouseEvent("click", { bubbles: true }),
    );
    await new Promise((r) => setTimeout(r, 650));
  });

  assert.ok(
    toastCalls.some((c) => c.type === "error"),
    "toast.error should be called on mutation failure",
  );

  await act(async () => {
    root.unmount();
  });
  container.remove();
});
