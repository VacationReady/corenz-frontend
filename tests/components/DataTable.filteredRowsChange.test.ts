import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import React from "react";
import { JSDOM } from "jsdom";
import { createRoot } from "react-dom/client";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
});

(globalThis as any).window = dom.window as any;
(globalThis as any).document = dom.window.document as any;
(globalThis as any).navigator = dom.window.navigator;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).CustomEvent = dom.window.CustomEvent;
(globalThis as any).Event = dom.window.Event;
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
let DataTable: any;

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "@/components/ui/popover") {
    return {
      Popover: ({ children }: any) => React.createElement(React.Fragment, null, children),
      PopoverTrigger: ({ children }: any) => React.createElement(React.Fragment, null, children),
      PopoverContent: ({ children }: any) => React.createElement("div", null, children),
    };
  }
  return originalLoad(request, parent, isMain);
};

async function loadComponent() {
  if (!DataTable) {
    DataTable = (await import("../../app/components/ui/data-table")).DataTable;
  }
  return DataTable;
}

test.after(() => {
  (Module as any)._load = originalLoad;
  dom.window.close();
});

test.beforeEach(() => {
  document.body.innerHTML = "";
  DataTable = null;
});

async function waitFor(condition: () => void, timeoutMs = 1500) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      condition();
      return;
    } catch (err) {
      if (Date.now() - start > timeoutMs) throw err;
      await new Promise((r) => setTimeout(r, 10));
    }
  }
}

function setNativeValue(element: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
    return;
  }

  if (valueSetter) {
    valueSetter.call(element, value);
    return;
  }

  // Fallback
  (element as any).value = value;
}

test("DataTable calls onFilteredRowsChange when column filters change (without JSON.stringify)", async () => {
  const Table = await loadComponent();
  const circular: any = {};
  circular.self = circular;

  const data = [
    { email: "b@example.com", meta: circular },
    { email: "c@example.com", meta: circular },
    { email: "a@example.com", meta: circular },
  ];

  const columns = [{ accessorKey: "email", header: "Email" }];

  const calls: any[] = [];
  const onFilteredRowsChange = (rows: any[]) => {
    calls.push(rows);
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  root.render(
    React.createElement(Table as any, {
      columns,
      data,
      onFilteredRowsChange,
    }),
  );

  await waitFor(() => assert.ok(calls.length > 0));

  assert.equal(calls[calls.length - 1]?.length, 3);
  const initialCallCount = calls.length;

  const headerCell = Array.from(document.querySelectorAll("th")).find((th) =>
    (th.textContent ?? "").includes("Email"),
  ) as HTMLTableCellElement | undefined;
  assert.ok(headerCell, "Email header should render");

  const sortTarget = headerCell.querySelector("div.cursor-pointer") as HTMLDivElement | null;
  assert.ok(sortTarget, "Header should be clickable to sort");

  sortTarget.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

  await waitFor(() => {
    assert.ok(calls.length > initialCallCount);
    const last = calls[calls.length - 1];
    assert.equal(last.length, 3);
    assert.equal(last[0]?.email, "a@example.com");
    assert.equal(last[1]?.email, "b@example.com");
    assert.equal(last[2]?.email, "c@example.com");
  });

  root.unmount();
  container.remove();
});
