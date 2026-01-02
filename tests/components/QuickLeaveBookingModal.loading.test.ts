import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import React from "react";
import { JSDOM } from "jsdom";
import { render } from "@testing-library/react";
import * as rtl from "@testing-library/react";

const waitFor: any = (rtl as any).waitFor;

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
});

(globalThis as any).window = dom.window as any;
(globalThis as any).document = dom.window.document as any;
(globalThis as any).navigator = dom.window.navigator;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).CustomEvent = dom.window.CustomEvent;
(globalThis as any).Event = dom.window.Event;
(globalThis as any).DocumentFragment = dom.window.DocumentFragment;
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

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const originalLoad = (Module as any)._load;
const originalFetch = global.fetch;

const toastCalls: Array<{ type: "success" | "error"; message: string }> = [];

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next-auth/react") {
    return {
      useSession: () => ({
        data: {
          user: {
            id: "user1",
            companyId: "company1",
            role: "MANAGER",
            employeeId: "emp1",
          },
        },
        status: "authenticated",
      }),
      SessionProvider: ({ children }: any) => children,
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
      motion,
      AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
    };
  }

  return originalLoad(request, parent, isMain);
};

let QuickLeaveBookingModal: any;
async function loadComponent() {
  if (!QuickLeaveBookingModal) {
    QuickLeaveBookingModal = (await import(
      "../../app/(withSidebar)/calendar/QuickLeaveBookingModal"
    )).default;
  }
  return QuickLeaveBookingModal;
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

test("QuickLeaveBookingModal shows loading state and disables controls while fetching employees/categories", async () => {
  const Modal = await loadComponent();

  const employeesDeferred = createDeferred<Response>();

  global.fetch = (async (url: RequestInfo | URL) => {
    const urlStr = url.toString();

    if (urlStr.includes("/api/employees") && urlStr.includes("scope=direct")) {
      return employeesDeferred.promise;
    }

    if (urlStr.includes("/api/event-categories")) {
      return Response.json([]);
    }

    return new Response("Not found", { status: 404 });
  }) as any;

  render(
    React.createElement(Modal, {
      open: true,
      setOpen: () => {},
      defaultStartDate: null,
      defaultEndDate: null,
      onSubmitted: () => {},
    }),
  );

  await waitFor(() => {
    const employeeLoading = document.querySelector(
      '[data-testid="quick-leave-employees-loading"]',
    );
    assert.ok(employeeLoading, "Loading employees indicator should render");

    const employeeTrigger = document.querySelector(
      '[data-testid="quick-leave-employee-trigger"]',
    ) as HTMLButtonElement | null;
    assert.ok(employeeTrigger, "Employee trigger should exist");
    assert.ok(employeeTrigger.disabled, "Employee trigger should be disabled while fetching");

    const categoryTrigger = document.querySelector(
      '[data-testid="quick-leave-category-trigger"]',
    ) as HTMLElement | null;
    assert.ok(categoryTrigger, "Category trigger should exist");
    const disabled =
      categoryTrigger.hasAttribute("disabled") ||
      categoryTrigger.getAttribute("aria-disabled") === "true" ||
      categoryTrigger.getAttribute("data-disabled") !== null;
    assert.ok(disabled, "Category trigger should be disabled while fetching");

    assert.ok(
      (document.body.textContent || "").includes("Loading leave types"),
      "Leave type placeholder should indicate loading",
    );
  });

  employeesDeferred.resolve(
    Response.json([
      {
        id: "emp1",
        firstName: "Jane",
        lastName: "Doe",
        profileImageUrl: null,
        departmentName: "Engineering",
      },
    ]),
  );

  await waitFor(() => {
    const employeeTrigger = document.querySelector(
      '[data-testid="quick-leave-employee-trigger"]',
    ) as HTMLButtonElement | null;
    assert.ok(employeeTrigger, "Employee trigger should exist");
    assert.ok(!employeeTrigger.disabled, "Employee trigger should re-enable after fetch");
  });
});
