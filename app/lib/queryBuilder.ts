import { prisma } from "@/lib/prisma";
import { reportFields } from "@/lib/reportFields";

export async function buildDynamicQuery({ model, selectedFields, filters, pagination, sort }) {
  const modelFields = reportFields.filter(f => f.model === model);

  const select = selectedFields.reduce((acc, fieldKey) => {
    const fieldMeta = modelFields.find(f => f.field === fieldKey);
    if (!fieldMeta) return acc;

    const parts = fieldKey.split(".");
    if (parts.length === 2) {
      const [relation, field] = parts;
      acc[relation] = acc[relation] || { select: {} };
      acc[relation].select[field] = true;
    } else {
      acc[parts[0]] = true;
    }
    return acc;
  }, {});

  const where = filters.reduce((acc, filter) => {
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

  return prisma[model].findMany({
    select,
    where,
    take: pagination?.limit || 50,
    skip: ((pagination?.page || 1) - 1) * (pagination?.limit || 50),
    orderBy: sort ? { [sort.field]: sort.direction } : undefined,
  });
}
