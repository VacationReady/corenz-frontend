import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import React from "react";
import { JSDOM } from "jsdom";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/dashboard/admin",
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

function jsonResponse(body: any, init?: { status?: number }) {
  const status = init?.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as any;
}

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "sonner") {
    return {
      toast: {
        success: () => {},
        error: () => {},
      },
    };
  }

  if (request === "next-auth/react") {
    return {
      useSession: () => ({ status: "authenticated", data: { user: { companyId: "test-company" } } }),
    };
  }

  if (request === "@/hooks/useTenantFetch") {
    return {
      useTenantFetch: () => (url: string, init?: RequestInit) =>
        fetch(url, init as any),
    };
  }

  return originalLoad(request, parent, isMain);
};

let AdminDashboardModule: any;
async function loadCompactApprovalsList() {
  if (!AdminDashboardModule) {
    AdminDashboardModule = await import(
      "../app/(withSidebar)/dashboard/admin/AdminDashboardClient"
    );
  }
  return AdminDashboardModule.CompactApprovalsList;
}

test.after(() => {
  (Module as any)._load = originalLoad;
  global.fetch = originalFetch;
  dom.window.close();
});

test.beforeEach(() => {
  document.body.innerHTML = "";
  global.fetch = originalFetch;
});

test("CompactApprovalsList: clicking Approve/Decline does not trigger row onClick", async () => {
  const CompactApprovalsList = await loadCompactApprovalsList();
  const opened: any[] = [];
  const onOpenApprovalItem = (item: any) => opened.push(item);

  global.fetch = (async (url: any, init?: any) => {
    const href = String(url);

    // Initial list load
    if (href.startsWith("/api/approvals?")) {
      return jsonResponse({
        items: [
          {
            id: "leave-1",
            typeName: "Annual",
            employee: { name: "Jane Doe", userId: "user-1" },
            employeeId: "emp-1",
            eventCategoryId: "cat-1",
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            dates: "Today",
          },
        ],
      });
    }

    if (href.startsWith("/api/transactional-change-requests")) {
      return jsonResponse({ data: [] });
    }

    // Avatar signing fallback
    if (href.startsWith("/api/users/") && href.endsWith("/profile-image")) {
      return jsonResponse({ url: null });
    }

    // Action calls
    if (href === "/api/approvals/leave-1" && init?.method === "POST") {
      return jsonResponse({}, { status: 200 });
    }

    return jsonResponse({}, { status: 200 });
  }) as any;

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      React.createElement(CompactApprovalsList as any, {
        scope: "my",
        onOpenApprovalItem,
      }),
    );

    // Let the initial effect run
    await new Promise((r) => setTimeout(r, 0));
  });

  const approveButton = Array.from(document.querySelectorAll("button")).find(
    (b) => (b.textContent || "").trim() === "Approve",
  ) as HTMLButtonElement | undefined;

  const declineButton = Array.from(document.querySelectorAll("button")).find(
    (b) => (b.textContent || "").trim() === "Decline",
  ) as HTMLButtonElement | undefined;

  assert.ok(approveButton, "Approve button should be present");
  assert.ok(declineButton, "Decline button should be present");

  await act(async () => {
    approveButton!.dispatchEvent(
      new dom.window.MouseEvent("click", { bubbles: true }),
    );
    await new Promise((r) => setTimeout(r, 0));
  });

  assert.equal(
    opened.length,
    0,
    "Clicking Approve should not trigger onOpenApprovalItem",
  );

  // Re-render fresh (because approve removes item)
  document.body.innerHTML = "";
  const container2 = document.createElement("div");
  document.body.appendChild(container2);
  const root2 = createRoot(container2);

  await act(async () => {
    root2.render(
      React.createElement(CompactApprovalsList as any, {
        scope: "my",
        onOpenApprovalItem,
      }),
    );
    await new Promise((r) => setTimeout(r, 0));
  });

  const declineButton2 = Array.from(document.querySelectorAll("button")).find(
    (b) => (b.textContent || "").trim() === "Decline",
  ) as HTMLButtonElement | undefined;

  assert.ok(declineButton2, "Decline button should be present (second render)");

  await act(async () => {
    declineButton2!.dispatchEvent(
      new dom.window.MouseEvent("click", { bubbles: true }),
    );
    await new Promise((r) => setTimeout(r, 0));
  });

  assert.equal(
    opened.length,
    0,
    "Clicking Decline should not trigger onOpenApprovalItem",
  );

  await act(async () => {
    root.unmount();
    root2.unmount();
  });

  container.remove();
  container2.remove();
});
