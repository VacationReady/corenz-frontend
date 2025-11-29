export type NzPresetStep = {
  slug: string;
  type: string;
  title: string;
  description: string;
  required?: boolean;
  uploadType?: string;
  documentId?: string;
  formId?: string;
  formFields?: any[];
  metadata?: Record<string, any>;
};

export type NzOnboardingPreset = {
  id: string;
  name: string;
  headline: string;
  summary: string;
  complianceReferences: string[];
  tags: string[];
  steps: NzPresetStep[];
};

export const NZ_ONBOARDING_PRESETS: NzOnboardingPreset[] = [
  {
    id: "nz-ird-forms",
    name: "IRD & Tax Code collection",
    headline: "Capture IR330 declarations and supporting IDs",
    summary:
      "Bundles the IR330/IR330C questions, collects IRD numbers, and prompts employees to acknowledge the official declaration text.",
    complianceReferences: [
      "IRD 330 (Tax code declaration)",
      "IRD 330C (Casual agricultural/entertainment)",
    ],
    tags: ["Payroll", "IRD", "Mandatory"],
    steps: [
      {
        slug: "nz-ird-guidance",
        type: "instructions",
        title: "How IRD tax declarations work",
        description:
          "We require your IRD number and a signed IR330 declaration before we can process payroll.",
        metadata: { buttonLabel: "Review declaration" },
      },
      {
        slug: "nz-ird-details",
        type: "payroll-setup",
        title: "IRD number & tax code",
        description:
          "Provide your IRD number, current tax code and any special deduction instructions.",
        metadata: {
          instructions:
            "Complete every field exactly as it appears on your latest IR330. This data feeds directly into payday filing.",
          fields: [
            {
              id: "irdNumber",
              label: "IRD number",
              placeholder: "123-456-785",
              required: true,
              fieldType: "irdNumber",
            },
            {
              id: "taxCode",
              label: "Tax code",
              placeholder: "e.g. M SL",
              required: true,
              fieldType: "text",
            },
            {
              id: "secondaryTaxCode",
              label: "Secondary tax code (if applicable)",
              required: false,
              fieldType: "text",
            },
            {
              id: "studentLoan",
              label: "Student loan deductions",
              required: false,
              fieldType: "select",
              options: ["yes", "no"],
              defaultValue: "no",
            },
          ],
        },
      },
      {
        slug: "nz-ird-acknowledgement",
        type: "acknowledge-document",
        title: "IR330 declaration acknowledgement",
        description:
          "Confirm you have completed the IR330 accurately and will notify Inland Revenue if your situation changes.",
        metadata: {
          acknowledgementText:
            "I confirm the IR330/IR330C declaration provided is accurate and I will notify IRD of any changes.",
        },
      },
      {
        slug: "nz-ird-supporting-id",
        type: "upload-document",
        title: "Upload signed IR330",
        description: "Upload a scanned copy or PDF of your signed IR330 or IR330C.",
        metadata: {
          instructions: "Upload the signed form or a clear photo of every page.",
          allowedFileTypes: [".pdf", ".jpg", ".png"],
          category: "Tax compliance",
        },
      },
    ],
  },
  {
    id: "nz-kiwisaver",
    name: "KiwiSaver enrolment",
    headline: "Capture KiwiSaver opt-in/opt-out preferences",
    summary:
      "Guides employees through KiwiSaver enrolment, contribution rates, and gives payroll the consent trail they need.",
    complianceReferences: ["KiwiSaver Act 2006"],
    tags: ["Benefits", "KiwiSaver"],
    steps: [
      {
        slug: "nz-kiwisaver-overview",
        type: "instructions",
        title: "KiwiSaver overview",
        description: "Tell us whether you are joining, opting out, or on a contributions holiday.",
        metadata: { buttonLabel: "Choose options" },
      },
      {
        slug: "nz-kiwisaver-preferences",
        type: "payroll-setup",
        title: "KiwiSaver preferences",
        description: "Choose your status and employee/employer contribution rates.",
        metadata: {
          instructions:
            "We feed these settings straight into payroll and the IRD payday filing gateway.",
          fields: [
            {
              id: "kiwiSaverStatus",
              label: "KiwiSaver status",
              fieldType: "kiwiSaverStatus",
              required: true,
            },
            {
              id: "kiwiSaverEmployeeRate",
              label: "Employee contribution rate",
              fieldType: "kiwiSaverEmployeeRate",
              required: true,
            },
            {
              id: "kiwiSaverEmployerRate",
              label: "Employer contribution rate",
              fieldType: "kiwiSaverEmployerRate",
              placeholder: "Minimum 3%",
              required: false,
            },
            {
              id: "optOutReason",
              label: "Opt-out reason (if applicable)",
              fieldType: "text",
              required: false,
            },
          ],
        },
      },
      {
        slug: "nz-kiwisaver-confirmation",
        type: "acknowledge-document",
        title: "KiwiSaver consent",
        description:
          "Confirm you understand your chosen contribution rate and when deductions will commence.",
        metadata: {
          acknowledgementText:
            "I authorise payroll to make KiwiSaver deductions according to my selections above.",
        },
      },
    ],
  },
  {
    id: "nz-health-safety",
    name: "Health & safety onboarding",
    headline: "Meet WorkSafe NZ acknowledgement requirements",
    summary:
      "Push WorkSafe briefings, track hazard training, and capture health & safety acknowledgements in one pass.",
    complianceReferences: ["Health and Safety at Work Act 2015"],
    tags: ["H&S", "WorkSafe", "Mandatory"],
    steps: [
      {
        slug: "nz-hs-briefing",
        type: "instructions",
        title: "Welcome to our health & safety programme",
        description: "Review our WorkSafe NZ briefing deck before acknowledging.",
        metadata: { buttonLabel: "Review briefing" },
      },
      {
        slug: "nz-hs-training",
        type: "training-assignment",
        title: "Health & safety training modules",
        description: "Complete the mandatory safety videos and toolbox talks.",
        metadata: {
          modules: [
            {
              id: "worksafe-intro",
              label: "WorkSafe NZ introduction",
              required: true,
              url: "https://worksafe.govt.nz/training",
            },
            {
              id: "hazard-register",
              label: "Site-specific hazard register",
              required: true,
            },
          ],
        },
      },
      {
        slug: "nz-hs-ack",
        type: "acknowledge-document",
        title: "Health & safety acknowledgement",
        description: "Confirm you understand our reporting process for hazards and incidents.",
        metadata: {
          acknowledgementText:
            "I have read the WorkSafe briefing, understand emergency procedures, and will report hazards immediately.",
        },
      },
      {
        slug: "nz-hs-hazard-id",
        type: "collect-document",
        title: "Verify PPE & hazard ID",
        description:
          "Managers confirm the employee has been issued PPE and understands hazard reporting protocols.",
        metadata: {
          instructions:
            "Check PPE sizing, log serial numbers, and note any additional risk assessments completed on day one.",
        },
      },
    ],
  },
];

export const NZ_PRESET_STEP_LOOKUP = new Map(
  NZ_ONBOARDING_PRESETS.flatMap((preset) =>
    preset.steps.map((step) => [step.slug, { presetId: preset.id, step }]),
  ),
);
