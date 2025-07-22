import { prisma } from "@/lib/prisma";

function buildSelect(selectedFields: string[]) {
  return selectedFields.reduce((acc: any, field) => {
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
    const { field, operator, value } = filter;
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

function buildPaginationAndSort(pagination = {}, sort = {}) {
  return {
    take: pagination.limit || 50,
    skip: ((pagination.page || 1) - 1) * (pagination.limit || 50),
    orderBy: sort.field ? { [sort.field]: sort.direction || "asc" } : undefined,
  };
}

export async function buildDynamicQuery({ model, selectedFields, filters, pagination, sort }: any) {
  switch (model) {
    case "employee":
      return prisma.employee.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });

    case "leaveRequest":
      return prisma.leaveRequest.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });

    case "drivingLicence":
      return prisma.drivingLicence.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });

    case "leaveEntitlement":
      return prisma.leaveEntitlement.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });

    case "trainingRecord":
      return prisma.trainingRecord.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });

    case "employmentCheck":
      return prisma.employmentCheck.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });

    case "document":
      return prisma.document.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });

    case "workingPattern":
      return prisma.workingPattern.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });

    case "company":
      return prisma.company.findMany({
        select: buildSelect(selectedFields),
        where: buildWhere(filters),
        ...buildPaginationAndSort(pagination, sort),
      });

    default:
      throw new Error(`Unsupported model: ${model}`);
  }
}
