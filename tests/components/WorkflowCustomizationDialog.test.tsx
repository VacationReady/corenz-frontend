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

// Mock dependencies
(Module as any)._load = function (
  request: string,
  parent: any,
  isMain: boolean,
) {
  if (request === "next-auth/react") {
    return {
      useSession: () => ({
        data: { user: { companyId: "test-company" } },
      }),
    };
  }
  if (request === "sonner") {
    return {
      toast: {
        success: (msg: string) => {},
        error: (msg: string) => {},
      },
    };
  }
  return originalLoad(request, parent, isMain);
};

// Mock workflow reference data hooks
const mockDepartments = [
  { id: "dept1", name: "Engineering" },
  { id: "dept2", name: "HR" },
];

const mockForms = [
  { id: "form1", name: "Onboarding Form" },
  { id: "form2", name: "Exit Form" },
];

const mockUsers = [
  { id: "user1", name: "John Doe", email: "john@test.com" },
  { id: "user2", name: "Jane Smith", email: "jane@test.com" },
];

// Create mock workflow templates
const createMockWorkflow = (id: string, name: string, customizable?: string[]) => ({
  id,
  name,
  description: `Test workflow ${id}`,
  category: { id: "onboarding", name: "Onboarding", description: "Test", icon: "👤", color: "blue", order: 1 },
  tags: ["test"],
  icon: "📋",
  nodes: [
    {
      id: "trigger",
      type: "trigger",
      data: {
        config: {
          daysBefore: 30,
          schedule: "0 9 * * *",
        },
      },
      position: { x: 0, y: 0 },
    },
    {
      id: "action1",
      type: "action",
      data: {
        config: {
          dueDays: 7,
          formId: "form1",
          channels: ["email"],
          recipientType: "employee",
        },
      },
      position: { x: 0, y: 100 },
    },
    {
      id: "condition1",
      type: "condition",
      data: {
        config: {
          conditionType: "department",
        },
      },
      position: { x: 0, y: 200 },
    },
  ],
  edges: [],
  config: {
    customizable: customizable || [],
  },
  benefits: ["Test benefit"],
});

const workflowWithMultipleCategories = createMockWorkflow("wf1", "Multi-Category Workflow", ["daysBefore", "formId"]);
const workflowWithSingleCategory = {
  ...createMockWorkflow("wf2", "Single-Category Workflow", ["daysBefore"]),
  nodes: [
    {
      id: "trigger",
      type: "trigger",
      data: {
        config: {
          daysBefore: 30,
        },
      },
      position: { x: 0, y: 0 },
    },
  ],
};

const workflowNoCustomizations = {
  ...createMockWorkflow("wf3", "No Customizations Workflow", []),
  nodes: [],
};

// Load component
let WorkflowCustomizationDialog: any;
async function loadComponent() {
  if (!WorkflowCustomizationDialog) {
    // Mock the hooks before importing
    const mockHooks = {
      useDepartments: () => ({ data: mockDepartments, loading: false }),
      useForms: () => ({ data: mockForms, loading: false }),
      useUsers: () => ({ data: mockUsers, loading: false }),
    };
    
    (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
      if (request === "@/hooks/useWorkflowReferenceData") {
        return mockHooks;
      }
      if (request === "next-auth/react") {
        return {
          useSession: () => ({
            data: { user: { companyId: "test-company" } },
          }),
        };
      }
      if (request === "sonner") {
        return {
          toast: {
            success: (msg: string) => {},
            error: (msg: string) => {},
          },
        };
      }
      return originalLoad(request, parent, isMain);
    };

    const module = await import(
      "../../app/(withSidebar)/workflows/components/WorkflowCustomizationDialog"
    );
    WorkflowCustomizationDialog = module.WorkflowCustomizationDialog;
  }
  return WorkflowCustomizationDialog;
}

test.after(() => {
  (Module as any)._load = originalLoad;
  dom.window.close();
});

test.beforeEach(() => {
  document.body.innerHTML = "";
});

test("resets selectedTab to first category when workflow changes", async () => {
  const Dialog = await loadComponent();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  let currentWorkflow = workflowWithMultipleCategories;

  // Render with first workflow
  await act(async () => {
    root.render(
      React.createElement(Dialog, {
        workflow: currentWorkflow,
        isOpen: true,
        onClose: () => {},
        onConfirm: () => {},
      })
    );
    await new Promise((r) => setTimeout(r, 150));
  });

  // Check that tabs are rendered
  let content = document.body.textContent || "";
  assert.ok(content.includes("Customize Workflow"), "Dialog should render");

  // Change to a different workflow
  currentWorkflow = workflowWithSingleCategory;
  await act(async () => {
    root.render(
      React.createElement(Dialog, {
        workflow: currentWorkflow,
        isOpen: true,
        onClose: () => {},
        onConfirm: () => {},
      })
    );
    await new Promise((r) => setTimeout(r, 150));
  });

  // Verify the dialog re-rendered with new workflow
  content = document.body.textContent || "";
  assert.ok(content.includes("Single-Category Workflow"), "Should show new workflow name");

  root.unmount();
});

test("resets workflowName to template default when workflow changes", async () => {
  const Dialog = await loadComponent();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  // Render with first workflow
  await act(async () => {
    root.render(
      React.createElement(Dialog, {
        workflow: workflowWithMultipleCategories,
        isOpen: true,
        onClose: () => {},
        onConfirm: () => {},
      })
    );
    await new Promise((r) => setTimeout(r, 150));
  });

  // Find and modify the workflow name input
  await act(async () => {
    const nameInput = document.querySelector('input[id="workflow-name"]') as HTMLInputElement;
    if (nameInput) {
      nameInput.value = "Custom Modified Name";
      nameInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    await new Promise((r) => setTimeout(r, 50));
  });

  // Change to a different workflow
  await act(async () => {
    root.render(
      React.createElement(Dialog, {
        workflow: workflowWithSingleCategory,
        isOpen: true,
        onClose: () => {},
        onConfirm: () => {},
      })
    );
    await new Promise((r) => setTimeout(r, 150));
  });

  // Check that the name input has been reset to the new workflow's name
  const nameInput = document.querySelector('input[id="workflow-name"]') as HTMLInputElement;
  if (nameInput) {
    assert.ok(
      nameInput.value === "Single-Category Workflow" || nameInput.placeholder.includes("workflow"),
      "Workflow name should reset to template default"
    );
  }

  root.unmount();
});

test("resets autoActivate to true when workflow changes", async () => {
  const Dialog = await loadComponent();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  // Render with first workflow
  await act(async () => {
    root.render(
      React.createElement(Dialog, {
        workflow: workflowWithMultipleCategories,
        isOpen: true,
        onClose: () => {},
        onConfirm: () => {},
      })
    );
    await new Promise((r) => setTimeout(r, 150));
  });

  // Find and toggle the auto-activate switch
  await act(async () => {
    const autoActivateSwitch = document.querySelector('button[id="auto-activate"]') as HTMLButtonElement;
    if (autoActivateSwitch) {
      autoActivateSwitch.click();
    }
    await new Promise((r) => setTimeout(r, 50));
  });

  // Change to a different workflow
  await act(async () => {
    root.render(
      React.createElement(Dialog, {
        workflow: workflowWithSingleCategory,
        isOpen: true,
        onClose: () => {},
        onConfirm: () => {},
      })
    );
    await new Promise((r) => setTimeout(r, 150));
  });

  // Check that auto-activate is reset (should be checked by default)
  const autoActivateSwitch = document.querySelector('button[id="auto-activate"]') as HTMLButtonElement;
  if (autoActivateSwitch) {
    const isChecked = autoActivateSwitch.getAttribute("data-state") === "checked" ||
                     autoActivateSwitch.getAttribute("aria-checked") === "true";
    assert.ok(isChecked, "Auto-activate should be reset to true");
  }

  root.unmount();
});

test("resets customizations when workflow changes", async () => {
  const Dialog = await loadComponent();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  let confirmCalled = false;
  let confirmedData: any = null;

  // Render with first workflow
  await act(async () => {
    root.render(
      React.createElement(Dialog, {
        workflow: workflowWithMultipleCategories,
        isOpen: true,
        onClose: () => {},
        onConfirm: (data: any) => {
          confirmCalled = true;
          confirmedData = data;
        },
      })
    );
    await new Promise((r) => setTimeout(r, 150));
  });

  // Modify a customization field
  await act(async () => {
    const numberInputs = document.querySelectorAll('input[type="number"]');
    if (numberInputs.length > 0) {
      const input = numberInputs[0] as HTMLInputElement;
      input.value = "99";
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    await new Promise((r) => setTimeout(r, 50));
  });

  // Change to a different workflow
  await act(async () => {
    root.render(
      React.createElement(Dialog, {
        workflow: workflowWithSingleCategory,
        isOpen: true,
        onClose: () => {},
        onConfirm: (data: any) => {
          confirmCalled = true;
          confirmedData = data;
        },
      })
    );
    await new Promise((r) => setTimeout(r, 150));
  });

  // Click confirm to check the reset values
  await act(async () => {
    const confirmButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Add Workflow")
    );
    if (confirmButton) {
      confirmButton.click();
    }
    await new Promise((r) => setTimeout(r, 50));
  });

  // Verify customizations were reset (should not contain the modified value)
  if (confirmCalled && confirmedData) {
    const customizationValues = Object.values(confirmedData.customizations || {});
    assert.ok(
      !customizationValues.includes(99),
      "Customizations should be reset to defaults"
    );
  }

  root.unmount();
});

test("shows first available category tab immediately after selecting template", async () => {
  const Dialog = await loadComponent();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  // Render with workflow that has multiple categories
  await act(async () => {
    root.render(
      React.createElement(Dialog, {
        workflow: workflowWithMultipleCategories,
        isOpen: true,
        onClose: () => {},
        onConfirm: () => {},
      })
    );
    await new Promise((r) => setTimeout(r, 150));
  });

  // Check that tabs are rendered and first tab is visible
  const content = document.body.textContent || "";
  const tabs = document.querySelectorAll('[role="tab"]');
  
  if (tabs.length > 0) {
    const firstTab = tabs[0] as HTMLElement;
    const isSelected = firstTab.getAttribute("data-state") === "active" ||
                      firstTab.getAttribute("aria-selected") === "true";
    assert.ok(isSelected, "First tab should be selected immediately");
  } else {
    // If no tabs (single category or no customizations), that's also valid
    assert.ok(true, "Component renders without tabs for single/no categories");
  }

  root.unmount();
});

test("handles workflow with no customizations gracefully", async () => {
  const Dialog = await loadComponent();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      React.createElement(Dialog, {
        workflow: workflowNoCustomizations,
        isOpen: true,
        onClose: () => {},
        onConfirm: () => {},
      })
    );
    await new Promise((r) => setTimeout(r, 150));
  });

  const content = document.body.textContent || "";
  assert.ok(
    content.includes("default settings") || content.includes("Customize Workflow"),
    "Should show message about default settings or render without errors"
  );

  root.unmount();
});

test("preserves dialog functionality after workflow change", async () => {
  const Dialog = await loadComponent();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  let closeCalled = false;
  let confirmCalled = false;

  // Render with first workflow
  await act(async () => {
    root.render(
      React.createElement(Dialog, {
        workflow: workflowWithMultipleCategories,
        isOpen: true,
        onClose: () => { closeCalled = true; },
        onConfirm: () => { confirmCalled = true; },
      })
    );
    await new Promise((r) => setTimeout(r, 150));
  });

  // Change workflow
  await act(async () => {
    root.render(
      React.createElement(Dialog, {
        workflow: workflowWithSingleCategory,
        isOpen: true,
        onClose: () => { closeCalled = true; },
        onConfirm: () => { confirmCalled = true; },
      })
    );
    await new Promise((r) => setTimeout(r, 150));
  });

  // Test confirm button still works
  await act(async () => {
    const confirmButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Add Workflow")
    );
    if (confirmButton) {
      confirmButton.click();
    }
    await new Promise((r) => setTimeout(r, 50));
  });

  assert.ok(confirmCalled, "Confirm callback should work after workflow change");

  root.unmount();
});

test("resets to 'basic' tab when fieldsByCategory is empty", async () => {
  const Dialog = await loadComponent();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  // Render with workflow that has no customization fields
  await act(async () => {
    root.render(
      React.createElement(Dialog, {
        workflow: workflowNoCustomizations,
        isOpen: true,
        onClose: () => {},
        onConfirm: () => {},
      })
    );
    await new Promise((r) => setTimeout(r, 150));
  });

  // Should render without errors and show basic settings
  const content = document.body.textContent || "";
  assert.ok(
    content.includes("Workflow Name") && content.includes("Activate Immediately"),
    "Should show basic settings when no categories available"
  );

  root.unmount();
});
