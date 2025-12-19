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

const toastCalls: Array<{ type: "success" | "error"; message: string }> = [];

let tenantFetchImpl: any;

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next-auth/react") {
    return {
      useSession: () => ({
        data: {
          user: {
            id: "user-1",
            email: "test@example.com",
            role: "ADMIN",
            companyId: "company-1",
          },
        },
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

  if (request === "@/hooks/useTenantFetch") {
    return {
      useTenantFetch: () => tenantFetchImpl,
    };
  }

  if (request === "@/lib/fetchData") {
    return {
      fetchEmployees: async () => [],
    };
  }

  if (request === "@/components/documents/FieldPlacementModal") {
    return {
      __esModule: true,
      default: function FieldPlacementModalMock(props: any) {
        if (props?.isOpen) {
          props.onSaveFields([
            {
              type: "SIGNATURE",
              page: 1,
              x: 100,
              y: 100,
              width: 200,
              height: 50,
            },
          ]);
        }
        return null;
      },
    };
  }

  return originalLoad(request, parent, isMain);
};

let AddDocumentModal: any;
async function loadComponent() {
  if (!AddDocumentModal) {
    AddDocumentModal = (await import(
      "../../app/components/documents/AddDocumentModal"
    )).default;
  }
  return AddDocumentModal;
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

test("AddDocumentModal: does not close modal or show success when signature-fields save fails", async () => {
  global.fetch = async (url: RequestInfo | URL) => {
    const urlStr = url.toString();
    if (urlStr.includes("/api/departments/active")) {
      return Response.json([]);
    }
    if (urlStr.includes("/api/job-roles/active")) {
      return Response.json([]);
    }
    if (urlStr.includes("/api/document-categories")) {
      return Response.json([]);
    }
    return new Response("Not found", { status: 404 });
  };

  tenantFetchImpl = async (url: string) => {
    if (url.includes("/api/documents/upload")) {
      return {
        ok: true,
        json: async () => ({ Document: { id: "doc-1" } }),
      };
    }

    if (url.includes("/api/documents/signature-fields/doc-1")) {
      return {
        ok: false,
        json: async () => ({ error: "Sig save failed" }),
        text: async () => "",
      };
    }

    return {
      ok: false,
      json: async () => ({ error: "Unexpected request" }),
      text: async () => "Unexpected request",
    };
  };

  const Modal = await loadComponent();
  const mockOnClose = () => {
    closeCalled = true;
  };
  let closeCalled = false;

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(Modal, { open: true, onClose: mockOnClose }));
    await new Promise((r) => setTimeout(r, 50));
  });

  await act(async () => {
    findButtonByText("Employee Document")?.click();
    await new Promise((r) => setTimeout(r, 10));
  });

  await act(async () => {
    const titleInput = Array.from(document.querySelectorAll("input")).find(
      (inp) => (inp as HTMLInputElement).placeholder === "Enter document title",
    ) as HTMLInputElement | undefined;
    assert.ok(titleInput, "Title input should exist");
    titleInput.value = "Test Document";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    titleInput.dispatchEvent(new Event("change", { bubbles: true }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    assert.ok(fileInput, "File input should exist");

    const file = new File(["dummy"], "test.pdf", { type: "application/pdf" });
    Object.defineProperty(fileInput, "files", { value: [file] });
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));

    await new Promise((r) => setTimeout(r, 30));
  });

  await act(async () => {
    const signatureLabel = Array.from(document.querySelectorAll("label")).find((l) =>
      (l.textContent || "").includes("Requires Signature"),
    );
    assert.ok(signatureLabel, "Requires Signature label should exist");

    const labelContainer = signatureLabel.closest("div");
    const leftGroup = labelContainer?.parentElement;
    const row = leftGroup?.parentElement;
    const switchButton = (row?.querySelector('button[role="switch"]') || row?.querySelector("button")) as
      | HTMLButtonElement
      | undefined;
    assert.ok(switchButton, "Signature switch should exist");
    switchButton.click();
    await new Promise((r) => setTimeout(r, 10));
  });

  await act(async () => {
    findButtonByText("Preview & Place Fields")?.click();
    await new Promise((r) => setTimeout(r, 10));
  });

  await act(async () => {
    findButtonByText("Upload Document")?.click();
    await new Promise((r) => setTimeout(r, 50));
  });

  assert.ok(
    toastCalls.some((c) => c.type === "error" && c.message.includes("Sig save failed")),
    "Should show error toast when signature fields fail to save",
  );
  assert.ok(
    !toastCalls.some((c) => c.type === "success" && c.message.includes("Document uploaded successfully")),
    "Should not show success toast when signature fields fail to save",
  );
  assert.equal(closeCalled, false, "Modal should remain open when signature fields fail");

  root.unmount();
});
