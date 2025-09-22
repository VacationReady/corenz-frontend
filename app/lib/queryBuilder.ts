// lib/queryBuilder.ts
import { computedHandlers } from "@/lib/computedHandlers";

type Operator =
	| "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with"
	| "greater_than" | "less_than" | "greater_than_equal" | "less_than_equal" | "between"
	| "is_null" | "is_not_null" | "in" | "not_in"
	| "date_equals" | "date_before" | "date_after" | "date_between" | "date_in_last" | "date_in_next";

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

	console.log("🔍 Built select object:", JSON.stringify(select, null, 2));
	return select;
}

function mapOperatorToCondition(operator: Operator, value: any, value2?: any) {
	switch (operator) {
		case "equals":
			return { equals: value };
		case "not_equals":
			return { not: value };
		case "contains":
			return { contains: value, mode: "insensitive" };
		case "not_contains":
			return { not: { contains: value, mode: "insensitive" } };
		case "starts_with":
			return { startsWith: value, mode: "insensitive" };
		case "ends_with":
			return { endsWith: value, mode: "insensitive" };
		case "greater_than":
			return { gt: value };
		case "less_than":
			return { lt: value };
		case "greater_than_equal":
			return { gte: value };
		case "less_than_equal":
			return { lte: value };
		case "between":
			return { gte: value, lte: value2 };
		case "is_null":
			return null; // handled at field level as { field: null }
		case "is_not_null":
			return { not: null };
		case "in":
			return { in: Array.isArray(value) ? value : [value] };
		case "not_in":
			return { notIn: Array.isArray(value) ? value : [value] };
		case "date_equals":
			return { equals: new Date(value) };
		case "date_before":
			return { lt: new Date(value) };
		case "date_after":
			return { gt: new Date(value) };
		case "date_between":
			return { gte: new Date(value), lte: new Date(value2) };
		case "date_in_last": {
			const { amount = 1, unit = "days" } = value || {};
			const end = new Date();
			const start = new Date();
			switch (unit) {
				case "days": start.setDate(start.getDate() - amount); break;
				case "weeks": start.setDate(start.getDate() - amount * 7); break;
				case "months": start.setMonth(start.getMonth() - amount); break;
				case "years": start.setFullYear(start.getFullYear() - amount); break;
			}
			return { gte: start, lte: end };
		}
		case "date_in_next": {
			const { amount = 1, unit = "days" } = value || {};
			const start = new Date();
			const end = new Date();
			switch (unit) {
				case "days": end.setDate(end.getDate() + amount); break;
				case "weeks": end.setDate(end.getDate() + amount * 7); break;
				case "months": end.setMonth(end.getMonth() + amount); break;
				case "years": end.setFullYear(end.getFullYear() + amount); break;
			}
			return { gte: start, lte: end };
		}
	}
}

function buildWhere(filters: any[]) {
	const where: Record<string, any> = {};

	for (const filter of filters) {
		const { field, value, value2, operator } = filter;
		if (!field || field.startsWith("_computed.")) continue;

		const parts = field.split(".");
		let current = where;

		for (let i = 0; i < parts.length; i++) {
			const key = parts[i];
			const isLeaf = i === parts.length - 1;

			if (isLeaf) {
				if (operator === "is_null") {
					current[key] = null;
					continue;
				}
				const condition = mapOperatorToCondition(operator as Operator, value, value2);
				current[key] = condition ?? null;
			} else {
				current[key] = current[key] || {};
				current = current[key];
			}
		}
	}

	return where;
}

function normalizeOrderBy(sort?: { field?: string; direction?: "asc" | "desc" }) {
	if (!sort?.field || sort.field.startsWith("_computed.")) return undefined;
	const parts = sort.field.split(".");
	const dir = sort.direction || "asc";
	let node: any = dir;
	for (let i = parts.length - 1; i >= 0; i--) {
		const key = parts[i];
		node = { [key]: node };
	}
	return node;
}

function buildPaginationAndSort(
	pagination: { limit?: number; page?: number } = {},
	sort: { field?: string; direction?: "asc" | "desc" } = {},
) {
	return {
		take: pagination.limit || 50,
		skip: ((pagination.page || 1) - 1) * (pagination.limit || 50),
		orderBy: normalizeOrderBy(sort),
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

	console.log("🔍 Grouped fields by model:", modelMap);
	return modelMap;
}

export function buildDynamicQuery({
	selectedFields,
	filters,
	pagination,
	sort,
}: any) {
	// Constrain to a single primary dataset for now
    const fieldGroups = groupFieldsByModel(selectedFields);
    const models = Object.keys(fieldGroups);
    if (models.length > 1) {
        // If any LeaveRequest fields are selected, prefer LeaveRequest as the primary model
        const hasLeaveFields = selectedFields.some((f: string) => f.startsWith("LeaveRequest."));
        let primaryModel = hasLeaveFields ? "LeaveRequest" : undefined as string | undefined;
        if (!primaryModel) {
            // Otherwise choose by highest field count, tie-breaker: prefer LeaveRequest, else first
            const counts = models.map((m) => ({ model: m, count: fieldGroups[m].length }));
            counts.sort((a, b) => b.count - a.count);
            primaryModel = counts[0].model;
            const topCount = counts[0].count;
            const tied = counts.filter((c) => c.count === topCount).map((c) => c.model);
            if (tied.includes("LeaveRequest")) primaryModel = "LeaveRequest";
        }
        console.warn("Multiple models selected; constraining to primary model:", primaryModel);
        selectedFields = selectedFields.filter((f: string) => f.startsWith(`${primaryModel}.`));
        // Also drop filters/sort that target other models; handled later per-model
        if (Array.isArray(filters)) {
            filters = filters.filter((f: any) => typeof f.field === "string" && f.field.startsWith(`${primaryModel}.`));
        }
        if (sort?.field && !String(sort.field).startsWith(`${primaryModel}.`)) {
            sort = undefined;
        }
    }

	const constrainedGroups = groupFieldsByModel(selectedFields);
	const queries = [] as any[];

	for (const model in constrainedGroups) {
		const fields = constrainedGroups[model];
		const modelFilters = (filters || []).filter((f: any) => f.field.startsWith(`${model}.`));
		const strippedFilters = modelFilters.map((f: any) => ({
			...f,
			field: f.field.replace(`${model}.`, ""),
		}));

		// Adapt sort to model context
		let modelSort = sort;
		if (sort?.field?.startsWith(`${model}.`)) {
			modelSort = { ...sort, field: sort.field.replace(`${model}.`, "") };
		}

		queries.push({
			model,
			prismaQuery: {
				select: buildSelect(fields),
				where: buildWhere(strippedFilters),
				...buildPaginationAndSort(pagination, modelSort),
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

