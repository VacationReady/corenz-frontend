// lib/queryBuilder.ts
import { computedHandlers } from "@/lib/computedHandlers";
import { DEFAULT_TIMEZONE } from "@/lib/datetime";
import {
        calculateDateRange,
        type DatePresetSelection,
} from "@/lib/reportingDatePresets";
import {
        endOfLocalDay,
        getLocalDateParts,
        shiftLocalDate,
        shiftLocalMonths,
        shiftLocalYears,
        startOfLocalDay,
} from "@/lib/zonedDateUtils";
import type {
        FilterGroup,
        FilterRule,
        FilterNode,
} from "@/lib/reportFilters";
import {
        isFilterGroup,
        isFilterRule,
        filterGroupByModel,
        stripModelPrefixFromGroup,
        createRootFilterGroup,
} from "@/lib/reportFilters";

type Operator =
        | "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with"
        | "greater_than" | "less_than" | "greater_than_equal" | "less_than_equal" | "between"
        | "is_null" | "is_not_null" | "in" | "not_in"
        | "date_equals" | "date_before" | "date_after" | "date_between" | "date_in_last" | "date_in_next" | "date_preset";

interface QueryContext {
        timeZone?: string;
        now?: Date;
}

function resolveTimeZone(context?: QueryContext): string {
        return context?.timeZone || DEFAULT_TIMEZONE;
}

type RollingUnit = "days" | "weeks" | "months" | "years";

function computeRollingRange(
        direction: "past" | "future",
        amount: number,
        unit: RollingUnit,
        context?: QueryContext,
) {
        const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 1;
        const timeZone = resolveTimeZone(context);
        const base = context?.now ? new Date(context.now) : new Date();
        const todayParts = getLocalDateParts(base, timeZone);
        const unitLower = unit ?? "days";

        const shift = (parts: ReturnType<typeof getLocalDateParts>, delta: number) => {
                switch (unitLower) {
                        case "weeks":
                                return shiftLocalDate(parts, delta * 7);
                        case "months":
                                return shiftLocalMonths(parts, delta);
                        case "years":
                                return shiftLocalYears(parts, delta);
                        default:
                                return shiftLocalDate(parts, delta);
                }
        };

        if (direction === "past") {
                const referenceParts = shift(todayParts, -safeAmount);
                const start = startOfLocalDay(referenceParts, timeZone);
                const end = endOfLocalDay(todayParts, timeZone);
                return { start, end };
        }

        const referenceParts = shift(todayParts, safeAmount);
        const start = startOfLocalDay(todayParts, timeZone);
        const end = endOfLocalDay(referenceParts, timeZone);
        return { start, end };
}

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

function mapOperatorToCondition(operator: Operator, value: any, value2: any, context?: QueryContext) {
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
                        const range = computeRollingRange("past", amount, unit, context);
                        const condition: Record<string, Date> = {};
                        if (range.start) condition.gte = range.start;
                        if (range.end) condition.lte = range.end;
                        return condition;
                }
                case "date_in_next": {
                        const { amount = 1, unit = "days" } = value || {};
                        const range = computeRollingRange("future", amount, unit, context);
                        const condition: Record<string, Date> = {};
                        if (range.start) condition.gte = range.start;
                        if (range.end) condition.lte = range.end;
                        return condition;
                }
                case "date_preset": {
                        let selection: DatePresetSelection | undefined;
                        if (typeof value === "string") {
                                try {
                                        selection = JSON.parse(value) as DatePresetSelection;
                                } catch (error) {
                                        selection = undefined;
                                }
                        } else {
                                selection = value as DatePresetSelection | undefined;
                        }
                        if (!selection) return undefined;
                        const range = calculateDateRange(selection, {
                                timeZone: resolveTimeZone(context),
                                now: context?.now,
                        });
                        const condition: Record<string, Date> = {};
                        if (range.start) condition.gte = range.start;
                        if (range.end) condition.lte = range.end;
                        return condition;
                }
        }
}

/**
 * Build a nested where clause from a single filter rule.
 * Returns a nested object matching the field path.
 */
function buildFilterRuleCondition(
        rule: FilterRule,
        context?: QueryContext,
): Record<string, any> | null {
        const { field, value, value2, operator } = rule;
        if (!field || field.startsWith("_computed.")) return null;

        const parts = field.split(".");
        const where: Record<string, any> = {};
        let current = where;

        for (let i = 0; i < parts.length; i++) {
                const key = parts[i];
                const isLeaf = i === parts.length - 1;

                if (isLeaf) {
                        if (operator === "is_null") {
                                current[key] = null;
                        } else {
                                const condition = mapOperatorToCondition(
                                        operator as Operator,
                                        value,
                                        value2,
                                        context,
                                );
                                current[key] = condition ?? null;
                        }
                } else {
                        current[key] = current[key] || {};
                        current = current[key];
                }
        }

        return where;
}

/**
 * Build a Prisma where clause from a FilterGroup tree.
 * Supports nested AND/OR logic.
 */
function buildGroupedWhere(
        group: FilterGroup,
        context?: QueryContext,
): Record<string, any> {
        const conditions: Record<string, any>[] = [];

        for (const child of group.children) {
                if (isFilterRule(child)) {
                        const condition = buildFilterRuleCondition(child, context);
                        if (condition) {
                                conditions.push(condition);
                        }
                } else if (isFilterGroup(child)) {
                        const nestedCondition = buildGroupedWhere(child, context);
                        if (Object.keys(nestedCondition).length > 0) {
                                conditions.push(nestedCondition);
                        }
                }
        }

        if (conditions.length === 0) {
                return {};
        }

        if (conditions.length === 1) {
                return conditions[0];
        }

        // Multiple conditions: combine with AND or OR
        if (group.logicOperator === "OR") {
                return { OR: conditions };
        } else {
                return { AND: conditions };
        }
}

/**
 * Build a where clause from either a FilterGroup or legacy flat filter array.
 * Maintains backward compatibility.
 */
function buildWhere(
        filtersOrGroup: any[] | FilterGroup | undefined,
        context?: QueryContext,
): Record<string, any> {
        // Handle FilterGroup (new format)
        if (
                filtersOrGroup &&
                typeof filtersOrGroup === "object" &&
                !Array.isArray(filtersOrGroup) &&
                "type" in filtersOrGroup &&
                filtersOrGroup.type === "group"
        ) {
                return buildGroupedWhere(filtersOrGroup as FilterGroup, context);
        }

        // Handle legacy flat array format
        const filters = (filtersOrGroup as any[]) || [];
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
                                const condition = mapOperatorToCondition(
                                        operator as Operator,
                                        value,
                                        value2,
                                        context,
                                );
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
}: any, context: QueryContext = {}) {
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
        if (filters) {
            if (Array.isArray(filters)) {
                // Legacy array format
                filters = filters.filter((f: any) => typeof f.field === "string" && f.field.startsWith(`${primaryModel}.`));
            } else if (isFilterGroup(filters)) {
                // FilterGroup format - filter by primary model
                const filtered = filterGroupByModel(filters, primaryModel);
                // Use filtered group if available, otherwise use empty group
                filters = filtered || createRootFilterGroup();
            }
        }
        if (sort?.field && !String(sort.field).startsWith(`${primaryModel}.`)) {
            sort = undefined;
        }
    }

	const constrainedGroups = groupFieldsByModel(selectedFields);
	const queries = [] as any[];

	for (const model in constrainedGroups) {
		const fields = constrainedGroups[model];
		
		// Filter by model and strip model prefix
		let modelFilters: any[] | FilterGroup | undefined;
		if (filters) {
			if (Array.isArray(filters)) {
				// Legacy array format
				modelFilters = filters.filter((f: any) => f.field?.startsWith(`${model}.`)).map((f: any) => ({
					...f,
					field: f.field.replace(`${model}.`, ""),
				}));
			} else if (isFilterGroup(filters)) {
				// FilterGroup format - filter by model and strip prefix
				const filteredGroup = filterGroupByModel(filters, model);
				if (filteredGroup) {
					modelFilters = stripModelPrefixFromGroup(filteredGroup, model);
				} else {
					modelFilters = undefined;
				}
			}
		}

		// Adapt sort to model context
		let modelSort = sort;
		if (sort?.field?.startsWith(`${model}.`)) {
			modelSort = { ...sort, field: sort.field.replace(`${model}.`, "") };
		}

                queries.push({
                        model,
                        prismaQuery: {
                                select: buildSelect(fields),
                                where: buildWhere(modelFilters, context),
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

