import {
  Prisma,
  OnboardingStepType,
  OnboardingUploadType,
} from "@prisma/client";

const typeMap: Record<string, OnboardingStepType> = {
  "acknowledge-document": OnboardingStepType.ACKNOWLEDGE_DOCUMENT,
  "upload-document": OnboardingStepType.UPLOAD_DOCUMENT,
  instructions: OnboardingStepType.INSTRUCTION,
  "fill-form": OnboardingStepType.FORM_FILL,
};

const uploadTypeMap: Record<string, OnboardingUploadType> = {
  passport: OnboardingUploadType.PASSPORT,
  "right-to-work": OnboardingUploadType.RIGHT_TO_WORK,
  "driver-licence": OnboardingUploadType.DRIVER_LICENSE,
  "training-certificate": OnboardingUploadType.TRAINING_CERTIFICATE,
  other: OnboardingUploadType.OTHER,
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
  return Array.isArray(steps)
    ? (steps
        .map((step: any, i: number) => {
          const mappedType = typeMap[step.type];
          if (!mappedType) return undefined;
          const base = {
            type: mappedType,
            label: step.label || step.title || "",
            order: i + 1,
          };
          if (mappedType === OnboardingStepType.ACKNOWLEDGE_DOCUMENT) {
            return { ...base, documentId: step.documentId || null };
          }
          if (mappedType === OnboardingStepType.UPLOAD_DOCUMENT) {
            return {
              ...base,
              uploadType: step.uploadType
                ? uploadTypeMap[step.uploadType] || null
                : null,
            };
          }
          if (mappedType === OnboardingStepType.INSTRUCTION) {
            return { ...base, instruction: step.description || "" };
          }
          if (mappedType === OnboardingStepType.FORM_FILL) {
            return { ...base, formId: step.formId || null };
          }
          return undefined;
        })
        .filter(isStep) as Prisma.OnboardingStepCreateInput[])
    : [];
}
