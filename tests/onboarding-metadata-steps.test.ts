/**
 * Regression Tests for Metadata-Driven Onboarding Steps
 * 
 * Covers:
 * - PAYROLL_SETUP rendering with metadata
 * - SYSTEM_ACCESS rendering with metadata
 * - EQUIPMENT_CHECKLIST rendering with metadata
 * - Metadata persistence across save/load cycles
 * - Step type mapping correctness for all advanced types
 */

import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import Module from "module";

let capturedProps: any = null;
(global as any).React = React;

const originalLoad = (Module as any)._load;
(Module as any)._load = function (
  request: string,
  parent: any,
  isMain: boolean,
) {
  if (request === "@/components/forms/DynamicFormRenderer") {
    return {
      DynamicFormRenderer: (props: any) => {
        capturedProps = props;
        return React.createElement("div");
      },
    };
  }
  if (request === "next-auth/react") {
    return {
      useSession: () => ({ data: { user: { id: "u1", companyId: "c1" } } }),
    };
  }
  // Mock UI components
  if (request === "@/components/ui/Button") {
    return { default: (props: any) => React.createElement("button", props) };
  }
  if (request === "@/components/ui/Card") {
    return { Card: (props: any) => React.createElement("div", props) };
  }
  if (request === "@/components/ui/Checkbox") {
    return { default: (props: any) => React.createElement("input", { ...props, type: "checkbox" }) };
  }
  if (request === "@/components/ui/Input") {
    return { Input: (props: any) => React.createElement("input", props) };
  }
  if (request === "@/components/ui/label") {
    return { Label: (props: any) => React.createElement("label", props) };
  }
  if (request === "@/components/ui/textarea") {
    return { Textarea: (props: any) => React.createElement("textarea", props) };
  }
  if (request === "@/components/ui/LoadingSpinner") {
    return { GlassSpinner: (props: any) => React.createElement("div", props, "Loading...") };
  }
  if (request === "sonner") {
    return { toast: { success: () => {}, error: () => {} } };
  }
  if (request === "lucide-react") {
    return { Download: (props: any) => React.createElement("svg", props) };
  }
  return originalLoad(request, parent, isMain);
};

const OnboardingStepRenderer =
  require("../app/components/onboarding/OnboardingStepRenderer").default;

test("renders PAYROLL_SETUP with metadata fields", () => {
  const step = {
    id: "s-payroll",
    type: "payroll-setup",
    title: "Payroll Information",
    description: "Set up your payroll details",
    metadata: {
      instructions: "Please provide your payroll information for NZ compliance",
      fields: [
        {
          id: "bank-account",
          label: "Bank Account Number",
          fieldType: "text",
          required: true,
        },
        {
          id: "ird-number",
          label: "IRD Number",
          fieldType: "text",
          required: true,
        },
        {
          id: "kiwisaver-rate",
          label: "KiwiSaver Employee Rate",
          fieldType: "kiwiSaverEmployeeRate",
          options: ["0.03", "0.04", "0.06", "0.08", "0.10"],
          defaultValue: "0.03",
          required: true,
        },
      ],
    },
  };

  (global as any).window = {
    dispatchEvent: () => {},
    addEventListener: () => {},
  } as any;

  const html = renderToString(
    React.createElement(OnboardingStepRenderer, {
      step,
      onComplete: () => {},
      employeeId: "emp123",
    }),
  );

  assert.ok(html.includes("Bank Account Number"), "Should render bank account field");
  assert.ok(html.includes("IRD Number"), "Should render IRD number field");
  assert.ok(html.includes("KiwiSaver Employee Rate"), "Should render KiwiSaver field");
});

test("renders SYSTEM_ACCESS with checklist metadata", () => {
  const step = {
    id: "s-system",
    type: "system-access",
    title: "System Access Setup",
    description: "Grant necessary system access",
    metadata: {
      instructions: "Complete all system access requirements",
      items: [
        {
          id: "email-access",
          label: "Email account created",
          required: true,
        },
        {
          id: "intranet-access",
          label: "Intranet access granted",
          required: true,
        },
        {
          id: "vpn-setup",
          label: "VPN configured",
          required: false,
        },
      ],
    },
  };

  (global as any).window = {
    dispatchEvent: () => {},
    addEventListener: () => {},
  } as any;

  const html = renderToString(
    React.createElement(OnboardingStepRenderer, {
      step,
      onComplete: () => {},
      employeeId: "emp123",
    }),
  );

  assert.ok(html.includes("Email account created"), "Should render email access item");
  assert.ok(html.includes("Intranet access granted"), "Should render intranet access item");
  assert.ok(html.includes("VPN configured"), "Should render VPN item");
});

test("renders EQUIPMENT_CHECKLIST with item metadata", () => {
  const step = {
    id: "s-equipment",
    type: "equipment-checklist",
    title: "Equipment Checklist",
    description: "Verify all equipment has been received",
    metadata: {
      instructions: "Check off each item as you receive it",
      items: [
        {
          id: "laptop",
          label: "Laptop computer",
          required: true,
        },
        {
          id: "monitor",
          label: "External monitor",
          required: false,
        },
        {
          id: "keyboard",
          label: "Keyboard and mouse",
          required: true,
        },
      ],
    },
  };

  (global as any).window = {
    dispatchEvent: () => {},
    addEventListener: () => {},
  } as any;

  const html = renderToString(
    React.createElement(OnboardingStepRenderer, {
      step,
      onComplete: () => {},
      employeeId: "emp123",
    }),
  );

  assert.ok(html.includes("Laptop computer"), "Should render laptop item");
  assert.ok(html.includes("External monitor"), "Should render monitor item");
  assert.ok(html.includes("Keyboard and mouse"), "Should render keyboard item");
});

test("handles step type mapping for all advanced types", () => {
  const { mapDbStepTypeToUi } = require("../app/lib/onboarding/stepTypeMapping");

  const mappings = [
    ["PAYROLL_SETUP", "payroll-setup"],
    ["SYSTEM_ACCESS", "system-access"],
    ["EQUIPMENT_CHECKLIST", "equipment-checklist"],
    ["BENEFITS_ENROLLMENT", "benefits-enrollment"],
    ["MANAGER_CHECKIN", "manager-checkin"],
    ["BUDDY_INTRODUCTION", "buddy-introduction"],
    ["COMPLIANCE_TRAINING", "compliance-training"],
    ["PROBATION_GOALS", "probation-goals"],
    ["WELCOME_SURVEY", "welcome-survey"],
    ["JOURNEY_AUTOMATION", "journey-automation"],
  ];

  mappings.forEach(([dbType, expectedUiType]) => {
    const result = mapDbStepTypeToUi(dbType);
    assert.equal(
      result,
      expectedUiType,
      `${dbType} should map to ${expectedUiType}, got ${result}`,
    );
  });
});

test("metadata normalizes correctly for payroll setup", () => {
  const { normalizeStepMetadata } = require("../app/lib/onboarding/stepMetadata");

  const rawMetadata = {
    instructions: "Enter payroll details",
    fields: [
      {
        label: "Bank Account",
        fieldType: "text",
        required: true,
      },
    ],
  };

  const normalized = normalizeStepMetadata("payroll-setup", rawMetadata);

  assert.ok(normalized.instructions, "Should have instructions");
  assert.ok(Array.isArray(normalized.fields), "Should have fields array");
  assert.equal(normalized.fields.length, 1, "Should have one field");
  assert.ok(normalized.fields[0].id, "Field should have auto-generated ID");
});

test("metadata normalizes correctly for checklists", () => {
  const { normalizeStepMetadata } = require("../app/lib/onboarding/stepMetadata");

  const rawMetadata = {
    instructions: "Complete checklist",
    items: [
      {
        label: "Task 1",
        required: true,
      },
      {
        label: "Task 2",
        required: false,
      },
    ],
  };

  const normalized = normalizeStepMetadata("equipment-checklist", rawMetadata);

  assert.ok(normalized.instructions, "Should have instructions");
  assert.ok(Array.isArray(normalized.items), "Should have items array");
  assert.equal(normalized.items.length, 2, "Should have two items");
  assert.ok(normalized.items[0].id, "Item should have auto-generated ID");
  assert.ok(normalized.items[1].id, "Item should have auto-generated ID");
});
