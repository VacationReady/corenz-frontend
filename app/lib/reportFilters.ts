export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_than_equal"
  | "less_than_equal"
  | "between"
  | "is_null"
  | "is_not_null"
  | "in"
  | "not_in"
  | "date_equals"
  | "date_before"
  | "date_after"
  | "date_between"
  | "date_in_last"
  | "date_in_next"
  | "date_preset";

export type DatePresetFilterValue = import("@/lib/reportingDatePresets").DatePresetSelection;

export interface ReportFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value?: unknown;
  value2?: unknown;
  groupId?: string; // ID of the group this filter belongs to
  hideFieldInResults?: boolean; // Whether to hide this field from output columns
  type?: "rule"; // Discriminator for tree serialization
}

export type FilterLogic = "AND" | "OR";

export interface FilterRule extends ReportFilter {
  type: "rule";
}

export interface FilterGroup {
  id: string;
  type: "group";
  logicOperator: FilterLogic;
  children: FilterNode[];
  parentGroupId?: string;
}

export type FilterNode = FilterGroup | FilterRule;

const FILTER_GROUP_PREFIX = "filter_group";
const FILTER_RULE_PREFIX = "filter_rule";

const generateNodeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export const createFilterRule = (overrides: Partial<FilterRule> = {}): FilterRule => ({
  id: overrides.id ?? generateNodeId(FILTER_RULE_PREFIX),
  type: "rule",
  field: overrides.field ?? "",
  operator: overrides.operator ?? "equals",
  value: overrides.value,
  value2: overrides.value2,
  groupId: overrides.groupId,
  hideFieldInResults: overrides.hideFieldInResults ?? false,
});

export const createFilterGroup = (overrides: Partial<FilterGroup> = {}): FilterGroup => ({
  id: overrides.id ?? generateNodeId(FILTER_GROUP_PREFIX),
  type: "group",
  logicOperator: overrides.logicOperator ?? "AND",
  parentGroupId: overrides.parentGroupId,
  children: overrides.children ? overrides.children.map((child) => ({ ...child })) : [],
});

export const createRootFilterGroup = (): FilterGroup => ({
  id: "filter_root",
  type: "group",
  logicOperator: "AND",
  children: [],
});

export const isFilterGroup = (node: FilterNode): node is FilterGroup => node?.type === "group";

export const isFilterRule = (node: FilterNode): node is FilterRule => node?.type === "rule";

export const flattenFilterRules = (group: FilterGroup): FilterRule[] => {
  const rules: FilterRule[] = [];
  group.children.forEach((child) => {
    if (isFilterRule(child)) {
      rules.push(child);
      return;
    }
    if (isFilterGroup(child)) {
      rules.push(...flattenFilterRules(child));
    }
  });
  return rules;
};

export const hasFilterRules = (group: FilterGroup): boolean => flattenFilterRules(group).length > 0;

export const collectVisibleFields = (group: FilterGroup): string[] => {
  const fields = new Set<string>();
  const visit = (node: FilterNode) => {
    if (isFilterRule(node)) {
      if (!node.hideFieldInResults && node.field && !node.field.startsWith("_computed.")) {
        fields.add(node.field);
      }
      return;
    }
    node.children.forEach(visit);
  };
  visit(group);
  return Array.from(fields);
};

export const normalizeFilterGroupInput = (
  input?: FilterGroup | FilterRule[] | ReportFilter[],
): FilterGroup => {
  if (!input) {
    return createRootFilterGroup();
  }
  if ((input as FilterGroup).type === "group") {
    return input as FilterGroup;
  }
  const rules = (input as ReportFilter[]).map((rule) => ({
    ...rule,
    type: "rule" as const,
  }));
  return {
    ...createRootFilterGroup(),
    children: rules,
  };
};

export const filterGroupByModel = (group: FilterGroup, model: string): FilterGroup | null => {
  const children: FilterNode[] = [];
  group.children.forEach((child) => {
    if (isFilterGroup(child)) {
      const nested = filterGroupByModel(child, model);
      if (nested && nested.children.length > 0) {
        children.push(nested);
      }
      return;
    }
    if (isFilterRule(child) && child.field?.startsWith(`${model}.`)) {
      children.push({ ...child });
    }
  });
  if (!children.length) {
    return null;
  }
  return {
    ...group,
    children,
  };
};

export const stripModelPrefixFromGroup = (group: FilterGroup, model: string): FilterGroup => ({
  ...group,
  children: group.children.map((child) => {
    if (isFilterGroup(child)) {
      return stripModelPrefixFromGroup(child, model);
    }
    const rule: FilterRule = {
      ...child,
      field: child.field?.startsWith(`${model}.`)
        ? child.field.replace(`${model}.`, "")
        : child.field,
    };
    return rule;
  }),
});

export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

export interface MultiSortConfig {
  sorts: SortConfig[];
}

// Validation helpers
export function isFilterComplete(filter: ReportFilter): boolean {
  if (!filter.field || !filter.operator) return false;
  
  const operatorsWithoutValue: FilterOperator[] = ["is_null", "is_not_null"];
  if (operatorsWithoutValue.includes(filter.operator)) return true;
  
  const operatorsWithTwoValues: FilterOperator[] = ["between", "date_between"];
  if (operatorsWithTwoValues.includes(filter.operator)) {
    return filter.value !== undefined && filter.value !== "" && 
           filter.value2 !== undefined && filter.value2 !== "";
  }
  
  return filter.value !== undefined && filter.value !== "";
}

export function getFilterValidationError(filter: ReportFilter): string | null {
  if (!filter.field) return "Field is required";
  if (!filter.operator) return "Operator is required";
  
  const operatorsWithoutValue: FilterOperator[] = ["is_null", "is_not_null"];
  if (operatorsWithoutValue.includes(filter.operator)) return null;
  
  const operatorsWithTwoValues: FilterOperator[] = ["between", "date_between"];
  if (operatorsWithTwoValues.includes(filter.operator)) {
    if (!filter.value || filter.value === "") return "Start value is required";
    if (!filter.value2 || filter.value2 === "") return "End value is required";
    return null;
  }
  
  if (!filter.value || filter.value === "") return "Value is required";
  return null;
}

// ============================================================================
// SERIALIZATION HELPERS
// ============================================================================

/**
 * Serializes a FilterGroup tree into a structure suitable for API transmission.
 * Preserves the nested group structure with explicit type discriminators.
 */
export interface SerializedFilterNode {
  type: "group" | "rule";
  id: string;
  logicOperator?: FilterLogic;
  children?: SerializedFilterNode[];
  field?: string;
  operator?: FilterOperator;
  value?: unknown;
  value2?: unknown;
  hideFieldInResults?: boolean;
}

export function serializeFilterGroup(group: FilterGroup): SerializedFilterNode {
  return {
    type: "group",
    id: group.id,
    logicOperator: group.logicOperator,
    children: group.children.map((child) => {
      if (isFilterGroup(child)) {
        return serializeFilterGroup(child);
      }
      return {
        type: "rule",
        id: child.id,
        field: child.field,
        operator: child.operator,
        value: child.value,
        value2: child.value2,
        hideFieldInResults: child.hideFieldInResults,
      };
    }),
  };
}

/**
 * Deserializes an API payload back into a FilterGroup tree.
 * Handles both new grouped format and legacy flat arrays.
 */
export function deserializeFilterGroup(data: unknown): FilterGroup {
  // Handle null/undefined
  if (!data) {
    return createRootFilterGroup();
  }

  // Handle legacy flat array format
  if (Array.isArray(data)) {
    const rules: FilterRule[] = data.map((item: any) => ({
      ...item,
      type: "rule" as const,
      id: item.id || generateNodeId(FILTER_RULE_PREFIX),
    }));
    return {
      ...createRootFilterGroup(),
      children: rules,
    };
  }

  // Handle new grouped format
  const node = data as SerializedFilterNode;
  if (node.type === "group") {
    return {
      id: node.id || generateNodeId(FILTER_GROUP_PREFIX),
      type: "group",
      logicOperator: node.logicOperator || "AND",
      children: (node.children || []).map((child) => {
        if (child.type === "group") {
          return deserializeFilterGroup(child);
        }
        return {
          type: "rule" as const,
          id: child.id || generateNodeId(FILTER_RULE_PREFIX),
          field: child.field || "",
          operator: (child.operator || "equals") as FilterOperator,
          value: child.value,
          value2: child.value2,
          hideFieldInResults: child.hideFieldInResults || false,
        };
      }),
    };
  }

  // Fallback: treat as root group
  return createRootFilterGroup();
}

/**
 * Flattens a FilterGroup into a legacy flat array format.
 * Useful for backward compatibility with older API versions.
 */
export function flattenToLegacyFilters(group: FilterGroup): ReportFilter[] {
  return flattenFilterRules(group).map((rule) => ({
    id: rule.id,
    field: rule.field,
    operator: rule.operator,
    value: rule.value,
    value2: rule.value2,
    hideFieldInResults: rule.hideFieldInResults,
  }));
}

/**
 * Adds a filter rule to a specific group within the tree.
 * Returns a new tree with the rule added.
 */
export function addRuleToGroup(
  root: FilterGroup,
  groupId: string,
  rule: FilterRule,
): FilterGroup {
  if (root.id === groupId) {
    return {
      ...root,
      children: [...root.children, rule],
    };
  }

  return {
    ...root,
    children: root.children.map((child) => {
      if (isFilterGroup(child)) {
        return addRuleToGroup(child, groupId, rule);
      }
      return child;
    }),
  };
}

/**
 * Removes a node (rule or group) from the tree by its ID.
 * Returns a new tree with the node removed.
 */
export function removeNodeFromGroup(root: FilterGroup, nodeId: string): FilterGroup {
  return {
    ...root,
    children: root.children
      .filter((child) => child.id !== nodeId)
      .map((child) => {
        if (isFilterGroup(child)) {
          return removeNodeFromGroup(child, nodeId);
        }
        return child;
      }),
  };
}

/**
 * Updates a specific node in the tree.
 * Returns a new tree with the node updated.
 */
export function updateNodeInGroup(
  root: FilterGroup,
  nodeId: string,
  updates: Partial<FilterRule> | Partial<FilterGroup>,
): FilterGroup {
  if (root.id === nodeId) {
    return { ...root, ...(updates as Partial<FilterGroup>) } as FilterGroup;
  }

  return {
    ...root,
    children: root.children.map((child) => {
      if (child.id === nodeId) {
        if (isFilterGroup(child)) {
          return { ...child, ...(updates as Partial<FilterGroup>) } as FilterGroup;
        }
        return { ...child, ...(updates as Partial<FilterRule>) } as FilterRule;
      }
      if (isFilterGroup(child)) {
        return updateNodeInGroup(child, nodeId, updates);
      }
      return child;
    }),
  };
}

/**
 * Adds a new filter group as a child of the specified parent group.
 * Returns a new tree with the group added.
 */
export function addGroupToGroup(
  root: FilterGroup,
  parentGroupId: string,
  newGroup: FilterGroup,
): FilterGroup {
  if (root.id === parentGroupId) {
    return {
      ...root,
      children: [...root.children, { ...newGroup, parentGroupId }],
    };
  }

  return {
    ...root,
    children: root.children.map((child) => {
      if (isFilterGroup(child)) {
        return addGroupToGroup(child, parentGroupId, newGroup);
      }
      return child;
    }),
  };
}

/**
 * Finds a specific group by ID in the tree.
 */
export function findGroupById(root: FilterGroup, groupId: string): FilterGroup | null {
  if (root.id === groupId) {
    return root;
  }

  for (const child of root.children) {
    if (isFilterGroup(child)) {
      const found = findGroupById(child, groupId);
      if (found) return found;
    }
  }

  return null;
}

