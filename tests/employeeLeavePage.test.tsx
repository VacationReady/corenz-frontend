import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import React from "react";
import { JSDOM } from "jsdom";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/employees/emp1/leave",
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

let searchParamsMock = "";
const routerReplacements: string[] = [];

const originalLoad = (Module as any)._load;
const originalFetch = global.fetch;

(Module as any)._load = function (
  request: string,
  parent: any,
  isMain: boolean,
) {
  if (request === "next/navigation") {
    return {
      useRouter: () => ({
        replace: (url: string) => routerReplacements.push(url),
        push: () => {},
        prefetch: () => Promise.resolve(),
        refresh: () => {},
      }),
      usePathname: () => "/employees/emp1/leave",
      useSearchParams: () => new URLSearchParams(searchParamsMock),
    };
  }
  if (request === "next-auth/react") {
    return {
      useSession: () => ({ data: { user: { role: "ADMIN" } } }),
    };
  }
  if (request === "@/components/AddLeaveRequestDialog") {
    return {
      __esModule: true,
      default: (props: any) =>
        React.createElement(
          "button",
          {
            type: "button",
            "data-testid": "open-add-leave",
            onClick: () => props.onSubmitted?.(),
          },
          "Add leave",
        ),
    };
  }
  return originalLoad(request, parent, isMain);
};

const Page = (await import(
  "../app/(withSidebar)/employees/[id]/leave/page"
)).default as React.ComponentType<{ params: { id: string } }>;

test.after(() => {
  (Module as any)._load = originalLoad;
  global.fetch = originalFetch;
  dom.window.close();
});

test.beforeEach(() => {
  searchParamsMock = "";
  routerReplacements.length = 0;
  document.body.innerHTML = "";
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

test("loads leave requests and renders sections", async () => {
  const fetchCalls: string[] = [];
  const firstFetch = createDeferred<{
    ok: boolean;
    json: () => Promise<any>;
  }>();

  global.fetch = (async (...args: any[]) => {
    const url = typeof args[0] === "string" ? args[0] : String(args[0]);
    fetchCalls.push(url);
    if (fetchCalls.length === 1) {
      return firstFetch.promise;
    }
    return {
      ok: true,
      json: async () => [],
    } as any;
  }) as any;

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(React.createElement(Page, { params: { id: "emp1" } }));
  });

  const loading = container.querySelector('[data-testid="leave-loading"]');
  assert.ok(loading, "loading skeleton should render while fetching");

  const now = Date.now();
  firstFetch.resolve({
    ok: true,
    json: async () => [
      {
        id: "leave-1",
        startDate: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        EventCategory: { id: "ec1", name: "Annual Leave" },
        approvalStatus: "APPROVED",
        dayType: "FULL_DAY",
      },
      {
        id: "leave-2",
        startDate: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
        EventCategory: { id: "ec2", name: "Conference" },
        approvalStatus: "APPROVED",
        dayType: "HALF_DAY_AM",
      },
    ],
  });

  await act(async () => {
    await Promise.resolve();
  });

  assert.equal(fetchCalls.length, 1);
  assert.ok(
    fetchCalls[0].includes(
      "/api/employees/emp1/leave-requests?upcoming=true&limit=3",
    ),
    "fetch should include default query params",
  );

  assert.ok(
    !container.querySelector('[data-testid="leave-loading"]'),
    "loading indicator should clear after fetch",
  );

  const currentSection = container.querySelector('[data-testid="leave-current"]');
  assert.ok(currentSection?.textContent?.includes("Annual Leave"));
  const upcomingSection = container.querySelector('[data-testid="leave-upcoming"]');
  assert.ok(upcomingSection?.textContent?.includes("Conference"));

  await act(async () => {
    root.unmount();
  });
  container.remove();
});

test("respects query params and shows empty state", async () => {
  searchParamsMock = "limit=8&upcoming=false";

  const fetchCalls: string[] = [];
  global.fetch = (async (...args: any[]) => {
    const url = typeof args[0] === "string" ? args[0] : String(args[0]);
    fetchCalls.push(url);
    return {
      ok: true,
      json: async () => [],
    } as any;
  }) as any;

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(React.createElement(Page, { params: { id: "emp1" } }));
  });

  await act(async () => {
    await Promise.resolve();
  });

  assert.equal(fetchCalls.length, 1);
  assert.ok(
    fetchCalls[0].includes(
      "/api/employees/emp1/leave-requests?upcoming=false&limit=8",
    ),
    "fetch should forward provided query params",
  );

  const emptyState = container.querySelector('[data-testid="leave-empty"]');
  assert.ok(emptyState, "empty state should render when no leave is returned");

  await act(async () => {
    root.unmount();
  });
  container.remove();
});

test("refreshes data after creating leave", async () => {
  const responses = [
    [
      {
        id: "initial",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        EventCategory: { id: "ec", name: "Initial" },
        approvalStatus: "APPROVED",
      },
    ],
    [
      {
        id: "second",
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        EventCategory: { id: "ec2", name: "Team Retreat" },
        approvalStatus: "APPROVED",
      },
    ],
  ];
  let callIndex = 0;

  global.fetch = (async (...args: any[]) => {
    const url = typeof args[0] === "string" ? args[0] : String(args[0]);
    const data =
      responses[Math.min(callIndex, responses.length - 1)] ?? responses[0];
    callIndex += 1;
    return {
      ok: true,
      json: async () => data,
    } as any;
  }) as any;

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(React.createElement(Page, { params: { id: "emp1" } }));
  });

  await act(async () => {
    await Promise.resolve();
  });

  assert.equal(callIndex, 1, "initial fetch should run once");

  const addButton = container.querySelector(
    '[data-testid="open-add-leave"]',
  ) as HTMLButtonElement | null;
  assert.ok(addButton, "stub add leave button should be rendered");

  await act(async () => {
    addButton!.dispatchEvent(
      new dom.window.MouseEvent("click", { bubbles: true }),
    );
    await Promise.resolve();
  });

  assert.equal(callIndex, 2, "refresh should trigger a second fetch");
  const content = `${
    container.querySelector('[data-testid="leave-current"]')?.textContent ??
    ""
  } ${
    container.querySelector('[data-testid="leave-upcoming"]')?.textContent ??
    ""
  }`;
  assert.ok(
    content.includes("Team Retreat"),
    "updated leave should render after refresh",
  );

  await act(async () => {
    root.unmount();
  });
  container.remove();
});
