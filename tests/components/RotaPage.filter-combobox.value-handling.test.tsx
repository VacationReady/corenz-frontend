import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import React from "react";
import { JSDOM } from "jsdom";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/rota",
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

const iconProxy = new Proxy(
  {},
  {
    get: (_target, prop: string) => {
      return function IconMock() {
        return React.createElement("span", {
          "data-icon": String(prop),
        });
      };
    },
  },
);

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next-auth/react") {
    return {
      useSession: () => ({
        data: null,
        status: "authenticated",
      }),
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

  if (request === "lucide-react") {
    return iconProxy;
  }

  if (request === "date-fns") {
    return {
      format: () => "",
      startOfWeek: (d: Date) => d,
      endOfWeek: (d: Date) => d,
    };
  }

  if (request.startsWith("@/")) {
    if (
      request === "@/components/ui/command" ||
      request === "@/components/ui/popover" ||
      request === "@/components/ui/label" ||
      request === "@/lib/utils"
    ) {
      return originalLoad(request, parent, isMain);
    }

    return {
      __esModule: true,
      default: function Stub() {
        return null;
      },
    };
  }

  return originalLoad(request, parent, isMain);
};

let FilterCombobox: any;
async function loadComponent() {
  if (!FilterCombobox) {
    const rotaModule = await import("../../app/(withSidebar)/rota/page");
    FilterCombobox = rotaModule.FilterCombobox;
  }
  return FilterCombobox;
}

function findButtonByText(text: string) {
  return Array.from(document.querySelectorAll("button")).find((btn) =>
    (btn.textContent || "").includes(text),
  ) as HTMLButtonElement | undefined;
}

test.after(() => {
  (Module as any)._load = originalLoad;
  dom.window.close();
});

test.beforeEach(() => {
  document.body.innerHTML = "";
});

test("Rota filter combobox: CommandItem uses option.value for data-value and selection", async () => {
  const Component = await loadComponent();

  const options = [
    { value: "dep-1", label: "Sales" },
    { value: "dep-2", label: "Sales" },
    { value: "dep-eng", label: "Engineering" },
  ];

  let selectedValue: string | null = null;

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      React.createElement(Component, {
        label: "Department",
        placeholder: "All departments",
        options,
        value: "",
        onChange: (nextValue: string) => {
          selectedValue = nextValue;
        },
      }),
    );
    await new Promise((r) => setTimeout(r, 25));
  });

  await act(async () => {
    findButtonByText("All departments")?.click();
    await new Promise((r) => setTimeout(r, 25));
  });

  const input = document.querySelector("input") as HTMLInputElement | null;
  assert.ok(input, "Combobox search input should exist");

  await act(async () => {
    input.value = "dep-2";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 25));
  });

  const optionEl = document.querySelector('[data-value="dep-2"]') as HTMLElement | null;
  assert.ok(optionEl, "Should render an option with data-value=dep-2");

  await act(async () => {
    optionEl.click();
    await new Promise((r) => setTimeout(r, 25));
  });

  assert.equal(selectedValue, "dep-2", "Should call onChange with option.value");

  const triggerAfter = findButtonByText("Sales");
  assert.ok(triggerAfter, "Trigger should display selected option label");

  root.unmount();
});
