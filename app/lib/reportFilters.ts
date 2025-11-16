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
}

export interface FilterGroup {
  id: string;
  logicOperator: "AND" | "OR";
  filters: ReportFilter[];
  parentGroupId?: string; // For nested groups
}

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

