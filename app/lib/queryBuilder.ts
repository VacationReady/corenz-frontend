function buildSelect(selectedFields: string[]) {
  return selectedFields.reduce((acc: any, field) => {
    if (field.startsWith("_computed.")) return acc; // Skip computed fields
    const parts = field.split(".");
    if (parts.length === 2) {
      const [relation, fieldName] = parts;
      acc[relation] = acc[relation] || { select: {} };
      acc[relation].select[fieldName] = true;
    } else {
      acc[parts[0]] = true;
    }
    return acc;
  }, {});
}

function buildWhere(filters: any[]) {
  return filters.reduce((acc: any, filter) => {
    const { field, value } = filter;
    if (!field || field.startsWith("_computed.")) return acc; // Skip computed filters
    const parts = field.split(".");
    if (parts.length === 2) {
      const [relation, fieldName] = parts;
      acc[relation] = acc[relation] || {};
      acc[relation][fieldName] = value;
    } else {
      acc[field] = value;
    }
    return acc;
  }, {});
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

export async function attachComputedFields(results: any[], selectedFields: string[], model: string) {
  if (!selectedFields.some((f) => f.startsWith("_computed."))) return results;

  return results.map((item) => {
    if (model === "leaveEntitlement" && selectedFields.includes("_computed.remainingEntitlement")) {
      item["_computed"] = {
        remainingEntitlement:
          (item.totalDays || 0) + (item.daysAllocated || 0) + (item.carryoverDays || 0) - (item.usedDays || 0),
      };
    }
    return item;
  });
}
