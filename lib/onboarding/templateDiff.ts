const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toJson = (value: unknown) => {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export type TemplateFieldDiff = {
  field: string;
  before: unknown;
  after: unknown;
};

export type TemplateStepSnapshot = {
  stepId: string | null;
  stepKey: string;
  type: string;
  title: string;
  description: string;
  documentId: string | null;
  uploadType: string | null;
  formId: string | null;
  metadata: Record<string, unknown>;
  order: number;
};

export type TemplateSnapshot = {
  id: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  updatedAt: string | null;
  updatedBy: { id: string | null; name: string | null; email: string | null } | null;
  departments: { id: string; name: string | null }[];
  jobRoles: { id: string; name: string | null }[];
  steps: TemplateStepSnapshot[];
};

export type TemplateStepChange = {
  changeType: "added" | "removed" | "updated";
  stepId: string | null;
  stepKey: string;
  title: string;
  type: string;
  fieldChanges?: TemplateFieldDiff[];
};

export type TemplateDiff = {
  hasChanges: boolean;
  fieldChanges: TemplateFieldDiff[];
  stepChanges: TemplateStepChange[];
};

const normalizeId = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const normalizeNullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const normalizeBoolean = (value: unknown): boolean => Boolean(value);

const normalizeMetadata = (value: unknown): Record<string, unknown> => {
  if (isPlainObject(value)) return value;
  return {};
};

const toDepartmentList = (value: unknown): { id: string; name: string | null }[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const id = normalizeId((item as any)?.id);
      if (!id) return null;
      return {
        id,
        name: normalizeNullableString((item as any)?.name),
      };
    })
    .filter(Boolean) as { id: string; name: string | null }[];
};

const toStepList = (value: unknown): any[] => {
  if (!Array.isArray(value)) return [];
  return value;
};

const diffRecord = (
  baseline: unknown,
  current: unknown,
  prefix: string,
): TemplateFieldDiff[] => {
  if (JSON.stringify(baseline) === JSON.stringify(current)) {
    return [];
  }

  if (!isPlainObject(baseline) || !isPlainObject(current)) {
    return [
      {
        field: prefix,
        before: baseline,
        after: current,
      },
    ];
  }

  const before = baseline as Record<string, unknown>;
  const after = current as Record<string, unknown>;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const diffs: TemplateFieldDiff[] = [];

  keys.forEach((key) => {
    const childPrefix = prefix ? `${prefix}.${key}` : key;
    const childDiffs = diffRecord(before[key], after[key], childPrefix);
    diffs.push(...childDiffs);
  });

  return diffs;
};

const buildStepKey = (step: any, index: number) => {
  const stepId = normalizeId(step?.id);
  if (stepId) return stepId;
  const stepKey = normalizeId(step?.key);
  if (stepKey) return stepKey;
  return `step-${index}`;
};

export function createTemplateSnapshot(source: unknown): TemplateSnapshot {
  const template = (isPlainObject(source) ? source : {}) as Record<string, unknown>;
  const departments =
    toDepartmentList(template.departments) ||
    toDepartmentList((template as any).Department);
  const jobRoles =
    toDepartmentList(template.jobRoles) ||
    toDepartmentList((template as any).JobRole);

  const stepSource = template.steps ?? (template as any).OnboardingStep;
  const stepsRaw = toStepList(stepSource);

  const steps: TemplateStepSnapshot[] = stepsRaw.map((step: any, index: number) => {
    const stepId = normalizeId(step?.id);
    const stepKey = buildStepKey(step, index);
    const order = typeof step?.order === "number" ? step.order : index + 1;

    return {
      stepId,
      stepKey,
      order,
      type: normalizeString(step?.type || step?.uiType || ""),
      title: normalizeString(step?.title ?? step?.label ?? ""),
      description: normalizeString(step?.description ?? step?.instruction ?? ""),
      documentId: normalizeId(step?.documentId),
      uploadType: normalizeNullableString(step?.uploadType),
      formId: normalizeId(step?.formId),
      metadata: normalizeMetadata(step?.metadata),
    };
  });

  const updatedAt = template.updatedAt;
  const updatedAtIso = updatedAt instanceof Date
    ? updatedAt.toISOString()
    : typeof updatedAt === "string"
      ? updatedAt
      : null;

  const updatedByRaw = template.updatedBy ?? (template as any).User;
  const updatedBy = isPlainObject(updatedByRaw)
    ? {
        id: normalizeId(updatedByRaw.id),
        name: normalizeNullableString(updatedByRaw.name),
        email: normalizeNullableString(updatedByRaw.email),
      }
    : null;

  return {
    id: normalizeId(template.id),
    name: normalizeString(template.name ?? ""),
    description:
      typeof template.description === "string" || template.description === null
        ? (template.description as string | null)
        : null,
    isActive: normalizeBoolean(template.isActive),
    updatedAt: updatedAtIso,
    updatedBy,
    departments,
    jobRoles,
    steps,
  };
}

const compareIdSets = (
  previous: { id: string; name: string | null }[],
  next: { id: string; name: string | null }[],
): boolean => {
  if (previous.length !== next.length) return false;
  const prevIds = previous.map((item) => item.id).sort();
  const nextIds = next.map((item) => item.id).sort();
  return prevIds.every((id, index) => id === nextIds[index]);
};

export function diffTemplates(
  baseline: unknown,
  current: unknown,
): TemplateDiff {
  const previous = createTemplateSnapshot(baseline);
  const next = createTemplateSnapshot(current);

  const fieldChanges: TemplateFieldDiff[] = [];

  if (previous.name !== next.name) {
    fieldChanges.push({ field: "name", before: previous.name, after: next.name });
  }

  if ((previous.description ?? "") !== (next.description ?? "")) {
    fieldChanges.push({
      field: "description",
      before: previous.description,
      after: next.description,
    });
  }

  if (previous.isActive !== next.isActive) {
    fieldChanges.push({
      field: "isActive",
      before: previous.isActive,
      after: next.isActive,
    });
  }

  if (!compareIdSets(previous.departments, next.departments)) {
    fieldChanges.push({
      field: "departments",
      before: previous.departments.map((d) => d.id),
      after: next.departments.map((d) => d.id),
    });
  }

  if (!compareIdSets(previous.jobRoles, next.jobRoles)) {
    fieldChanges.push({
      field: "jobRoles",
      before: previous.jobRoles.map((d) => d.id),
      after: next.jobRoles.map((d) => d.id),
    });
  }

  const stepChanges: TemplateStepChange[] = [];
  const baselineMap = new Map<string, TemplateStepSnapshot>();

  previous.steps.forEach((step) => {
    const key = step.stepId ?? step.stepKey;
    baselineMap.set(key, step);
  });

  const seen = new Set<string>();

  next.steps.forEach((step) => {
    const key = step.stepId ?? step.stepKey;
    const baselineStep = baselineMap.get(key);

    if (!baselineStep) {
      stepChanges.push({
        changeType: "added",
        stepId: step.stepId,
        stepKey: key,
        title: step.title,
        type: step.type,
      });
      return;
    }

    seen.add(key);
    const changes: TemplateFieldDiff[] = [];

    if (baselineStep.order !== step.order) {
      changes.push({ field: "order", before: baselineStep.order, after: step.order });
    }

    if (baselineStep.title !== step.title) {
      changes.push({ field: "title", before: baselineStep.title, after: step.title });
    }

    if (baselineStep.description !== step.description) {
      changes.push({
        field: "description",
        before: baselineStep.description,
        after: step.description,
      });
    }

    if ((baselineStep.documentId ?? null) !== (step.documentId ?? null)) {
      changes.push({
        field: "documentId",
        before: baselineStep.documentId,
        after: step.documentId,
      });
    }

    if ((baselineStep.uploadType ?? null) !== (step.uploadType ?? null)) {
      changes.push({
        field: "uploadType",
        before: baselineStep.uploadType,
        after: step.uploadType,
      });
    }

    if ((baselineStep.formId ?? null) !== (step.formId ?? null)) {
      changes.push({ field: "formId", before: baselineStep.formId, after: step.formId });
    }

    const metadataDiffs = diffRecord(baselineStep.metadata, step.metadata, "metadata");
    changes.push(...metadataDiffs);

    if (changes.length) {
      stepChanges.push({
        changeType: "updated",
        stepId: step.stepId,
        stepKey: key,
        title: step.title,
        type: step.type,
        fieldChanges: changes,
      });
    }
  });

  previous.steps.forEach((step) => {
    const key = step.stepId ?? step.stepKey;
    if (seen.has(key)) return;
    stepChanges.push({
      changeType: "removed",
      stepId: step.stepId,
      stepKey: key,
      title: step.title,
      type: step.type,
    });
  });

  return {
    hasChanges: fieldChanges.length > 0 || stepChanges.length > 0,
    fieldChanges,
    stepChanges,
  };
}

export const describeTemplateDiff = (diff: TemplateDiff): string[] => {
  const lines: string[] = [];

  diff.fieldChanges.forEach((change) => {
    lines.push(
      `${change.field} changed from ${toJson(change.before)} to ${toJson(change.after)}`,
    );
  });

  diff.stepChanges.forEach((change) => {
    if (change.changeType === "added") {
      lines.push(`Step "${change.title || change.type}" was added`);
    } else if (change.changeType === "removed") {
      lines.push(`Step "${change.title || change.type}" was removed`);
    } else if (change.fieldChanges?.length) {
      const fields = change.fieldChanges
        .map((item) => item.field)
        .join(", ");
      lines.push(`Step "${change.title || change.type}" updated (${fields})`);
    }
  });

  return lines;
};
