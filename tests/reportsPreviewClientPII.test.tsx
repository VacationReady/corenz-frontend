import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import React from "react";
import { JSDOM } from "jsdom";
import { createRoot, Root } from "react-dom/client";
import { act } from "react-dom/test-utils";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/reports/preview?fields=User.firstName",
});

(globalThis as any).window = dom.window as any;
(globalThis as any).document = dom.window.document as any;
(globalThis as any).navigator = dom.window.navigator;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).HTMLAnchorElement = dom.window.HTMLAnchorElement;
(globalThis as any).CustomEvent = dom.window.CustomEvent;
(globalThis as any).Event = dom.window.Event;
(globalThis as any).MouseEvent = dom.window.MouseEvent;
(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(() => cb(Date.now()), 0);
(globalThis as any).cancelAnimationFrame = (id: number) =>
  clearTimeout(id as any);
(globalThis as any).getComputedStyle = dom.window.getComputedStyle;

if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

let searchParamsMock = "fields=User.firstName";
const toastInvocations: unknown[] = [];
const infoLogs: unknown[] = [];

const originalLoad = (Module as any)._load;
const originalFetch = global.fetch;
const originalConsoleInfo = console.info;
const originalURL = global.URL;
const originalBlob = (globalThis as any).Blob;

let createObjectUrlCalls = 0;
const originalCreateObjectURL = dom.window.URL.createObjectURL;
const originalRevokeObjectURL = dom.window.URL.revokeObjectURL;
dom.window.URL.createObjectURL = () => {
  createObjectUrlCalls += 1;
  return "blob:mock";
};
dom.window.URL.revokeObjectURL = () => {};
(globalThis as any).URL = dom.window.URL;

(globalThis as any).Blob = class {
  parts: unknown[];
  options: unknown;
  constructor(parts: unknown[], options?: unknown) {
    this.parts = parts;
    this.options = options;
  }
};

console.info = (...args: unknown[]) => {
  infoLogs.push(args);
};

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next/navigation") {
    return {
      useRouter: () => ({
        push: () => {},
        replace: () => {},
        prefetch: async () => {},
        refresh: () => {},
        back: () => {},
      }),
      useSearchParams: () => new URLSearchParams(searchParamsMock),
    };
  }
  if (request === "@/components/reports/FilterableDataTable") {
    return {
      __esModule: true,
      default: (props: any) => {
        React.useEffect(() => {
          props.onFilteredDataChange?.(props.data);
        }, [props.data, props.onFilteredDataChange]);
        return React.createElement("div", { "data-testid": "mock-table" });
      },
    };
  }
  if (request === "@/components/ui/dialog") {
    return {
      __esModule: true,
      Dialog: ({ open, children, onOpenChange }: any) => {
        React.useEffect(() => {
          onOpenChange?.(open);
        }, [open, onOpenChange]);
        return open ? React.createElement(React.Fragment, null, children) : null;
      },
      DialogContent: ({ children }: any) =>
        React.createElement("div", { "data-dialog": "content" }, children),
      DialogHeader: ({ children }: any) =>
        React.createElement("div", { "data-dialog": "header" }, children),
      DialogFooter: ({ children }: any) =>
        React.createElement("div", { "data-dialog": "footer" }, children),
      DialogTitle: ({ children }: any) => React.createElement("h2", null, children),
      DialogDescription: ({ children }: any) => React.createElement("p", null, children),
    };
  }
  if (request === "@/hooks/use-toast") {
    return {
      __esModule: true,
      useToast: () => ({
        toast: (...args: unknown[]) => {
          toastInvocations.push(args);
        },
      }),
      toast: (...args: unknown[]) => {
        toastInvocations.push(args);
      },
    };
  }
  if (request === "papaparse") {
    return {
      __esModule: true,
      default: {
        unparse: () => "col1\nvalue",
      },
    };
  }
  return originalLoad(request, parent, isMain);
};

test.after(() => {
  (Module as any)._load = originalLoad;
  global.fetch = originalFetch;
  console.info = originalConsoleInfo;
  dom.window.URL.createObjectURL = originalCreateObjectURL;
  dom.window.URL.revokeObjectURL = originalRevokeObjectURL;
  global.URL = originalURL;
  if (originalBlob) {
    (globalThis as any).Blob = originalBlob;
  } else {
    delete (globalThis as any).Blob;
  }
  dom.window.close();
});

test("blocks CSV download until PII confirmation", async () => {
  createObjectUrlCalls = 0;
  infoLogs.length = 0;
  toastInvocations.length = 0;
  const ReportsPreviewClient = (
    await import("../app/reports/preview/ReportsPreviewClient")
  ).default as React.ComponentType;

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: Root | null = null;

  global.fetch = (async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input?.url ?? String(input);
    if (url.endsWith("/api/reports/fields")) {
      return {
        ok: true,
        json: async () => [
          { field: "User.firstName", label: "First Name", isPII: true },
          { field: "Employee.startDate", label: "Start Date", isPII: false },
        ],
      };
    }
    if (url.endsWith("/api/reports/query")) {
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              User: { firstName: "Alice" },
              Employee: { startDate: "2024-01-01" },
            },
          ],
        }),
      };
    }
    throw new Error(`Unhandled fetch for ${url}`);
  }) as typeof fetch;

  await act(async () => {
    root = createRoot(container);
    root.render(React.createElement(ReportsPreviewClient));
  });

  await act(async () => {
    await flushPromises();
  });
  await act(async () => {
    await flushPromises();
  });

  const findButtonByLabel = async (text: string) => {
    for (let i = 0; i < 10; i += 1) {
      const button = Array.from(document.querySelectorAll("button")).find((el) =>
        (el.textContent || "").includes(text),
      );
      if (button) {
        return button as HTMLButtonElement;
      }
      await act(async () => {
        await flushPromises();
      });
    }
    throw new Error(`Button with text ${text} not found`);
  };

  const downloadButton = await findButtonByLabel("Download CSV");
  assert.ok(downloadButton, "download button should be present");

  await act(async () => {
    downloadButton.dispatchEvent(
      new dom.window.MouseEvent("click", { bubbles: true }),
    );
  });

  assert.strictEqual(createObjectUrlCalls, 0, "download should be blocked until confirmation");

  const confirmButton = await findButtonByLabel("Confirm");
  assert.ok(confirmButton, "confirmation dialog should be visible");

  await act(async () => {
    confirmButton.dispatchEvent(
      new dom.window.MouseEvent("click", { bubbles: true }),
    );
    await flushPromises();
  });

  assert.strictEqual(createObjectUrlCalls, 1, "download should proceed after confirmation");
  assert.ok(infoLogs.length >= 1, "PII acknowledgement should be logged");
  assert.ok(toastInvocations.length >= 1, "PII acknowledgement toast should be triggered");

  await act(async () => {
    root?.unmount();
  });
  container.remove();
});
