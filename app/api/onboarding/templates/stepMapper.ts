import { Prisma, OnboardingStepType, OnboardingUploadType } from "@prisma/client";
import { normalizeStepMetadata } from "@/lib/onboarding/stepMetadata";
import {
  mapUiStepTypeToDb,
  mapUiUploadTypeToDb,
  UI_TO_DB_STEP_TYPE,
} from "@/lib/onboarding/stepTypeMapping";

const typeMap: Record<string, OnboardingStepType> = Object.fromEntries(
  Object.entries(UI_TO_DB_STEP_TYPE).map(([uiType, dbType]) => [
    uiType,
    (OnboardingStepType as Record<string, OnboardingStepType>)[dbType] ?? dbType,
  ]),
) as Record<string, OnboardingStepType>;

const uploadTypeMap: Record<string, OnboardingUploadType> = {
  passport: (OnboardingUploadType as any).PASSPORT,
  "right-to-work": (OnboardingUploadType as any).RIGHT_TO_WORK,
  "driver-licence": (OnboardingUploadType as any).DRIVER_LICENSE,
  "training-certificate": (OnboardingUploadType as any).TRAINING_CERTIFICATE,
  other: (OnboardingUploadType as any).OTHER,
};

function isStep(step: any): step is {
  type: OnboardingStepType;
  label: string;
  order: number;
  documentId?: string | null;
  uploadType?: OnboardingUploadType | null;
  instruction?: string | null;
  formId?: string | null;
} {
  return !!step;
}

export function mapSteps(steps: any[]): Prisma.OnboardingStepCreateInput[] {
  if (!Array.isArray(steps)) return [];

  // Validate label uniqueness before mapping
  const labelCounts = new Map<string, number>();
  steps.forEach((step) => {
    const label = String(step.title || step.label || "").trim();
    if (label) {
      labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
    }
  });

  const duplicateLabels = Array.from(labelCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([label]) => label);

  if (duplicateLabels.length > 0) {
    throw new Error(
      `Duplicate step labels detected: ${duplicateLabels.join(", ")}. Each step must have a unique label.`
    );
  }

  return steps
    .map((step: any, i: number) => {
      const mappedTypeKey = mapUiStepTypeToDb(step.type);
      const mappedType = mappedTypeKey
        ? (OnboardingStepType as any)[mappedTypeKey] ?? typeMap[step.type]
        : typeMap[step.type];
      if (!mappedType) return undefined;
      const normalizedMetadata = normalizeStepMetadata(
        step.type,
        step.metadata,
      );
      // Use the title/label as-is without modification
      const safeTitle = String(step.title || step.label || "").trim();
      const defaultLabelByType =
        mappedType === OnboardingStepType.ACKNOWLEDGE_DOCUMENT
          ? "Acknowledge Document"
          : mappedType === OnboardingStepType.UPLOAD_DOCUMENT
            ? "Upload Document"
            : mappedType === OnboardingStepType.INSTRUCTION
              ? "Instructions"
              : mappedType === OnboardingStepType.FORM_FILL
                ? "Fill Form"
                : "Step";
      const finalLabel = safeTitle || `${defaultLabelByType} ${i + 1}`;
      const base = {
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`,
        type: mappedType,
        label: finalLabel,
        order: i + 1,
      };
      if (mappedType === OnboardingStepType.ACKNOWLEDGE_DOCUMENT) {
        return {
          ...base,
          documentId: step.documentId || null,
          instruction: step.description || "",
          metadata: normalizedMetadata,
        };
      }
      if (mappedType === OnboardingStepType.UPLOAD_DOCUMENT) {
        return {
          ...base,
          uploadType: (() => {
            const mappedUpload = mapUiUploadTypeToDb(step.uploadType);
            if (!mappedUpload) return null;
            return (
              (OnboardingUploadType as Record<string, OnboardingUploadType>)[
                mappedUpload
              ] || uploadTypeMap[step.uploadType]
            );
          })(),
          instruction: step.description || "",
          metadata: normalizedMetadata,
        };
      }
      if (mappedType === OnboardingStepType.INSTRUCTION) {
        return {
          ...base,
          instruction: step.description || "",
          metadata: normalizedMetadata,
        };
      }
      if (mappedType === OnboardingStepType.FORM_FILL) {
        return {
          ...base,
          formId: step.formId || null,
          instruction: step.description || "",
          metadata: normalizedMetadata,
        };
      }
      return {
        ...base,
        instruction: step.description || "",
        metadata: normalizedMetadata,
      };
    })
    .filter(isStep) as Prisma.OnboardingStepCreateInput[];
}

