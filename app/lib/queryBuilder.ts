// lib/queryBuilder.ts
import { computedHandlers } from "@/lib/computedHandlers";

function buildSelect(selectedFields: string[]) {
  const select: Record<string, any> = {};

  for (const field of selectedFields) {
    if (field.startsWith("_computed.")) continue;

    const parts = field.split(".");
    let current = select;

    for (let i = 0; i < parts.length; i++) {
      const key = parts[i];

      if (i === parts.length - 1) {
        current[key] = true;
      } else {
        current[key] = current[key] || { select: {} };
        current = current[key].select;
      }
    }
  }

  return select;
}

function buildWhere(filters: any[]) {
  const where: Record<string, any> = {};

  for (const filter of filters) {
    const { field, value } = filter;
    if (!field || field.startsWith("_computed.")) continue;

    const parts = field.split(".");
    let current = where;

    for (let i = 0; i < parts.length; i++) {
      const key = parts[i];

      if (i === parts.length - 1) {
        current[key] = value;
      } else {
        current[key] = current[key] || {};
        current = current[key];
      }
    }
  }

  return where;
}

function buildPaginationAndSort(
  pagination: { limit?: number; page?: number } = {},
  sort: { field?: string; direction?: "asc" | "desc" } = {},
) {
  return {
    take: pagination.limit || 50,
    skip: ((pagination.page || 1) - 1) * (pagination.limit || 50),
    orderBy:
      sort.field && !sort.field.startsWith("_computed.")
        ? { [sort.field]: sort.direction || "asc" }
        : undefined,
  };
}

function groupFieldsByModel(selectedFields: string[]) {
  const modelMap: Record<string, string[]> = {};

  for (const fullField of selectedFields) {
    if (fullField.startsWith("_computed.")) continue;

    const [model, ...fieldParts] = fullField.split(".");
    const actualField = fieldParts.join(".");

    if (!modelMap[model]) modelMap[model] = [];
    modelMap[model].push(actualField);
  }

  return modelMap;
}

export function buildDynamicQuery({
  selectedFields,
  filters,
  pagination,
  sort,
}: any) {
  const fieldGroups = groupFieldsByModel(selectedFields);
  const queries = [];

  for (const model in fieldGroups) {
    const fields = fieldGroups[model];
    const modelFilters = filters.filter((f: any) =>
      f.field.startsWith(`${model}.`),
    );
    const strippedFilters = modelFilters.map((f: any) => ({
      ...f,
      field: f.field.replace(`${model}.`, ""),
    }));

    queries.push({
      model,
      prismaQuery: {
        select: buildSelect(fields),
        where: buildWhere(strippedFilters),
        ...buildPaginationAndSort(pagination, sort),
      },
    });
  }

  const computedFields = selectedFields
    .filter((field: string) => field.startsWith("_computed."))
    .map((field: string) => ({ field }));

  return { queries, computedFields };
}

export async function attachComputedFields(
  results: any[],
  selectedFields: string[],
  model: string,
) {
  if (!selectedFields.some((f) => f.startsWith("_computed."))) return results;

  return results.map((item) => {
    const modelHandlers = computedHandlers[model];
    if (!modelHandlers) return item;

    const computed: Record<string, any> = {};

    for (const field of selectedFields) {
      if (field.startsWith("_computed.") && modelHandlers[field]) {
        try {
          computed[field.replace("_computed.", "")] =
            modelHandlers[field](item);
        } catch (err) {
          console.warn(`Computed field error on ${field}:`, err);
        }
      }
    }

    return {
      ...item,
      _computed: computed,
    };
  });
}
