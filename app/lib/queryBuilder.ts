import { prisma } from "@/lib/prisma";

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

async function attachComputedFields(results: any[], selectedFields: string[], model: string) {
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

export async function buildDynamicQuery({ model, selectedFields, filters, pagination, sort }: any) {
  let results: any[] = [];

  switch (model) {
    case "employee":
      results = await prisma.employee.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });
      break;
    case "leaveRequest":
      results = await prisma.leaveRequest.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });
      break;
    case "driverLicence":
      results = await prisma.driverLicence.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });
      break;
    case "leaveEntitlement":
      results = await prisma.leaveEntitlement.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });
      break;
    case "trainingRecord":
      results = await prisma.trainingRecord.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });
      break;
    case "employmentCheck":
      results = await prisma.employmentCheck.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });
      break;
    case "document":
      results = await prisma.document.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });
      break;
    case "workingPattern":
      results = await prisma.workingPattern.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });
      break;
    case "company":
      results = await prisma.company.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });
      break;
    default:
      throw new Error(`Unsupported model: ${model}`);
  }

  return await attachComputedFields(results, selectedFields, model);
}
