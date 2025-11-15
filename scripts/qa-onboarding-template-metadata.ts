import { PrismaClient } from "@prisma/client";
import {
  serializeTemplate,
  templateSelect,
  type RawTemplate,
} from "../app/api/onboarding/templates/tenantScopedFetch";
import { normalizeStepMetadata } from "../app/lib/onboarding/stepMetadata";
import {
  metadataValuesAreEqual,
  summariseMetadataDiff,
  prepareMetadataForTelemetry,
} from "../app/lib/onboarding/telemetry";

const prisma = new PrismaClient();

type MetadataMismatch = {
  tenantId: string;
  templateId: string;
  templateName: string | null;
  stepId: string;
  stepLabel: string | null;
  uiType: string;
  mismatchedKeys: string[];
  before: unknown;
  after: unknown;
};

async function verifyOnboardingTemplateMetadata() {
  const [, , tenantFilter] = process.argv;

  console.log("🔍 Starting onboarding template metadata QA check...\n");

  const templates: RawTemplate[] = await prisma.onboardingTemplate.findMany({
    where: tenantFilter ? { companyId: tenantFilter } : undefined,
    select: templateSelect,
    orderBy: [{ companyId: "asc" }, { name: "asc" }],
  });

  if (!templates.length) {
    console.log("ℹ️  No onboarding templates found for the specified scope.");
    return { totalTemplates: 0, totalSteps: 0, mismatches: [] as MetadataMismatch[] };
  }

  const mismatches: MetadataMismatch[] = [];
  let totalSteps = 0;

  for (const template of templates as RawTemplate[]) {
    const serialized = serializeTemplate(template, template.companyId);
    const rawStepsById = new Map(
      (template.OnboardingStep || []).map((step) => [step.id, step]),
    );

    for (const step of serialized.steps) {
      totalSteps += 1;
      const rawStep = rawStepsById.get(step.id);
      const uiType = step.uiType;
      const baseline = normalizeStepMetadata(uiType, rawStep?.metadata ?? null);
      const roundTripped = normalizeStepMetadata(uiType, baseline);

      if (!metadataValuesAreEqual(baseline, roundTripped)) {
        mismatches.push({
          tenantId: template.companyId,
          templateId: template.id,
          templateName: template.name,
          stepId: step.id,
          stepLabel: rawStep?.label ?? step.label ?? null,
          uiType,
          mismatchedKeys: summariseMetadataDiff(baseline, roundTripped),
          before: prepareMetadataForTelemetry(baseline),
          after: prepareMetadataForTelemetry(roundTripped),
        });
      }

      if (!metadataValuesAreEqual(step.metadata, baseline)) {
        mismatches.push({
          tenantId: template.companyId,
          templateId: template.id,
          templateName: template.name,
          stepId: step.id,
          stepLabel: rawStep?.label ?? step.label ?? null,
          uiType,
          mismatchedKeys: summariseMetadataDiff(step.metadata, baseline),
          before: prepareMetadataForTelemetry(step.metadata),
          after: prepareMetadataForTelemetry(baseline),
        });
      }
    }
  }

  return {
    totalTemplates: templates.length,
    totalSteps,
    mismatches,
  };
}

verifyOnboardingTemplateMetadata()
  .then(({ totalTemplates, totalSteps, mismatches }) => {
    console.log(
      `📦 Processed ${totalTemplates} template${totalTemplates === 1 ? "" : "s"} (${totalSteps} step${totalSteps === 1 ? "" : "s"}).`,
    );

    if (mismatches.length) {
      console.error(
        `\n❌ Detected ${mismatches.length} metadata discrepancy${mismatches.length === 1 ? "" : "ies"}:\n`,
      );

      for (const mismatch of mismatches) {
        console.error(
          [
            `• Tenant ${mismatch.tenantId} — Template "${mismatch.templateName || mismatch.templateId}"`,
            `  Step ${mismatch.stepId} (${mismatch.uiType}${
              mismatch.stepLabel ? `: ${mismatch.stepLabel}` : ""
            })`,
            `  Keys: ${mismatch.mismatchedKeys.length ? mismatch.mismatchedKeys.join(", ") : "(entire payload)"}`,
            `  Before: ${JSON.stringify(mismatch.before)}`,
            `  After: ${JSON.stringify(mismatch.after)}`,
          ].join("\n"),
        );
      }

      console.error(
        "\n⚠️  Metadata normalisation is not idempotent. Review the affected steps before deploying.",
      );
      process.exitCode = 1;
    } else {
      console.log("\n✅ All onboarding step metadata round-tripped without loss.");
    }
  })
  .catch((error) => {
    console.error("❌ Failed to execute metadata QA check", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
