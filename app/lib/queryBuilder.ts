// lib/queryBuilder.ts
import { computedHandlers } from "@/lib/computedHandlers";

function buildSelect(selectedFields: string[]) {
  const select = {};

  for (const field of selectedFields) {
    if (field.startsWith("_computed.")) continue;

    const parts = field.split(".");
    let current = select;

    for (let i = 0; i < parts.length; i++) {
      const key = parts[i];

      if (i === parts.length - 1) {
        current[key] = true; // Final field
      } else {
        current[key] = current[key] || { select: {} };
        current = current[key].select;
      }
    }
  }

  return select;
}

function buildWhere(filters: any[]) {
  const where = {};

  for (const filter of filters) {
    const { field, value } = filter;
    if (!field || field.startsWith("_computed.")) continue;

    const parts = field.split(".");
    let current = where;

    for (let i = 0; i < parts.length; i++) {
      const key = parts[i];

      if (i === parts.length - 1) {
        current[key] = value; // Final condition
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
  sort: { field?: string; direction?: "asc" | "desc" } = {}
) {
  return {
    take: pagination.limit || 50,
    skip: ((pagination.page || 1) - 1) * (pagination.limit || 50),
    orderBy: sort.field && !sort.field.startsWith("_computed.")
      ? { [sort.field]: sort.direction || "asc" }
      : undefined,
  };
}

export function buildDynamicQuery({ selectedFields, filters, pagination, sort }: any) {
  const prismaQuery: any = {
    select: buildSelect(selectedFields),
    where: buildWhere(filters),
    ...buildPaginationAndSort(pagination, sort),
  };

  const computedFields = selectedFields
    .filter((field: string) => field.startsWith("_computed."))
    .map((field: string) => ({ field }));

  return { prismaQuery, computedFields };
}

export async function attachComputedFields(
  results: any[],
  selectedFields: string[],
  model: string
) {
  // Skip if no computed fields were selected
  if (!selectedFields.some((f) => f.startsWith("_computed."))) return results;

  return results.map((item) => {
    const modelHandlers = computedHandlers[model];
    if (!modelHandlers) return item;

    const computed: Record<string, any> = {};

    for (const field of selectedFields) {
      if (field.startsWith("_computed.") && modelHandlers[field]) {
        try {
          computed[field.replace("_computed.", "")] = modelHandlers[field](item);
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
